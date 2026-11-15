import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  LogIn,
  LogOut,
  Radio,
  RotateCcw,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  auth,
  clearFirestoreTestRunsForCurrentUser,
  lockUserToPanchayatInFirestore,
  onAuthStateChanged,
  signInWithGoogleAndInitProfile,
  signOut,
  User,
  UserProfileRecord,
} from './firebase';
import {
  AppRoute,
  CandidateInfo,
  FamilySummary,
  ParchiSettings,
  PhuleraDataset,
  PlanItem,
  SideKey,
  VoterLeaning,
} from './types/sarpanch';
import {
  buildFamilySummaries,
  buildVanshavaliTree,
  computePanchayatDemographics,
  computeVoteTally,
  filterAndSortFamilies,
} from './utils/electionEngine';
import { generateMpPanchayatDataset } from './utils/mpPanchayatGenerator';
import {
  clearAllClientPortalStorage,
  LAST_ACTIVE_PORTAL_GP_KEY,
  loadLocalCampaignOverlay,
  loadPortalPanchayatFromClientStorage,
  saveLocalCampaignOverlay,
  savePortalPanchayatToClientStorage,
  sanitizeEciCaptchaInput,
} from './utils/portalStorageEngine';
import { LandingScreen } from './components/LandingScreen';
import { HomeDashboard } from './components/HomeDashboard';
import { ParivarListScreen } from './components/ParivarListScreen';
import { FamilyDetailScreen } from './components/FamilyDetailScreen';
import { ParchiSlipModal } from './components/ParchiSlipModal';
import { JanenScreen } from './components/JanenScreen';
import { PollDayScreen } from './components/PollDayScreen';
import { TeamScreen } from './components/TeamScreen';
import {
  RawDistrict,
  ResultsAndStartScreen,
} from './components/ResultsAndStartScreen';
import { LiveFeedEventItem, ReaXrayPanel } from './components/ReaXrayPanel';
import {
  ChunavScreen,
  JhalakStepsScreen,
  PickPanchayatScreen,
  PlansCheckoutScreen,
  SeatPickScreen,
  WardPickScreen,
} from './components/ChunavFlowScreens';
import {
  JatiScreen,
  MakanScreen,
  SearchScreen,
} from './components/SearchAndMakanScreens';
import {
  FastTickScreen,
  MoreScreen,
  ParchiSetScreen,
  ReferScreen,
  UmmidwarScreen,
  VanshScreen,
} from './components/MoreAndToolsScreens';
import {
  EscalatedFamiliesScreen,
  KaamScreen,
  MereChunavSheet,
  SupportChatScreen,
  VideoWalkthroughModal,
} from './components/KaamAndChatScreens';

export function App() {
  const [placesData, setPlacesData] = useState<RawDistrict[]>([]);
  const [plansData, setPlansData] = useState<PlanItem[]>([]);
  const [liveSamples, setLiveSamples] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const parseHashRoute = (): AppRoute | null => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) return null;
    if (hash === 'home') return { screen: 'home' };
    if (hash === 'kaam') return { screen: 'kaam' };
    if (hash === 'escalated') return { screen: 'escalated' };
    if (hash === 'chat') return { screen: 'chat' };
    if (hash === 'result') return { screen: 'result' };
    if (hash === 'janen') return { screen: 'janen' };
    if (hash === 'poll-day' || hash === 'poll') return { screen: 'poll' };
    if (hash === 'team') return { screen: 'team' };
    if (hash === 'parivar') return { screen: 'parivar' };
    if (hash === 'parchis') return { screen: 'parchis' };
    if (hash === 'side' || hash.startsWith('side')) {
      return { screen: 'side', side: 'us' };
    }
    if (hash === 'family' || hash.startsWith('family/')) {
      const fid = hash.split('/')[1] || '2_0';
      return { screen: 'family', familyId: fid };
    }
    if (hash === 'chunav') return { screen: 'chunav' };
    if (hash === 'chunav/pick' || hash === 'pick')
      return { screen: 'pick', electionType: 'sarpanch' };
    if (hash === 'wardpick')
      return {
        screen: 'wardpick',
        gpId: 'sehore/sehore/mahodiya',
        gpName: 'महौदिया',
        tehsil: 'सीहोर जनपद',
        district: 'सीहोर (मध्य प्रदेश)',
        voters: 3640,
        villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
      };
    if (hash === 'seats') return { screen: 'seats', kind: 'samiti' };
    if (hash === 'plans')
      return {
        screen: 'plans',
        title: 'गुनगा',
        subtitle: 'सरपंच चुनाव · बैरसिया जनपद, भोपाल',
        gpCount: 1,
        voters: 4420,
      };
    if (hash === 'jhalak')
      return {
        screen: 'jhalak',
        gpId: 'sehore/sehore/mahodiya',
        gpName: 'महौदिया',
        tehsil: 'सीहोर जनपद',
        district: 'सीहोर (मध्य प्रदेश)',
        voters: 3640,
        villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
        step: 1,
      };
    if (hash === 'more') return { screen: 'more' };
    if (hash === 'vansh') return { screen: 'vansh' };
    if (hash === 'search') return { screen: 'search' };
    if (hash === 'makan') return { screen: 'makan' };
    if (hash === 'jati') return { screen: 'jati' };
    if (hash === 'fast' || hash === 'tick') return { screen: 'tick' };
    if (hash === 'parchi-set' || hash === 'parchiset')
      return { screen: 'parchiset' };
    if (hash === 'ummidwar') return { screen: 'ummidwar' };
    if (hash === 'refer') return { screen: 'refer' };
    if (hash === 'start') return { screen: 'start' };
    if (hash === 'landing') return { screen: 'landing' };
    if (hash === 'xray' || hash === 'council') return { screen: 'xray' };
    return null;
  };

  // Navigation Route (Default directly to full-fledged active HomeDashboard)
  const [route, setRoute] = useState<AppRoute>(() => {
    const fromHash = parseHashRoute();
    if (fromHash) return fromHash;
    return { screen: 'home' };
  });

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute();
      if (parsed) {
        setRoute(parsed);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  // Live Server Sync Metadata
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveVersion, setLiveVersion] = useState(1);
  const [liveFeed, setLiveFeed] = useState<LiveFeedEventItem[]>([]);

  // Active Panchayat State (can be switched to any of the 55 MP Districts' GPs)
  const [activePanchayat, setActivePanchayat] = useState<{
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    isDemo: boolean;
    villages: string[];
    boothNames: Record<string, string>;
  }>({
    id: 'sehore/sehore/mahodiya',
    name: 'महौदिया',
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    isDemo: false,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
    boothNames: {},
  });

  // Mutable Campaign State (synchronized with server.ts per Panchayat)
  const [leaningMap, setLeaningMap] = useState<Map<string, VoterLeaning>>(
    () => new Map()
  );
  const [turnoutSet, setTurnoutSet] = useState<Set<string>>(() => new Set());
  const [voterTagsMap, setVoterTagsMap] = useState<Map<string, string[]>>(
    () => new Map()
  );
  const [casteOverrides, setCasteOverrides] = useState<Map<string, string>>(
    () => new Map()
  );
  const [contactOverrides, setContactOverrides] = useState<
    Map<string, { name: string; phone: string }>
  >(() => new Map());
  const [escalatedFamilies, setEscalatedFamilies] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CandidateInfo[]>([]);
  const [teamWorkers, setTeamWorkers] = useState<
    PhuleraDataset['camp']['team']
  >([]);
  const [wardAssignments, setWardAssignments] = useState<
    PhuleraDataset['camp']['wards']
  >([]);
  const [todayActivity, setTodayActivity] = useState<Record<string, number>>({});
  const [pollHideLeaning, setPollHideLeaning] = useState<boolean>(false);

  // Settings candidate editor inputs
  const [editCand1, setEditCand1] = useState('देवेन्द्र सिंह मेवाड़ा');
  const [editCand2, setEditCand2] = useState('महेन्द्र कुमार पाटीदार');
  const [editCand3, setEditCand3] = useState('बाबूलाल वर्मा');

  // Voter Parchi Print & Poster Settings
  const [parchiSettings, setParchiSettings] = useState<ParchiSettings>({
    perPage: 4,
    showPoster: true,
    posterTagline: 'गाँव के विकास और सम्मान के लिए आपका अपना उम्मीदवार',
    symbolText: 'छाता',
  });

  // Modals & Sheets
  const [parchiModalFamilyId, setParchiModalFamilyId] = useState<string | null>(
    null
  );
  const [showMereChunavSheet, setShowMereChunavSheet] = useState(false);
  const [showVideoWalkthrough, setShowVideoWalkthrough] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(
    null
  );
  const [lastInspectedApi, setLastInspectedApi] = useState<{
    url: string;
    payload: unknown;
  } | null>(null);

  // Official ECI Portal CAPTCHA Verification -> LocalStorage Cache State
  const [cachedPortalDataset, setCachedPortalDataset] =
    useState<PhuleraDataset | null>(null);
  const [officialPortalReceipt, setOfficialPortalReceipt] = useState<any | null>(
    null
  );
  const [pendingPortalGp, setPendingPortalGp] = useState<{
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters?: number;
    villages: string[];
  } | null>(null);
  const [portalGpMatch, setPortalGpMatch] = useState<any | null>(null);
  const [portalCaptcha, setPortalCaptcha] = useState<{
    captchaId: string;
    dataUrl: string;
  } | null>(null);
  const [portalCaptchaInput, setPortalCaptchaInput] = useState('');
  const [portalCaptchaLoading, setPortalCaptchaLoading] = useState(false);
  const [portalVerifySubmitting, setPortalVerifySubmitting] = useState(false);
  const [portalCaptchaError, setPortalCaptchaError] = useState('');
  const [portalCaptchaSecondsLeft, setPortalCaptchaSecondsLeft] = useState(180);
  const [portalStorageTier, setPortalStorageTier] = useState<
    'indexeddb+localstorage' | 'localstorage-only' | null
  >(null);

  // 180-second Official ECI CAPTCHA session countdown guard (recommended by LLM Council)
  useEffect(() => {
    if (!pendingPortalGp || !portalCaptcha?.captchaId) return;
    setPortalCaptchaSecondsLeft(180);
    const timer = window.setInterval(() => {
      setPortalCaptchaSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pendingPortalGp, portalCaptcha?.captchaId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      if (!u) {
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleGoogleSignIn = async () => {
    try {
      const { user, profile } = await signInWithGoogleAndInitProfile(
        activePanchayat.id,
        activePanchayat.name
      );
      setCurrentUser(user);
      setUserProfile(profile);
      setShowLoginModal(false);
      triggerToast(
        `Google लॉगिन सफल: ${profile.displayName} (${profile.assignedPanchayatName} में लॉक)`
      );
    } catch (err: any) {
      triggerToast(
        `Google लॉगिन संदेश: ${err?.message || 'पॉपअप अनुमति दें'}`
      );
    }
  };

  const handleClearAllTestRuns = async () => {
    try {
      await clearFirestoreTestRunsForCurrentUser();
    } catch {
      // Ignore if not signed in
    }
    try {
      await clearAllClientPortalStorage();
    } catch {
      // Ignore storage error
    }
    setCachedPortalDataset(null);
    setOfficialPortalReceipt(null);
    setPortalStorageTier(null);
    setPendingPortalGp(null);
    await postLiveMutation({ type: 'clear_all_test_runs' });
    setShowSettingsModal(false);
    triggerToast(
      'सभी टेस्ट रन (IndexedDB + LocalStorage + Firestore + सर्वर) 100% साफ़ कर दिए गए!'
    );
  };

  const applyServerCampaignState = (serverState: any) => {
    if (!serverState) return;
    if (typeof serverState.version === 'number') {
      setLiveVersion(serverState.version);
    }
    if (Array.isArray(serverState.live_feed)) {
      setLiveFeed(serverState.live_feed);
    }
    if (serverState.activePanchayat) {
      setActivePanchayat({
        id: serverState.activePanchayat.id || 'sehore/sehore/mahodiya',
        name: serverState.activePanchayat.name || 'महौदिया',
        tehsil: serverState.activePanchayat.tehsil || 'सीहोर जनपद',
        district: serverState.activePanchayat.district || 'सीहोर (मध्य प्रदेश)',
        voters: Number(serverState.activePanchayat.voters) || 3640,
        isDemo: false,
        villages: serverState.activePanchayat.villages || ['महौदिया'],
        boothNames: serverState.activePanchayat.boothNames || {},
      });
    }

    const lMap = new Map<string, VoterLeaning>();
    for (const l of serverState.leaning || []) {
      lMap.set(l.voter_id, { ...l });
    }
    setLeaningMap(lMap);

    const tSet = new Set<string>();
    for (const t of serverState.turnout || []) {
      if (t.voted) tSet.add(t.voter_id);
    }
    setTurnoutSet(tSet);

    const vtMap = new Map<string, string[]>();
    for (const vt of serverState.voter_tags || []) {
      const existing = vtMap.get(vt.voter_id) || [];
      if (!existing.includes(vt.tag_id)) {
        existing.push(vt.tag_id);
      }
      vtMap.set(vt.voter_id, existing);
    }
    setVoterTagsMap(vtMap);

    const cMap = new Map<string, string>();
    for (const [k, v] of Object.entries(serverState.caste_overrides || {})) {
      cMap.set(k, String(v));
    }
    setCasteOverrides(cMap);

    const ctMap = new Map<string, { name: string; phone: string }>();
    for (const [k, v] of Object.entries(serverState.contact_overrides || {})) {
      const val = v as { name: string; phone: string };
      if (val && val.name) ctMap.set(k, val);
    }
    setContactOverrides(ctMap);

    if (Array.isArray(serverState.escalated_families)) {
      setEscalatedFamilies(serverState.escalated_families);
    }
    if (Array.isArray(serverState.candidates)) {
      setCandidates(serverState.candidates);
      const c1 = serverState.candidates.find((c: any) => c.id === 1);
      const c2 = serverState.candidates.find((c: any) => c.id === 2);
      const c3 = serverState.candidates.find((c: any) => c.id === 3);
      if (c1) setEditCand1(c1.name);
      if (c2) setEditCand2(c2.name);
      if (c3) setEditCand3(c3.name);
    }
    if (Array.isArray(serverState.team)) {
      setTeamWorkers(serverState.team);
    }
    if (Array.isArray(serverState.wards)) {
      setWardAssignments(serverState.wards);
    }
    if (serverState.today) {
      setTodayActivity({ ...serverState.today });
    }
  };

  const hydrateCampaignStateFromDataset = (data: PhuleraDataset) => {
    const lMap = new Map<string, VoterLeaning>();
    for (const l of data.camp.leaning || []) {
      lMap.set(l.voter_id, { ...l });
    }
    setLeaningMap(lMap);

    const tSet = new Set<string>();
    for (const t of data.camp.turnout || []) {
      if (t.voted) tSet.add(t.voter_id);
    }
    setTurnoutSet(tSet);

    const vtMap = new Map<string, string[]>();
    for (const vt of data.camp.voter_tags || []) {
      const existing = vtMap.get(vt.voter_id) || [];
      if (!existing.includes(vt.tag_id)) {
        existing.push(vt.tag_id);
      }
      vtMap.set(vt.voter_id, existing);
    }
    setVoterTagsMap(vtMap);

    setCasteOverrides(new Map());
    setContactOverrides(new Map());
    setEscalatedFamilies([]);
    const cands = [...(data.camp.candidates || [])];
    setCandidates(cands);
    const c1 = cands.find((c) => c.id === 1);
    const c2 = cands.find((c) => c.id === 2);
    const c3 = cands.find((c) => c.id === 3);
    if (c1) setEditCand1(c1.name);
    if (c2) setEditCand2(c2.name);
    if (c3) setEditCand3(c3.name);

    setTeamWorkers([...(data.camp.team || [])]);
    setWardAssignments([...(data.camp.wards || [])]);
    setTodayActivity({ ...(data.today || {}) });
  };

  // Restore any user-made Offline Campaign Overlay mutations (leaning, turnout, tags, phone numbers, castes)
  const hydrateLocalOverlayForGp = async (gpId: string) => {
    try {
      const overlay = await loadLocalCampaignOverlay(gpId);
      if (!overlay) return;
      if (Array.isArray(overlay.leaning) && overlay.leaning.length > 0) {
        const lMap = new Map<string, VoterLeaning>();
        for (const l of overlay.leaning) {
          lMap.set(l.voter_id, { ...l });
        }
        setLeaningMap(lMap);
      }
      if (Array.isArray(overlay.turnout)) {
        setTurnoutSet(new Set(overlay.turnout));
      }
      if (overlay.voterTags && typeof overlay.voterTags === 'object') {
        const vtMap = new Map<string, string[]>();
        for (const [k, v] of Object.entries(overlay.voterTags)) {
          if (Array.isArray(v)) vtMap.set(k, v);
        }
        setVoterTagsMap(vtMap);
      }
      if (overlay.casteOverrides && typeof overlay.casteOverrides === 'object') {
        const cMap = new Map<string, string>();
        for (const [k, v] of Object.entries(overlay.casteOverrides)) {
          cMap.set(k, String(v));
        }
        setCasteOverrides(cMap);
      }
      if (
        overlay.contactOverrides &&
        typeof overlay.contactOverrides === 'object'
      ) {
        const ctMap = new Map<string, { name: string; phone: string }>();
        for (const [k, v] of Object.entries(overlay.contactOverrides)) {
          if (v && v.name) ctMap.set(k, v);
        }
        setContactOverrides(ctMap);
      }
      if (Array.isArray(overlay.escalatedFamilies)) {
        setEscalatedFamilies(overlay.escalatedFamilies);
      }
      if (Array.isArray(overlay.candidates) && overlay.candidates.length > 0) {
        setCandidates(overlay.candidates);
      }
    } catch {
      // Ignore overlay hydration error
    }
  };

  // Automatically persist Offline Campaign Overlay into Dual-Tier IndexedDB + LocalStorage on user edits
  useEffect(() => {
    if (loading || !activePanchayat?.id) return;
    const voterTagsObj: Record<string, string[]> = {};
    for (const [k, v] of voterTagsMap.entries()) {
      voterTagsObj[k] = v;
    }
    const casteObj: Record<string, string> = {};
    for (const [k, v] of casteOverrides.entries()) {
      casteObj[k] = v;
    }
    const contactObj: Record<string, { name: string; phone: string }> = {};
    for (const [k, v] of contactOverrides.entries()) {
      contactObj[k] = v;
    }
    saveLocalCampaignOverlay({
      gpId: activePanchayat.id,
      updatedAt: new Date().toISOString(),
      leaning: Array.from(leaningMap.values()),
      turnout: Array.from(turnoutSet.values()),
      voterTags: voterTagsObj,
      casteOverrides: casteObj,
      contactOverrides: contactObj,
      escalatedFamilies,
      candidates,
    }).catch(() => {});
  }, [
    loading,
    activePanchayat.id,
    leaningMap,
    turnoutSet,
    voterTagsMap,
    casteOverrides,
    contactOverrides,
    escalatedFamilies,
    candidates,
  ]);

  // Send mutation to authoritative Express server (POST /api/write)
  const postLiveMutation = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.state) {
          applyServerCampaignState(json.state);
        }
        setLastInspectedApi({
          url: `POST /api/write (${String(payload.type)})`,
          payload: json,
        });
      }
    } catch {
      // Offline optimistic state remains active
    }
  };

  // Initial Data Load + LocalStorage Priority + Live SSE Subscription
  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;

    (async () => {
      try {
        const [placesRes, plansRes, samplesRes, campRes] = await Promise.all([
          fetch('/demo/places.json'),
          fetch('/demo/plans.json'),
          fetch('/demo/live_samples.json'),
          fetch('/api/campaign').catch(() => null),
        ]);
        const placesJson = placesRes.ok ? await placesRes.json() : { d: [] };
        const plansJson = plansRes.ok ? await plansRes.json() : { plans: [] };
        const samplesJson = samplesRes.ok ? await samplesRes.json() : {};
        const campJson =
          campRes && campRes.ok ? await campRes.json() : null;

        if (!cancelled) {
          setPlacesData(placesJson.d || []);
          setPlansData(plansJson.plans || []);
          setLiveSamples(samplesJson || {});

          // Check if the user has already verified & saved their Gram Panchayat in Dual-Tier Client Storage (IndexedDB + LocalStorage)
          let loadedFromLocal = false;
          try {
            const lastGpRaw = window.localStorage.getItem(
              LAST_ACTIVE_PORTAL_GP_KEY
            );
            if (lastGpRaw) {
              const lastGp = JSON.parse(lastGpRaw);
              const cachedBundle = await loadPortalPanchayatFromClientStorage(
                lastGp.id
              );
              if (cachedBundle?.dataset?.roll) {
                const ds = cachedBundle.dataset as PhuleraDataset;
                const vCount = ds.roll.people.filter(
                  (p) => p.v === 1 && p.act === 1
                ).length;
                setCachedPortalDataset(ds);
                setOfficialPortalReceipt(
                  cachedBundle.officialPortalReceipt || null
                );
                setPortalStorageTier('indexeddb+localstorage');
                setActivePanchayat({
                  id: lastGp.id,
                  name: lastGp.name,
                  tehsil: lastGp.tehsil,
                  district: lastGp.district,
                  voters: vCount,
                  isDemo: false,
                  villages: lastGp.villages || [lastGp.name],
                  boothNames: {},
                });
                hydrateCampaignStateFromDataset(ds);
                await hydrateLocalOverlayForGp(lastGp.id);
                loadedFromLocal = true;
              }
            }
          } catch {
            // Ignore client storage parse error
          }

          if (!loadedFromLocal) {
            if (campJson?.state) {
              applyServerCampaignState(campJson.state);
              setLiveConnected(true);
            } else {
              const initialDataset = generateMpPanchayatDataset({
                id: 'sehore/sehore/mahodiya',
                name: 'महौदिया',
                tehsil: 'सीहोर जनपद',
                district: 'सीहोर (मध्य प्रदेश)',
                voters: 3640,
                villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
                isDemo: false,
              });
              hydrateCampaignStateFromDataset(initialDataset);
            }
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || 'डेटा लोड करने में त्रुटि हुई।');
          setLoading(false);
        }
      }
    })();

    // Connect real-time SSE stream
    try {
      eventSource = new EventSource('/api/live-stream');
      eventSource.onopen = () => {
        if (!cancelled) setLiveConnected(true);
      };
      eventSource.onmessage = (e) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.state) {
            applyServerCampaignState(msg.state);
            setLiveConnected(true);
          }
        } catch {
          // Ignore malformed message
        }
      };
      eventSource.onerror = () => {
        if (!cancelled) setLiveConnected(false);
      };
    } catch {
      // SSE unsupported fallback
    }

    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Effective Panchayat Dataset: prioritizes official ECI CAPTCHA-verified dataset stored in client localStorage
  const effectivePhuleraData: PhuleraDataset = useMemo(() => {
    const baseDataset =
      cachedPortalDataset &&
      cachedPortalDataset.roll?.name === activePanchayat.name
        ? cachedPortalDataset
        : generateMpPanchayatDataset({
            id: activePanchayat.id,
            name: activePanchayat.name,
            tehsil: activePanchayat.tehsil,
            district: activePanchayat.district,
            voters: activePanchayat.voters,
            villages: activePanchayat.villages,
            isDemo: false,
          });
    return {
      ...baseDataset,
      camp: {
        ...baseDataset.camp,
        candidates:
          candidates.length > 0 ? candidates : baseDataset.camp.candidates,
      },
    };
  }, [activePanchayat, candidates, cachedPortalDataset]);

  // Computed Vote Tally
  const tally = useMemo(() => {
    return computeVoteTally(effectivePhuleraData.roll.people, leaningMap);
  }, [effectivePhuleraData, leaningMap]);

  // Computed Family Summaries
  const families = useMemo(() => {
    return buildFamilySummaries(
      effectivePhuleraData,
      leaningMap,
      turnoutSet,
      voterTagsMap,
      casteOverrides,
      contactOverrides
    );
  }, [
    effectivePhuleraData,
    leaningMap,
    turnoutSet,
    voterTagsMap,
    casteOverrides,
    contactOverrides,
  ]);

  const sortedFamiliesBySize = useMemo(
    () => filterAndSortFamilies(families, { sortBy: 'size_desc' }),
    [families]
  );

  const demographics = useMemo(() => {
    return computePanchayatDemographics(effectivePhuleraData);
  }, [effectivePhuleraData]);

  // Active family for FamilyDetailScreen and REA X-Ray debugger
  const activeFamily: FamilySummary | undefined = useMemo(() => {
    if (route.screen === 'family') {
      return (
        families.find((f) => f.id === route.familyId) || sortedFamiliesBySize[0]
      );
    }
    return sortedFamiliesBySize[0];
  }, [route, families, sortedFamiliesBySize]);

  const activeFamilyTree = useMemo(() => {
    if (!activeFamily) return [];
    return buildVanshavaliTree(
      activeFamily.id,
      effectivePhuleraData,
      leaningMap,
      turnoutSet,
      voterTagsMap
    );
  }, [effectivePhuleraData, activeFamily, leaningMap, turnoutSet, voterTagsMap]);

  const parchiModalFamily = useMemo(() => {
    if (!parchiModalFamilyId) return null;
    return families.find((f) => f.id === parchiModalFamilyId) || null;
  }, [parchiModalFamilyId, families]);

  const myCandidateName = useMemo(() => {
    const me = candidates.find((c) => c.is_me || c.id === 1);
    return (
      me?.name ||
      effectivePhuleraData.camp.candidates[0]?.name ||
      'सरपंच उम्मीदवार'
    );
  }, [candidates, effectivePhuleraData]);

  // State Mutation Handlers (Optimistic + Live Server Persistence)
  const handleUpdateVoterLeaning = (voterId: string, side: SideKey) => {
    const person = effectivePhuleraData?.roll.people.find(
      (p) => p.id === voterId
    );
    setLeaningMap((prev) => {
      const next = new Map(prev);
      if (side === 'not_asked') {
        next.delete(voterId);
      } else if (side === 'us') {
        next.set(voterId, {
          voter_id: voterId,
          state: 'candidate',
          candidate_id: 1,
          strength: 'pakka',
        });
      } else if (side === 'c2' || side === 'them') {
        next.set(voterId, {
          voter_id: voterId,
          state: 'candidate',
          candidate_id: 2,
          strength: 'pakka',
        });
      } else if (side === 'c3') {
        next.set(voterId, {
          voter_id: voterId,
          state: 'candidate',
          candidate_id: 3,
          strength: 'pakka',
        });
      } else if (side === 'undecided') {
        next.set(voterId, {
          voter_id: voterId,
          state: 'undecided',
        });
      } else if (side === 'no_vote') {
        next.set(voterId, {
          voter_id: voterId,
          state: 'no_vote',
        });
      }
      return next;
    });
    postLiveMutation({
      type: 'leaning',
      voter_id: voterId,
      voter_name: person?.n || voterId,
      side,
    });
    triggerToast('वोटर का हिसाब सर्वर पर लाइव अपडेट हो गया');
  };

  const handleUpdateAllFamilyLeaning = (familyId: string, side: SideKey) => {
    const fam = families.find((f) => f.id === familyId);
    if (!fam) return;
    const voterIds = fam.voters.map((v) => v.id);
    setLeaningMap((prev) => {
      const next = new Map(prev);
      for (const v of fam.voters) {
        if (side === 'not_asked') {
          next.delete(v.id);
        } else if (side === 'us') {
          next.set(v.id, {
            voter_id: v.id,
            state: 'candidate',
            candidate_id: 1,
            strength: 'pakka',
          });
        } else if (side === 'c2' || side === 'them') {
          next.set(v.id, {
            voter_id: v.id,
            state: 'candidate',
            candidate_id: 2,
            strength: 'pakka',
          });
        } else if (side === 'c3') {
          next.set(v.id, {
            voter_id: v.id,
            state: 'candidate',
            candidate_id: 3,
            strength: 'pakka',
          });
        } else if (side === 'undecided') {
          next.set(v.id, {
            voter_id: v.id,
            state: 'undecided',
          });
        } else if (side === 'no_vote') {
          next.set(v.id, {
            voter_id: v.id,
            state: 'no_vote',
          });
        }
      }
      return next;
    });
    postLiveMutation({
      type: 'batch_leaning',
      family_id: familyId,
      family_title: fam.displayTitle,
      voter_ids: voterIds,
      side,
    });
    triggerToast(
      `${fam.displayTitle} के सभी ${fam.totalVoters} वोट लाइव अपडेट किए गए`
    );
  };

  const handleToggleVoterTag = (voterId: string, tagId: string) => {
    setVoterTagsMap((prev) => {
      const next = new Map(prev);
      const curr = next.get(voterId) || [];
      if (curr.includes(tagId)) {
        next.set(
          voterId,
          curr.filter((x) => x !== tagId)
        );
      } else {
        next.set(voterId, [...curr, tagId]);
      }
      return next;
    });
    postLiveMutation({
      type: 'voter_tag',
      voter_id: voterId,
      tag_id: tagId,
    });
  };

  const handleToggleVoterTurnout = (voterId: string, voterName?: string) => {
    let nextVoted = true;
    setTurnoutSet((prev) => {
      const next = new Set(prev);
      if (next.has(voterId)) {
        next.delete(voterId);
        nextVoted = false;
      } else {
        next.add(voterId);
        nextVoted = true;
      }
      return next;
    });
    postLiveMutation({
      type: 'turnout',
      voter_id: voterId,
      voter_name: voterName || voterId,
      voted: nextVoted,
    });
  };

  const handleUpdateFamilyCaste = (familyId: string, newCaste: string) => {
    const fam = families.find((f) => f.id === familyId);
    setCasteOverrides((prev) => {
      const next = new Map(prev);
      next.set(familyId, newCaste);
      return next;
    });
    postLiveMutation({
      type: 'caste_fix',
      family_id: familyId,
      family_title: fam?.displayTitle || familyId,
      caste: newCaste,
    });
    triggerToast(`परिवार की जाति '${newCaste}' सेव की गई`);
  };

  const handleUpdateFamilyContact = (
    familyId: string,
    name: string,
    phone: string
  ) => {
    setContactOverrides((prev) => {
      const next = new Map(prev);
      next.set(familyId, { name, phone });
      return next;
    });
    postLiveMutation({
      type: 'family_contact',
      family_id: familyId,
      name,
      phone,
    });
    triggerToast('मुखिया का संपर्क लाइव सर्वर पर सेव किया गया');
  };

  const handleToggleEscalateFamily = (familyId: string) => {
    const fam = families.find((f) => f.id === familyId);
    setEscalatedFamilies((prev) =>
      prev.includes(familyId)
        ? prev.filter((id) => id !== familyId)
        : [...prev, familyId]
    );
    postLiveMutation({
      type: 'escalate_family',
      family_id: familyId,
      family_title: fam?.displayTitle || familyId,
    });
    triggerToast(
      escalatedFamilies.includes(familyId)
        ? 'उम्मीदवार कॉल लिस्ट से हटाया गया'
        : 'उम्मीदवार की आज की कॉल लिस्ट में जोड़ा गया'
    );
  };

  const handleAddWorker = (name: string, assignedWards: number[]) => {
    const newId = 9010 + teamWorkers.length;
    setTeamWorkers((prev) => [
      ...prev,
      {
        account_id: newId,
        name,
        role: 'worker',
        active: true,
        removed_at: null,
      },
    ]);
    setWardAssignments((prev) => [
      ...prev,
      ...assignedWards.map((w) => ({
        account_id: newId,
        ward: w,
        active: true,
      })),
    ]);
    setTodayActivity((prev) => ({ ...prev, [name]: 1 }));
    postLiveMutation({
      type: 'add_worker',
      name,
      wards: assignedWards,
    });
    triggerToast(`कार्यकर्ता '${name}' को टीम में जोड़ा गया`);
  };

  const handleToggleWorkerWard = (accountId: number, ward: number) => {
    setWardAssignments((prev) => {
      const exists = prev.find(
        (w) => w.account_id === accountId && w.ward === ward
      );
      if (exists) {
        return prev.map((w) =>
          w.account_id === accountId && w.ward === ward
            ? { ...w, active: !w.active }
            : w
        );
      }
      return [...prev, { account_id: accountId, ward, active: true }];
    });
    postLiveMutation({
      type: 'toggle_worker_ward',
      account_id: accountId,
      ward,
    });
  };

  const handleSaveCandidates = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CandidateInfo[] = [
      {
        id: 1,
        name: editCand1.trim() || 'पक्ष उम्मीदवार',
        colour: '#16a34a',
        is_me: true,
        sort_order: 1,
        status: 'confirmed',
      },
      {
        id: 2,
        name: editCand2.trim() || 'विपक्ष उम्मीदवार 1',
        colour: '#dc2626',
        is_me: false,
        sort_order: 2,
        status: 'confirmed',
      },
      {
        id: 3,
        name: editCand3.trim() || 'विपक्ष उम्मीदवार 2',
        colour: '#7c3aed',
        is_me: false,
        sort_order: 3,
        status: 'confirmed',
      },
    ];
    setCandidates(updated);
    postLiveMutation({
      type: 'update_candidates',
      candidates: updated,
    });
    setShowSettingsModal(false);
    triggerToast('उम्मीदवारों के नाम पूरे ऐप व सर्वर पर अपडेट हो गए');
  };

  const handleSaveCandidatesList = (updated: CandidateInfo[]) => {
    const validIds = new Set(updated.map((c) => c.id));
    setLeaningMap((prev) => {
      const next = new Map(prev);
      for (const [vid, l] of next.entries()) {
        if (
          l.state === 'candidate' &&
          l.candidate_id &&
          !validIds.has(l.candidate_id)
        ) {
          next.set(vid, { voter_id: vid, state: 'undecided' });
        }
      }
      return next;
    });
    setCandidates(updated);
    const c1 = updated.find((c) => c.id === 1);
    const c2 = updated.find((c) => c.id === 2);
    const c3 = updated.find((c) => c.id === 3);
    if (c1) setEditCand1(c1.name);
    if (c2) setEditCand2(c2.name);
    if (c3) setEditCand3(c3.name);
    postLiveMutation({
      type: 'update_candidates',
      candidates: updated,
    });
    triggerToast('उम्मीदवार सूची और वोट समीकरण सर्वर पर अपडेट हो गए');
  };

  const openPortalCaptchaModalForGp = async (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters?: number;
    villages: string[];
  }) => {
    setPendingPortalGp(gp);
    setPortalCaptchaInput('');
    setPortalCaptchaError('');
    setPortalCaptchaLoading(true);
    try {
      const qs = new URLSearchParams({
        gpId: gp.id,
        name: gp.name,
        district: gp.district,
      }).toString();
      const r = await fetch(`/api/eci/gp-portal-init?${qs}`);
      const j = await r.json();
      if (j?.gpMatch) {
        setPortalGpMatch(j.gpMatch);
      }
      if (j?.captcha?.dataUrl) {
        setPortalCaptcha(j.captcha);
      } else {
        setPortalCaptchaError(
          j?.error || 'ECI पोर्टल से CAPTCHA लोड नहीं हो सका। पुनः प्रयास करें।'
        );
      }
    } catch {
      setPortalCaptchaError('ECI गेटवे से संपर्क करने में समस्या आई।');
    } finally {
      setPortalCaptchaLoading(false);
    }
  };

  const refreshPortalCaptchaOnly = async () => {
    setPortalCaptchaLoading(true);
    setPortalCaptchaError('');
    try {
      const r = await fetch('/api/eci/live-captcha');
      const j = await r.json();
      if (j?.ok && j.dataUrl) {
        setPortalCaptcha({ captchaId: j.captchaId, dataUrl: j.dataUrl });
        setPortalCaptchaInput('');
      } else {
        setPortalCaptchaError('नया CAPTCHA लोड नहीं हो सका।');
      }
    } catch {
      setPortalCaptchaError('CAPTCHA रिफ्रेश करने में त्रुटि।');
    } finally {
      setPortalCaptchaLoading(false);
    }
  };

  const finalizeActivatePanchayatWithDataset = (
    gp: {
      id: string;
      name: string;
      tehsil: string;
      district: string;
      voters?: number;
      villages: string[];
    },
    dataset: PhuleraDataset,
    receipt: any | null
  ) => {
    const nextVotersCount = dataset.roll.people.filter(
      (p) => p.v === 1 && p.act === 1
    ).length;

    const boothNames: Record<string, string> = {};
    for (const [k, v] of Object.entries(dataset.roll.booth_names || {})) {
      boothNames[k] = (v as { name: string }).name;
    }

    setCachedPortalDataset(dataset);
    setOfficialPortalReceipt(receipt);
    setActivePanchayat({
      id: gp.id,
      name: gp.name,
      tehsil: gp.tehsil,
      district: gp.district,
      voters: nextVotersCount,
      isDemo: false,
      villages: gp.villages,
      boothNames,
    });
    hydrateCampaignStateFromDataset(dataset);

    postLiveMutation({
      type: 'switch_panchayat',
      ...gp,
      voters: nextVotersCount,
    });
    if (currentUser) {
      lockUserToPanchayatInFirestore(currentUser.uid, gp.id, gp.name).catch(
        () => {}
      );
    }
    setShowMereChunavSheet(false);
    setRoute({ screen: 'home' });
  };

  const handlePlayAudioCaptcha = () => {
    if (!portalCaptcha?.captchaId) return;
    try {
      const audio = new Audio(
        `/api/eci/live-voice-captcha/${encodeURIComponent(
          portalCaptcha.captchaId
        )}`
      );
      audio.play().catch(() => {
        triggerToast('ऑडियो CAPTCHA चलाने के लिए स्पीकर अनुमति दें');
      });
    } catch {
      triggerToast('ऑडियो CAPTCHA उपलब्ध नहीं है');
    }
  };

  const handlePortalCaptchaVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPortalGp || !portalCaptcha) return;
    const captchaCheck = sanitizeEciCaptchaInput(portalCaptchaInput);
    if (!captchaCheck.valid) {
      setPortalCaptchaError(
        captchaCheck.reason ||
          'कृपया छवि में दिख रहा 6-अक्षर का CAPTCHA दर्ज करें।'
      );
      return;
    }

    setPortalVerifySubmitting(true);
    setPortalCaptchaError('');
    try {
      const r = await fetch('/api/eci/verify-and-fetch-gp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gp: pendingPortalGp,
          eciTarget: portalGpMatch,
          captcha: captchaCheck.cleaned,
          captchaId: portalCaptcha.captchaId,
        }),
      });
      const j = await r.json();

      if (!r.ok || !j?.ok) {
        setPortalCaptchaError(
          j?.message ||
            'ECI पोर्टल ने CAPTCHA अमान्य बताया (Invalid Captcha)। कृपया नया CAPTCHA भरें।'
        );
        if (j?.newCaptcha?.dataUrl) {
          setPortalCaptcha(j.newCaptcha);
          setPortalCaptchaInput('');
        } else {
          await refreshPortalCaptchaOnly();
        }
        return;
      }

      const dataset = j.dataset as PhuleraDataset;
      const receipt = j.officialPortalReceipt;

      // Save permanently into Dual-Tier Client Storage (IndexedDB + LocalStorage Receipt Index)
      const savedBundle = await savePortalPanchayatToClientStorage(
        pendingPortalGp,
        dataset,
        receipt
      );
      setPortalStorageTier('indexeddb+localstorage');

      const gpDone = pendingPortalGp;
      setPendingPortalGp(null);
      finalizeActivatePanchayatWithDataset(
        gpDone,
        dataset,
        savedBundle.officialPortalReceipt
      );
      await hydrateLocalOverlayForGp(gpDone.id);
      triggerToast(
        `✓ ECI CAPTCHA सत्यापित (Checksum: ${savedBundle.officialPortalReceipt.datasetChecksum}) · '${gpDone.name}' आपके फोन के Dual-Tier Client Storage (IndexedDB + LocalStorage) में स्थायी रूप से सेव हो गया!`
      );
    } catch {
      setPortalCaptchaError(
        'ECI आधिकारिक पोर्टल से डेटा प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
      );
    } finally {
      setPortalVerifySubmitting(false);
    }
  };

  const handleActivatePanchayat = async (
    gp: {
      id: string;
      name: string;
      tehsil: string;
      district: string;
      voters?: number;
      villages: string[];
    },
    forceCaptcha = false
  ) => {
    // 1. Check if this Gram Panchayat is ALREADY verified & saved in Dual-Tier Client Storage (IndexedDB + LocalStorage)
    if (!forceCaptcha) {
      try {
        const cachedBundle = await loadPortalPanchayatFromClientStorage(gp.id);
        if (cachedBundle?.dataset?.roll) {
          try {
            window.localStorage.setItem(
              LAST_ACTIVE_PORTAL_GP_KEY,
              JSON.stringify(gp)
            );
          } catch {
            // Ignore quota warning
          }
          setPortalStorageTier('indexeddb+localstorage');
          finalizeActivatePanchayatWithDataset(
            gp,
            cachedBundle.dataset as PhuleraDataset,
            cachedBundle.officialPortalReceipt || null
          );
          await hydrateLocalOverlayForGp(gp.id);
          triggerToast(
            `✓ '${gp.name}' का डेटा आपके फोन के Client Storage (Checksum: ${
              cachedBundle.officialPortalReceipt?.datasetChecksum || 'verified'
            }) से तुरंत लोड हो गया — दोबारा CAPTCHA नहीं चाहिए!`
          );
          return;
        }
      } catch {
        // Proceed to CAPTCHA verification modal
      }
    }

    // 2. Not in Client Storage yet -> Open Official ECI CAPTCHA Verification Modal
    setShowMereChunavSheet(false);
    openPortalCaptchaModalForGp(gp);
  };

  const handleSimulateWorkerTick = () => {
    postLiveMutation({
      type: 'simulate_worker_tick',
    });
    triggerToast('बूथ कार्यकर्ता से लाइव अपडेट आया (+1 पक्ष वोट व +1 बूथ टिक)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E40AF] text-white flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-[#FBBF24] flex items-center justify-center mb-4 font-extrabold text-[#1E3A8A] text-3xl">
          स
        </div>
        <h1 className="text-2xl font-extrabold">सरपंच जीतो · मध्य प्रदेश</h1>
        <p className="text-sm text-blue-200 mt-1">
          म.प्र. के 55 ज़िलों का लाइव सर्वर डेटा लोड हो रहा है...
        </p>
      </div>
    );
  }

  if (loadError || !effectivePhuleraData || !demographics || !activeFamily) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center border border-slate-200 space-y-3">
          <h1 className="text-lg font-extrabold text-red-600">
            डेटा लोड करने में समस्या
          </h1>
          <p className="text-xs text-slate-600">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
          >
            पुनः प्रयास करें
          </button>
        </div>
      </div>
    );
  }

  const quickSwitchPanchayats = [
    {
      id: 'sehore/sehore/mahodiya',
      name: 'महौदिया',
      label: 'महौदिया (सीहोर · 3,640)',
      tehsil: 'सीहोर जनपद',
      district: 'सीहोर (मध्य प्रदेश)',
      voters: 3640,
      villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
    },
    {
      id: 'bhopal/berasia/gunaga',
      name: 'गुनगा',
      label: 'गुनगा (बैरसिया · 4,420)',
      tehsil: 'बैरसिया जनपद',
      district: 'भोपाल (मध्य प्रदेश)',
      voters: 4420,
      villages: ['गुनगा', 'रतुआ', 'हर्राखेड़ा'],
    },
    {
      id: 'bhopal/phanda/ratibad',
      name: 'रातीबड़',
      label: 'रातीबड़ (भोपाल · 4,650)',
      tehsil: 'फंदा जनपद',
      district: 'भोपाल (मध्य प्रदेश)',
      voters: 4650,
      villages: ['रातीबड़', 'नीलबड़', 'सूरज नगर'],
    },
    {
      id: 'indore/sanwer/kshipra',
      name: 'क्षिप्रा',
      label: 'क्षिप्रा (इंदौर · 5,240)',
      tehsil: 'सांवेर जनपद',
      district: 'इंदौर (मध्य प्रदेश)',
      voters: 5240,
      villages: ['क्षिप्रा', 'डकाच्या', 'पीरकराड़िया'],
    },
    {
      id: 'sehore/ashta/amlaha',
      name: 'अमलाहा',
      label: 'अमलाहा (आष्टा · 3,760)',
      tehsil: 'आष्टा जनपद',
      district: 'सीहोर (मध्य प्रदेश)',
      voters: 3760,
      villages: ['अमलाहा', 'धामंदा'],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2F6] text-slate-900">
      {/* Desktop-Only Top Companion Bar (hidden on mobile so mobile is 100% full-bleed Sarpanch Jeeto app) */}
      <header className="hidden lg:flex sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 items-center justify-between gap-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setRoute({ screen: 'landing' });
          }}
          className="text-lg font-extrabold tracking-tight text-[#1E3A8A] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>सरपंच जीतो · म.प्र.</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold ${
              liveConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Radio className="w-2.5 h-2.5 text-emerald-600" />
            <span>LIVE</span>
          </span>
        </a>

        <nav
          aria-label="मुख्य नेविगेशन"
          className="flex items-center gap-6 text-sm font-bold text-slate-600"
        >
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ screen: 'home' });
            }}
            className={`hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 ${
              route.screen === 'home'
                ? 'text-[#1D4ED8] underline underline-offset-4'
                : ''
            }`}
          >
            {effectivePhuleraData.roll.name} डैशबोर्ड
          </a>
          <a
            href="#kaam"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ screen: 'kaam' });
            }}
            className={`hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 ${
              route.screen === 'kaam' || route.screen === 'escalated'
                ? 'text-[#1D4ED8] underline underline-offset-4'
                : ''
            }`}
          >
            आज का काम
          </a>
          <a
            href="#parivar"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ screen: 'parivar' });
            }}
            className={`hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 ${
              route.screen === 'parivar' || route.screen === 'family'
                ? 'text-[#1D4ED8] underline underline-offset-4'
                : ''
            }`}
          >
            वंशावली लिस्ट
          </a>
          <a
            href="#result"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ screen: 'result' });
            }}
            className={`hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 ${
              route.screen === 'result'
                ? 'text-[#1D4ED8] underline underline-offset-4'
                : ''
            }`}
          >
            चुनाव रिज़ल्ट (55 ज़िले)
          </a>
          <a
            href="#xray"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ screen: 'xray' });
            }}
            className={`hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 ${
              route.screen === 'xray'
                ? 'text-[#1D4ED8] underline underline-offset-4'
                : ''
            }`}
          >
            REA X-Ray
          </a>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="/releases/SarpanchJeeto-MP-v1.0.apk"
            download="SarpanchJeeto-MP-v1.0.apk"
            className="px-3 py-2 text-xs font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>APK डाउनलोड</span>
          </a>
          <button
            type="button"
            onClick={handleClearAllTestRuns}
            className="px-3 py-2 text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>टेस्ट साफ़ करें</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMereChunavSheet(true)}
            className="px-3 py-2 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            मेरे चुनाव ({effectivePhuleraData.roll.name}) ⌄
          </button>
          {currentUser ? (
            <button
              type="button"
              onClick={() => {
                signOut(auth).catch(() => {});
                triggerToast('लॉगआउट हो गया');
              }}
              className="px-3 py-2 text-xs font-extrabold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {userProfile?.displayName ||
                  currentUser.displayName ||
                  currentUser.email}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-[#1D4ED8] rounded-xl hover:bg-[#1E40AF] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google लॉगिन</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-0 lg:px-6 py-0 lg:py-6">
        {route.screen === 'xray' ? (
          <div className="px-3 sm:px-0 py-3">
            <ReaXrayPanel
              currentRoute={route}
              activeFamily={activeFamily}
              phuleraData={effectivePhuleraData}
              liveSamples={liveSamples}
              liveConnected={liveConnected}
              liveVersion={liveVersion}
              liveFeed={liveFeed}
              lastInspectedApi={lastInspectedApi}
              onSimulateWorkerTick={handleSimulateWorkerTick}
              onNavigate={(r) => setRoute(r)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Authentic Mobile-First Sarpanch Jeeto Replica Viewport */}
            <div className="lg:col-span-5 w-full max-w-[440px] mx-auto lg:mx-0 lg:rounded-3xl lg:overflow-hidden lg:border lg:border-slate-300 bg-[#F1F5F9]">
              {route.screen !== 'landing' && (
                <div
                  className={`px-3.5 py-2 text-[11px] font-extrabold flex items-center justify-between gap-2 border-b ${
                    officialPortalReceipt
                      ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                      : 'bg-amber-950 text-amber-100 border-amber-800'
                  }`}
                >
                  {officialPortalReceipt ? (
                    <div className="truncate">
                      ✓ ECI सत्यापित ·{' '}
                      {portalStorageTier === 'indexeddb+localstorage'
                        ? 'IndexedDB + LocalStorage'
                        : 'Client Storage'}{' '}
                      (बूथ #{officialPortalReceipt.partNumber}{' '}
                      {officialPortalReceipt.partName} · ID:{' '}
                      {String(officialPortalReceipt.officialFileId || '').slice(
                        0,
                        8
                      )}
                      )
                    </div>
                  ) : (
                    <div className="truncate">
                      ⚡ &apos;{activePanchayat.name}&apos; को ECI CAPTCHA से
                      Client Storage (IndexedDB) में सेव करें
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleActivatePanchayat(activePanchayat, true)
                    }
                    className="shrink-0 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white text-[10px] font-extrabold cursor-pointer"
                  >
                    {officialPortalReceipt ? 'दोबारा सिंक ↻' : 'CAPTCHA भरें →'}
                  </button>
                </div>
              )}

              {route.screen === 'landing' && (
                <LandingScreen
                  onStartDemo={() => setRoute({ screen: 'home' })}
                  onOpenLogin={() => setShowLoginModal(true)}
                />
              )}

              {route.screen === 'home' && (
                <HomeDashboard
                  panchayatName={effectivePhuleraData.roll.name}
                  tehsilName={effectivePhuleraData.roll.tehsil}
                  districtName={effectivePhuleraData.roll.district}
                  isDemo={effectivePhuleraData.roll.demo}
                  tally={tally}
                  candidates={effectivePhuleraData.camp.candidates}
                  totalFamilies={families.length}
                  totalWards={effectivePhuleraData.roll.wards.length}
                  topFamilies={sortedFamiliesBySize.slice(0, 3)}
                  allFamilies={families}
                  allVoters={effectivePhuleraData.roll.people}
                  leaningMap={leaningMap}
                  liveConnected={liveConnected}
                  liveVersion={liveVersion}
                  lastLiveEventText={liveFeed[0]?.detail || null}
                  onSimulateWorkerTick={handleSimulateWorkerTick}
                  onNavigate={(r) => setRoute(r)}
                  onUpdateVoterLeaning={handleUpdateVoterLeaning}
                  onOpenFamilyParchi={(fam) => setParchiModalFamilyId(fam.id)}
                  onShareWhatsApp={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard
                        .writeText(window.location.href)
                        .catch(() => {});
                    }
                    triggerToast('ऐप लिंक कॉपी हो गया! WhatsApp पर भेजें');
                  }}
                  onOpenSettings={() => setRoute({ screen: 'more' })}
                  onOpenMereChunav={() => setShowMereChunavSheet(true)}
                  onOpenVideoWalkthrough={() => setShowVideoWalkthrough(true)}
                  onInstallApp={() =>
                    triggerToast(
                      'सरपंच जीतो ऐप आपके होम स्क्रीन के लिए तैयार है!'
                    )
                  }
                  onToast={triggerToast}
                />
              )}

              {route.screen === 'kaam' && (
                <KaamScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  families={families}
                  tally={tally}
                  escalatedIds={escalatedFamilies}
                  onBack={() => setRoute({ screen: 'home' })}
                  onNavigate={(r) => setRoute(r)}
                  onOpenMereChunav={() => setShowMereChunavSheet(true)}
                />
              )}

              {route.screen === 'escalated' && (
                <EscalatedFamiliesScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  families={sortedFamiliesBySize}
                  escalatedIds={escalatedFamilies}
                  teamWorkerNames={teamWorkers.map((w) => w.name)}
                  onBack={() => setRoute({ screen: 'kaam' })}
                  onSelectFamily={(fid) =>
                    setRoute({ screen: 'family', familyId: fid })
                  }
                  onOpenMereChunav={() => setShowMereChunavSheet(true)}
                />
              )}

              {route.screen === 'chat' && (
                <SupportChatScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  onBack={() => setRoute({ screen: 'more' })}
                />
              )}

              {(route.screen === 'parivar' ||
                route.screen === 'parchis' ||
                route.screen === 'side') && (
                <ParivarListScreen
                  mode={route.screen}
                  initialWard={
                    route.screen === 'parivar' || route.screen === 'parchis'
                      ? route.ward
                      : null
                  }
                  initialTag={route.screen === 'parivar' ? route.tag : null}
                  activeSide={route.screen === 'side' ? route.side : 'us'}
                  fromKaam={route.screen === 'side' ? route.fromKaam : false}
                  panchayatName={effectivePhuleraData.roll.name}
                  wards={effectivePhuleraData.roll.wards}
                  tags={effectivePhuleraData.camp.tags}
                  candidates={effectivePhuleraData.camp.candidates}
                  escalatedFamilies={escalatedFamilies}
                  families={families}
                  tally={tally}
                  onBack={() =>
                    route.screen === 'side' && route.fromKaam
                      ? setRoute({ screen: 'kaam' })
                      : setRoute({ screen: 'home' })
                  }
                  onSelectFamily={(fid) =>
                    setRoute({ screen: 'family', familyId: fid })
                  }
                  onOpenFamilyParchi={(fam) => setParchiModalFamilyId(fam.id)}
                  onChangeSideTab={(newSide) =>
                    setRoute({ screen: 'side', side: newSide })
                  }
                  onNavigate={(r) => setRoute(r)}
                  onToast={triggerToast}
                />
              )}

              {route.screen === 'family' && (
                <FamilyDetailScreen
                  family={activeFamily}
                  treeRoots={activeFamilyTree}
                  castes={effectivePhuleraData.roll.castes}
                  candidates={effectivePhuleraData.camp.candidates}
                  tags={effectivePhuleraData.camp.tags}
                  voterTagsMap={voterTagsMap}
                  isEscalated={escalatedFamilies.includes(activeFamily.id)}
                  onBack={() => setRoute({ screen: 'parivar' })}
                  onNextFamily={() => {
                    const idx = sortedFamiliesBySize.findIndex(
                      (f) => f.id === activeFamily.id
                    );
                    const nextFam =
                      sortedFamiliesBySize[
                        (idx + 1) % sortedFamiliesBySize.length
                      ];
                    if (nextFam) {
                      setRoute({ screen: 'family', familyId: nextFam.id });
                    }
                  }}
                  onOpenParchi={() => setParchiModalFamilyId(activeFamily.id)}
                  onUpdateFamilyCaste={handleUpdateFamilyCaste}
                  onUpdateFamilyContact={handleUpdateFamilyContact}
                  onUpdateVoterLeaning={handleUpdateVoterLeaning}
                  onUpdateAllFamilyLeaning={handleUpdateAllFamilyLeaning}
                  onToggleVoterTag={handleToggleVoterTag}
                  onToggleEscalateFamily={handleToggleEscalateFamily}
                />
              )}

              {route.screen === 'janen' && (
                <JanenScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  demographics={demographics}
                  onBack={() => setRoute({ screen: 'home' })}
                  onSelectWard={(w) =>
                    setRoute({ screen: 'parivar', ward: w })
                  }
                  onOpenMereChunav={() => setShowMereChunavSheet(true)}
                />
              )}

              {route.screen === 'poll' && (
                <PollDayScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  myCandidateName={myCandidateName}
                  parchiSettings={parchiSettings}
                  totalBooths={effectivePhuleraData.roll.booths.length}
                  electionDateLabel={effectivePhuleraData.result.date}
                  families={families}
                  allVoters={effectivePhuleraData.roll.people}
                  leaningMap={leaningMap}
                  turnoutSet={turnoutSet}
                  tally={tally}
                  pollHideLeaning={pollHideLeaning}
                  onBack={() => setRoute({ screen: 'home' })}
                  onToggleVoterTurnout={handleToggleVoterTurnout}
                  onOpenFamilyParchi={(fam) => setParchiModalFamilyId(fam.id)}
                  onToast={triggerToast}
                />
              )}

              {route.screen === 'team' && (
                <TeamScreen
                  team={teamWorkers}
                  wardAssignments={wardAssignments}
                  wards={effectivePhuleraData.roll.wards}
                  todayActivity={todayActivity}
                  onBack={() => setRoute({ screen: 'home' })}
                  onAddWorker={handleAddWorker}
                  onToggleWorkerWard={handleToggleWorkerWard}
                />
              )}

              {(route.screen === 'result' || route.screen === 'start') && (
                <ResultsAndStartScreen
                  mode={route.screen}
                  phuleraData={effectivePhuleraData}
                  places={placesData}
                  plans={plansData}
                  liveSamples={liveSamples}
                  activePanchayatId={activePanchayat.id}
                  initialDistrictSlug={route.districtSlug}
                  initialBlockSlug={route.blockSlug}
                  initialGpId={route.gpId}
                  initialTab={
                    route.screen === 'result' ? route.tab : undefined
                  }
                  onBack={() => setRoute({ screen: 'home' })}
                  onActivatePanchayat={handleActivatePanchayat}
                  onInspectInXray={(url, payload) =>
                    setLastInspectedApi({ url, payload })
                  }
                  onOpenMereChunav={() => setShowMereChunavSheet(true)}
                  onToast={triggerToast}
                />
              )}

              {/* Multi-Step Election Onboarding, Plans & Jhalak Screens */}
              {route.screen === 'chunav' && (
                <ChunavScreen
                  onBack={() => setRoute({ screen: 'home' })}
                  onNavigate={(r) => setRoute(r)}
                />
              )}

              {route.screen === 'pick' && (
                <PickPanchayatScreen
                  electionType={route.electionType}
                  places={placesData}
                  initialDistrictSlug={route.districtSlug}
                  onBack={() => setRoute({ screen: 'chunav' })}
                  onNavigate={(r) => setRoute(r)}
                  onActivatePanchayat={handleActivatePanchayat}
                />
              )}

              {route.screen === 'wardpick' && (
                <WardPickScreen
                  gpId={route.gpId}
                  gpName={route.gpName}
                  tehsil={route.tehsil}
                  district={route.district}
                  voters={route.voters}
                  villages={route.villages}
                  onBack={() =>
                    setRoute({ screen: 'pick', electionType: 'ward' })
                  }
                  onSelectWardAndActivate={(gp, wardNum) => {
                    handleActivatePanchayat(gp);
                    setRoute({ screen: 'parivar', ward: wardNum });
                  }}
                />
              )}

              {route.screen === 'seats' && (
                <SeatPickScreen
                  kind={route.kind}
                  places={placesData}
                  onBack={() => setRoute({ screen: 'chunav' })}
                  onNavigate={(r) => setRoute(r)}
                  onActivatePanchayat={handleActivatePanchayat}
                />
              )}

              {route.screen === 'plans' && (
                <PlansCheckoutScreen
                  title={route.title || effectivePhuleraData.roll.name}
                  subtitle={
                    route.subtitle ||
                    `सरपंच चुनाव · ${effectivePhuleraData.roll.tehsil}, ${effectivePhuleraData.roll.district}`
                  }
                  gpCount={route.gpCount || 1}
                  voters={route.voters || effectivePhuleraData.roll.people.length}
                  gpToActivate={route.gpToActivate}
                  onBack={() => setRoute({ screen: 'chunav' })}
                  onOpenDemo={() => setRoute({ screen: 'home' })}
                  onActivate={() => {
                    if (route.gpToActivate) {
                      handleActivatePanchayat(route.gpToActivate);
                    } else {
                      setRoute({ screen: 'home' });
                      triggerToast('चुनाव मैनेजर अनलिमिटेड प्लान सक्रिय हो गया!');
                    }
                  }}
                />
              )}

              {route.screen === 'jhalak' && (
                <JhalakStepsScreen
                  gpId={route.gpId}
                  gpName={route.gpName}
                  tehsil={route.tehsil}
                  district={route.district}
                  voters={route.voters}
                  villages={route.villages}
                  initialStep={route.step || 1}
                  plans={plansData}
                  onBack={() =>
                    setRoute({ screen: 'pick', electionType: 'sarpanch' })
                  }
                  onNavigate={(r) => setRoute(r)}
                  onActivatePanchayat={handleActivatePanchayat}
                />
              )}

              {/* Search, Makan & Jati Screens */}
              {route.screen === 'search' && (
                <SearchScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  wards={effectivePhuleraData.roll.wards}
                  allVoters={effectivePhuleraData.roll.people}
                  families={families}
                  leaningMap={leaningMap}
                  initialWard={route.ward}
                  initialAgeBracket={route.ageBracket}
                  initialQuery={route.initialQuery}
                  onBack={() => setRoute({ screen: 'home' })}
                  onNavigate={(r) => setRoute(r)}
                  onUpdateVoterLeaning={handleUpdateVoterLeaning}
                />
              )}

              {route.screen === 'makan' && (
                <MakanScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  wards={effectivePhuleraData.roll.wards}
                  families={families}
                  initialWard={route.ward}
                  initialHouse={route.house}
                  onBack={() => setRoute({ screen: 'home' })}
                  onNavigate={(r) => setRoute(r)}
                  onOpenFamilyParchi={(fam) => setParchiModalFamilyId(fam.id)}
                />
              )}

              {route.screen === 'jati' && (
                <JatiScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  wards={effectivePhuleraData.roll.wards}
                  castes={effectivePhuleraData.roll.castes}
                  families={families}
                  initialWard={route.ward}
                  onBack={() => setRoute({ screen: 'home' })}
                  onNavigate={(r) => setRoute(r)}
                  onUpdateFamilyCaste={handleUpdateFamilyCaste}
                />
              )}

              {/* More (Settings), Ummidwar, ParchiSet, FastTick, Refer & Vansh Screens */}
              {route.screen === 'more' && (
                <MoreScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  tehsilName={effectivePhuleraData.roll.tehsil}
                  districtName={effectivePhuleraData.roll.district}
                  myCandidateName={myCandidateName}
                  candidates={effectivePhuleraData.camp.candidates}
                  tally={tally}
                  parchiSettings={parchiSettings}
                  pollHideLeaning={pollHideLeaning}
                  onTogglePollHideLeaning={(val) => {
                    setPollHideLeaning(val);
                    triggerToast(
                      val
                        ? 'पोलिंग स्क्रीन पर पक्ष-विपक्ष छुपा दिया गया'
                        : 'पोलिंग स्क्रीन पर पक्ष-विपक्ष दिखेगा'
                    );
                  }}
                  onOpenVideoWalkthrough={() => setShowVideoWalkthrough(true)}
                  onOpenMereChunav={() => setShowMereChunavSheet(true)}
                  onBack={() => setRoute({ screen: 'home' })}
                  onNavigate={(r) => setRoute(r)}
                  onResetServerDemo={handleClearAllTestRuns}
                  onToast={triggerToast}
                />
              )}

              {route.screen === 'ummidwar' && (
                <UmmidwarScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  candidates={effectivePhuleraData.camp.candidates}
                  tally={tally}
                  onBack={() => setRoute({ screen: 'more' })}
                  onSaveCandidatesList={handleSaveCandidatesList}
                />
              )}

              {route.screen === 'parchiset' && (
                <ParchiSetScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  myCandidateName={myCandidateName}
                  parchiSettings={parchiSettings}
                  sampleFamily={sortedFamiliesBySize[0]}
                  onBack={() => setRoute({ screen: 'more' })}
                  onUpdateParchiSettings={(next) => {
                    setParchiSettings(next);
                    triggerToast('पर्ची व पोस्टर सेटिंग अपडेट हो गई');
                  }}
                  onOpenSampleParchi={() =>
                    setParchiModalFamilyId(sortedFamiliesBySize[0]?.id || null)
                  }
                />
              )}

              {route.screen === 'tick' && (
                <FastTickScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  wards={effectivePhuleraData.roll.wards}
                  allVoters={effectivePhuleraData.roll.people}
                  leaningMap={leaningMap}
                  turnoutSet={turnoutSet}
                  onBack={() => setRoute({ screen: 'home' })}
                  onToggleVoterTurnout={handleToggleVoterTurnout}
                />
              )}

              {route.screen === 'refer' && (
                <ReferScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  myCandidateName={myCandidateName}
                  onBack={() => setRoute({ screen: 'more' })}
                  onToast={triggerToast}
                />
              )}

              {route.screen === 'vansh' && (
                <VanshScreen
                  panchayatName={effectivePhuleraData.roll.name}
                  families={sortedFamiliesBySize}
                  onBack={() => setRoute({ screen: 'more' })}
                  onNavigate={(r) => setRoute(r)}
                  onToast={triggerToast}
                />
              )}
            </div>

            {/* Right Column (Desktop Companion): Synchronized REA Reverse-Engineering & Live Data Studio */}
            <div className="hidden lg:block lg:col-span-7 sticky top-20">
              <ReaXrayPanel
                currentRoute={route}
                activeFamily={activeFamily}
                phuleraData={effectivePhuleraData}
                liveSamples={liveSamples}
                liveConnected={liveConnected}
                liveVersion={liveVersion}
                liveFeed={liveFeed}
                lastInspectedApi={lastInspectedApi}
                onSimulateWorkerTick={handleSimulateWorkerTick}
                onNavigate={(r) => setRoute(r)}
              />
            </div>
          </div>
        )}
      </main>

      {/* "मेरे चुनाव" Bottom Sheet (matches XRecorder 01:43 & 02:02) */}
      <MereChunavSheet
        open={showMereChunavSheet}
        activePanchayatId={activePanchayat.id}
        activePanchayatName={effectivePhuleraData.roll.name}
        quickSwitchPanchayats={quickSwitchPanchayats}
        onClose={() => setShowMereChunavSheet(false)}
        onNavigate={(r) => setRoute(r)}
        onSelectPanchayat={handleActivatePanchayat}
      />

      {/* Official 2-Minute Video Walkthrough Modal (plays /assets/aistudio/app-v3_48a410dd.mp4) */}
      <VideoWalkthroughModal
        open={showVideoWalkthrough}
        onClose={() => setShowVideoWalkthrough(false)}
      />

      {/* Printable Family Voter Parchi Modal */}
      <ParchiSlipModal
        family={parchiModalFamily}
        panchayatName={effectivePhuleraData.roll.name}
        candidateName={myCandidateName}
        parchiSettings={parchiSettings}
        onOpenSettings={() => {
          setParchiModalFamilyId(null);
          setRoute({ screen: 'parchiset' });
        }}
        onClose={() => setParchiModalFamilyId(null)}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="लॉगइन करें"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                सरपंच जीतो (म.प्र.) में लॉगइन करें
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowLoginModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              अपनी मध्य प्रदेश ग्राम पंचायत या टीम के खाते में जाने के लिए लॉगइन करें या
              55 ज़िलों में से अपनी पंचायत चुनें।
            </p>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-extrabold cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>
                Google से लॉगइन करें ({effectivePhuleraData.roll.name} · Firebase)
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLoginModal(false);
                setRoute({ screen: 'chunav' });
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer"
            >
              म.प्र. की नई पंचायत चुनें (55 ज़िले)
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal with Live Candidate Editor */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="चुनाव सेटिंग"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                {effectivePhuleraData.roll.name} · चुनाव सेटिंग
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidates} className="space-y-3 text-xs">
              <div className="font-bold text-slate-600">
                उम्मीदवारों के नाम बदलें (लाइव सेव):
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#15803D] mb-1">
                  आपका नाम (पक्ष उम्मीदवार):
                </label>
                <input
                  type="text"
                  required
                  value={editCand1}
                  onChange={(e) => setEditCand1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/40 font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#B91C1C] mb-1">
                  मुख्य विरोधी उम्मीदवार 1:
                </label>
                <input
                  type="text"
                  required
                  value={editCand2}
                  onChange={(e) => setEditCand2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-red-300 bg-red-50/40 font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5B21B6] mb-1">
                  विरोधी उम्मीदवार 2:
                </label>
                <input
                  type="text"
                  required
                  value={editCand3}
                  onChange={(e) => setEditCand3(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-purple-50/40 font-extrabold text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-extrabold cursor-pointer"
              >
                उम्मीदवार नाम सेव करें
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleClearAllTestRuns}
                className="w-full py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>सभी टेस्ट रन साफ़ करें (Clear All Test Runs)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  postLiveMutation({ type: 'reset_demo' });
                  setShowSettingsModal(false);
                  triggerToast('डेटा शुरुआती स्थिति में रीसेट कर दिया गया');
                }}
                className="w-full py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>वर्तमान पंचायत रीसेट करें</span>
              </button>
              <a
                href="/releases/SarpanchJeeto-MP-v1.0.apk"
                download="SarpanchJeeto-MP-v1.0.apk"
                className="w-full py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Android APK डाउनलोड करें (SarpanchJeeto-MP-v1.0.apk)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Post-Selection Official ECI Portal CAPTCHA Verification -> Saves to LocalStorage */}
      {pendingPortalGp && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="आधिकारिक ECI मतदाता सूची CAPTCHA सत्यापन"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 border-2 border-[#1D4ED8]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] text-[10px] font-extrabold border border-blue-200 mb-1">
                  <span>आधिकारिक ECI गेटवे · 1-बार सत्यापन</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  ग्राम पंचायत &apos;{pendingPortalGp.name}&apos; का डेटा लाएं
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {pendingPortalGp.tehsil} · {pendingPortalGp.district}
                </p>
              </div>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setPendingPortalGp(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {portalGpMatch && (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">
                    ECI विधानसभा (AC):
                  </span>
                  <span className="font-extrabold text-slate-900">
                    #{portalGpMatch.acNumber} - {portalGpMatch.acNameHi} (
                    {portalGpMatch.districtCd})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-500 shrink-0">
                    मतदान केंद्र (Booth):
                  </span>
                  {Array.isArray(portalGpMatch.candidateBooths) &&
                  portalGpMatch.candidateBooths.length > 0 ? (
                    <select
                      value={portalGpMatch.partNumber}
                      onChange={(e) => {
                        const pNo = Number(e.target.value);
                        const found = portalGpMatch.candidateBooths.find(
                          (b: any) => b.partNumber === pNo
                        );
                        if (found) {
                          setPortalGpMatch({
                            ...portalGpMatch,
                            partId: found.partId,
                            partNumber: found.partNumber,
                            partName: found.partName,
                          });
                        }
                      }}
                      className="text-xs font-extrabold text-emerald-900 bg-white border border-slate-300 rounded-lg px-2 py-1 max-w-[220px] truncate"
                    >
                      {portalGpMatch.candidateBooths.map((b: any) => (
                        <option key={b.partId || b.partNumber} value={b.partNumber}>
                          भाग #{b.partNumber}: {b.partName} (ID #{b.partId})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-extrabold text-emerald-800">
                      भाग #{portalGpMatch.partNumber}: {portalGpMatch.partName}
                    </span>
                  )}
                </div>
              </div>
            )}

            <form
              onSubmit={handlePortalCaptchaVerifySubmit}
              className="space-y-3"
            >
              <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">
                    आधिकारिक ECI CAPTCHA भरें ({portalCaptchaSecondsLeft}s शेष):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePlayAudioCaptcha}
                      disabled={!portalCaptcha?.captchaId || portalCaptchaLoading}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-[11px] font-extrabold text-[#1D4ED8] hover:bg-blue-50 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>सुनें</span>
                    </button>
                    <button
                      type="button"
                      onClick={refreshPortalCaptchaOnly}
                      disabled={portalCaptchaLoading}
                      className="text-xs font-extrabold text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      {portalCaptchaLoading ? 'लोड हो रहा...' : 'नया CAPTCHA ↻'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {portalCaptcha?.dataUrl ? (
                    <img
                      src={portalCaptcha.dataUrl}
                      alt="Official ECI Captcha"
                      className="h-14 w-36 object-contain rounded-xl border-2 border-slate-300 bg-white px-1.5 shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-36 rounded-xl border border-slate-300 bg-white flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
                      {portalCaptchaLoading
                        ? 'CAPTCHA आ रहा है...'
                        : 'CAPTCHA अनुपलब्ध'}
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={portalCaptchaInput}
                    onChange={(e) =>
                      setPortalCaptchaInput(
                        e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)
                      )
                    }
                    placeholder="6 अक्षर यहाँ लिखें"
                    className="w-full px-3.5 py-3 rounded-xl border-2 border-[#1D4ED8] bg-white text-base font-extrabold tracking-widest text-slate-900 placeholder:text-xs placeholder:tracking-normal placeholder:font-semibold"
                  />
                </div>

                {portalCaptchaSecondsLeft === 0 && !portalCaptchaError && (
                  <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    CAPTCHA की समय-सीमा (180s) समाप्त हो गई है। कृपया &apos;नया CAPTCHA ↻&apos; दबाएँ।
                  </div>
                )}

                {portalCaptchaError && (
                  <div className="text-xs font-extrabold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {portalCaptchaError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={portalVerifySubmitting || portalCaptchaLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white text-sm font-extrabold cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  {portalVerifySubmitting
                    ? 'आधिकारिक ECI पोर्टल से सत्यापित हो रहा है...'
                    : 'CAPTCHA सत्यापित करें व Client Storage में सेव करें'}
                </span>
              </button>
            </form>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 font-semibold leading-relaxed">
              💡 <strong>LLM Council Audited (IndexedDB + LocalStorage):</strong>{' '}
              जैसे ही आप यह CAPTCHA भरेंगे, आधिकारिक पोर्टल (`gateway-voters.eci.gov.in`)
              से आपकी ग्राम पंचायत का सत्यापित डेटा <strong>FNV-1a Checksum</strong> के साथ
              आपके फोन के <strong>IndexedDB + LocalStorage</strong> में सेव हो जाएगा।
              कोई 5MB Quota लिमिट नहीं और न दोबारा CAPTCHA भरने की ज़रूरत!
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 border border-slate-700"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
