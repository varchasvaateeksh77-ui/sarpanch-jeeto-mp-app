import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart2,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Home,
  ListChecks,
  MessageCircle,
  Mic,
  Play,
  Printer,
  Radio,
  Search,
  Settings,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AppRoute,
  CandidateInfo,
  FamilySummary,
  PersonNode,
  SideKey,
  VoterLeaning,
  VoteTally,
} from '../types/sarpanch';
import { classifyVoterSide } from '../utils/electionEngine';
import { matchesSearchQuery } from '../utils/hindiSearch';
import { startHindiVoiceSearch } from '../utils/voiceSearch';

interface HomeDashboardProps {
  panchayatName: string;
  tehsilName?: string;
  districtName?: string;
  isDemo: boolean;
  tally: VoteTally;
  candidates: CandidateInfo[];
  totalFamilies: number;
  totalWards: number;
  topFamilies: FamilySummary[];
  allFamilies?: FamilySummary[];
  allVoters?: PersonNode[];
  leaningMap?: Map<string, VoterLeaning>;
  liveConnected?: boolean;
  liveVersion?: number;
  lastLiveEventText?: string | null;
  onSimulateWorkerTick?: () => void;
  onNavigate: (route: AppRoute) => void;
  onUpdateVoterLeaning?: (voterId: string, side: SideKey) => void;
  onOpenFamilyParchi?: (family: FamilySummary) => void;
  onShareWhatsApp: () => void;
  onOpenSettings: () => void;
  onOpenMereChunav: () => void;
  onOpenVideoWalkthrough: () => void;
  onInstallApp?: () => void;
  onToast?: (msg: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  panchayatName,
  tehsilName,
  districtName,
  tally,
  candidates,
  totalFamilies,
  totalWards,
  topFamilies,
  allFamilies = [],
  allVoters = [],
  leaningMap,
  liveConnected = true,
  liveVersion = 1,
  lastLiveEventText,
  onSimulateWorkerTick,
  onNavigate,
  onUpdateVoterLeaning,
  onOpenFamilyParchi,
  onShareWhatsApp,
  onOpenSettings,
  onOpenMereChunav,
  onOpenVideoWalkthrough,
  onInstallApp,
  onToast,
}) => {
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const c2Name =
    candidates.find((c) => c.id === 2)?.name || 'विपक्ष उम्मीदवार 1';
  const c3Name =
    candidates.find((c) => c.id === 3)?.name || 'विपक्ष उम्मीदवार 2';

  const previewFamily = topFamilies[0];
  const previewVoter1 = previewFamily?.voters?.[0];
  const previewVoter2 = previewFamily?.voters?.[1] || previewVoter1;

  const total = Math.max(tally.totalVoters, 1);
  const usPct = (tally.us / total) * 100;
  const themPct = (tally.them / total) * 100;
  const undPct = (tally.undecided / total) * 100;
  const remPct = Math.max(0, 100 - usPct - themPct - undPct);

  const familiesToSearch = allFamilies.length > 0 ? allFamilies : topFamilies;

  // Live instant search across families and individual voters (Hindi + Hinglish/English + House # + Ward + EPIC)
  const matchingFamilies = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return familiesToSearch
      .filter((fam) =>
        matchesSearchQuery(
          [
            fam.displayTitle,
            fam.headName,
            fam.house,
            `मकान ${fam.house}`,
            `वार्ड ${fam.ward}`,
            fam.caste,
            fam.boothName,
            ...fam.voters.map(
              (v) => `${v.n} ${v.rv || ''} ${v.e || ''} ${v.sr || ''}`
            ),
          ],
          q
        )
      )
      .slice(0, 8);
  }, [familiesToSearch, searchQuery]);

  const matchingVoters = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return allVoters
      .filter(
        (p) =>
          p.v === 1 &&
          p.act === 1 &&
          matchesSearchQuery(
            [
              p.n,
              p.rv,
              p.e,
              p.sr,
              p.h,
              `मकान ${p.h}`,
              `वार्ड ${p.w}`,
              p.cs,
            ],
            q
          )
      )
      .slice(0, 15);
  }, [allVoters, searchQuery]);

  const handleVoiceSearch = () => {
    startHindiVoiceSearch({
      fallbackSuggestions: [
        previewFamily?.headName.split(' ')[0] || 'लक्ष्मीनारायण',
        'मकान 10',
        'वार्ड 1',
        'मीणा',
        'पाटीदार',
      ],
      currentQuery: searchQuery,
      onStatus: (msg) => onToast && onToast(msg),
      onResult: (transcript) => {
        setSearchQuery(transcript);
      },
    });
  };

  const sideCards: {
    key: SideKey;
    label: string;
    count: number;
    numColor: string;
    dotColor: string;
    bgColor: string;
  }[] = [
    {
      key: 'us',
      label: 'पक्ष',
      count: tally.us,
      numColor: 'text-[#15803D]',
      dotColor: 'bg-[#16A34A]',
      bgColor: 'bg-[#F0FDF4]',
    },
    {
      key: 'them',
      label: 'विपक्ष',
      count: tally.them,
      numColor: 'text-[#B91C1C]',
      dotColor: 'bg-[#DC2626]',
      bgColor: 'bg-[#FEF2F2]',
    },
    {
      key: 'c2',
      label: c2Name,
      count: tally.c2,
      numColor: 'text-[#991B1B]',
      dotColor: 'bg-[#DC2626]',
      bgColor: 'bg-[#FEF2F2]',
    },
    {
      key: 'c3',
      label: c3Name,
      count: tally.c3,
      numColor: 'text-[#5B21B6]',
      dotColor: 'bg-[#7C3AED]',
      bgColor: 'bg-[#F5F3FF]',
    },
    {
      key: 'undecided',
      label: 'डांवाडोल',
      count: tally.undecided,
      numColor: 'text-[#92400E]',
      dotColor: 'bg-[#D97706]',
      bgColor: 'bg-[#FFFBEB]',
    },
    {
      key: 'not_asked',
      label: 'बात बाकी',
      count: tally.not_asked,
      numColor: 'text-slate-700',
      dotColor: 'bg-slate-400',
      bgColor: 'bg-slate-100',
    },
  ];

  const quickSearchChips = [
    { label: 'मकान 10', q: '10' },
    { label: 'वार्ड 1', q: 'वार्ड 1' },
    {
      label: previewFamily?.headName.split(' ')[0] || 'लक्ष्मीनारायण',
      q: previewFamily?.headName.split(' ')[0] || 'लक्ष्मीनारायण',
    },
    {
      label: previewFamily?.caste.split(' ')[0] || 'मीणा',
      q: previewFamily?.caste.split(' ')[0] || 'मीणा',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      {/* Top Install App Strip (matches XRecorder 01:33) */}
      {showInstallBanner && (
        <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FBBF24] flex items-center justify-center shrink-0 font-extrabold text-[#1E3A8A] text-sm">
              स
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 leading-tight truncate">
                सरपंच जीतो ऐप
              </div>
              <div className="text-xs text-slate-500 leading-tight truncate">
                एक टैप में खुलेगा
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onInstallApp) onInstallApp();
                setShowInstallBanner(false);
              }}
              className="px-4 py-1.5 rounded-full bg-[#1D4ED8] text-white text-xs font-bold hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              इंस्टॉल
            </button>
            <button
              type="button"
              aria-label="बैनर बंद करें"
              onClick={() => setShowInstallBanner(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Royal Blue Panchayat Header */}
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-11 rounded-b-[28px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenMereChunav}
                className="inline-flex items-center gap-2 text-left cursor-pointer group"
              >
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {panchayatName}
                </h1>
                <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-[#FBBF24] text-slate-900 text-xs font-extrabold group-hover:bg-amber-300 transition-colors">
                  <span>सक्रिय</span>
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </button>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-emerald-200 tabular-nums">
                <Radio className="w-2.5 h-2.5 text-emerald-300" />
                <span>{liveConnected ? `LIVE v${liveVersion}` : 'सक्रिय'}</span>
              </span>
            </div>
            {(tehsilName || districtName) && (
              <div className="text-xs text-blue-200 font-semibold mt-0.5">
                {tehsilName} {districtName ? `· ${districtName}` : ''}
              </div>
            )}
            <p className="text-sm text-blue-100 mt-0.5 tabular-nums font-medium">
              {tally.totalVoters.toLocaleString('en-IN')} वोट · {totalFamilies}{' '}
              परिवार · {totalWards} वार्ड
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <span className="w-10 h-10 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors">
                <MessageCircle className="w-5 h-5 text-white" />
              </span>
              <span className="text-[11px] text-blue-100 font-medium whitespace-nowrap">
                ऐप भेजें
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <span className="w-10 h-10 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors">
                <Settings className="w-5 h-5 text-white" />
              </span>
              <span className="text-[11px] text-blue-100 font-medium whitespace-nowrap">
                सेटिंग
              </span>
            </button>
          </div>
        </div>

        {/* REAL Interactive Search Bar inside Header (supports Hindi + English/Hinglish + House # + EPIC) */}
        <div className="mt-3 bg-white rounded-2xl px-3.5 py-2 flex items-center gap-2 text-slate-900 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम, मकान नंबर, जाति या EPIC लिखें (हिंदी / English)"
            aria-label="नाम या मकान नंबर लिखें"
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="खोज साफ़ करें"
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleVoiceSearch}
            aria-label="बोलकर खोजें"
            className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Search Chips inside Header when focused or searching */}
        {(searchFocused || searchQuery.trim().length > 0) && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-blue-200 shrink-0">
              तुरंत खोजें:
            </span>
            {quickSearchChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setSearchQuery(chip.q)}
                className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                onNavigate({
                  screen: 'search',
                  initialQuery: searchQuery.trim() || undefined,
                })
              }
              className="px-2.5 py-0.5 rounded-full bg-[#FBBF24] text-slate-900 text-[11px] font-extrabold whitespace-nowrap cursor-pointer"
            >
              उम्र व वार्ड फ़िल्टर →
            </button>
          </div>
        )}
      </div>

      {/* Main Content Container */}
      <div className="px-3.5 -mt-6 space-y-3.5 flex-1">
        {/* LIVE INSTANT SEARCH RESULTS PANEL (when user types in the search bar) */}
        {searchQuery.trim().length > 0 && (
          <div className="bg-white rounded-2xl p-4 border-2 border-[#1D4ED8] space-y-3 shadow-md">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  खोज परिणाम: &ldquo;{searchQuery}&rdquo; ({panchayatName})
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold tabular-nums">
                  {matchingFamilies.length} परिवार · {matchingVoters.length}{' '}
                  मतदाता मिले
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({
                      screen: 'search',
                      initialQuery: searchQuery.trim(),
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] text-xs font-extrabold cursor-pointer"
                >
                  सारे देखें
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchFocused(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  बंद करें
                </button>
              </div>
            </div>

            {matchingFamilies.length === 0 && matchingVoters.length === 0 ? (
              <div className="py-5 text-center space-y-2">
                <div className="text-sm font-extrabold text-slate-700">
                  &ldquo;{searchQuery}&rdquo; से कोई वोटर या मकान नहीं मिला
                </div>
                <p className="text-xs text-slate-500">
                  हिंदी या English में नाम (जैसे &ldquo;लक्ष्मी&rdquo; या
                  &ldquo;lakshmi&rdquo;), जाति (&ldquo;meena&rdquo;,
                  &ldquo;patidar&rdquo;) या मकान नंबर (&ldquo;10&rdquo;) लिखें
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-0.5">
                {/* Matching Families Section */}
                {matchingFamilies.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase">
                      परिवार ({matchingFamilies.length})
                    </div>
                    {matchingFamilies.slice(0, 4).map((fam) => (
                      <div
                        key={fam.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate({ screen: 'family', familyId: fam.id })
                          }
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {fam.displayTitle}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold tabular-nums">
                            वार्ड {fam.ward} · मकान {fam.house} · {fam.caste} ·{' '}
                            <strong className="text-[#1D4ED8]">
                              {fam.totalVoters} वोट
                            </strong>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenFamilyParchi && (
                            <button
                              type="button"
                              onClick={() => onOpenFamilyParchi(fam)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-[#1D4ED8]" />
                              <span>पर्ची</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate({ screen: 'family', familyId: fam.id })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-[#1D4ED8] text-white text-[11px] font-extrabold cursor-pointer"
                          >
                            खोलें →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Matching Individual Voters Section */}
                {matchingVoters.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase">
                      मतदाता ({matchingVoters.length})
                    </div>
                    {matchingVoters.slice(0, 8).map((v) => {
                      const side = classifyVoterSide(leaningMap?.get(v.id));
                      return (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#1D4ED8] text-[10px] font-extrabold tabular-nums">
                                  #{v.sr}
                                </span>
                                <span className="text-sm font-extrabold text-slate-900">
                                  {v.n}
                                </span>
                                <span className="text-xs font-bold text-slate-500">
                                  ({v.a} वर्ष)
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {v.r || 'पिता'}: {v.rv || '—'} · वार्ड {v.w} ·
                                मकान {v.h}
                              </div>
                              <div className="text-[10px] font-mono-code text-slate-400">
                                EPIC: {v.e} · {v.cs}
                              </div>
                            </div>

                            {v.fam && (
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigate({
                                    screen: 'family',
                                    familyId: v.fam!,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold shrink-0 cursor-pointer"
                              >
                                परिवार →
                              </button>
                            )}
                          </div>

                          {/* 1-Tap Leaning Assignment inside Search Results */}
                          {onUpdateVoterLeaning && (
                            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => onUpdateVoterLeaning(v.id, 'us')}
                                className={`py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer flex items-center justify-center gap-1 ${
                                  side === 'us'
                                    ? 'bg-[#16A34A] text-white'
                                    : 'bg-[#F0FDF4] text-[#15803D] border border-emerald-200'
                                }`}
                              >
                                {side === 'us' && <Check className="w-3 h-3" />}
                                <span>पक्ष</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateVoterLeaning(v.id, 'c2')}
                                className={`py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer flex items-center justify-center gap-1 ${
                                  side === 'c2' ||
                                  side === 'c3' ||
                                  side === 'them'
                                    ? 'bg-[#DC2626] text-white'
                                    : 'bg-[#FEF2F2] text-[#B91C1C] border border-red-200'
                                }`}
                              >
                                {(side === 'c2' ||
                                  side === 'c3' ||
                                  side === 'them') && (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>विपक्ष</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateVoterLeaning(v.id, 'undecided')
                                }
                                className={`py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer flex items-center justify-center gap-1 ${
                                  side === 'undecided'
                                    ? 'bg-[#D97706] text-white'
                                    : 'bg-[#FFFBEB] text-[#92400E] border border-amber-200'
                                }`}
                              >
                                {side === 'undecided' && (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>डांवाडोल</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Card: ऐप कैसे चलता है · 2 मिनट (Opens Real 2-Min Video Modal) */}
        <button
          type="button"
          onClick={onOpenVideoWalkthrough}
          className="w-full bg-white rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between text-left hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 rounded-xl bg-amber-700 text-white p-1.5 flex flex-col justify-between shrink-0 text-[9px] font-extrabold leading-tight text-center">
              <span className="bg-black/25 rounded px-0.5">सरपंच जीतो</span>
              <span className="text-[11px]">2 मिनट</span>
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900">
                ऐप कैसे चलता है
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                2 मिनट
              </div>
            </div>
          </div>
          <span className="w-11 h-11 rounded-full bg-[#DC2626] text-white flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </span>
        </button>

        {/* Card: वोटों का हिसाब (Vote Tally & Side Cards) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-extrabold text-slate-900">
              वोटों का हिसाब
            </h2>
            <span
              className={`text-xs font-extrabold tabular-nums px-2.5 py-1 rounded-full ${
                tally.leadMargin >= 0
                  ? 'bg-[#DCFCE7] text-[#15803D]'
                  : 'bg-[#FEE2E2] text-[#B91C1C]'
              }`}
            >
              {tally.leadMargin >= 0
                ? `${tally.leadMargin.toLocaleString('en-IN')} वोट से आगे`
                : `${Math.abs(tally.leadMargin).toLocaleString('en-IN')} वोट से पीछे`}
            </span>
          </div>

          {/* Stacked Bar */}
          <div
            className="h-3.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100 mb-3.5"
            role="img"
            aria-label={`पक्ष ${tally.us}, विपक्ष ${tally.them}, डांवाडोल ${tally.undecided}, बात बाकी ${tally.not_asked}`}
          >
            <div
              style={{ width: `${usPct}%` }}
              className="bg-[#16A34A] h-full transition-all"
            />
            <div
              style={{ width: `${themPct}%` }}
              className="bg-[#DC2626] h-full transition-all"
            />
            <div
              style={{ width: `${undPct}%` }}
              className="bg-[#D97706] h-full transition-all"
            />
            <div
              style={{ width: `${remPct}%` }}
              className="bg-slate-300 h-full transition-all"
            />
          </div>

          {/* Side Breakdown Cards Row */}
          <div className="grid grid-cols-3 gap-2">
            {sideCards.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate({ screen: 'side', side: item.key })}
                className={`${item.bgColor} rounded-xl p-2.5 text-left hover:opacity-90 transition-opacity cursor-pointer flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-lg font-extrabold tabular-nums leading-none ${item.numColor}`}
                  >
                    {item.count.toLocaleString('en-IN')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`}
                  />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Live Worker Activity Strip */}
          {onSimulateWorkerTick && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 text-[11px] font-bold text-slate-600 truncate">
                <Activity className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span className="truncate">
                  {lastLiveEventText || 'कार्यकर्ता अपडेट सर्वर से रियल-टाइम जुड़े हैं'}
                </span>
              </div>
              <button
                type="button"
                onClick={onSimulateWorkerTick}
                className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-blue-100 text-[#1D4ED8] text-[11px] font-extrabold shrink-0 cursor-pointer tabular-nums"
              >
                +1 लाइव टिक
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Visual Showcase: परिवार वाइज़ पर्ची & परिवार वाइज़ लिस्ट */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left: परिवार वाइज़ पर्ची */}
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'parchis' })}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden text-left flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer group"
          >
            <div className="bg-[#FCE7F3]/70 p-3 pt-4 h-36 relative overflow-hidden flex flex-col justify-center">
              {/* Back slip */}
              <div className="bg-white rounded-lg border border-pink-200 p-1.5 rotate-3 translate-x-2 -translate-y-1 opacity-90">
                <div className="bg-[#DB2777] text-white rounded px-1.5 py-0.5 flex items-center justify-between text-[10px] font-bold">
                  <span className="bg-white text-[#DB2777] px-1 rounded tabular-nums">
                    {previewVoter1?.sr || 101}
                  </span>
                  <span className="font-mono-code text-[9px]">
                    {previewVoter1?.e || 'MP37-000101'}
                  </span>
                </div>
              </div>
              {/* Front slip */}
              <div className="bg-white rounded-lg border border-blue-200 p-2 -rotate-2 -mt-2 relative z-10">
                <div className="bg-[#1D4ED8] text-white rounded px-1.5 py-0.5 flex items-center justify-between text-[10px] font-bold">
                  <span className="bg-white text-[#1D4ED8] px-1 rounded tabular-nums">
                    {previewVoter2?.sr || 102}
                  </span>
                  <span className="font-mono-code text-[9px]">
                    {previewVoter2?.e || 'MP37-000102'}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-slate-800 mt-1 truncate">
                  नाम: {previewVoter2?.n || previewFamily?.headName || 'मुखिया'}
                </div>
                <div className="text-[9px] text-slate-500 truncate">
                  {previewVoter2?.r || 'पिता'}:{' '}
                  {previewVoter2?.rv || previewFamily?.headName || '—'} · मकान{' '}
                  {previewFamily?.house || '10'}
                </div>
              </div>
            </div>
            <div className="px-3.5 py-3 flex items-center justify-between bg-white">
              <span className="text-sm font-extrabold text-slate-900">
                परिवार वाइज़ पर्ची
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Right: परिवार वाइज़ लिस्ट */}
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'parivar' })}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden text-left flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer group"
          >
            <div className="bg-[#DBEAFE]/70 p-2.5 h-36 flex flex-col justify-center gap-1.5">
              {topFamilies.slice(0, 3).map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="bg-white rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold border border-blue-100"
                >
                  <span className="text-slate-800 truncate pr-1">
                    {f.displayTitle}
                  </span>
                  <span className="text-[#1D4ED8] tabular-nums shrink-0">
                    {f.totalVoters}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-3.5 py-3 flex items-center justify-between bg-white">
              <span className="text-sm font-extrabold text-slate-900">
                परिवार वाइज़ लिस्ट
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* 2-Column Action Buttons: पंचायत को जानें & पोलिंग के दिन */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'janen' })}
            className="bg-white rounded-2xl px-4 py-3.5 border border-slate-200/80 flex items-center gap-2.5 hover:border-blue-300 transition-colors cursor-pointer text-left"
          >
            <BarChart2 className="w-5 h-5 text-[#7C3AED] shrink-0" />
            <span className="text-sm font-extrabold text-slate-900 truncate">
              पंचायत को जानें
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'poll' })}
            className="bg-white rounded-2xl px-4 py-3.5 border border-slate-200/80 flex items-center gap-2.5 hover:border-blue-300 transition-colors cursor-pointer text-left"
          >
            <CalendarCheck className="w-5 h-5 text-[#16A34A] shrink-0" />
            <span className="text-sm font-extrabold text-slate-900 truncate">
              पोलिंग के दिन
            </span>
          </button>
        </div>

        {/* 3-Column Action Row: आज का काम, चुनाव रिज़ल्ट, कार्यकर्ता */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'kaam' })}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <ListChecks className="w-5 h-5 text-[#16A34A]" />
            <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
              आज का काम
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'result' })}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-[#B45309]" />
            <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
              चुनाव रिज़ल्ट
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'team' })}
            className="bg-white rounded-2xl p-3 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <UserPlus className="w-5 h-5 text-[#1D4ED8]" />
            <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
              कार्यकर्ता
            </span>
          </button>
        </div>

        {/* 4-Column Pro Campaign Tools Strip: वंशावली, मकान वाइज़, जाति समीकरण, तेज़ टिक */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'vansh' })}
            className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex flex-col items-center justify-center gap-1 hover:border-purple-300 transition-colors cursor-pointer"
          >
            <GitBranch className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-[11px] font-extrabold text-slate-800 whitespace-nowrap">
              वंशावली
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'makan' })}
            className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex flex-col items-center justify-center gap-1 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#1D4ED8]" />
            <span className="text-[11px] font-extrabold text-slate-800 whitespace-nowrap">
              मकान वाइज़
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'jati' })}
            className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex flex-col items-center justify-center gap-1 hover:border-amber-300 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#D97706]" />
            <span className="text-[11px] font-extrabold text-slate-800 whitespace-nowrap">
              जाति वाइज़
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'tick' })}
            className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-300 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 text-[#16A34A]" />
            <span className="text-[11px] font-extrabold text-slate-800 whitespace-nowrap">
              तेज़ बूथ टिक
            </span>
          </button>
        </div>

        {/* Bottom Primary CTA: पंचायत / चुनाव बदलें */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'chunav' })}
            className="w-full h-14 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] transition-all text-white font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>पंचायत या चुनाव बदलें (55 ज़िले · म.प्र.)</span>
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
