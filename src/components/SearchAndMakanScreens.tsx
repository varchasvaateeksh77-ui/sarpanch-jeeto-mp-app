import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Home,
  Printer,
  Search,
  Users,
} from 'lucide-react';
import {
  AppRoute,
  FamilySummary,
  PersonNode,
  SideKey,
  VoterLeaning,
} from '../types/sarpanch';
import { matchesSearchQuery } from '../utils/hindiSearch';

interface SearchScreenProps {
  panchayatName: string;
  wards: number[];
  allVoters: PersonNode[];
  families: FamilySummary[];
  leaningMap: Map<string, VoterLeaning>;
  initialWard?: number;
  initialAgeBracket?: '18-25' | '26-40' | '41-60' | '60+';
  initialQuery?: string;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onUpdateVoterLeaning: (voterId: string, side: SideKey) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  panchayatName,
  wards,
  allVoters,
  families,
  leaningMap,
  initialWard,
  initialAgeBracket,
  initialQuery,
  onBack,
  onNavigate,
  onUpdateVoterLeaning,
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [selectedWard, setSelectedWard] = useState<number | null>(
    initialWard || null
  );
  const [selectedAge, setSelectedAge] = useState<
    '18-25' | '26-40' | '41-60' | '60+' | null
  >(initialAgeBracket || null);

  const activeVoters = useMemo(
    () =>
      allVoters.filter(
        (p) => p.v === 1 && p.act === 1 && (!selectedWard || p.w === selectedWard)
      ),
    [allVoters, selectedWard]
  );

  const ageBrackets = useMemo(() => {
    const b1 = activeVoters.filter((p) => (p.a || 25) >= 18 && (p.a || 25) <= 25);
    const b2 = activeVoters.filter((p) => (p.a || 30) >= 26 && (p.a || 30) <= 40);
    const b3 = activeVoters.filter((p) => (p.a || 45) >= 41 && (p.a || 45) <= 60);
    const b4 = activeVoters.filter((p) => (p.a || 65) > 60);
    const total = Math.max(activeVoters.length, 1);
    return [
      {
        key: '18-25' as const,
        label: '18–25 साल (युवा)',
        count: b1.length,
        pct: Math.round((b1.length / total) * 100),
        color: 'bg-[#1D4ED8]',
      },
      {
        key: '26-40' as const,
        label: '26–40 साल',
        count: b2.length,
        pct: Math.round((b2.length / total) * 100),
        color: 'bg-[#16A34A]',
      },
      {
        key: '41-60' as const,
        label: '41–60 साल',
        count: b3.length,
        pct: Math.round((b3.length / total) * 100),
        color: 'bg-[#D97706]',
      },
      {
        key: '60+' as const,
        label: '60+ साल (बुज़ुर्ग)',
        count: b4.length,
        pct: Math.round((b4.length / total) * 100),
        color: 'bg-[#7C3AED]',
      },
    ];
  }, [activeVoters]);

  const filteredVoters = useMemo(() => {
    const q = query.trim();
    return activeVoters
      .filter((p) => {
        if (selectedAge === '18-25' && ((p.a || 25) < 18 || (p.a || 25) > 25))
          return false;
        if (selectedAge === '26-40' && ((p.a || 30) < 26 || (p.a || 30) > 40))
          return false;
        if (selectedAge === '41-60' && ((p.a || 45) < 41 || (p.a || 45) > 60))
          return false;
        if (selectedAge === '60+' && (p.a || 65) <= 60) return false;

        if (!q) return true;
        return matchesSearchQuery(
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
        );
      })
      .slice(0, 60);
  }, [activeVoters, query, selectedAge]);

  const familyById = useMemo(
    () => new Map(families.map((f) => [f.id, f])),
    [families]
  );

  return (
    <div className="min-h-[760px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5 rounded-b-[28px]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
              aria-label="वापस जाएँ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">
                वोटर खोजें · {panchayatName}
              </h1>
              <p className="text-[11px] text-blue-100 tabular-nums">
                नाम, पिता/पति, EPIC आईडी, क्रम या उम्र से खोजें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'makan' })}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>मकान वाइज़</span>
          </button>
        </div>

        <div className="relative mt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="नाम, पिता का नाम, EPIC नंबर या क्रम संख्या लिखें..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="px-3.5 pt-3 space-y-3 flex-1">
        {/* Ward Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedWard(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
              selectedWard === null
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            सारे वार्ड ({allVoters.filter((p) => p.v === 1 && p.act === 1).length})
          </button>
          {wards.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWard(w === selectedWard ? null : w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                selectedWard === w
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              वार्ड {w}
            </button>
          ))}
        </div>

        {/* Age-Group Breakdown Card (उम्र के हिसाब से) */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800">
              उम्र के हिसाब से वोटर (टैप करके फ़िल्टर करें)
            </span>
            {selectedAge && (
              <button
                type="button"
                onClick={() => setSelectedAge(null)}
                className="text-[11px] font-extrabold text-[#1D4ED8] cursor-pointer"
              >
                फ़िल्टर हटाएँ ×
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ageBrackets.map((ab) => {
              const isSelected = selectedAge === ab.key;
              return (
                <button
                  key={ab.key}
                  type="button"
                  onClick={() =>
                    setSelectedAge(isSelected ? null : ab.key)
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-[#1D4ED8]'
                      : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                    <span>{ab.label}</span>
                    <span className="text-[#1D4ED8] tabular-nums">
                      {ab.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div
                      style={{ width: `${ab.pct}%` }}
                      className={`h-full ${ab.color}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Matching Voters List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-xs font-extrabold text-slate-600">
            <span>
              मतदाता सूची ({filteredVoters.length} दिख रहे हैं · कुल{' '}
              {activeVoters.length})
            </span>
          </div>

          {filteredVoters.map((v) => {
            const lean = leaningMap.get(v.id);
            const isUs = lean?.state === 'candidate' && lean.candidate_id === 1;
            const isThem =
              lean?.state === 'candidate' &&
              (lean.candidate_id === 2 || lean.candidate_id === 3);
            const isUnd = lean?.state === 'undecided';
            const fam = familyById.get(v.fam);

            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-extrabold tabular-nums">
                        #{v.sr}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {v.n}
                      </span>
                      <span className="text-xs font-bold text-slate-500 tabular-nums">
                        ({v.a} वर्ष · {v.g === 'f' ? 'महिला' : 'पुरुष'})
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold mt-0.5">
                      {v.r}: {v.rv} ·{' '}
                      <span className="font-mono-code text-[11px] text-slate-500">
                        {v.e}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({
                        screen: 'makan',
                        ward: v.w,
                        house: v.h,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] text-[11px] font-extrabold shrink-0 cursor-pointer tabular-nums"
                  >
                    वार्ड {v.w} · मकान {v.h}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateVoterLeaning(v.id, 'us')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                        isUs
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-emerald-50 text-[#15803D]'
                      }`}
                    >
                      पक्ष
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateVoterLeaning(v.id, 'c2')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                        isThem
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-red-50 text-[#B91C1C]'
                      }`}
                    >
                      विपक्ष
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateVoterLeaning(v.id, 'undecided')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                        isUnd
                          ? 'bg-[#D97706] text-white'
                          : 'bg-amber-50 text-[#B45309]'
                      }`}
                    >
                      डांवाडोल
                    </button>
                  </div>

                  {fam && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate({ screen: 'family', familyId: fam.id })
                      }
                      className="text-xs font-extrabold text-[#1D4ED8] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>वंशावली ({fam.totalVoters})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface MakanScreenProps {
  panchayatName: string;
  wards: number[];
  families: FamilySummary[];
  initialWard?: number;
  initialHouse?: string;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onOpenFamilyParchi: (fam: FamilySummary) => void;
}

export const MakanScreen: React.FC<MakanScreenProps> = ({
  panchayatName,
  wards,
  families,
  initialWard,
  initialHouse,
  onBack,
  onNavigate,
  onOpenFamilyParchi,
}) => {
  const [selectedWard, setSelectedWard] = useState<number | null>(
    initialWard || null
  );
  const [selectedHouse, setSelectedHouse] = useState<string | null>(
    initialHouse || null
  );

  const housesList = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        ward: number;
        house: string;
        families: FamilySummary[];
        totalVoters: number;
      }
    >();

    for (const f of families) {
      if (selectedWard && f.ward !== selectedWard) continue;
      const key = `${f.ward}-${f.house}`;
      const existing = map.get(key);
      if (existing) {
        existing.families.push(f);
        existing.totalVoters += f.totalVoters;
      } else {
        map.set(key, {
          key,
          ward: f.ward,
          house: f.house,
          families: [f],
          totalVoters: f.totalVoters,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalVoters - a.totalVoters
    );
  }, [families, selectedWard]);

  const activeHouseGroup = useMemo(() => {
    if (!selectedHouse) return null;
    return (
      housesList.find((h) => h.house === selectedHouse) || housesList[0] || null
    );
  }, [housesList, selectedHouse]);

  return (
    <div className="min-h-[760px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5 rounded-b-[28px]">
        <div className="flex items-center gap-2.5 mb-2">
          <button
            type="button"
            onClick={() => {
              if (selectedHouse) setSelectedHouse(null);
              else onBack();
            }}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            aria-label="वापस जाएँ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold">
              {selectedHouse
                ? `मकान नंबर ${selectedHouse} के परिवार`
                : `मकान वाइज़ लिस्ट · ${panchayatName}`}
            </h1>
            <p className="text-xs text-blue-100 tabular-nums">
              कुल {housesList.length} मकान · हर मकान में रहने वाले परिवार व वोटर
            </p>
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-3 space-y-3 flex-1">
        {/* Ward Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSelectedWard(null);
              setSelectedHouse(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
              selectedWard === null
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            सारे वार्ड
          </button>
          {wards.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                setSelectedWard(w);
                setSelectedHouse(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                selectedWard === w
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              वार्ड {w}
            </button>
          ))}
        </div>

        {activeHouseGroup ? (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-base font-extrabold text-slate-900">
                  मकान नंबर {activeHouseGroup.house} (वार्ड{' '}
                  {activeHouseGroup.ward})
                </div>
                <div className="text-xs text-slate-500 font-bold tabular-nums">
                  {activeHouseGroup.families.length} परिवार · कुल{' '}
                  {activeHouseGroup.totalVoters} मतदाता
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHouse(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700 cursor-pointer"
              >
                सभी मकान देखें
              </button>
            </div>

            {activeHouseGroup.families.map((fam) => (
              <div
                key={fam.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {fam.displayTitle}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      जाति: {fam.caste} · बूथ {fam.booth} ({fam.boothName})
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#1D4ED8] text-xs font-extrabold tabular-nums">
                    {fam.totalVoters} वोट
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({ screen: 'family', familyId: fam.id })
                    }
                    className="flex-1 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>वंशावली व वोट देखें</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenFamilyParchi(fam)}
                    className="py-2.5 px-3.5 rounded-xl bg-pink-50 text-[#DB2777] border border-pink-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>पर्ची</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {housesList.slice(0, 40).map((h) => (
              <button
                key={h.key}
                type="button"
                onClick={() => setSelectedHouse(h.house)}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-[#1D4ED8] text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#1D4ED8] text-xs font-extrabold tabular-nums">
                    मकान {h.house}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    वार्ड {h.ward}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {h.families[0]?.displayTitle}
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold tabular-nums mt-0.5">
                    {h.totalVoters} वोट · {h.families.length} परिवार
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface JatiScreenProps {
  panchayatName: string;
  wards: number[];
  castes: string[];
  families: FamilySummary[];
  initialWard?: number;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onUpdateFamilyCaste: (familyId: string, newCaste: string) => void;
}

export const JatiScreen: React.FC<JatiScreenProps> = ({
  panchayatName,
  wards,
  castes,
  families,
  initialWard,
  onBack,
  onNavigate,
  onUpdateFamilyCaste,
}) => {
  const [selectedWard, setSelectedWard] = useState<number | null>(
    initialWard || null
  );
  const [selectedCaste, setSelectedCaste] = useState<string | null>(null);

  const wardFamilies = useMemo(
    () =>
      selectedWard
        ? families.filter((f) => f.ward === selectedWard)
        : families,
    [families, selectedWard]
  );

  const casteStats = useMemo(() => {
    const map = new Map<
      string,
      { caste: string; voters: number; families: number; usVoters: number }
    >();
    let totalVoters = 0;

    for (const f of wardFamilies) {
      totalVoters += f.totalVoters;
      const c = f.caste || 'अन्य';
      const cur = map.get(c) || {
        caste: c,
        voters: 0,
        families: 0,
        usVoters: 0,
      };
      cur.voters += f.totalVoters;
      cur.families += 1;
      cur.usVoters += f.counts.us;
      map.set(c, cur);
    }

    return Array.from(map.values())
      .sort((a, b) => b.voters - a.voters)
      .map((item) => ({
        ...item,
        pct: totalVoters > 0 ? (item.voters / totalVoters) * 100 : 0,
      }));
  }, [wardFamilies]);

  const activeCasteFamilies = useMemo(() => {
    const target = selectedCaste || casteStats[0]?.caste;
    if (!target) return [];
    return wardFamilies.filter((f) => f.caste === target);
  }, [wardFamilies, selectedCaste, casteStats]);

  return (
    <div className="min-h-[760px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
      <div className="bg-[#7C3AED] text-white px-4 pt-4 pb-5 rounded-b-[28px]">
        <div className="flex items-center gap-2.5 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            aria-label="वापस जाएँ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold">
              जाति वाइज़ वोट · {panchayatName}
            </h1>
            <p className="text-xs text-purple-100">
              किस जाति के कितने वोट, कितने आपके पक्ष में और परिवार जाति संशोधन
            </p>
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-3 space-y-3.5 flex-1">
        {/* Ward Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedWard(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
              selectedWard === null
                ? 'bg-[#7C3AED] text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            सारे वार्ड
          </button>
          {wards.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWard(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                selectedWard === w
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              वार्ड {w}
            </button>
          ))}
        </div>

        {/* Caste Breakdown Cards */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2">
          <div className="text-xs font-extrabold text-slate-600">
            जाति चुनें (परिवार देखने व जाति अपडेट करने के लिए टैप करें):
          </div>
          {casteStats.map((c) => {
            const isSelected =
              (selectedCaste || casteStats[0]?.caste) === c.caste;
            return (
              <button
                key={c.caste}
                type="button"
                onClick={() => setSelectedCaste(c.caste)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-50 border-[#7C3AED]'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-slate-900">
                    {c.caste} ({c.families} परिवार)
                  </span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-[#15803D]">पक्ष: {c.usVoters}</span>
                    <span className="text-[#7C3AED]">
                      कुल: {c.voters} ({c.pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-1.5">
                  <div
                    style={{ width: `${Math.min(100, c.pct)}%` }}
                    className="h-full bg-[#7C3AED]"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Families in Selected Caste */}
        <div className="space-y-2">
          <div className="text-xs font-extrabold text-slate-700 px-1">
            {selectedCaste || casteStats[0]?.caste} समाज के परिवार (
            {activeCasteFamilies.length} परिवार):
          </div>
          {activeCasteFamilies.slice(0, 20).map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({ screen: 'family', familyId: f.id })
                  }
                  className="text-sm font-extrabold text-slate-900 hover:text-[#1D4ED8] text-left truncate block cursor-pointer"
                >
                  {f.displayTitle} ({f.totalVoters} वोट)
                </button>
                <div className="text-[11px] text-slate-500 font-semibold">
                  वार्ड {f.ward} · मकान {f.house} · पक्ष: {f.counts.us}
                </div>
              </div>

              <select
                aria-label={`${f.displayTitle} की जाति बदलें`}
                value={f.caste}
                onChange={(e) => onUpdateFamilyCaste(f.id, e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-extrabold text-slate-800 shrink-0"
              >
                {castes.map((cn) => (
                  <option key={cn} value={cn}>
                    {cn}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
