import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  MapPin,
  Mic,
  Phone,
  Printer,
  Search,
  Star,
  Tag,
  X,
} from 'lucide-react';
import {
  AppRoute,
  CandidateInfo,
  FamilySummary,
  SideKey,
  VoterTagDef,
  VoteTally,
} from '../types/sarpanch';
import { filterAndSortFamilies } from '../utils/electionEngine';
import { startHindiVoiceSearch } from '../utils/voiceSearch';

interface ParivarListScreenProps {
  mode: 'parivar' | 'parchis' | 'side';
  initialWard?: number | null;
  initialTag?: string | null;
  activeSide?: SideKey;
  fromKaam?: boolean;
  panchayatName: string;
  wards: number[];
  tags: VoterTagDef[];
  candidates?: CandidateInfo[];
  escalatedFamilies?: string[];
  families: FamilySummary[];
  tally: VoteTally;
  onBack: () => void;
  onSelectFamily: (familyId: string) => void;
  onOpenFamilyParchi: (family: FamilySummary) => void;
  onChangeSideTab?: (side: SideKey) => void;
  onNavigate: (route: AppRoute) => void;
  onToast?: (msg: string) => void;
}

export const ParivarListScreen: React.FC<ParivarListScreenProps> = ({
  mode,
  initialWard = null,
  initialTag = null,
  activeSide = 'us',
  fromKaam = false,
  panchayatName,
  wards,
  tags,
  candidates = [],
  escalatedFamilies = [],
  families,
  tally,
  onBack,
  onSelectFamily,
  onOpenFamilyParchi,
  onChangeSideTab,
  onNavigate,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<number | null>(
    initialWard || null
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    initialTag || null
  );
  const [sortBy, setSortBy] = useState<'size_desc' | 'house_asc'>('size_desc');
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [showWardPrintModal, setShowWardPrintModal] = useState(false);

  const c2Name =
    candidates.find((c) => c.id === 2)?.name || 'क्रांति देवी';
  const c3Name =
    candidates.find((c) => c.id === 3)?.name || 'बिनोद';

  const sideMeta: Record<
    SideKey,
    { title: string; dotColor: string; pillLabel: string }
  > = {
    us: { title: 'पक्ष के वोट', dotColor: 'bg-[#16A34A]', pillLabel: 'पक्ष' },
    them: {
      title: 'विपक्ष के वोट',
      dotColor: 'bg-[#DC2626]',
      pillLabel: 'विपक्ष',
    },
    c2: {
      title: `${c2Name} के वोट`,
      dotColor: 'bg-[#DC2626]',
      pillLabel: c2Name,
    },
    c3: {
      title: `${c3Name} के वोट`,
      dotColor: 'bg-[#7C3AED]',
      pillLabel: c3Name,
    },
    undecided: {
      title: 'डांवाडोल वोट',
      dotColor: 'bg-[#D97706]',
      pillLabel: 'डांवाडोल',
    },
    no_vote: {
      title: 'वोट नहीं देंगे',
      dotColor: 'bg-slate-400',
      pillLabel: 'वोट नहीं',
    },
    not_asked: {
      title: 'बात बाकी (आज का काम)',
      dotColor: 'bg-slate-300',
      pillLabel: 'बात बाकी',
    },
  };

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tags) counts[t.id] = 0;
    for (const fam of families) {
      for (const tid of fam.tags) {
        counts[tid] = (counts[tid] || 0) + 1;
      }
    }
    return counts;
  }, [families, tags]);

  const filteredFamilies = useMemo(() => {
    const base = filterAndSortFamilies(families, {
      query: searchQuery,
      ward: selectedWard,
      tag: selectedTag,
      side: mode === 'side' ? activeSide : null,
      sortBy: mode === 'side' ? 'side_desc' : sortBy,
    });
    if (fromKaam && escalatedFamilies.length > 0) {
      const escSet = new Set(escalatedFamilies);
      return [...base].sort((a, b) => {
        const aEsc = escSet.has(a.id) ? 1 : 0;
        const bEsc = escSet.has(b.id) ? 1 : 0;
        if (bEsc !== aEsc) return bEsc - aEsc;
        return 0;
      });
    }
    return base;
  }, [
    families,
    searchQuery,
    selectedWard,
    selectedTag,
    mode,
    activeSide,
    sortBy,
    fromKaam,
    escalatedFamilies,
  ]);

  const sideVotersTotal = useMemo(() => {
    if (mode !== 'side') return tally.totalVoters;
    return filteredFamilies.reduce(
      (acc, f) => acc + f.counts[activeSide],
      0
    );
  }, [mode, filteredFamilies, activeSide, tally.totalVoters]);

  const visibleFamilies = filteredFamilies.slice(0, visibleLimit);

  const handleVoiceSearch = () => {
    startHindiVoiceSearch({
      fallbackSuggestions: ['रामनारायण', 'मोहनलाल', 'पाटीदार', 'कुशवाहा', '21'],
      currentQuery: searchQuery,
      onStatus: (msg) => onToast && onToast(msg),
      onResult: (transcript, isFallback) => {
        setSearchQuery(transcript);
        if (onToast) {
          onToast(
            isFallback
              ? `वॉइस खोज (उदाहरण): "${transcript}"`
              : `वॉइस खोज: "${transcript}"`
          );
        }
      },
    });
  };

  return (
    <div className="min-h-[780px] flex flex-col bg-[#F8FAFC] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200">
      {/* Royal Blue Header */}
      <header className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>पीछे</span>
            </button>

            {mode === 'parivar' && (
              <>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  परिवार वाइज़ लिस्ट
                </h1>
                <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
                  {panchayatName} · {filteredFamilies.length} परिवार
                </p>
              </>
            )}

            {mode === 'parchis' && (
              <>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  वोटर पर्ची
                </h1>
                <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
                  {panchayatName} · {filteredFamilies.length} परिवार
                </p>
              </>
            )}

            {mode === 'side' && (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white ${sideMeta[activeSide].dotColor}`}
                  />
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    {fromKaam && activeSide === 'not_asked'
                      ? 'आज का काम: बात बाकी'
                      : sideMeta[activeSide].title}
                  </h1>
                </div>
                <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
                  {panchayatName} · {sideVotersTotal.toLocaleString('en-IN')}{' '}
                  वोट, {filteredFamilies.length} परिवारों में
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {mode === 'parchis' && (
              <div className="bg-white/15 rounded-2xl px-3.5 py-1.5 text-center">
                <div className="text-xl font-extrabold tabular-nums leading-tight">
                  {tally.totalVoters.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-blue-100">पर्ची</div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate({ screen: 'start' })}
              className="flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </span>
              <span className="text-[10px] text-blue-100 font-bold">म.प्र.</span>
            </button>
          </div>
        </div>

        {/* Side Switcher Pills when in 'side' mode */}
        {mode === 'side' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3 pb-1">
            {(
              [
                'us',
                'them',
                'c2',
                'c3',
                'undecided',
                'no_vote',
                'not_asked',
              ] as SideKey[]
            ).map((sk) => {
              const isAct = activeSide === sk;
              return (
                <button
                  key={sk}
                  type="button"
                  onClick={() => onChangeSideTab && onChangeSideTab(sk)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isAct
                      ? 'bg-white text-slate-900'
                      : 'bg-white/15 text-white border border-white/25 hover:bg-white/25'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${sideMeta[sk].dotColor}`}
                  />
                  <span>{sideMeta[sk].pillLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Search & Filter Controls */}
      <div className="p-3.5 space-y-2.5 bg-[#F8FAFC] border-b border-slate-200/80">
        {/* Search Input */}
        <div className="relative flex items-center bg-white rounded-full border border-slate-200 px-3.5 py-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम, जाति या मकान नंबर लिखें"
            aria-label="नाम, जाति या मकान नंबर लिखें"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="खोज साफ़ करें"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="बोलकर खोजें (वॉइस सर्च)"
              onClick={handleVoiceSearch}
              className="p-1 text-slate-500 hover:text-[#1D4ED8] cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          <span
            className="ml-1.5 w-8 h-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Search className="w-4 h-4" />
          </span>
        </div>

        {/* Ward Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedWard(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              selectedWard === null
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            सब वार्ड
          </button>
          {wards.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWard(selectedWard === w ? null : w)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedWard === w
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              वार्ड {w}
            </button>
          ))}
        </div>

        {/* Tag Filter Pills (shown in Parivar mode) */}
        {mode === 'parivar' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tags.map((t) => {
              const active = selectedTag === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTag(active ? null : t.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#1E40AF] text-white'
                      : 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>
                    {t.name} {tagCounts[t.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sort / Action Row */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <span className="text-slate-500 font-semibold">
            {sortBy === 'size_desc'
              ? 'सबसे बड़े परिवार पहले'
              : 'मकान नंबर क्रम से'}
          </span>

          {mode === 'parchis' ? (
            <button
              type="button"
              onClick={() => setShowWardPrintModal(true)}
              className="text-[#C2410C] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF के लिए वार्ड चुनें</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setSortBy((prev) =>
                  prev === 'size_desc' ? 'house_asc' : 'size_desc'
                )
              }
              className="text-[#1D4ED8] font-extrabold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>बदलें</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Family List */}
      <div className="flex-1 px-3 py-2">
        {visibleFamilies.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 my-4">
            <p className="text-base font-bold text-slate-700">
              कोई परिवार नहीं मिला
            </p>
            <p className="text-xs text-slate-500 mt-1">
              खोज शब्द या वार्ड फ़िल्टर बदलकर देखें।
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedWard(null);
                setSelectedTag(null);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
            >
              सब फ़िल्टर हटाएँ
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {visibleFamilies.map((fam, index) => {
              const isEscalated = escalatedFamilies.includes(fam.id);
              return (
                <div
                  key={fam.id}
                  className="flex items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() =>
                      mode === 'parchis'
                        ? onOpenFamilyParchi(fam)
                        : onSelectFamily(fam.id)
                    }
                    className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-xs font-extrabold tabular-nums flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-extrabold text-slate-900 truncate">
                          {fam.displayTitle}
                        </span>
                        {isEscalated && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold shrink-0">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>उम्मीदवार कॉल</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium tabular-nums truncate">
                        वार्ड {fam.ward} · मकान {fam.house} · {fam.caste}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    {mode === 'parivar' &&
                      (fam.contactPhone ? (
                        <a
                          href={`tel:${fam.contactPhone}`}
                          aria-label={`${fam.contactName} को कॉल करें`}
                          className="w-9 h-9 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectFamily(fam.id)}
                          aria-label={`${fam.contactName} का नंबर जोड़ें`}
                          title="फ़ोन नंबर जोड़ें"
                          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                      ))}

                    <button
                      type="button"
                      onClick={() =>
                        mode === 'parchis'
                          ? onOpenFamilyParchi(fam)
                          : onSelectFamily(fam.id)
                      }
                      className="flex items-center gap-1 text-right cursor-pointer"
                    >
                      <div>
                        {mode === 'side' ? (
                          <>
                            <div className="text-base font-extrabold text-[#16A34A] tabular-nums leading-none">
                              {fam.counts[activeSide]}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              /{fam.totalVoters} वोट
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-base font-extrabold text-slate-900 tabular-nums leading-none">
                              {fam.totalVoters}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {mode === 'parchis' ? 'पर्ची' : 'वोट'}
                            </div>
                          </>
                        )}
                      </div>
                      {mode === 'parchis' && (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more button */}
        {filteredFamilies.length > visibleLimit && (
          <div className="py-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + 100)}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 hover:bg-slate-100 cursor-pointer tabular-nums"
            >
              और परिवार ({filteredFamilies.length - visibleLimit})
            </button>
          </div>
        )}
      </div>

      {/* Ward Print / PDF Modal for Parchis */}
      {showWardPrintModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="वार्ड की पर्ची PDF"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                वार्ड वाइज़ वोटर पर्ची PDF प्रिंट
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowWardPrintModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              जिस वार्ड की सारी परिवार वाइज़ पर्चियाँ एक साथ देखनी या प्रिंट करनी हैं,
              उसे चुनें:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {wards.map((w) => {
                const wFams = families.filter((f) => f.ward === w);
                const wVoters = wFams.reduce((a, b) => a + b.totalVoters, 0);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setSelectedWard(w);
                      setShowWardPrintModal(false);
                      if (wFams[0]) onOpenFamilyParchi(wFams[0]);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left cursor-pointer"
                  >
                    <div className="text-sm font-extrabold text-slate-900">
                      वार्ड {w}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                      {wFams.length} परिवार · {wVoters} पर्ची
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
