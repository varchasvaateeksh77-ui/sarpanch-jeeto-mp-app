import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Mic,
  Play,
  Search,
  X,
} from 'lucide-react';
import { PhuleraDataset, PlanItem } from '../types/sarpanch';
import { generateMpPanchayatDataset } from '../utils/mpPanchayatGenerator';
import { matchesSearchQuery } from '../utils/hindiSearch';
import { startHindiVoiceSearch } from '../utils/voiceSearch';

export type RawGP = [string, string, number, string[]?, string[]?];
export type RawBlock = [string, string, RawGP[]];
export type RawDistrict = [string, string, RawBlock[]];

interface ResultsAndStartScreenProps {
  mode: 'result' | 'start';
  phuleraData: PhuleraDataset;
  places: RawDistrict[];
  plans: PlanItem[];
  liveSamples: Record<string, any>;
  activePanchayatId?: string;
  initialDistrictSlug?: string;
  initialBlockSlug?: string;
  initialGpId?: string;
  initialTab?: 'zila' | 'samiti' | 'sarpanch' | 'ward';
  onBack: () => void;
  onActivatePanchayat?: (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters?: number;
    villages: string[];
  }) => void;
  onInspectInXray?: (endpointUrl: string, payload: unknown) => void;
  onOpenMereChunav?: () => void;
  onToast?: (msg: string) => void;
}

const MP_DISTRICT_COUNTS: Record<string, { total: number; done: number }> = {
  sehore: { total: 497, done: 497 },
  bhopal: { total: 222, done: 222 },
  indore: { total: 334, done: 334 },
  ujjain: { total: 609, done: 608 },
  jabalpur: { total: 526, done: 526 },
  gwalior: { total: 264, done: 264 },
  sagar: { total: 754, done: 754 },
  rewa: { total: 645, done: 645 },
  satna: { total: 580, done: 580 },
  chhindwara: { total: 692, done: 692 },
  narmadapuram: { total: 428, done: 428 },
  vidisha: { total: 576, done: 576 },
  raisen: { total: 492, done: 492 },
  dewas: { total: 495, done: 495 },
  dhar: { total: 762, done: 762 },
  khandwa: { total: 420, done: 420 },
  khargone: { total: 590, done: 590 },
  ratlam: { total: 418, done: 418 },
  mandsaur: { total: 449, done: 449 },
  neemuch: { total: 241, done: 241 },
  rajgarh: { total: 622, done: 622 },
  shajapur: { total: 345, done: 345 },
  'agar-malwa': { total: 228, done: 228 },
  morena: { total: 478, done: 478 },
  bhind: { total: 442, done: 442 },
  sheopur: { total: 232, done: 232 },
  shivpuri: { total: 605, done: 605 },
  guna: { total: 425, done: 425 },
  ashoknagar: { total: 334, done: 334 },
  datia: { total: 290, done: 290 },
  damoh: { total: 462, done: 462 },
  panna: { total: 389, done: 389 },
  chhatarpur: { total: 558, done: 558 },
  tikamgarh: { total: 468, done: 468 },
  niwari: { total: 138, done: 138 },
  sidhi: { total: 392, done: 392 },
  singrauli: { total: 326, done: 326 },
  maihar: { total: 234, done: 234 },
  mauganj: { total: 218, done: 218 },
  shahdol: { total: 390, done: 390 },
  umaria: { total: 236, done: 236 },
  anuppur: { total: 282, done: 282 },
  katni: { total: 407, done: 407 },
  narsinghpur: { total: 447, done: 447 },
  seoni: { total: 642, done: 642 },
  mandla: { total: 486, done: 486 },
  dindori: { total: 364, done: 364 },
  balaghat: { total: 690, done: 690 },
  pandhurna: { total: 148, done: 148 },
  betul: { total: 554, done: 554 },
  harda: { total: 210, done: 210 },
  jhabua: { total: 375, done: 375 },
  alirajpur: { total: 288, done: 288 },
  barwani: { total: 416, done: 416 },
  burhanpur: { total: 167, done: 167 },
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-800',
  'bg-blue-100 text-blue-800',
  'bg-amber-100 text-amber-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
];

export const ResultsAndStartScreen: React.FC<ResultsAndStartScreenProps> = ({
  phuleraData,
  places,
  activePanchayatId,
  initialDistrictSlug,
  initialBlockSlug,
  initialGpId,
  initialTab = 'sarpanch',
  onBack,
  onActivatePanchayat,
  onOpenMereChunav,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<RawDistrict | null>(
    () =>
      initialDistrictSlug
        ? places.find((d) => d[0] === initialDistrictSlug) || null
        : null
  );
  const [selectedBlock, setSelectedBlock] = useState<RawBlock | null>(() => {
    if (!initialDistrictSlug || !initialBlockSlug) return null;
    const d = places.find((x) => x[0] === initialDistrictSlug);
    return d?.[2].find((b) => b[0] === initialBlockSlug) || null;
  });
  const [selectedGp, setSelectedGp] = useState<{
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  } | null>(() => {
    if (!initialGpId) return null;
    for (const d of places) {
      for (const b of d[2]) {
        for (const g of b[2]) {
          if (g[0] === initialGpId) {
            return {
              id: g[0],
              name: g[1],
              tehsil: b[1],
              district: d[1],
              voters: Number(g[2]) || 3400,
              villages: Array.isArray(g[3]) && g[3].length ? g[3] : [g[1]],
            };
          }
        }
      }
    }
    return null;
  });

  const [gpSortMode, setGpSortMode] = useState<
    'min_margin' | 'max_margin' | 'alpha'
  >('min_margin');
  const [detailTab, setDetailTab] = useState<
    'zila' | 'samiti' | 'sarpanch' | 'ward'
  >(initialTab);

  // Compute deterministic GP result cards for every GP in selectedBlock
  const blockGpResults = useMemo(() => {
    if (!selectedBlock || !selectedDistrict) return [];
    const list = selectedBlock[2].map((g, idx) => {
      const ds = generateMpPanchayatDataset({
        id: g[0],
        name: g[1],
        tehsil: selectedBlock[1],
        district: selectedDistrict[1],
        voters: Number(g[2]) || 3200,
        villages: Array.isArray(g[3]) && g[3].length ? g[3] : [g[1]],
        isDemo: false,
      });
      const margin2022 = Math.max(
        1,
        ds.result.win_votes - ds.result.runner_votes
      );
      const margin2015 = Math.max(
        1,
        ds.y2020.win_votes - ds.y2020.runner_votes
      );
      return {
        raw: g,
        id: g[0],
        name: g[1],
        tehsil: selectedBlock[1],
        district: selectedDistrict[1],
        voters: Number(g[2]) || ds.result.electorate,
        villages: Array.isArray(g[3]) && g[3].length ? g[3] : [g[1]],
        winner2022: ds.result.winner,
        margin2022,
        winner2015: ds.y2020.winner,
        margin2015,
        avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      };
    });

    if (gpSortMode === 'min_margin') {
      return [...list].sort((a, b) => a.margin2022 - b.margin2022);
    }
    if (gpSortMode === 'max_margin') {
      return [...list].sort((a, b) => b.margin2022 - a.margin2022);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'hi'));
  }, [selectedBlock, selectedDistrict, gpSortMode]);

  // Full dataset for Level 4 GP Result Detail
  const activeDetailDataset = useMemo(() => {
    if (!selectedGp) return null;
    if (selectedGp.id === activePanchayatId) return phuleraData;
    return generateMpPanchayatDataset({
      id: selectedGp.id,
      name: selectedGp.name,
      tehsil: selectedGp.tehsil,
      district: selectedGp.district,
      voters: selectedGp.voters,
      villages: selectedGp.villages,
      isDemo: false,
    });
  }, [selectedGp, activePanchayatId, phuleraData]);

  // Search matches across all 55 districts (supports Hindi + English/Hinglish)
  const matchingGps = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 1) return [];
    const matches: {
      district: RawDistrict;
      block: RawBlock;
      gp: RawGP;
    }[] = [];
    for (const d of places) {
      for (const b of d[2]) {
        for (const g of b[2]) {
          const vils = Array.isArray(g[3]) ? g[3] : [];
          if (
            matchesSearchQuery(
              [g[1], g[0], b[1], b[0], d[1], d[0], ...vils],
              q
            )
          ) {
            matches.push({ district: d, block: b, gp: g });
            if (matches.length >= 25) return matches;
          }
        }
      }
    }
    return matches;
  }, [places, searchQuery]);

  const filteredDistricts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return places;
    return places.filter(
      (d) =>
        matchesSearchQuery([d[1], d[0]], q) ||
        d[2].some(
          (b) =>
            matchesSearchQuery([b[1], b[0]], q) ||
            b[2].some((g) =>
              matchesSearchQuery(
                [g[1], g[0], ...(Array.isArray(g[3]) ? g[3] : [])],
                q
              )
            )
        )
    );
  }, [places, searchQuery]);

  const handleHeaderBack = () => {
    if (selectedGp) {
      setSelectedGp(null);
      return;
    }
    if (selectedBlock) {
      setSelectedBlock(null);
      return;
    }
    if (selectedDistrict) {
      setSelectedDistrict(null);
      return;
    }
    onBack();
  };

  const handleVoiceSearch = () => {
    startHindiVoiceSearch({
      fallbackSuggestions: ['सीहोर', 'भोपाल', 'इंदौर', 'महौदिया', 'गुनगा'],
      currentQuery: searchQuery,
      onStatus: (msg) => onToast && onToast(msg),
      onResult: (transcript) => {
        setSearchQuery(transcript);
      },
    });
  };

  const backLabel = selectedGp
    ? 'रिज़ल्ट'
    : selectedBlock
    ? selectedDistrict?.[1] || 'ज़िला'
    : selectedDistrict
    ? 'रिज़ल्ट'
    : 'पीछे';

  const headerTitle = selectedGp
    ? `${selectedGp.name} का रिज़ल्ट`
    : selectedBlock
    ? selectedBlock[1]
    : selectedDistrict
    ? selectedDistrict[1]
    : 'चुनाव रिज़ल्ट';

  const headerSubtitle = selectedGp
    ? `${selectedGp.tehsil.replace(' जनपद', '')} · ${selectedGp.district.replace(' (मध्य प्रदेश)', '')}`
    : selectedBlock
    ? `पंचायत समिति · ${selectedDistrict?.[1]}`
    : selectedDistrict
    ? `${MP_DISTRICT_COUNTS[selectedDistrict[0]]?.total || 420} पंचायतें · सबके रिज़ल्ट`
    : 'मध्य प्रदेश की हर पंचायत के 2022 और 2015 के रिज़ल्ट';

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      {/* Royal Blue Header */}
      <header className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <button
              type="button"
              onClick={handleHeaderBack}
              className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{backLabel}</span>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {headerTitle}
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 font-medium">
              {headerSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenMereChunav}
            className="flex flex-col items-center cursor-pointer"
          >
            <span className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </span>
            <span className="text-[10px] text-blue-100 font-bold mt-0.5">
              {phuleraData.roll.demo ? 'डेमो' : 'चुनाव'}
            </span>
          </button>
        </div>

        {/* Search Input (shown on Level 1, 2, 3) */}
        {!selectedGp && (
          <div className="mt-3 bg-white rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-slate-900">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedBlock
                  ? `${selectedBlock[1]} में पंचायत खोजें`
                  : 'ज़िला, समिति या पंचायत खोजें'
              }
              className="flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="साफ़ करें"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="बोलकर खोजें"
                onClick={handleVoiceSearch}
                className="w-7 h-7 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="p-3.5 space-y-3.5 flex-1">
        {/* LEVEL 4: GP Result Detail View (matches XRecorder 01:08-01:31 & 05:31-05:38) */}
        {selectedGp && activeDetailDataset ? (
          <div className="space-y-3.5">
            {/* 4 Top Pill Tabs: ज़िला परिषद | समिति | सरपंच ● | वार्ड पंच ● */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
              {(
                [
                  { id: 'zila', label: 'ज़िला परिषद', dot: false },
                  { id: 'samiti', label: 'समिति', dot: false },
                  { id: 'sarpanch', label: 'सरपंच', dot: true },
                  { id: 'ward', label: 'वार्ड पंच', dot: true },
                ] as const
              ).map((t) => {
                const isActive = detailTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetailTab(t.id)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white'
                        : 'text-slate-700 hover:bg-white/60'
                    }`}
                  >
                    <span className="truncate">{t.label}</span>
                    {t.dot && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive ? 'bg-emerald-300' : 'bg-[#16A34A]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB: सरपंच ● */}
            {detailTab === 'sarpanch' && (() => {
              const res = activeDetailDataset.result;
              const y15 = activeDetailDataset.y2020;
              const margin22 = res.win_votes - res.runner_votes;
              const margin15 = y15.win_votes - y15.runner_votes;
              const polled = Math.max(res.polled, 1);
              const turnoutPct = Math.round((res.polled / res.electorate) * 100);
              const winPct = Math.round((res.win_votes / polled) * 100);
              const runPct = Math.round((res.runner_votes / polled) * 100);
              const othersVotes = res.others.reduce((s, o) => s + o.votes, 0);
              const othersPct = Math.round((othersVotes / polled) * 100);
              const notaPct = Math.max(
                1,
                100 - winPct - runPct - othersPct
              );

              const allCandidates = [
                {
                  rank: 1,
                  name: res.winner,
                  votes: res.win_votes,
                  pct: ((res.win_votes / polled) * 100).toFixed(1),
                  bio: '38 · ग्रेजुएट · कृषि व समाजसेवा',
                  won: true,
                },
                {
                  rank: 2,
                  name: res.runner,
                  votes: res.runner_votes,
                  pct: ((res.runner_votes / polled) * 100).toFixed(1),
                  bio: '44 · 12वीं · खेती',
                  won: false,
                },
                ...res.others.map((o, idx) => ({
                  rank: idx + 3,
                  name: o.name,
                  votes: o.votes,
                  pct: ((o.votes / polled) * 100).toFixed(1),
                  bio: `${31 + idx * 5} · 10वीं · खेती`,
                  won: false,
                })),
              ];

              return (
                <div className="space-y-3.5">
                  {/* Winner Hero Card */}
                  <div className="bg-[#ECFDF5] border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-[#15803D]">
                        सरपंच 2022 · जीते
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                        {res.winner}
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        38 · ग्रेजुएट
                      </div>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="text-2xl font-extrabold text-[#15803D] leading-none">
                        +{margin22.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs font-bold text-[#15803D] mt-0.5">
                        वोट से
                      </div>
                    </div>
                  </div>

                  {/* Vote Share Stacked Bar & Legend */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 tabular-nums">
                      <span>
                        <strong className="text-slate-900 text-sm">
                          {res.polled.toLocaleString('en-IN')}
                        </strong>{' '}
                        वोट पड़े · {res.electorate.toLocaleString('en-IN')} में से
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {turnoutPct}% मतदान
                      </span>
                    </div>

                    <div className="h-3.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100">
                      <div
                        style={{ width: `${winPct}%` }}
                        className="bg-[#16A34A] h-full"
                      />
                      <div
                        style={{ width: `${runPct}%` }}
                        className="bg-[#2563EB] h-full"
                      />
                      <div
                        style={{ width: `${othersPct}%` }}
                        className="bg-[#F59E0B] h-full"
                      />
                      <div
                        style={{ width: `${notaPct}%` }}
                        className="bg-slate-300 h-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] mt-1 shrink-0" />
                        <div>
                          <div className="font-extrabold text-slate-900">
                            {res.winner}
                          </div>
                          <div className="text-slate-500 font-semibold tabular-nums">
                            {res.win_votes.toLocaleString('en-IN')} · {winPct}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] mt-1 shrink-0" />
                        <div>
                          <div className="font-extrabold text-slate-900">
                            {res.runner}
                          </div>
                          <div className="text-slate-500 font-semibold tabular-nums">
                            {res.runner_votes.toLocaleString('en-IN')} · {runPct}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] mt-1 shrink-0" />
                        <div>
                          <div className="font-extrabold text-slate-900">
                            बाकी {res.others.length} उम्मीदवार
                          </div>
                          <div className="text-slate-500 font-semibold tabular-nums">
                            {othersVotes.toLocaleString('en-IN')} · {othersPct}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                        <div>
                          <div className="font-extrabold text-slate-900">
                            NOTA / निरस्त
                          </div>
                          <div className="text-slate-500 font-semibold tabular-nums">
                            {(res.nota + res.rejected).toLocaleString('en-IN')} ·{' '}
                            {notaPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2015 से तुलना Table (matches XRecorder 01:13) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      2015 से तुलना
                    </h2>
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="py-2 grid grid-cols-3 font-extrabold text-slate-400">
                        <span>विवरण</span>
                        <span>2015</span>
                        <span className="text-[#15803D]">2022</span>
                      </div>
                      <div className="py-2.5 grid grid-cols-3 items-center">
                        <span className="text-slate-500 font-semibold">
                          सरपंच
                        </span>
                        <span className="font-bold text-slate-800 pr-1">
                          {y15.winner}
                        </span>
                        <span className="font-extrabold text-[#15803D]">
                          {res.winner}
                        </span>
                      </div>
                      <div className="py-2.5 grid grid-cols-3 items-center tabular-nums">
                        <span className="text-slate-500 font-semibold">
                          अंतर
                        </span>
                        <span className="font-bold text-slate-800">
                          {margin15} वोट
                        </span>
                        <span className="font-extrabold text-[#15803D]">
                          {margin22} वोट
                        </span>
                      </div>
                      <div className="py-2.5 grid grid-cols-3 items-center tabular-nums">
                        <span className="text-slate-500 font-semibold">
                          वोट पड़े
                        </span>
                        <span className="font-bold text-slate-800">
                          {y15.polled.toLocaleString('en-IN')} (
                          {Math.round((y15.polled / y15.electorate) * 100)}%)
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {res.polled.toLocaleString('en-IN')} ({turnoutPct}%)
                        </span>
                      </div>
                      <div className="py-2.5 grid grid-cols-3 items-center tabular-nums">
                        <span className="text-slate-500 font-semibold">
                          उम्मीदवार
                        </span>
                        <span className="font-bold text-slate-800">
                          {allCandidates.length + 2}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {allCandidates.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* सारे उम्मीदवार List (matches XRecorder 01:16) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      सारे उम्मीदवार ({allCandidates.length})
                    </h2>
                    <div className="divide-y divide-slate-100">
                      {allCandidates.map((c) => (
                        <div
                          key={c.rank}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 tabular-nums ${
                                c.won
                                  ? 'bg-[#16A34A] text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.rank}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-extrabold text-slate-900 truncate">
                                  {c.name}
                                </span>
                                {c.won && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold shrink-0">
                                    जीते
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {c.bio}
                              </div>
                            </div>
                          </div>

                          <div className="text-right tabular-nums shrink-0">
                            <div className="text-sm font-extrabold text-slate-900">
                              {c.votes.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-slate-400 font-semibold">
                              {c.pct}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: वार्ड पंच ● (matches XRecorder 03:04) */}
            {detailTab === 'ward' && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 grid grid-cols-3 text-center divide-x divide-slate-100 tabular-nums">
                  <div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {activeDetailDataset.result.ward_panch.length}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      कुल वार्ड
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-[#16A34A]">
                      4
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      निर्विरोध
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-[#1D4ED8]">
                      {Math.max(
                        1,
                        activeDetailDataset.result.ward_panch.length - 4
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      चुनाव से
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {activeDetailDataset.result.ward_panch.map((wp, idx) => {
                    const isUnopposed = idx % 4 === 0;
                    const margin = wp.win_votes - wp.runner_votes;
                    return (
                      <div
                        key={wp.ward}
                        className="p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] text-xs font-extrabold flex items-center justify-center tabular-nums">
                            {wp.ward}
                          </span>
                          <div>
                            <div className="text-sm font-extrabold text-slate-900">
                              {wp.winner}
                            </div>
                            <div className="text-xs text-slate-500 font-medium tabular-nums">
                              वार्ड {wp.ward} · पोलिंग {wp.polled}/{wp.electorate}
                            </div>
                          </div>
                        </div>
                        {isUnopposed ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#15803D] text-xs font-extrabold">
                            निर्विरोध
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold text-[#15803D] tabular-nums">
                            +{margin} वोट से
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: ज़िला परिषद / समिति (matches XRecorder 01:21-01:29) */}
            {(detailTab === 'zila' || detailTab === 'samiti') && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="text-base font-extrabold text-slate-900">
                    {detailTab === 'zila'
                      ? `ज़िला पंचायत निर्वाचन क्षेत्र · ${selectedGp.district.replace(' (मध्य प्रदेश)', '')}`
                      : `जनपद पंचायत सीट · ${selectedGp.tehsil}`}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    {detailTab === 'zila'
                      ? 'इस ज़िला पंचायत सीट में 14 ग्राम पंचायतें शामिल हैं'
                      : 'इस जनपद पंचायत सीट में 5 ग्राम पंचायतें शामिल हैं'}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
                  <div className="text-sm font-extrabold text-slate-900">
                    उम्मीदवार
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      {
                        name:
                          detailTab === 'zila'
                            ? 'श्रीमती गायत्री देवी परमार'
                            : 'राजेश सिंह राजपूत',
                        party: 'भाजपा समर्थित',
                        partyCls: 'bg-amber-100 text-amber-900',
                        bio: '42 · पोस्ट ग्रेजुएट · कृषि',
                        won: true,
                      },
                      {
                        name:
                          detailTab === 'zila'
                            ? 'कमल किशोर पाटीदार'
                            : 'महेश चंद्र वर्मा',
                        party: 'कांग्रेस समर्थित',
                        partyCls: 'bg-blue-100 text-blue-900',
                        bio: '46 · ग्रेजुएट · समाजसेवा',
                        won: false,
                      },
                      {
                        name: 'दिनेश कुमार मालवीय',
                        party: 'निर्दलीय',
                        partyCls: 'bg-slate-100 text-slate-700',
                        bio: '37 · 12वीं · व्यवसाय',
                        won: false,
                      },
                    ].map((c, idx) => (
                      <div
                        key={idx}
                        className="py-3 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {c.name}
                            </span>
                            {c.won && (
                              <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold">
                                विजेता
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {c.bio}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${c.partyCls}`}
                        >
                          {c.party}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Activate This Panchayat Dashboard Button */}
            {onActivatePanchayat && (
              <button
                type="button"
                onClick={() => onActivatePanchayat(selectedGp)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  ग्राम पंचायत &lsquo;{selectedGp.name}&rsquo; का लाइव डैशबोर्ड खोलें
                </span>
              </button>
            )}
          </div>
        ) : selectedBlock && selectedDistrict ? (
          /* LEVEL 3: Samiti / Block Gram Panchayats List with 4 Stats + 3 Sort Pills (matches XRecorder 01:02 & 05:25) */
          <div className="space-y-3.5">
            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-4 gap-2 text-center tabular-nums">
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">
                  {blockGpResults.length}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  सरपंच
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">52%</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  महिलाएँ
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">1</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  निर्विरोध
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">
                  {Math.min(...blockGpResults.map((x) => x.margin2022), 7)} वोट
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  सबसे कम अंतर
                </div>
              </div>
            </div>

            {/* Header + 3 Sort Filter Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-500">
                पंचायतें ({blockGpResults.length})
              </span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'min_margin', label: 'सबसे कम अंतर' },
                    { id: 'max_margin', label: 'सबसे ज़्यादा अंतर' },
                    { id: 'alpha', label: 'क-ख' },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setGpSortMode(pill.id)}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                      gpSortMode === pill.id
                        ? 'bg-[#1D4ED8] text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gram Panchayat Result Cards */}
            <div className="space-y-2.5">
              {blockGpResults
                .filter(
                  (item) =>
                    !searchQuery.trim() ||
                    item.name
                      .toLowerCase()
                      .includes(searchQuery.trim().toLowerCase()) ||
                    item.winner2022
                      .toLowerCase()
                      .includes(searchQuery.trim().toLowerCase())
                )
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDetailTab('sarpanch');
                      setSelectedGp({
                        id: item.id,
                        name: item.name,
                        tehsil: `${item.tehsil} जनपद`,
                        district: `${item.district} (मध्य प्रदेश)`,
                        voters: item.voters,
                        villages: item.villages,
                      });
                    }}
                    className="w-full bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-blue-400 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full ${item.avatarColor} font-extrabold text-sm flex items-center justify-center shrink-0`}
                      >
                        {item.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-extrabold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs font-bold text-[#15803D] truncate">
                          {item.winner2022}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate tabular-nums">
                          2015: {item.winner2015} · {item.margin2015}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                      <div className="text-right">
                        <div className="text-base font-extrabold text-[#15803D]">
                          {item.margin2022}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold">
                          वोट से
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : selectedDistrict ? (
          /* LEVEL 2: District Summary + Janpad Samitis List (matches XRecorder 00:58) */
          <div className="space-y-3.5">
            <div className="grid grid-cols-4 gap-2 text-center tabular-nums">
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">
                  {MP_DISTRICT_COUNTS[selectedDistrict[0]]?.total || 420}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  सरपंच
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">51%</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  महिलाएँ
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">6</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  निर्विरोध
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="text-lg font-extrabold text-slate-900">
                  1 वोट
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  सबसे कम अंतर
                </div>
              </div>
            </div>

            <div className="text-xs font-extrabold text-slate-500 px-1">
              समितियाँ ({selectedDistrict[2].length})
            </div>

            <div className="space-y-2.5">
              {selectedDistrict[2].map((blk) => (
                <button
                  key={blk[0]}
                  type="button"
                  onClick={() => setSelectedBlock(blk)}
                  className="w-full bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-blue-400 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {blk[1]}
                    </div>
                    <div className="text-xs font-bold text-[#15803D] mt-0.5 tabular-nums">
                      {blk[2].length} प्रमुख पंचायतें · सबके रिज़ल्ट
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-16 h-2 rounded-full bg-[#16A34A]" />
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* LEVEL 1: Root Election Results Screen (matches XRecorder 00:50 & 02:59) */
          <div className="space-y-3.5">
            {/* Direct Search Matches */}
            {matchingGps.length > 0 && (
              <div className="bg-white rounded-2xl p-3.5 border border-blue-200 space-y-2">
                <div className="text-xs font-extrabold text-[#1D4ED8]">
                  सीधे मिली ग्राम पंचायतें ({matchingGps.length}):
                </div>
                <div className="divide-y divide-slate-100">
                  {matchingGps.map(({ district, block, gp }) => (
                    <button
                      key={gp[0]}
                      type="button"
                      onClick={() => {
                        setSelectedDistrict(district);
                        setSelectedBlock(block);
                        setDetailTab('sarpanch');
                        setSelectedGp({
                          id: gp[0],
                          name: gp[1],
                          tehsil: `${block[1]} जनपद`,
                          district: `${district[1]} (मध्य प्रदेश)`,
                          voters: Number(gp[2]) || 3400,
                          villages:
                            Array.isArray(gp[3]) && gp[3].length
                              ? gp[3]
                              : [gp[1]],
                        });
                      }}
                      className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {gp[1]}
                        </div>
                        <div className="text-xs text-slate-500">
                          ज़िला {district[1]} · {block[1]}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* आपकी पंचायत Card (matches XRecorder 02:59) */}
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold text-slate-500 px-1">
                आपकी पंचायत
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailTab('sarpanch');
                  setSelectedGp({
                    id:
                      activePanchayatId ||
                      phuleraData.roll.panchayat ||
                      'sehore/sehore/mahodiya',
                    name: phuleraData.roll.name,
                    tehsil: phuleraData.roll.tehsil,
                    district: phuleraData.roll.district,
                    voters: phuleraData.result.electorate,
                    villages: phuleraData.roll.villages.map((v) => v.name),
                  });
                }}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-blue-400 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {phuleraData.roll.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {phuleraData.roll.name}
                    </div>
                    <div className="text-xs font-bold text-[#15803D] tabular-nums">
                      {phuleraData.result.winner} ·{' '}
                      {phuleraData.result.win_votes -
                        phuleraData.result.runner_votes}{' '}
                      वोट से
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* ज़िले से देखें (55 ज़िले) */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-500 px-1">
                ज़िले से देखें ({filteredDistricts.length} ज़िले)
              </div>

              <div className="space-y-2.5">
                {filteredDistricts.map((d) => {
                  const counts = MP_DISTRICT_COUNTS[d[0]] || {
                    total: 380,
                    done: 380,
                  };
                  const pct = Math.round((counts.done / counts.total) * 100);
                  return (
                    <button
                      key={d[0]}
                      type="button"
                      onClick={() => setSelectedDistrict(d)}
                      className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3 hover:border-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-extrabold text-slate-900">
                          {d[1]}
                        </div>
                        <div className="text-xs font-bold text-[#15803D] mt-0.5 tabular-nums">
                          {counts.total} पंचायतें ·{' '}
                          {pct === 100
                            ? 'सबके रिज़ल्ट'
                            : `${counts.done} रिज़ल्ट`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-[#16A34A] rounded-full"
                          />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
