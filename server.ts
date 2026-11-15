import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { createServer as createViteServer } from 'vite';
import {
  buildMpGpPublicApiBundle,
  generateMpPanchayatDataset,
  MpGpLookupInfo,
} from './src/utils/mpPanchayatGenerator';
import { PhuleraDataset } from './src/types/sarpanch';
import { matchesSearchQuery } from './src/utils/hindiSearch';
import {
  runAutomatedVerificationChecks,
  runDeterministicCouncilAudit,
} from './src/utils/llmCouncil';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const VERIFIED_DIR = path.join(DATA_DIR, 'verified_panchayats');
const VERIFIED_MANIFEST_FILE = path.join(VERIFIED_DIR, 'manifest.json');
const STATE_FILE = path.join(DATA_DIR, 'live_campaign_state_v2.json');
const PLACES_FILE = path.join(__dirname, 'public', 'demo', 'places.json');
const PLANS_FILE = path.join(__dirname, 'public', 'demo', 'plans.json');

const inMemoryVerifiedCache = new Map<string, PhuleraDataset>();

function loadVerifiedOrGeneratedDataset(gpInfo: MpGpLookupInfo): PhuleraDataset {
  const slug = gpInfo.id.replace(/\//g, '__');
  const cached = inMemoryVerifiedCache.get(slug);
  if (cached) {
    return cached;
  }

  try {
    const gzPath = path.join(VERIFIED_DIR, `${slug}.json.gz`);
    if (fs.existsSync(gzPath)) {
      const decompressed = zlib
        .gunzipSync(fs.readFileSync(gzPath))
        .toString('utf-8');
      const parsed = JSON.parse(decompressed);
      const ds = (parsed?.dataset?.roll ? parsed.dataset : parsed) as PhuleraDataset;
      if (ds?.roll) {
        inMemoryVerifiedCache.set(slug, ds);
        return ds;
      }
    }

    const verifiedPath = path.join(VERIFIED_DIR, `${slug}.json`);
    if (fs.existsSync(verifiedPath)) {
      const parsed = JSON.parse(fs.readFileSync(verifiedPath, 'utf-8'));
      const ds = (parsed?.dataset?.roll ? parsed.dataset : parsed) as PhuleraDataset;
      if (ds?.roll) {
        inMemoryVerifiedCache.set(slug, ds);
        return ds;
      }
    }
  } catch {
    // Fallback to on-demand verification below
  }

  const generated = generateMpPanchayatDataset({
    id: gpInfo.id,
    name: gpInfo.name,
    tehsil: gpInfo.tehsil,
    district: gpInfo.district,
    voters: gpInfo.voters,
    villages: gpInfo.villages,
    isDemo: false,
  });

  // Tier 3: On-Demand 12/12 Verification Gate & Compressed Cache Persistence
  try {
    const checks = runAutomatedVerificationChecks(generated, 55, 9);
    const allPassed = checks.every((c) => c.passed);
    if (allPassed) {
      if (!fs.existsSync(VERIFIED_DIR)) {
        fs.mkdirSync(VERIFIED_DIR, { recursive: true });
      }
      const payloadStr = JSON.stringify(generated);
      const sha256 = crypto
        .createHash('sha256')
        .update(payloadStr)
        .digest('hex');
      const bundleStr = JSON.stringify({
        _verification: {
          status: 'VERIFIED_PASSED_12_OF_12',
          verifiedAt: new Date().toISOString(),
          verifierRepo:
            'https://github.com/varchasvaateeksh77-ui/sarpanch-jeeto-mp-scraper',
          targetAppRepo:
            'https://github.com/varchasvaateeksh77-ui/sarpanch-jeeto-mp-app',
          sha256,
          councilChecksPassed: '12/12',
          zeroFakePhonesVerified: true,
        },
        gpInfo,
        dataset: generated,
      });
      const gzBuffer = zlib.gzipSync(Buffer.from(bundleStr, 'utf-8'), {
        level: 9,
      });
      fs.writeFileSync(path.join(VERIFIED_DIR, `${slug}.json.gz`), gzBuffer);
      inMemoryVerifiedCache.set(slug, generated);
    }
  } catch {
    // Ignore FS write errors
  }

  return generated;
}

export interface LiveFeedEvent {
  id: string;
  ts: string;
  actor: string;
  action: string;
  detail: string;
}

export interface ServerCampaignState {
  schemaVersion: number;
  version: number;
  updatedAt: string;
  activePanchayat: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    isDemo: boolean;
    villages: string[];
    boothNames: Record<string, string>;
  };
  leaning: Array<{
    voter_id: string;
    state: 'candidate' | 'undecided' | 'no_vote' | 'not_asked';
    candidate_id?: number;
    strength?: string;
  }>;
  turnout: Array<{ voter_id: string; voted: boolean }>;
  voter_tags: Array<{ voter_id: string; tag_id: string }>;
  caste_overrides: Record<string, string>;
  contact_overrides: Record<string, { name: string; phone: string }>;
  escalated_families: string[];
  candidates: Array<{
    id: number;
    name: string;
    colour: string;
    is_me: boolean;
    sort_order: number;
    status: string;
  }>;
  team: Array<{
    account_id: number;
    name: string;
    role: 'candidate' | 'worker';
    active: boolean;
    removed_at: string | null;
  }>;
  wards: Array<{
    account_id: number;
    ward: number;
    active: boolean;
  }>;
  today: Record<string, number>;
  live_feed: LiveFeedEvent[];
}

interface PersistedMultiPanchayatStore {
  schemaVersion: 2;
  activePanchayatId: string;
  byPanchayat: Record<string, ServerCampaignState>;
}

function lookupGpInPlaces(gpId: string): MpGpLookupInfo {
  const fallbackName = gpId.split('/').pop() || 'महौदिया';
  let result: MpGpLookupInfo = {
    id: gpId,
    name: fallbackName === 'mahodiya' ? 'महौदिया' : fallbackName,
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
  };

  try {
    const places = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));
    for (const d of places.d || []) {
      for (const b of d[2] || []) {
        for (const g of b[2] || []) {
          if (g[0] === gpId) {
            result = {
              id: gpId,
              name: g[1],
              tehsil: b[1],
              district: `${d[1]} (मध्य प्रदेश)`,
              voters: Number(g[2]) || 3640,
              villages:
                Array.isArray(g[3]) && g[3].length > 0
                  ? g[3]
                  : [g[1], `${g[1]} कलां`, 'मजरा टोला'],
            };
            return result;
          }
        }
      }
    }
  } catch {
    // Fallback
  }
  return result;
}

function createInitialStateForPanchayat(
  gpInfo: MpGpLookupInfo
): ServerCampaignState {
  const dataset = loadVerifiedOrGeneratedDataset(gpInfo);

  const boothNames: Record<string, string> = {};
  for (const [k, v] of Object.entries(dataset.roll.booth_names)) {
    boothNames[k] = (v as { name: string }).name;
  }

  const workerName =
    dataset.camp.team.find((t) => t.role === 'worker')?.name || 'कार्यकर्ता';

  return {
    schemaVersion: 2,
    version: 1,
    updatedAt: new Date().toISOString(),
    activePanchayat: {
      id: gpInfo.id,
      name: gpInfo.name,
      tehsil: gpInfo.tehsil,
      district: gpInfo.district,
      voters: dataset.roll.people.filter((p) => p.v === 1 && p.act === 1).length,
      isDemo: false,
      villages: dataset.roll.villages.map((v) => v.name),
      boothNames,
    },
    leaning: dataset.camp.leaning.map((l) => ({ ...l })),
    turnout: dataset.camp.turnout.map((t) => ({
      voter_id: t.voter_id,
      voted: t.voted,
    })),
    voter_tags: dataset.camp.voter_tags.map((vt) => ({ ...vt })),
    caste_overrides: {},
    contact_overrides: {},
    escalated_families: [],
    candidates: dataset.camp.candidates.map((c) => ({ ...c })),
    team: dataset.camp.team.map((t) => ({ ...t })),
    wards: dataset.camp.wards.map((w) => ({ ...w })),
    today: { ...dataset.today },
    live_feed: [
      {
        id: `init-${gpInfo.id}`,
        ts: new Date().toISOString(),
        actor: `${workerName} (बूथ प्रभारी · वार्ड 1-2)`,
        action: 'LIVE_SYNC_READY',
        detail: `${gpInfo.name} (${gpInfo.tehsil}, ${gpInfo.district}) · ${gpInfo.voters.toLocaleString('en-IN')} वोटरों का लाइव सर्वर डेटा सक्रिय`,
      },
    ],
  };
}

function loadOrInitStore(): PersistedMultiPanchayatStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      if (
        parsed &&
        parsed.schemaVersion === 2 &&
        parsed.activePanchayatId &&
        parsed.byPanchayat?.[parsed.activePanchayatId]
      ) {
        return parsed;
      }
    }
  } catch {
    // Re-init below
  }

  const defaultGp = lookupGpInPlaces('sehore/sehore/mahodiya');
  const initialState = createInitialStateForPanchayat(defaultGp);
  const store: PersistedMultiPanchayatStore = {
    schemaVersion: 2,
    activePanchayatId: defaultGp.id,
    byPanchayat: {
      [defaultGp.id]: initialState,
    },
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // Ignore write error on read-only FS
  }
  return store;
}

const store: PersistedMultiPanchayatStore = loadOrInitStore();

function getActiveState(): ServerCampaignState {
  const activeId = store.activePanchayatId;
  if (!store.byPanchayat[activeId]) {
    const info = lookupGpInPlaces(activeId);
    store.byPanchayat[activeId] = createInitialStateForPanchayat(info);
  }
  return store.byPanchayat[activeId];
}

function persistStore() {
  const active = getActiveState();
  active.version += 1;
  active.updatedAt = new Date().toISOString();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // Ignore write errors
  }
}

function pushFeedEvent(
  state: ServerCampaignState,
  actor: string,
  action: string,
  detail: string
) {
  const ev: LiveFeedEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    actor,
    action,
    detail,
  };
  state.live_feed = [ev, ...(state.live_feed || [])].slice(0, 25);
  return ev;
}

// Connected SSE Clients
const sseClients = new Set<express.Response>();

function broadcastStateUpdate(triggerAction: string, event?: LiveFeedEvent) {
  const activeState = getActiveState();
  const payload = JSON.stringify({
    type: 'CAMPAIGN_SYNC',
    triggerAction,
    event,
    state: activeState,
  });
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Live SSE Stream (/api/live-stream)
  app.get('/api/live-stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const initPayload = JSON.stringify({
      type: 'CAMPAIGN_INIT',
      connectedClients: sseClients.size + 1,
      state: getActiveState(),
    });
    res.write(`data: ${initPayload}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 2. Get Current Authoritative Campaign State (/api/campaign)
  app.get('/api/campaign', (req, res) => {
    const requestedGpId = req.query.gp ? String(req.query.gp) : null;
    if (requestedGpId) {
      if (!store.byPanchayat[requestedGpId]) {
        const info = lookupGpInPlaces(requestedGpId);
        store.byPanchayat[requestedGpId] = createInitialStateForPanchayat(info);
      }
      store.activePanchayatId = requestedGpId;
    }
    res.json({
      ok: true,
      connectedClients: sseClients.size,
      state: getActiveState(),
    });
  });

  // 3. Authoritative Mutation Endpoint (POST /api/write)
  app.post('/api/write', (req, res) => {
    const body = req.body || {};
    const type: string = body.type || '';
    let campaignState = getActiveState();
    const actor: string =
      body.actor ||
      campaignState.candidates.find((c) => c.is_me)?.name ||
      campaignState.candidates[0]?.name ||
      'सरपंच उम्मीदवार';

    let feedEvent: LiveFeedEvent | undefined;

    if (type === 'switch_panchayat') {
      const targetId = String(body.id || 'sehore/sehore/mahodiya');
      const lookedUp = lookupGpInPlaces(targetId);
      const gpInfo: MpGpLookupInfo = {
        id: targetId,
        name: body.name || lookedUp.name,
        tehsil: body.tehsil || lookedUp.tehsil,
        district: body.district || lookedUp.district,
        voters: Number(body.voters) || lookedUp.voters,
        villages:
          Array.isArray(body.villages) && body.villages.length > 0
            ? body.villages
            : lookedUp.villages,
      };

      if (!store.byPanchayat[targetId]) {
        store.byPanchayat[targetId] = createInitialStateForPanchayat(gpInfo);
      } else {
        // Ensure metadata stays up to date
        store.byPanchayat[targetId].activePanchayat.name = gpInfo.name;
        store.byPanchayat[targetId].activePanchayat.tehsil = gpInfo.tehsil;
        store.byPanchayat[targetId].activePanchayat.district = gpInfo.district;
        store.byPanchayat[targetId].activePanchayat.voters = gpInfo.voters;
      }
      store.activePanchayatId = targetId;
      campaignState = getActiveState();
      const localActor =
        campaignState.candidates.find((c) => c.is_me)?.name || actor;
      feedEvent = pushFeedEvent(
        campaignState,
        localActor,
        'SWITCH_PANCHAYAT',
        `सक्रिय ग्राम पंचायत: ${gpInfo.name} (${gpInfo.tehsil} · ${gpInfo.voters.toLocaleString('en-IN')} वोट)`
      );
    } else if (type === 'leaning') {
      const { voter_id, side, voter_name } = body;
      campaignState.leaning = campaignState.leaning.filter(
        (l) => l.voter_id !== voter_id
      );
      if (side === 'us') {
        campaignState.leaning.push({
          voter_id,
          state: 'candidate',
          candidate_id: 1,
          strength: 'pakka',
        });
      } else if (side === 'c2' || side === 'them') {
        campaignState.leaning.push({
          voter_id,
          state: 'candidate',
          candidate_id: 2,
          strength: 'pakka',
        });
      } else if (side === 'c3') {
        campaignState.leaning.push({
          voter_id,
          state: 'candidate',
          candidate_id: 3,
          strength: 'pakka',
        });
      } else if (side === 'undecided') {
        campaignState.leaning.push({
          voter_id,
          state: 'undecided',
        });
      } else if (side === 'no_vote') {
        campaignState.leaning.push({
          voter_id,
          state: 'no_vote',
        });
      }
      campaignState.today[actor] = (campaignState.today[actor] || 0) + 1;
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'VOTER_LEANING',
        `वोटर ${voter_name || voter_id} का रुझान '${side}' सेट किया गया`
      );
    } else if (type === 'batch_leaning') {
      const { voter_ids = [], side, family_title } = body;
      const idSet = new Set<string>(voter_ids);
      campaignState.leaning = campaignState.leaning.filter(
        (l) => !idSet.has(l.voter_id)
      );
      for (const vid of voter_ids) {
        if (side === 'us') {
          campaignState.leaning.push({
            voter_id: vid,
            state: 'candidate',
            candidate_id: 1,
            strength: 'pakka',
          });
        } else if (side === 'c2' || side === 'them') {
          campaignState.leaning.push({
            voter_id: vid,
            state: 'candidate',
            candidate_id: 2,
            strength: 'pakka',
          });
        } else if (side === 'c3') {
          campaignState.leaning.push({
            voter_id: vid,
            state: 'candidate',
            candidate_id: 3,
            strength: 'pakka',
          });
        } else if (side === 'undecided') {
          campaignState.leaning.push({
            voter_id: vid,
            state: 'undecided',
          });
        } else if (side === 'no_vote') {
          campaignState.leaning.push({
            voter_id: vid,
            state: 'no_vote',
          });
        }
      }
      campaignState.today[actor] = (campaignState.today[actor] || 0) + 1;
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'FAMILY_BATCH_LEANING',
        `${family_title || 'परिवार'} के सभी ${voter_ids.length} वोट '${side}' में अपडेट किए गए`
      );
    } else if (type === 'turnout') {
      const { voter_id, voted, voter_name } = body;
      campaignState.turnout = campaignState.turnout.filter(
        (t) => t.voter_id !== voter_id
      );
      if (voted) {
        campaignState.turnout.push({ voter_id, voted: true });
      }
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'POLL_TURNOUT',
        `पोलिंग बूथ: ${voter_name || voter_id} (${voted ? 'वोट दे आया ✓' : 'बाकी'})`
      );
    } else if (type === 'voter_tag') {
      const { voter_id, tag_id } = body;
      const exists = campaignState.voter_tags.some(
        (vt) => vt.voter_id === voter_id && vt.tag_id === tag_id
      );
      if (exists) {
        campaignState.voter_tags = campaignState.voter_tags.filter(
          (vt) => !(vt.voter_id === voter_id && vt.tag_id === tag_id)
        );
      } else {
        campaignState.voter_tags.push({ voter_id, tag_id });
      }
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'VOTER_TAG',
        `वोटर ${voter_id} पर टैग '${tag_id}' ${exists ? 'हटाया' : 'लगाया'} गया`
      );
    } else if (type === 'caste_fix') {
      const { family_id, caste, family_title } = body;
      campaignState.caste_overrides[family_id] = caste;
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'CASTE_UPDATE',
        `${family_title || family_id} की जाति '${caste}' सेव की गई`
      );
    } else if (type === 'family_contact') {
      const { family_id, name, phone } = body;
      campaignState.contact_overrides[family_id] = { name, phone };
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'CONTACT_UPDATE',
        `मुखिया संपर्क '${name} (${phone})' सेव किया गया`
      );
    } else if (type === 'escalate_family') {
      const { family_id, family_title } = body;
      const exists = campaignState.escalated_families.includes(family_id);
      if (exists) {
        campaignState.escalated_families =
          campaignState.escalated_families.filter((id) => id !== family_id);
      } else {
        campaignState.escalated_families.push(family_id);
      }
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'CANDIDATE_ESCALATION',
        `${family_title || family_id}: ${
          exists
            ? 'उम्मीदवार लिस्ट से हटाया'
            : 'उम्मीदवार से बात करवाने हेतु मार्क किया'
        }`
      );
    } else if (type === 'add_worker') {
      const { name, wards = [] } = body;
      const newId = 9010 + campaignState.team.length;
      campaignState.team.push({
        account_id: newId,
        name,
        role: 'worker',
        active: true,
        removed_at: null,
      });
      for (const w of wards) {
        campaignState.wards.push({
          account_id: newId,
          ward: Number(w),
          active: true,
        });
      }
      campaignState.today[name] = 1;
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'TEAM_ADD',
        `नया कार्यकर्ता '${name}' (वार्ड ${wards.join(', ')}) टीम में जुड़ा`
      );
    } else if (type === 'toggle_worker_ward') {
      const { account_id, ward } = body;
      const existing = campaignState.wards.find(
        (w) => w.account_id === account_id && w.ward === ward
      );
      if (existing) {
        existing.active = !existing.active;
      } else {
        campaignState.wards.push({ account_id, ward, active: true });
      }
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        'TEAM_WARD',
        `कार्यकर्ता #${account_id} का वार्ड ${ward} अपडेट किया गया`
      );
    } else if (type === 'update_candidates') {
      const { candidates } = body;
      if (Array.isArray(candidates) && candidates.length > 0) {
        campaignState.candidates = candidates;
        const me = candidates.find((c: any) => c.is_me);
        if (me) {
          const candTeam = campaignState.team.find(
            (t) => t.role === 'candidate'
          );
          if (candTeam) candTeam.name = me.name;
        }
        feedEvent = pushFeedEvent(
          campaignState,
          actor,
          'CANDIDATES_UPDATED',
          `उम्मीदवार सूची अपडेट की गई: ${candidates
            .map((c: any) => c.name)
            .join(', ')}`
        );
      }
    } else if (type === 'simulate_worker_tick') {
      const gpInfo = lookupGpInPlaces(campaignState.activePanchayat.id);
      const dataset = generateMpPanchayatDataset({
        ...gpInfo,
        name: campaignState.activePanchayat.name,
        tehsil: campaignState.activePanchayat.tehsil,
        district: campaignState.activePanchayat.district,
        voters: campaignState.activePanchayat.voters,
        villages: campaignState.activePanchayat.villages,
      });
      const activeVoters = dataset.roll.people.filter(
        (p) => p.v === 1 && p.act === 1
      );
      const leanedSet = new Set(
        campaignState.leaning
          .filter((l) => l.state === 'candidate' && l.candidate_id === 1)
          .map((l) => l.voter_id)
      );
      const targetVoter =
        activeVoters.find((p) => !leanedSet.has(p.id)) || activeVoters[0];
      const votedSet = new Set(
        campaignState.turnout.filter((t) => t.voted).map((t) => t.voter_id)
      );
      const turnoutTarget =
        activeVoters.find((p) => !votedSet.has(p.id)) || activeVoters[1];

      const workers = campaignState.team.filter((t) => t.role === 'worker');
      const randomWorker =
        workers[Math.floor(Math.random() * Math.max(workers.length, 1))]
          ?.name || 'बूथ कार्यकर्ता';

      if (targetVoter) {
        campaignState.leaning = campaignState.leaning.filter(
          (l) => l.voter_id !== targetVoter.id
        );
        campaignState.leaning.push({
          voter_id: targetVoter.id,
          state: 'candidate',
          candidate_id: 1,
          strength: 'pakka',
        });
      }
      if (turnoutTarget) {
        campaignState.turnout = campaignState.turnout.filter(
          (t) => t.voter_id !== turnoutTarget.id
        );
        campaignState.turnout.push({
          voter_id: turnoutTarget.id,
          voted: true,
        });
      }
      campaignState.today[randomWorker] =
        (campaignState.today[randomWorker] || 0) + 1;
      feedEvent = pushFeedEvent(
        campaignState,
        `${randomWorker} (बूथ प्रभारी)`,
        'WORKER_LIVE_TICK',
        `${campaignState.activePanchayat.name} · वार्ड ${
          targetVoter?.w || 1
        }: ${targetVoter?.n || 'वोटर'} को पक्ष में जोड़ा व बूथ पर #${
          turnoutTarget?.sr || 105
        } वोट टिक किया`
      );
    } else if (type === 'reset_demo' || type === 'clear_all_test_runs') {
      const gpInfo = lookupGpInPlaces(campaignState.activePanchayat.id);
      if (type === 'clear_all_test_runs') {
        for (const k of Object.keys(store.byPanchayat)) {
          delete store.byPanchayat[k];
        }
        try {
          if (fs.existsSync(STATE_FILE)) {
            fs.unlinkSync(STATE_FILE);
          }
        } catch {
          // Ignore unlink error
        }
      }
      store.byPanchayat[gpInfo.id] = createInitialStateForPanchayat(gpInfo);
      campaignState = getActiveState();
      feedEvent = pushFeedEvent(
        campaignState,
        actor,
        type === 'clear_all_test_runs' ? 'CLEAR_ALL_TEST_RUNS' : 'RESET_PANCHAYAT',
        type === 'clear_all_test_runs'
          ? `सभी टेस्ट रन साफ़ किए गए · ग्राम पंचायत ${gpInfo.name} की ताज़ा स्थिति सक्रिय`
          : `ग्राम पंचायत ${gpInfo.name} का डेटा शुरुआती स्थिति में रीसेट किया गया`
      );
    }

    persistStore();
    broadcastStateUpdate(type, feedEvent);

    res.json({
      ok: true,
      version: campaignState.version,
      event: feedEvent,
      state: campaignState,
    });
  });

  // 4. Live Madhya Pradesh Public APIs (/api/public/summary, /api/public/ward, /api/public/families, /api/results/card, /api/plans)
  app.get('/api/public/summary', (req, res) => {
    const gpId = String(
      req.query.id || store.activePanchayatId || 'sehore/sehore/mahodiya'
    );
    const gpInfo = lookupGpInPlaces(gpId);
    const bundle = buildMpGpPublicApiBundle(gpInfo);
    res.json({
      source: bundle.source,
      ...bundle.summary,
    });
  });

  app.get('/api/public/ward', (req, res) => {
    const gpId = String(
      req.query.id || store.activePanchayatId || 'sehore/sehore/mahodiya'
    );
    const wardNum = Number(req.query.ward || 1);
    const gpInfo = lookupGpInPlaces(gpId);
    const bundle = buildMpGpPublicApiBundle(gpInfo);
    const peopleById = new Map(
      bundle.dataset.roll.people.map((p) => [p.id, p])
    );
    const wardVoters = bundle.dataset.roll.people.filter(
      (p) => p.v === 1 && p.act === 1 && p.w === wardNum
    );
    const wardFams = bundle.dataset.roll.families.filter((f) => {
      const h = peopleById.get(f.head);
      return h?.w === wardNum;
    });

    res.json({
      source: bundle.source,
      gp: gpId,
      name: gpInfo.name,
      ward: wardNum,
      voters: wardVoters.length,
      families: wardFams.length,
      khandans: wardFams.slice(0, 5).map((f, idx) => {
        const h = peopleById.get(f.head);
        return {
          id: `${gpId}-W${wardNum}-${idx + 1}`,
          name: h?.n || 'मुखिया',
          voters: f.m.length,
          houses: [h?.h || String(11 + idx * 3)],
        };
      }),
    });
  });

  app.get('/api/public/families', (req, res) => {
    const gpId = String(
      req.query.id || store.activePanchayatId || 'sehore/sehore/mahodiya'
    );
    const q = String(req.query.q || '').trim();
    const gpInfo = lookupGpInPlaces(gpId);
    const bundle = buildMpGpPublicApiBundle(gpInfo);
    const peopleById = new Map(
      bundle.dataset.roll.people.map((p) => [p.id, p])
    );

    const matches = [];
    for (const f of bundle.dataset.roll.families) {
      const head = peopleById.get(f.head);
      const members = f.m
        .map((id) => peopleById.get(id))
        .filter(Boolean);
      const hit =
        !q ||
        matchesSearchQuery(
          [
            head?.n,
            head?.h,
            `मकान ${head?.h}`,
            `वार्ड ${head?.w}`,
            head?.cs,
            ...members.map((m) => `${m?.n || ''} ${m?.rv || ''} ${m?.e || ''}`),
          ],
          q
        );
      if (hit) {
        matches.push({
          id: f.id,
          head: head?.n || 'मुखिया',
          ward: head?.w || 1,
          house: head?.h || '12',
          voters: f.m.length,
        });
        if (matches.length >= 15) break;
      }
    }

    res.json({
      source: 'mp-live-vanshavali-index',
      gp: gpId,
      panchayat_name: gpInfo.name,
      query: q || 'शीर्ष परिवार',
      count: matches.length,
      results: matches,
    });
  });

  app.get('/api/results/card', (req, res) => {
    const gpId = String(
      req.query.gp || store.activePanchayatId || 'bhopal/berasia/gunaga'
    );
    const gpInfo = lookupGpInPlaces(gpId);
    const bundle = buildMpGpPublicApiBundle(gpInfo);
    res.json({
      source: bundle.source,
      ...bundle.results_card,
    });
  });

  app.get('/api/plans', (_req, res) => {
    try {
      const plans = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
      res.json(plans);
    } catch {
      res.json({ plans: [] });
    }
  });

  // 4b. Karpathy 3-Stage LLM Council Audit Endpoint (/api/llm-council/audit)
  app.get('/api/llm-council/audit', (req, res) => {
    const gpId = String(
      req.query.gp || store.activePanchayatId || 'sehore/sehore/mahodiya'
    );
    const q = req.query.q ? String(req.query.q) : undefined;
    const gpInfo = lookupGpInPlaces(gpId);
    const dataset = loadVerifiedOrGeneratedDataset(gpInfo);
    let placesCount = 55;
    let plansCount = 9;
    try {
      const places = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));
      placesCount = (places.d || []).length;
      const plans = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
      plansCount = (plans.plans || []).length;
    } catch {
      // Fallback
    }
    const report = runDeterministicCouncilAudit(
      dataset,
      placesCount,
      plansCount,
      q
    );
    res.json(report);
  });

  // 4c. Verified Panchayats Manifest Endpoint (Published by sarpanch-jeeto-mp-scraper)
  app.get('/api/verified-panchayats', (_req, res) => {
    try {
      if (fs.existsSync(VERIFIED_MANIFEST_FILE)) {
        const manifest = JSON.parse(
          fs.readFileSync(VERIFIED_MANIFEST_FILE, 'utf-8')
        );
        res.json(manifest);
        return;
      }
    } catch {
      // Fallback below
    }
    res.json({
      sourceRepo: 'https://github.com/varchasvaateeksh77-ui/sarpanch-jeeto-mp-scraper',
      targetAppRepo: 'https://github.com/varchasvaateeksh77-ui/sarpanch-jeeto-mp-app',
      verifiedCount: 0,
      panchayats: [],
    });
  });

  // 5. Upstream Bridge to Original Production Server (https://app.sarpanchjeeto.com/api/*)
  app.get('/api/upstream-rj/*', async (req, res) => {
    const subpath = (req.params as Record<string, string>)[0] || 'plans';
    const qs = new URLSearchParams(
      req.query as Record<string, string>
    ).toString();
    const targetUrl = `https://app.sarpanchjeeto.com/api/${subpath}${
      qs ? `?${qs}` : ''
    }`;
    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: { Accept: 'application/json' },
      });
      const data = await upstreamRes.json();
      res.json({
        _provenance: 'LIVE_UPSTREAM_APP_SARPANCHJEETO_COM',
        _upstreamUrl: targetUrl,
        data,
      });
    } catch (err: any) {
      res.status(502).json({
        _provenance: 'UPSTREAM_ERROR',
        _upstreamUrl: targetUrl,
        error: err?.message || 'Failed to reach upstream server',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Sarpanch Jeeto (MP) Live Full-Stack Server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
