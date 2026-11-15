import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  FileText,
  ListChecks,
  MessageCircle,
  Mic,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  FamilySummary,
  ParchiSettings,
  PersonNode,
  VoterLeaning,
  VoteTally,
} from '../types/sarpanch';
import { classifyVoterSide } from '../utils/electionEngine';
import { matchesSearchQuery } from '../utils/hindiSearch';
import { startHindiVoiceSearch } from '../utils/voiceSearch';

interface PollDayScreenProps {
  panchayatName: string;
  myCandidateName?: string;
  parchiSettings?: ParchiSettings;
  totalBooths: number;
  electionDateLabel: string;
  families: FamilySummary[];
  allVoters: PersonNode[];
  leaningMap: Map<string, VoterLeaning>;
  turnoutSet: Set<string>;
  tally: VoteTally;
  pollHideLeaning?: boolean;
  onBack: () => void;
  onToggleVoterTurnout: (voterId: string, voterName?: string) => void;
  onOpenFamilyParchi: (family: FamilySummary) => void;
  onToast?: (msg: string) => void;
}

export const PollDayScreen: React.FC<PollDayScreenProps> = ({
  panchayatName,
  myCandidateName = 'सरपंच उम्मीदवार',
  parchiSettings = {
    perPage: 4,
    showPoster: true,
    posterTagline: 'गाँव के विकास के लिए आपका अपना उम्मीदवार',
    symbolText: 'छाता',
  },
  totalBooths,
  electionDateLabel,
  families,
  allVoters,
  leaningMap,
  turnoutSet,
  tally,
  pollHideLeaning = false,
  onBack,
  onToggleVoterTurnout,
  onOpenFamilyParchi,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'parchi' | 'serial' | 'hisab'>(
    'parchi'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooth, setSelectedBooth] = useState<number>(1);
  const [serialInput, setSerialInput] = useState<string>('827');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [onlyPendingUsFilter, setOnlyPendingUsFilter] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(40);

  const selectedFamily = useMemo(() => {
    if (!selectedFamilyId) return null;
    return families.find((f) => f.id === selectedFamilyId) || null;
  }, [families, selectedFamilyId]);

  const activeVoters = useMemo(
    () => allVoters.filter((v) => v.v === 1 && v.act === 1),
    [allVoters]
  );

  const totalPolled = turnoutSet.size;
  const totalVoters = Math.max(tally.totalVoters, 1);
  const totalPolledPct = Math.round((totalPolled / totalVoters) * 100);

  const filteredFamilies = useMemo(() => {
    const q = searchQuery.trim();
    let list = [...families].sort((a, b) => b.totalVoters - a.totalVoters);
    if (onlyPendingUsFilter) {
      list = list.filter(
        (f) => f.counts.us > 0 && f.votedCount < f.totalVoters
      );
    }
    if (!q) return list;
    return list.filter((f) =>
      matchesSearchQuery(
        [
          f.displayTitle,
          f.headName,
          f.house,
          `मकान ${f.house}`,
          `वार्ड ${f.ward}`,
          f.caste,
          ...f.voters.map(
            (v) => `${v.n} ${v.rv || ''} ${v.e || ''} ${v.sr || ''}`
          ),
        ],
        q
      )
    );
  }, [families, searchQuery, onlyPendingUsFilter]);

  // Booth breakdown for Booth pills on 'क्रम से टिक'
  const boothPills = useMemo(() => {
    const map = new Map<number, { total: number; voted: number }>();
    for (let b = 1; b <= Math.max(totalBooths, 3); b++) {
      map.set(b, { total: 0, voted: 0 });
    }
    for (const v of activeVoters) {
      const b = v.b || 1;
      const entry = map.get(b) || { total: 0, voted: 0 };
      entry.total += 1;
      if (turnoutSet.has(v.id)) entry.voted += 1;
      map.set(b, entry);
    }
    return Array.from(map.entries()).map(([booth, stats]) => ({
      booth,
      total: stats.total,
      voted: stats.voted,
    }));
  }, [activeVoters, turnoutSet, totalBooths]);

  // Matched voters from space/comma-separated serial numbers in 'क्रम से टिक'
  const matchedSerialVoters = useMemo(() => {
    const nums = serialInput
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (nums.length === 0) return [];
    const results: PersonNode[] = [];
    for (const num of nums) {
      const found =
        activeVoters.find(
          (v) => (v.b || 1) === selectedBooth && v.sr === num
        ) || activeVoters.find((v) => v.sr === num);
      if (found && !results.some((r) => r.id === found.id)) {
        results.push(found);
      }
    }
    return results;
  }, [serialInput, activeVoters, selectedBooth]);

  // Detailed Turnout Hisab (matches XRecorder 05:13-05:20)
  const turnoutHisab = useMemo(() => {
    let usVoted = 0;
    let themVoted = 0;
    let undVoted = 0;

    const wardTurnoutMap = new Map<
      number,
      { polled: number; total: number; usVoted: number; usRemaining: number }
    >();

    for (const v of activeVoters) {
      const w = v.w || 1;
      const wEntry = wardTurnoutMap.get(w) || {
        polled: 0,
        total: 0,
        usVoted: 0,
        usRemaining: 0,
      };
      wEntry.total += 1;

      const side = classifyVoterSide(leaningMap.get(v.id));
      const isVoted = turnoutSet.has(v.id);

      if (isVoted) {
        wEntry.polled += 1;
        if (side === 'us') {
          usVoted += 1;
          wEntry.usVoted += 1;
        } else if (side === 'c2' || side === 'c3' || side === 'them') {
          themVoted += 1;
        } else if (side === 'undecided') {
          undVoted += 1;
        }
      } else if (side === 'us') {
        wEntry.usRemaining += 1;
      }

      wardTurnoutMap.set(w, wEntry);
    }

    const safeWinTarget = Math.floor(totalVoters * 0.42);
    const neededForWin = Math.max(0, safeWinTarget - usVoted);

    const wardRows = Array.from(wardTurnoutMap.entries())
      .map(([ward, info]) => ({ ward, ...info }))
      .sort((a, b) => a.ward - b.ward);

    return {
      usVoted,
      usRemaining: Math.max(0, tally.us - usVoted),
      usPct: tally.us > 0 ? Math.round((usVoted / tally.us) * 100) : 0,
      themVoted,
      themRemaining: Math.max(0, tally.them - themVoted),
      themPct: tally.them > 0 ? Math.round((themVoted / tally.them) * 100) : 0,
      undVoted,
      undPct:
        tally.undecided > 0
          ? Math.round((undVoted / tally.undecided) * 100)
          : 0,
      safeWinTarget,
      neededForWin,
      wardRows,
    };
  }, [activeVoters, leaningMap, turnoutSet, tally, totalVoters]);

  const handleVoiceSearch = () => {
    startHindiVoiceSearch({
      fallbackSuggestions: ['रामनारायण', 'बृजभूषण', 'मोहनलाल', '827'],
      currentQuery: searchQuery,
      onStatus: (msg) => onToast && onToast(msg),
      onResult: (transcript) => {
        setSearchQuery(transcript);
      },
    });
  };

  // Full-Screen Family Poll Slip View (matches Video 2 01:12)
  if (selectedFamily) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
        <header className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setSelectedFamilyId(null)}
              className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>पीछे</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenFamilyParchi(selectedFamily)}
                className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिंट करें</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFamilyParchi(selectedFamily)}
                className="px-3 py-1.5 rounded-full bg-[#16A34A] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-extrabold">
                {selectedFamily.displayTitle}
              </h1>
              <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
                वार्ड {selectedFamily.ward} · मकान {selectedFamily.house} · बूथ{' '}
                {selectedFamily.booth}
              </p>
            </div>
            <div className="text-right tabular-nums shrink-0">
              <div className="text-xl font-extrabold">
                {selectedFamily.votedCount}/{selectedFamily.totalVoters}
              </div>
              <div className="text-[11px] text-blue-100">वोट दे आए</div>
            </div>
          </div>
        </header>

        <div className="p-3.5 space-y-3 flex-1">
          <div className="text-xs font-bold text-slate-500 text-center">
            वोट डाल आए तो नाम पर टैप करें
          </div>

          {selectedFamily.voters.map((v) => {
            const isVoted = turnoutSet.has(v.id);
            const isFemale = v.g === 'f';
            const side = classifyVoterSide(leaningMap.get(v.id));
            return (
              <div
                key={v.id}
                onClick={() => onToggleVoterTurnout(v.id, v.n)}
                className={`rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
                  isVoted
                    ? 'bg-[#ECFDF5] border-[#16A34A]'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Candidate Poster Banner on top of every slip (matches Video 2 01:12) */}
                {parchiSettings.showPoster && (
                  <div className="bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#1E3A8A] text-white px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-amber-300 text-slate-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {myCandidateName.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-amber-300 truncate">
                          {myCandidateName}
                        </div>
                        <div className="text-[10px] text-emerald-100 truncate">
                          सरपंच प्रत्याशी · ग्राम पंचायत {panchayatName}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-white text-slate-900 text-[10px] font-extrabold shrink-0">
                      ☂️ {parchiSettings.symbolText}
                    </span>
                  </div>
                )}

                {/* Slip Header Bar */}
                <div
                  className={`px-3 py-1.5 text-white flex items-center justify-between text-xs font-extrabold ${
                    isFemale ? 'bg-[#DB2777]' : 'bg-[#1D4ED8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-slate-900 px-2 py-0.5 rounded text-xs font-extrabold tabular-nums">
                      {v.sr}
                    </span>
                    <span className="font-mono-code text-[11px]">{v.e}</span>
                  </div>

                  {isVoted ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[11px] font-extrabold flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>वोट दे आए</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                      बाकी
                    </span>
                  )}
                </div>

                {/* Slip Body */}
                <div className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {v.n}{' '}
                      <span className="text-xs font-bold text-slate-500">
                        · उम्र {v.a}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      {v.r}: {v.rv} · वार्ड {v.w} · मकान {v.h}
                    </div>
                  </div>
                  {!pollHideLeaning && (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold shrink-0 ${
                        side === 'us'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : side === 'undecided'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {side === 'us'
                        ? 'पक्ष'
                        : side === 'undecided'
                        ? 'डांवाडोल'
                        : 'अन्य'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Royal Blue Header */}
      <header className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>पीछे</span>
          </button>

          <span className="px-2.5 py-0.5 rounded-full bg-[#FBBF24] text-slate-900 text-[11px] font-extrabold">
            डेमो
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              पोलिंग के दिन
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
              {panchayatName} · {totalBooths} बूथ · {electionDateLabel}
            </p>
          </div>

          <div className="text-right tabular-nums">
            <div>
              <span className="text-2xl font-extrabold">
                {totalPolled.toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-blue-200 font-bold">
                /{totalVoters.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-[11px] text-blue-100">वोट दे आए</div>
          </div>
        </div>

        {/* Search Input on Parchi Tab */}
        {activeTab === 'parchi' && (
          <div className="mt-3 bg-white rounded-2xl px-3.5 py-2 flex items-center gap-2 text-slate-900">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम, पिता या मुखिया का नाम"
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
                className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area by Tab */}
      <div className="flex-1 p-3.5 overflow-y-auto">
        {/* TAB 1: पर्ची (Family Poll Cards) */}
        {activeTab === 'parchi' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>परिवार {filteredFamilies.length}</span>
              {onlyPendingUsFilter ? (
                <button
                  type="button"
                  onClick={() => setOnlyPendingUsFilter(false)}
                  className="text-[#1D4ED8] font-extrabold underline cursor-pointer"
                >
                  सारे परिवार दिखाएँ
                </button>
              ) : (
                <span>परिवार पर टैप करें</span>
              )}
            </div>

            {filteredFamilies.slice(0, visibleLimit).map((fam) => (
              <button
                key={fam.id}
                type="button"
                onClick={() => setSelectedFamilyId(fam.id)}
                className="w-full bg-[#FEFCE8] hover:bg-[#FEF9C3] border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold text-slate-900 truncate">
                      {fam.displayTitle}
                    </div>
                    <div className="text-xs text-slate-500 font-medium tabular-nums">
                      वार्ड {fam.ward} · मकान {fam.house} · बूथ {fam.booth}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="text-right tabular-nums">
                    <div>
                      <span className="text-base font-extrabold text-[#15803D]">
                        {fam.votedCount}
                      </span>
                      <span className="text-xs text-slate-600 font-bold">
                        /{fam.totalVoters}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">आए</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </button>
            ))}

            {filteredFamilies.length > visibleLimit && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 60)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-extrabold text-slate-700 cursor-pointer"
                >
                  और परिवार देखें ({filteredFamilies.length - visibleLimit})
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: क्रम से टिक (matches XRecorder 05:07 & Video 2 01:06) */}
        {activeTab === 'serial' && (
          <div className="space-y-3.5">
            {/* Booth Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {boothPills.map((bp) => {
                const isAct = selectedBooth === bp.booth;
                return (
                  <button
                    key={bp.booth}
                    type="button"
                    onClick={() => setSelectedBooth(bp.booth)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap tabular-nums cursor-pointer ${
                      isAct
                        ? 'bg-[#1D4ED8] text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    बूथ {bp.booth} · {bp.voted}/{bp.total}
                  </button>
                );
              })}
            </div>

            {/* Serial Input Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border-2 border-[#1D4ED8] px-3 py-2 bg-white">
                <span className="text-xs font-extrabold text-slate-400 shrink-0">
                  क्रम नंबर
                </span>
                <input
                  type="text"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="एक या कई नंबर (12 45 78)"
                  className="flex-1 text-base font-extrabold text-slate-900 focus:outline-none tabular-nums"
                />
                {serialInput ? (
                  <button
                    type="button"
                    onClick={() => setSerialInput('')}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
                <span className="w-7 h-7 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Mic className="w-3.5 h-3.5" />
                </span>
              </div>

              {matchedSerialVoters.length > 0 ? (
                <div className="space-y-2.5">
                  {matchedSerialVoters.map((v) => {
                    const isVoted = turnoutSet.has(v.id);
                    const side = classifyVoterSide(leaningMap.get(v.id));
                    return (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-1 rounded-lg bg-[#1D4ED8] text-white text-xs font-extrabold tabular-nums">
                            {v.sr}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900 truncate">
                              {v.n}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {v.r}: {v.rv} · उम्र {v.a} · वार्ड {v.w}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!pollHideLeaning && (
                            <span
                              className={`text-xs font-extrabold ${
                                side === 'us'
                                  ? 'text-[#15803D]'
                                  : 'text-slate-500'
                              }`}
                            >
                              ● {side === 'us' ? 'पक्ष' : 'अन्य'}
                            </span>
                          )}
                          {isVoted && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#15803D] text-[10px] font-extrabold">
                              टिक हो गया ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      for (const v of matchedSerialVoters) {
                        if (!turnoutSet.has(v.id)) {
                          onToggleVoterTurnout(v.id, v.n);
                        }
                      }
                      if (onToast) {
                        onToast(
                          `${matchedSerialVoters.length} वोटर 'वोट दे आए' में टिक किए गए`
                        );
                      }
                      setSerialInput('');
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-extrabold cursor-pointer tabular-nums"
                  >
                    {matchedSerialVoters.length} वोट दे आए
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-2">
                  बूथ {selectedBooth} का क्रम नंबर ऊपर लिखें (जैसे 827)
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: हिसाब (matches XRecorder 05:13-05:20 & Video 2 01:17) */}
        {activeTab === 'hisab' && (
          <div className="space-y-3.5">
            {/* Card 1: वोट दे आए */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    वोट दे आए
                  </div>
                  <div className="mt-0.5 tabular-nums">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {totalPolled.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      {' '}
                      / {totalVoters.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <span className="text-2xl font-extrabold text-[#15803D] tabular-nums">
                  {totalPolledPct}%
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{ width: `${totalPolledPct}%` }}
                  className="h-full bg-[#16A34A] rounded-full"
                />
              </div>

              {!pollHideLeaning && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center divide-x divide-slate-100 tabular-nums">
                  <div>
                    <div className="text-base font-extrabold text-[#15803D]">
                      {turnoutHisab.usVoted}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      ● पक्ष · {turnoutHisab.usPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-[#B91C1C]">
                      {turnoutHisab.themVoted}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      ● विपक्ष · {turnoutHisab.themPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-[#D97706]">
                      {turnoutHisab.undVoted}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      ● डांवाडोल · {turnoutHisab.undPct}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: पक्ष के आए vs जीत के लिए और */}
            {!pollHideLeaning && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3 divide-x divide-slate-100 tabular-nums">
                  <div>
                    <div className="text-xs font-bold text-slate-500">
                      पक्ष के आए
                    </div>
                    <div className="text-2xl font-extrabold text-[#15803D] mt-0.5">
                      {turnoutHisab.usVoted}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold">
                      {tally.us.toLocaleString('en-IN')} में से
                    </div>
                  </div>
                  <div className="pl-3 text-right">
                    <div className="text-xs font-bold text-slate-500">
                      जीत के लिए और
                    </div>
                    <div className="text-2xl font-extrabold text-[#D97706] mt-0.5">
                      {turnoutHisab.neededForWin}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold">
                      {turnoutHisab.safeWinTarget.toLocaleString('en-IN')} चाहिए
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOnlyPendingUsFilter(true);
                    setActiveTab('parchi');
                  }}
                  className="w-full bg-[#ECFDF5] hover:bg-emerald-100 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-extrabold text-[#15803D] cursor-pointer tabular-nums"
                >
                  <span>पक्ष के {turnoutHisab.usRemaining} नहीं आए</span>
                  <span className="inline-flex items-center gap-0.5">
                    <span>परिवार देखें</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            )}

            {/* Card 3: अभी किसे बुलाएँ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  अभी किसे बुलाएँ
                </h3>
                <p className="text-xs text-slate-500">
                  जिन परिवारों में पक्ष के वोट अभी नहीं आए
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {families
                  .filter(
                    (f) => f.counts.us > 0 && f.votedCount < f.totalVoters
                  )
                  .slice(0, 5)
                  .map((fam) => {
                    const rem = fam.totalVoters - fam.votedCount;
                    return (
                      <button
                        key={fam.id}
                        type="button"
                        onClick={() => setSelectedFamilyId(fam.id)}
                        className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer"
                      >
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {fam.displayTitle}
                          </div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            वार्ड {fam.ward} · मकान {fam.house} · बूथ{' '}
                            {fam.booth} · {fam.votedCount}/{fam.totalVoters} आए
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#15803D] text-xs font-extrabold shrink-0 tabular-nums flex items-center gap-0.5">
                          <span>{rem} बाकी</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Card 4: वार्ड वाइज़ (matches XRecorder 05:19) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                <span>वार्ड वाइज़</span>
                <span>वोट पड़े · पक्ष आए · पक्ष बाकी</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs tabular-nums">
                {turnoutHisab.wardRows.map((w) => (
                  <div
                    key={w.ward}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span className="font-extrabold text-slate-900 w-16">
                      वार्ड {w.ward}
                    </span>
                    <span className="text-slate-600 font-semibold">
                      {w.polled}/{w.total} ({Math.round((w.polled / Math.max(w.total, 1)) * 100)}%)
                    </span>
                    <span className="font-extrabold text-[#15803D]">
                      {w.usVoted} आए
                    </span>
                    <span className="font-extrabold text-[#B91C1C]">
                      {w.usRemaining} बाकी
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 5: हर घंटे कितने वोट दे आए (matches XRecorder 05:20) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                हर घंटे कितने वोट दे आए
              </h3>
              <div className="space-y-2 tabular-nums">
                {[
                  { label: '7 बजे', count: Math.round(totalPolled * 0.06) },
                  { label: '8 बजे', count: Math.round(totalPolled * 0.11) },
                  { label: '9 बजे', count: Math.round(totalPolled * 0.15) },
                  { label: '10 बजे', count: Math.round(totalPolled * 0.19) },
                  { label: '11 बजे', count: Math.round(totalPolled * 0.18) },
                  { label: '12 बजे', count: Math.round(totalPolled * 0.14) },
                  { label: '1 बजे', count: Math.round(totalPolled * 0.1) },
                  { label: '2 बजे', count: Math.round(totalPolled * 0.07) },
                ].map((h) => {
                  const maxH = Math.max(Math.round(totalPolled * 0.2), 1);
                  const pct = Math.min(100, Math.round((h.count / maxH) * 100));
                  return (
                    <div key={h.label} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 w-12 shrink-0">
                        {h.label}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-[#3B82F6] rounded-full"
                        />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 w-10 text-right shrink-0">
                        {h.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom 3-Tab Navigation Bar: पर्ची | क्रम से टिक | हिसाब */}
      <nav
        aria-label="पोलिंग मोड टैब"
        className="bg-white border-t border-slate-200 grid grid-cols-3 h-14 shrink-0"
      >
        <button
          type="button"
          onClick={() => setActiveTab('parchi')}
          className={`flex flex-col items-center justify-center gap-0.5 text-xs font-extrabold cursor-pointer ${
            activeTab === 'parchi' ? 'text-[#1D4ED8]' : 'text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>पर्ची</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('serial')}
          className={`flex flex-col items-center justify-center gap-0.5 text-xs font-extrabold cursor-pointer ${
            activeTab === 'serial' ? 'text-[#1D4ED8]' : 'text-slate-400'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>क्रम से टिक</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hisab')}
          className={`flex flex-col items-center justify-center gap-0.5 text-xs font-extrabold cursor-pointer ${
            activeTab === 'hisab' ? 'text-[#1D4ED8]' : 'text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>हिसाब</span>
        </button>
      </nav>
    </div>
  );
};
