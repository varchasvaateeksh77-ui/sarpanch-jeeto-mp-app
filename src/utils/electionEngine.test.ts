import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildFamilySummaries,
  buildVanshavaliTree,
  computePanchayatDemographics,
  computeVoteTally,
  filterAndSortFamilies,
} from './electionEngine';
import { PhuleraDataset, VoterLeaning } from '../types/sarpanch';

const phuleraPath = path.resolve(process.cwd(), 'public/demo/phulera.json');
const phuleraData: PhuleraDataset = JSON.parse(
  fs.readFileSync(phuleraPath, 'utf8')
);

function createMaps(data: PhuleraDataset) {
  const leaningMap = new Map<string, VoterLeaning>();
  for (const l of data.camp.leaning) {
    leaningMap.set(l.voter_id, l);
  }
  const turnoutSet = new Set<string>();
  for (const t of data.camp.turnout) {
    if (t.voted) turnoutSet.add(t.voter_id);
  }
  const voterTagsMap = new Map<string, string[]>();
  for (const vt of data.camp.voter_tags) {
    const arr = voterTagsMap.get(vt.voter_id) || [];
    arr.push(vt.tag_id);
    voterTagsMap.set(vt.voter_id, arr);
  }
  return { leaningMap, turnoutSet, voterTagsMap };
}

test('computeVoteTally matches exact Sarpanch Jeeto Phulera numbers', () => {
  const { leaningMap } = createMaps(phuleraData);
  const tally = computeVoteTally(phuleraData.roll.people, leaningMap);

  assert.equal(tally.totalVoters, 2480);
  assert.equal(tally.us, 1105);
  assert.equal(tally.them, 908);
  assert.equal(tally.c2, 812);
  assert.equal(tally.c3, 96);
  assert.equal(tally.undecided, 200);
  assert.equal(tally.no_vote, 0);
  assert.equal(tally.not_asked, 267);
  assert.equal(tally.leadMargin, 197);
});

test('buildFamilySummaries produces 412 families and largest family is f140 (रामनारायण जी का परिवार) with 14 voters', () => {
  const { leaningMap, turnoutSet, voterTagsMap } = createMaps(phuleraData);
  const families = buildFamilySummaries(
    phuleraData,
    leaningMap,
    turnoutSet,
    voterTagsMap
  );
  assert.equal(families.length, 412);

  const sorted = filterAndSortFamilies(families, { sortBy: 'size_desc' });
  assert.equal(sorted[0].id, 'f140');
  assert.equal(sorted[0].displayTitle, 'रामनारायण जी का परिवार');
  assert.equal(sorted[0].totalVoters, 14);
  assert.equal(sorted[0].ward, 3);
  assert.equal(sorted[0].house, '21');
});

test('buildVanshavaliTree reconstructs multi-generational tree for f140', () => {
  const { leaningMap, turnoutSet, voterTagsMap } = createMaps(phuleraData);
  const roots = buildVanshavaliTree(
    'f140',
    phuleraData,
    leaningMap,
    turnoutSet,
    voterTagsMap
  );
  assert.ok(roots.length >= 1);
  // First root is G132 (रामनारायण)
  assert.equal(roots[0].primary.n, 'रामनारायण');
  assert.equal(roots[0].isGhost, true);
  // Has 3 sons: बृजभूषण, हरिनारायण, सत्यनारायण
  assert.equal(roots[0].children.length, 3);
  assert.equal(roots[0].children[0].primary.n, 'बृजभूषण');
  assert.equal(roots[0].children[0].spouses[0].n, 'मंजू देवी');
});

test('computePanchayatDemographics computes exact 2020 win target and village breakdown', () => {
  const demo = computePanchayatDemographics(phuleraData);
  assert.equal(demo.totalVoters, 2480);
  assert.equal(demo.totalFamilies, 412);
  assert.equal(demo.totalVillages, 3);
  assert.equal(demo.totalWards, 7);
  assert.equal(demo.totalBooths, 3);
  assert.equal(demo.newVoters, 142);
  assert.equal(demo.winCalculation.turnoutPercent2020, 80);
  assert.equal(demo.winCalculation.expectedPolledVotes, 1987);
  assert.equal(demo.winCalculation.safeWinTarget, 994);
  assert.equal(demo.villageStats[0].name, 'फुलेरा (महौदिया)');
  assert.equal(demo.villageStats[0].voters, 1516);
});

test('generateMpPanchayatDataset produces distinct voters, wards, families, EPIC codes, candidates, and vote tallies for Sehore, Berasia (Gunga), and Indore', async () => {
  const { generateMpPanchayatDataset } = await import('./mpPanchayatGenerator');

  const mahodiya = generateMpPanchayatDataset({
    id: 'sehore/sehore/mahodiya',
    name: 'महौदिया',
    tehsil: 'सीहोर जनपद',
    district: 'सीहोर (मध्य प्रदेश)',
    voters: 3640,
    villages: ['महौदिया', 'सिरपड़ी', 'बड़ियाखेड़ी'],
  });

  const gunga = generateMpPanchayatDataset({
    id: 'bhopal/berasia/gunaga',
    name: 'गुनगा',
    tehsil: 'बैरसिया जनपद',
    district: 'भोपाल (मध्य प्रदेश)',
    voters: 4420,
    villages: ['गुनगा', 'रतुआ', 'हर्राखेड़ा'],
  });

  const kshipra = generateMpPanchayatDataset({
    id: 'indore/sanwer/kshipra',
    name: 'क्षिप्रा',
    tehsil: 'सांवेर जनपद',
    district: 'इंदौर (मध्य प्रदेश)',
    voters: 5240,
    villages: ['क्षिप्रा', 'डकाच्या', 'पीरकराड़िया'],
  });

  const mMaps = createMaps(mahodiya);
  const gMaps = createMaps(gunga);
  const kMaps = createMaps(kshipra);

  const mTally = computeVoteTally(mahodiya.roll.people, mMaps.leaningMap);
  const gTally = computeVoteTally(gunga.roll.people, gMaps.leaningMap);
  const kTally = computeVoteTally(kshipra.roll.people, kMaps.leaningMap);

  // Voter counts match places.json and are never 2480
  assert.equal(mTally.totalVoters, 3640);
  assert.equal(gTally.totalVoters, 4420);
  assert.equal(kTally.totalVoters, 5240);

  // Ward counts are distinct MP scales (15, 16, 20) and never 7
  assert.equal(mahodiya.roll.wards.length, 15);
  assert.equal(gunga.roll.wards.length, 16);
  assert.equal(kshipra.roll.wards.length, 20);

  // Vote tallies are completely distinct
  assert.notEqual(mTally.us, gTally.us);
  assert.notEqual(gTally.us, kTally.us);
  assert.notEqual(mTally.us, 1105);
  assert.notEqual(gTally.us, 1105);

  // Candidates are region-specific and distinct
  assert.equal(mahodiya.camp.candidates[0].name, 'देवेन्द्र सिंह मेवाड़ा');
  assert.equal(gunga.camp.candidates[0].name, 'रामस्वरूप मीणा');
  assert.equal(kshipra.camp.candidates[0].name, 'कैलाश पटेल');

  // Top families and EPIC prefixes are distinct
  const mFams = filterAndSortFamilies(
    buildFamilySummaries(mahodiya, mMaps.leaningMap, mMaps.turnoutSet, mMaps.voterTagsMap),
    { sortBy: 'size_desc' }
  );
  const gFams = filterAndSortFamilies(
    buildFamilySummaries(gunga, gMaps.leaningMap, gMaps.turnoutSet, gMaps.voterTagsMap),
    { sortBy: 'size_desc' }
  );
  assert.notEqual(mFams[0].displayTitle, gFams[0].displayTitle);
  assert.ok(mFams[0].voters[0].e?.startsWith('MP37-MAH'));
  assert.ok(gFams[0].voters[0].e?.startsWith('MP04-GUN'));
});

