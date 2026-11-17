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
import {
  computeDatasetChecksum,
  sanitizeEciCaptchaInput,
} from './portalStorageEngine';
import {
  AC149_BERASIA_OFFICIAL_ROLL_PARTS,
  buildOfficialRollDatasetForSelectedParts,
} from './eciOfficialRollRegistry';
import {
  computeEciVoterGrid30Boxes,
  inspectEciPdfBuffer,
} from './eciPdfExtractor';

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

test('All 55 MP Districts and 1,800+ Gram Panchayats exist in places.json with zero duplicates and accurate geography', () => {
  const placesPath = path.resolve(process.cwd(), 'public/demo/places.json');
  const placesJson = JSON.parse(fs.readFileSync(placesPath, 'utf-8'));
  const districts = placesJson.d || [];
  assert.equal(districts.length, 55, 'Expected exactly 55 MP districts');

  let totalBlocks = 0;
  let totalGps = 0;
  let totalVillages = 0;
  let globalGpDupes = 0;
  let intraDistDupes = 0;
  let leadingMatraErrors = 0;
  const globalGpNames = new Set<string>();
  const invalidMatraRegex = /(?:^|\s)[\u0900-\u0903\u093A-\u094F\u0951-\u0963]|[\u0903\u0933]/;

  const toDedupKey = (str: string) =>
    str
      .normalize('NFKD')
      .replace(/[\u0900-\u0903\u093A-\u094F\u0951-\u0963\s]/g, '');

  for (const d of districts) {
    const distSeenNames = new Set<string>();
    const distSeenKeys = new Set<string>();
    for (const b of d[2] || []) {
      totalBlocks++;
      assert.equal(
        !String(b[0]).endsWith('-gramin') && !String(b[0]).endsWith('-uttar'),
        true,
        `Block slug ${b[0]} in ${d[0]} should be a real Janpad Panchayat, not a synthetic -gramin/-uttar block`
      );
      assert.equal(
        !String(b[1]).includes('&'),
        true,
        `Block name ${b[1]} in ${d[0]} should not merge two Janpads with &`
      );

      for (const g of b[2] || []) {
        totalGps++;
        const gpName = String(g[1]).normalize('NFKC').trim();
        const gpKey = toDedupKey(gpName) || gpName;
        if (invalidMatraRegex.test(gpName)) leadingMatraErrors++;
        if (globalGpNames.has(gpName)) globalGpDupes++;
        globalGpNames.add(gpName);

        if (distSeenNames.has(gpName) || distSeenKeys.has(gpKey)) intraDistDupes++;
        distSeenNames.add(gpName);
        distSeenKeys.add(gpKey);

        const vils: string[] = Array.isArray(g[3]) ? g[3] : [gpName];
        totalVillages += vils.length;
        for (const v of vils) {
          const vName = String(v).normalize('NFKC').trim();
          const vKey = toDedupKey(vName) || vName;
          if (invalidMatraRegex.test(vName)) leadingMatraErrors++;
          if (vName !== gpName) {
            if (distSeenNames.has(vName) || distSeenKeys.has(vKey)) intraDistDupes++;
            distSeenNames.add(vName);
            distSeenKeys.add(vKey);
          }
        }
      }
    }
  }

  assert.equal(totalBlocks >= 240, true, `Expected >=240 real Janpad blocks, got ${totalBlocks}`);
  assert.equal(totalGps >= 1800, true, `Expected >=1800 GPs, got ${totalGps}`);
  assert.equal(totalVillages >= 5000, true, `Expected >=5000 villages, got ${totalVillages}`);
  assert.equal(globalGpDupes, 0, `Expected 0 global duplicate GP names, got ${globalGpDupes}`);
  assert.equal(intraDistDupes, 0, `Expected 0 intra-district duplicate names, got ${intraDistDupes}`);
  assert.equal(leadingMatraErrors, 0, `Expected 0 leading matra errors, got ${leadingMatraErrors}`);

  // Verify key geographical placements reported by user
  const findDist = (slug: string) => districts.find((d: any) => d[0] === slug);
  const bhopal = findDist('bhopal');
  assert.deepEqual(
    bhopal[2].map((b: any) => b[0]),
    ['phanda', 'berasia'],
    'Bhopal must have exactly Phanda (Huzur) and Berasia Janpad Panchayats'
  );
  const phandaGps = bhopal[2][0][2].map((g: any) => g[1]);
  const berasiaGps = bhopal[2][1][2].map((g: any) => g[1]);
  assert.equal(phandaGps.includes('अचारपुरा'), true, 'Acharpura must be in Phanda (Huzur), Bhopal');
  assert.equal(phandaGps.includes('ईंटखेड़ी सड़क'), true, 'Intkhedi Sadak must be in Phanda (Huzur), Bhopal');
  assert.equal(berasiaGps.includes('गुनगा'), true, 'Gunga must be in Berasia, Bhopal');

  const ujjain = findDist('ujjain');
  assert.equal(ujjain[2].length, 6, 'Ujjain must have all 6 real Janpad Panchayats');
  const ujjainAllGps = ujjain[2].flatMap((b: any) => b[2].map((g: any) => g[1]));
  assert.equal(ujjainAllGps.includes('अमझेरा'), false, 'Amjhera belongs to Dhar, not Ujjain');
  assert.equal(ujjainAllGps.includes('इंगोरिया'), true, 'Ingoriya must be in Badnagar, Ujjain');
  assert.equal(ujjainAllGps.includes('भाट पचलाना'), true, 'Bhat Pachlana must be in Badnagar, Ujjain');

  const dhar = findDist('dhar');
  const dharAllGps = dhar[2].flatMap((b: any) => b[2].map((g: any) => g[1]));
  assert.equal(dharAllGps.includes('अमझेरा'), true, 'Amjhera must be in Dhar (Sardarpur)');

  const sehore = findDist('sehore');
  const sehoreAllGps = sehore[2].flatMap((b: any) => b[2].map((g: any) => g[1]));
  assert.equal(sehoreAllGps.includes('महौदिया'), true, 'Mahodiya must be in Sehore');
  assert.equal(sehoreAllGps.includes('धामंदा'), true, 'Dhamanda must be in Sehore');
  assert.equal(sehoreAllGps.includes('अमलाहा'), true, 'Amlaha must be in Sehore (Ashta)');
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

test('PortalStorageEngine FNV-1a checksum and ECI CAPTCHA input sanitization work deterministically', () => {
  const validRes = sanitizeEciCaptchaInput('  ab12XY ');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.cleaned, 'ab12XY');

  const invalidRes = sanitizeEciCaptchaInput('ab#12');
  assert.equal(invalidRes.valid, false);

  const dataset = generateMpPanchayatDataset({
    id: 'sehore/sehore/mahodiya',
    name: 'महौदिया',
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
  });
  const c1 = computeDatasetChecksum(dataset);
  const c2 = computeDatasetChecksum(dataset);
  assert.equal(c1, c2);
  assert.equal(c1.startsWith('fnv1a-'), true);
});

test('Full 3-Stage LLM Council Audit runs and passes all 16 automated verification checks (including ECI CAPTCHA -> Dual-Tier Client Storage checks)', () => {
  const dataset = generateMpPanchayatDataset({
    id: 'sehore/sehore/mahodiya',
    name: 'महौदिया',
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
  });

  const checks = runAutomatedVerificationChecks(dataset, 55, 9);
  assert.equal(checks.length, 16);
  for (const chk of checks) {
    assert.equal(chk.passed, true, `Check ${chk.id} (${chk.title}) failed: ${chk.detail}`);
  }

  const report = runDeterministicCouncilAudit(dataset, 55, 9);
  assert.equal(report.stage1.length, 4);
  assert.equal(report.stage2.length, 4);
  assert.equal(report.metadata.aggregate_rankings.length, 4);
  assert.equal(report.metadata.passedCount, 16);
  assert.equal(report.metadata.totalCount, 16);

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

test('Official 2024 ECI Final Electoral Roll Revision-2 PDFs (AC 149 Berasia Parts 1, 2, 3, 4) match exact voter counts, real EPICs, and selective booth roll filtering', () => {
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[1].totalVoters, 1028);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[1].maleVoters, 541);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[1].femaleVoters, 487);

  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[2].totalVoters, 841);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[2].maleVoters, 471);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[2].femaleVoters, 370);

  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[3].totalVoters, 795);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[3].maleVoters, 410);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[3].femaleVoters, 385);

  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[4].totalVoters, 875);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[4].maleVoters, 465);
  assert.equal(AC149_BERASIA_OFFICIAL_ROLL_PARTS[4].femaleVoters, 410);

  // Full Sooraj Pura 4-booth cluster (Parts 1, 2, 3, 4 = 3,539 voters)
  const fullCluster = buildOfficialRollDatasetForSelectedParts({
    gp: {
      id: 'bhopal/berasia/sooraj-pura',
      name: 'सूरज पुरा',
      tehsil: 'बैरसिया जनपद',
      district: 'भोपाल (मध्य प्रदेश)',
      voters: 3539,
      villages: ['सूरज पुरा', 'बाबूखेड़ी', 'उमरिया', 'सिंधौड़ा'],
    },
    acNumber: 149,
    selectedParts: [1, 2, 3, 4],
  });

  const activeVotersAll4 = fullCluster.roll.people.filter(
    (p) => p.v === 1 && p.act === 1
  );
  assert.equal(activeVotersAll4.length, 3539);
  assert.equal(
    activeVotersAll4.filter((p) => p.g === 'm').length,
    541 + 471 + 410 + 465
  );
  assert.equal(
    activeVotersAll4.filter((p) => p.g === 'f').length,
    487 + 370 + 385 + 410
  );

  // Verify real voters from the 4 uploaded PDFs exist with their exact EPIC IDs
  const rakesh = activeVotersAll4.find((p) => p.e === 'TUA2741437');
  assert.ok(rakesh, 'Rakesh Lodhi (TUA2741437) from Part 1 Sooraj Pura PDF must exist');
  assert.equal(rakesh.n, 'राकेश लोधी');

  const manisha = activeVotersAll4.find((p) => p.e === 'TUA1806355');
  assert.ok(manisha, 'Manisha (TUA1806355) from Part 2 Umariya PDF must exist');
  assert.equal(manisha.n, 'मनीषा');

  const ganpat = activeVotersAll4.find((p) => p.e === 'HDY4755401');
  assert.ok(ganpat, 'Ganpat Lal (HDY4755401) from Part 3 Sindhouda Booth 1 PDF must exist');
  assert.equal(ganpat.n, 'गनपत लाल');

  const mohan = activeVotersAll4.find((p) => p.e === 'TUA2490076');
  assert.ok(mohan, 'Mohan Singh (TUA2490076) from Part 4 Sindhouda Booth 2 PDF must exist');
  assert.equal(mohan.n, 'मोहन सिंह');

  // Verify selective single-roll download wrapper (e.g. only Part 1 = 1,028 voters)
  const part1Only = buildOfficialRollDatasetForSelectedParts({
    gp: {
      id: 'bhopal/berasia/sooraj-pura',
      name: 'सूरज पुरा',
      tehsil: 'बैरसिया जनपद',
      district: 'भोपाल (मध्य प्रदेश)',
    },
    acNumber: 149,
    selectedParts: [{ partNumber: 1, partName: 'सूरज पुरा' }],
  });
  assert.equal(
    part1Only.roll.people.filter((p) => p.v === 1 && p.act === 1).length,
    1028
  );

  // Verify Sindhouda 2-roll selection (Parts 3 & 4 = 795 + 875 = 1,670 voters)
  const sindhoudaParts = buildOfficialRollDatasetForSelectedParts({
    gp: {
      id: 'bhopal/berasia/sindhouda',
      name: 'सिंधौड़ा',
      tehsil: 'बैरसिया जनपद',
      district: 'भोपाल (मध्य प्रदेश)',
    },
    acNumber: 149,
    selectedParts: [3, 4],
  });
  assert.equal(
    sindhoudaParts.roll.people.filter((p) => p.v === 1 && p.act === 1).length,
    1670
  );

  // Verify Pure-TS Binary DCTDecode JPEG Stream Extractor & 3x10 Grid Slicer on real ECI PDF
  const pdfPath = path.join(
    process.cwd(),
    'public/assets/aistudio/2024-FC-EROLLGEN-S12-149-FinalRoll-Revision2-HIN-1-WI_685f853d.pdf'
  );
  if (fs.existsSync(pdfPath)) {
    const pdfBytes = new Uint8Array(fs.readFileSync(pdfPath));
    const summary = inspectEciPdfBuffer(
      pdfBytes,
      '2024-FC-EROLLGEN-S12-149-FinalRoll-Revision2-HIN-1-WI.pdf'
    );
    assert.equal(summary.acNumber, 149);
    assert.equal(summary.partNumber, 1);
    assert.equal(summary.totalPages, 40);
    assert.equal(summary.voterGridPagesCount, 37);
    assert.equal(summary.hasEmbeddedFonts, false);
    assert.equal(summary.isRasterizedEciWiPdf, true);
    assert.equal(
      summary.coverPageJpegDataUrl?.startsWith('data:image/jpeg;base64,'),
      true
    );
    assert.equal(
      summary.firstVoterGridPageJpegDataUrl?.startsWith(
        'data:image/jpeg;base64,'
      ),
      true
    );
  }

  const gridBoxes = computeEciVoterGrid30Boxes(3, 1239, 1754);
  assert.equal(gridBoxes.length, 30);
  assert.equal(gridBoxes[0].estimatedSerialNumber, 1);
  assert.equal(gridBoxes[29].estimatedSerialNumber, 30);
});

