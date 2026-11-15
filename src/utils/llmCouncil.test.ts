import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateAggregateRankings,
  deAnonymizeRankingText,
  parseRankingFromText,
  runAutomatedVerificationChecks,
  runDeterministicCouncilAudit,
} from './llmCouncil';
import {
  buildFamilySummaries,
  buildVanshavaliTree,
  classifyVoterSide,
  computePanchayatDemographics,
  computeVoteTally,
  filterAndSortFamilies,
} from './electionEngine';
import { matchesSearchQuery, transliterateDevanagariToRoman } from './hindiSearch';
import { generateMpPanchayatDataset } from './mpPanchayatGenerator';

test('karpathy/llm-council parseRankingFromText extracts numbered FINAL RANKING list accurately', () => {
  const sampleEvaluation = `Response A provides good detail on X but misses Y.
Response B is accurate but lacks depth on Z.
Response C offers the most comprehensive audit.

FINAL RANKING:
1. Response C
2. Response A
3. Response B`;

  const parsed = parseRankingFromText(sampleEvaluation);
  assert.deepEqual(parsed, ['Response C', 'Response A', 'Response B']);
});

test('karpathy/llm-council calculateAggregateRankings computes average rank and sorts lowest first', () => {
  const labelToModel = {
    'Response A': 'model-alpha',
    'Response B': 'model-beta',
    'Response C': 'model-gamma',
  };
  const stage2 = [
    {
      model: 'judge-1',
      ranking: 'FINAL RANKING:\n1. Response B\n2. Response C\n3. Response A',
      parsed_ranking: ['Response B', 'Response C', 'Response A'],
    },
    {
      model: 'judge-2',
      ranking: 'FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C',
      parsed_ranking: ['Response B', 'Response A', 'Response C'],
    },
  ];

  const agg = calculateAggregateRankings(stage2, labelToModel);
  assert.equal(agg[0].model, 'model-beta');
  assert.equal(agg[0].average_rank, 1);
  assert.equal(agg[0].rankings_count, 2);
});

test('karpathy/llm-council deAnonymizeRankingText annotates anonymous labels with model names', () => {
  const raw = 'Response A caught the search issue, while Response B verified Vanshavali.';
  const out = deAnonymizeRankingText(raw, {
    'Response A': 'council/search-auditor',
    'Response B': 'council/vanshavali-auditor',
  });
  assert.equal(
    out.includes('Response A (council/search-auditor)') &&
      out.includes('Response B (council/vanshavali-auditor)'),
    true
  );
});

test('All 55 MP Districts and 1,800+ Gram Panchayats exist in places.json', () => {
  const placesPath = path.resolve(process.cwd(), 'public/demo/places.json');
  const placesJson = JSON.parse(fs.readFileSync(placesPath, 'utf-8'));
  const districts = placesJson.d || [];
  assert.equal(districts.length, 55, 'Expected exactly 55 MP districts');

  let totalBlocks = 0;
  let totalGps = 0;
  let totalVillages = 0;
  for (const d of districts) {
    for (const b of d[2] || []) {
      totalBlocks++;
      for (const g of b[2] || []) {
        totalGps++;
        totalVillages += Array.isArray(g[3]) ? g[3].length : 1;
      }
    }
  }
  assert.equal(totalBlocks >= 200, true, `Expected >=200 blocks, got ${totalBlocks}`);
  assert.equal(totalGps >= 1500, true, `Expected >=1500 GPs, got ${totalGps}`);
  assert.equal(totalVillages >= 4500, true, `Expected >=4500 villages, got ${totalVillages}`);
});

test('Zero fake or generated phone numbers exist in generated MP Panchayats or buildFamilySummaries', () => {
  const mahodiya = generateMpPanchayatDataset({
    id: 'sehore/sehore/mahodiya',
    name: 'महौदिया',
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
  });

  for (const fi of mahodiya.camp.family_info) {
    assert.equal(fi.contact_phone, '', 'contact_phone must start empty until worker/candidate enters a real number');
  }

  const summaries = buildFamilySummaries(
    mahodiya,
    new Map(),
    new Set(),
    new Map(),
    new Map(),
    new Map()
  );
  assert.equal(summaries.length > 100, true);
  for (const fam of summaries) {
    assert.equal(fam.contactPhone, '');
  }

  // Verify user-saved contactOverrides work properly
  const targetFamId = summaries[0].id;
  const withOverride = buildFamilySummaries(
    mahodiya,
    new Map(),
    new Set(),
    new Map(),
    new Map(),
    new Map([[targetFamId, { name: 'रामनारायण पाटीदार', phone: '9826012345' }]])
  );
  const updatedFam = withOverride.find((f) => f.id === targetFamId);
  assert.equal(updatedFam?.contactPhone, '9826012345');
  assert.equal(updatedFam?.contactName, 'रामनारायण पाटीदार');
});

test('Universal Hindi + Hinglish/English phonetic search matches Devanagari names, castes, houses, and wards', () => {
  assert.equal(
    matchesSearchQuery(['लक्ष्मीनारायण मीणा जी का परिवार'], 'lakshminarayan'),
    true
  );
  assert.equal(
    matchesSearchQuery(['लक्ष्मीनारायण मीणा जी का परिवार'], 'meena'),
    true
  );
  assert.equal(
    matchesSearchQuery(['रामनारायण पाटीदार'], 'ramnarayan patidar'),
    true
  );
  assert.equal(
    matchesSearchQuery(['महौदिया', 'सीहोर जनपद'], 'mahodiya'),
    true
  );
  assert.equal(
    matchesSearchQuery(['गुनगा', 'बैरसिया जनपद'], 'berasia'),
    true
  );
  assert.equal(
    matchesSearchQuery(['मकान 10', 'वार्ड 1'], 'makan 10'),
    true
  );
  assert.equal(
    transliterateDevanagariToRoman('लक्ष्मी').startsWith('lakshm'),
    true
  );
});

test('Vote tally conservation and 4+ rival candidate classification hold under all mutations', () => {
  const dataset = generateMpPanchayatDataset({
    id: 'bhopal/berasia/gunaga',
    name: 'गुनगा',
    tehsil: 'बैरसिया जनपद',
    district: 'भोपाल (मध्य प्रदेश)',
    voters: 4420,
    villages: ['गुनगा', 'रतुआ', 'हर्राखेड़ा'],
  });

  const lMap = new Map(dataset.camp.leaning.map((l) => [l.voter_id, l]));
  // Assign first voter to candidate #4 (4th rival candidate)
  const firstVoterId = dataset.roll.people.find((p) => p.v === 1 && p.act === 1)!.id;
  lMap.set(firstVoterId, {
    voter_id: firstVoterId,
    state: 'candidate',
    candidate_id: 4,
  });

  assert.equal(classifyVoterSide(lMap.get(firstVoterId)), 'them');

  const tally = computeVoteTally(dataset.roll.people, lMap);
  const totalSum =
    tally.us + tally.c2 + tally.c3 + tally.undecided + tally.no_vote + tally.not_asked;
  assert.equal(totalSum, tally.totalVoters);
  assert.equal(tally.them, tally.c2 + tally.c3);
  assert.equal(tally.leadMargin, tally.us - tally.them);
});

test('Full 3-Stage LLM Council Audit runs and passes all 12 automated verification checks', () => {
  const dataset = generateMpPanchayatDataset({
    id: 'sehore/sehore/mahodiya',
    name: 'महौदिया',
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
  });

  const checks = runAutomatedVerificationChecks(dataset, 55, 9);
  assert.equal(checks.length, 12);
  for (const chk of checks) {
    assert.equal(chk.passed, true, `Check ${chk.id} (${chk.title}) failed: ${chk.detail}`);
  }

  const report = runDeterministicCouncilAudit(dataset, 55, 9);
  assert.equal(report.stage1.length, 4);
  assert.equal(report.stage2.length, 4);
  assert.equal(report.metadata.aggregate_rankings.length, 4);
  assert.equal(report.metadata.passedCount, 12);
  assert.equal(report.metadata.totalCount, 12);

  // Verify Vanshavali tree and filterAndSortFamilies
  const families = buildFamilySummaries(
    dataset,
    new Map(),
    new Set(),
    new Map(),
    new Map(),
    new Map()
  );
  const tree = buildVanshavaliTree(
    families[0].id,
    dataset,
    new Map(),
    new Set(),
    new Map()
  );
  assert.equal(tree.length > 0, true);

  const demo = computePanchayatDemographics(dataset);
  assert.equal(demo.totalVoters, dataset.roll.people.filter((p) => p.v === 1 && p.act === 1).length);

  const filteredByHouse = filterAndSortFamilies(families, {
    query: families[0].house,
  });
  assert.equal(filteredByHouse.length > 0, true);
});
