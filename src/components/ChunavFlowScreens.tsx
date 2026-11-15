import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Search,
  Smartphone,
  Trophy,
} from 'lucide-react';
import { AppRoute, PlanItem } from '../types/sarpanch';
import {
  buildFamilySummaries,
  computePanchayatDemographics,
  computeVoteTally,
} from '../utils/electionEngine';
import { generateMpPanchayatDataset } from '../utils/mpPanchayatGenerator';
import { matchesSearchQuery } from '../utils/hindiSearch';
import { startHindiVoiceSearch } from '../utils/voiceSearch';
import { RawDistrict } from './ResultsAndStartScreen';

interface ChunavScreenProps {
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const ChunavScreen: React.FC<ChunavScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  const tiers = [
    {
      key: 'sarpanch' as const,
      title: 'सरपंच',
      subtitle: 'अपनी ग्राम पंचायत का चुनाव',
      badgeBg: 'bg-[#DBEAFE]',
      icon: <Trophy className="w-6 h-6 text-[#1D4ED8]" />,
      onClick: () =>
        onNavigate({ screen: 'pick', electionType: 'sarpanch' }),
    },
    {
      key: 'samiti' as const,
      title: 'पंचायत समिति सदस्य',
      subtitle: 'जनपद पंचायत · समिति की अपनी सीट',
      badgeBg: 'bg-[#FEF3C7]',
      icon: <LayoutGrid className="w-6 h-6 text-[#B45309]" />,
      onClick: () => onNavigate({ screen: 'seats', kind: 'samiti' }),
    },
    {
      key: 'zila' as const,
      title: 'ज़िला परिषद सदस्य',
      subtitle: 'ज़िला पंचायत · ज़िले की अपनी सीट',
      badgeBg: 'bg-[#FCE7F3]',
      icon: <MapPin className="w-6 h-6 text-[#BE185D]" />,
      onClick: () => onNavigate({ screen: 'seats', kind: 'zila' }),
    },
    {
      key: 'ward' as const,
      title: 'वार्ड पंच',
      subtitle: 'अपनी पंचायत का एक वार्ड',
      badgeBg: 'bg-[#DCFCE7]',
      icon: <Home className="w-6 h-6 text-[#15803D]" />,
      onClick: () => onNavigate({ screen: 'pick', electionType: 'ward' }),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पीछे</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">
          अपना चुनाव चुनें
        </h1>
        <p className="text-xs text-blue-100 mt-0.5 font-medium">
          आप कौन सा चुनाव लड़ रहे हैं?
        </p>
      </div>

      <div className="p-3.5 space-y-3 flex-1">
        {tiers.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.onClick}
            className="w-full bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-[#1D4ED8] flex items-center justify-between gap-3.5 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl ${t.badgeBg} flex items-center justify-center shrink-0`}
              >
                {t.icon}
              </div>
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-900">
                  {t.title}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  {t.subtitle}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1D4ED8] group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}

        <div className="pt-4 text-center text-xs font-semibold text-slate-500">
          पहले के रिज़ल्ट देखने हैं?{' '}
          <button
            type="button"
            onClick={() => onNavigate({ screen: 'result' })}
            className="text-[#1D4ED8] font-extrabold underline underline-offset-2 cursor-pointer"
          >
            चुनाव रिज़ल्ट देखें
          </button>
        </div>
      </div>
    </div>
  );
};

interface PickPanchayatScreenProps {
  electionType: 'sarpanch' | 'ward';
  places: RawDistrict[];
  initialDistrictSlug?: string;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onActivatePanchayat: (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  }) => void;
}

export const PickPanchayatScreen: React.FC<PickPanchayatScreenProps> = ({
  electionType,
  places,
  initialDistrictSlug,
  onBack,
  onNavigate,
  onActivatePanchayat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistSlug, setSelectedDistSlug] = useState<string | null>(
    initialDistrictSlug || null
  );

  const selectedDistrict = useMemo(
    () =>
      selectedDistSlug
        ? places.find((d) => d[0] === selectedDistSlug) || null
        : null,
    [places, selectedDistSlug]
  );

  // Build alphabetical list of Panchayats + Villages (with गाँव badge) for the selected district
  const districtPanchayatAndVillageRows = useMemo(() => {
    if (!selectedDistrict) return [];
    const rows: {
      key: string;
      isVillage: boolean;
      displayName: string;
      gpId: string;
      gpName: string;
      tehsil: string;
      district: string;
      voters: number;
      villages: string[];
    }[] = [];

    for (const blk of selectedDistrict[2] || []) {
      for (const gp of blk[2] || []) {
        const gpVoters = Number(gp[2]) || 3400;
        const vils =
          Array.isArray(gp[3]) && gp[3].length > 0 ? gp[3] : [gp[1]];
        rows.push({
          key: `gp-${gp[0]}`,
          isVillage: false,
          displayName: gp[1],
          gpId: gp[0],
          gpName: gp[1],
          tehsil: blk[1],
          district: `${selectedDistrict[1]} (मध्य प्रदेश)`,
          voters: gpVoters,
          villages: vils,
        });

        for (const vil of vils) {
          if (vil !== gp[1]) {
            rows.push({
              key: `vil-${gp[0]}-${vil}`,
              isVillage: true,
              displayName: vil,
              gpId: gp[0],
              gpName: gp[1],
              tehsil: blk[1],
              district: `${selectedDistrict[1]} (मध्य प्रदेश)`,
              voters: gpVoters,
              villages: vils,
            });
          }
        }
      }
    }

    const q = searchQuery.trim();
    const filtered = q
      ? rows.filter((r) =>
          matchesSearchQuery(
            [
              r.displayName,
              r.gpName,
              r.gpId,
              r.tehsil,
              r.district,
              ...r.villages,
            ],
            q
          )
        )
      : rows;

    return filtered.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'hi')
    );
  }, [selectedDistrict, searchQuery]);

  // Global search across all 55 districts, blocks, GPs, and 5,000+ villages (supports Hindi + English/Hinglish)
  const globalMatchingGps = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || selectedDistrict) return [];
    const matches: {
      id: string;
      name: string;
      tehsil: string;
      district: string;
      voters: number;
      villages: string[];
      matchedVillage?: string;
    }[] = [];

    for (const d of places) {
      for (const b of d[2] || []) {
        for (const g of b[2] || []) {
          const vils = Array.isArray(g[3]) && g[3].length > 0 ? g[3] : [g[1]];
          if (
            matchesSearchQuery(
              [g[1], g[0], b[1], b[0], d[1], d[0], ...vils],
              q
            )
          ) {
            const matchedVil = vils.find(
              (v) => v !== g[1] && matchesSearchQuery([v], q)
            );
            matches.push({
              id: g[0],
              name: g[1],
              tehsil: `${b[1].replace(' जनपद', '')} जनपद`,
              district: `${d[1]} (मध्य प्रदेश)`,
              voters: Number(g[2]) || 3400,
              villages: vils,
              matchedVillage: matchedVil,
            });
            if (matches.length >= 40) return matches;
          }
        }
      }
    }
    return matches;
  }, [places, searchQuery, selectedDistrict]);

  const handleSelectGp = (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  }) => {
    if (electionType === 'ward') {
      onNavigate({
        screen: 'wardpick',
        gpId: gp.id,
        gpName: gp.name,
        tehsil: gp.tehsil,
        district: gp.district,
        voters: gp.voters,
        villages: gp.villages,
      });
    } else {
      // Immediately activate this Panchayat into the full-fledged live app!
      onActivatePanchayat(gp);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5">
        <button
          type="button"
          onClick={() => {
            if (selectedDistrict) {
              setSelectedDistSlug(null);
              setSearchQuery('');
            } else {
              onBack();
            }
          }}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{selectedDistrict ? 'ज़िले' : 'पीछे'}</span>
        </button>

        <h1 className="text-2xl font-extrabold tracking-tight">
          {selectedDistrict ? selectedDistrict[1] : 'अपनी पंचायत चुनें'}
        </h1>
        <p className="text-xs text-blue-100 mt-0.5 font-medium">
          {selectedDistrict
            ? 'पंचायत चुनें'
            : electionType === 'ward'
            ? 'वार्ड पंच का चुनाव'
            : 'सरपंच का चुनाव'}
        </p>

        <div className="mt-3 bg-white rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-slate-900">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              selectedDistrict
                ? `${selectedDistrict[1]} में पंचायत या गाँव खोजें`
                : 'नाम से खोजें — पंचायत या गाँव'
            }
            className="flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            aria-label="बोलकर पंचायत खोजें"
            onClick={() =>
              startHindiVoiceSearch({
                fallbackSuggestions: ['महौदिया', 'गुनगा', 'रातीबड़', 'क्षिप्रा', 'अमलाहा'],
                currentQuery: searchQuery,
                onResult: (q) => setSearchQuery(q),
              })
            }
            className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3 flex-1">
        {selectedDistrict ? (
          /* Alphabetical Panchayat & Village List inside Selected District (matches XRecorder 00:18) */
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-500 px-1">
              पंचायत और गाँव ({districtPanchayatAndVillageRows.length})
            </div>

            <div className="space-y-2">
              {districtPanchayatAndVillageRows.map((row) => (
                <div
                  key={row.key}
                  className="w-full bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-blue-400 flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectGp({
                        id: row.gpId,
                        name: row.gpName,
                        tehsil: `${row.tehsil.replace(' जनपद', '')} जनपद`,
                        district: row.district,
                        voters: row.voters,
                        villages: row.villages,
                      })
                    }
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900">
                        {row.displayName}
                      </span>
                      {row.isVillage && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                          गाँव
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 tabular-nums">
                      {row.isVillage ? `पंचायत ${row.gpName} · ` : ''}
                      {row.tehsil.replace(' जनपद', '')} ·{' '}
                      {row.voters.toLocaleString('en-IN')} वोटर
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {electionType === 'sarpanch' && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate({
                            screen: 'jhalak',
                            gpId: row.gpId,
                            gpName: row.gpName,
                            tehsil: `${row.tehsil.replace(' जनपद', '')} जनपद`,
                            district: row.district,
                            voters: row.voters,
                            villages: row.villages,
                            step: 1,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] text-[11px] font-extrabold cursor-pointer"
                      >
                        झलक
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectGp({
                          id: row.gpId,
                          name: row.gpName,
                          tehsil: `${row.tehsil.replace(' जनपद', '')} जनपद`,
                          district: row.district,
                          voters: row.voters,
                          villages: row.villages,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold cursor-pointer"
                    >
                      खोलें →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : searchQuery.trim() ? (
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-500 px-1">
              खोज परिणाम ({globalMatchingGps.length})
            </div>
            {globalMatchingGps.map((gp) => (
              <div
                key={gp.id}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-blue-400 flex items-center justify-between gap-3 text-left"
              >
                <button
                  type="button"
                  onClick={() => handleSelectGp(gp)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">
                      {gp.matchedVillage || gp.name}
                    </span>
                    {gp.matchedVillage && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                        गाँव
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 tabular-nums">
                    {gp.matchedVillage ? `पंचायत ${gp.name} · ` : ''}
                    {gp.tehsil} · {gp.district} ·{' '}
                    {gp.voters.toLocaleString('en-IN')} वोटर
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {electionType === 'sarpanch' && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate({
                          screen: 'jhalak',
                          gpId: gp.id,
                          gpName: gp.name,
                          tehsil: gp.tehsil,
                          district: gp.district,
                          voters: gp.voters,
                          villages: gp.villages,
                          step: 1,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] text-[11px] font-extrabold cursor-pointer"
                    >
                      झलक
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelectGp(gp)}
                    className="px-3 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold shrink-0 cursor-pointer"
                  >
                    खोलें →
                  </button>
                </div>
              </div>
            ))}

            {/* Dynamic Custom Panchayat Activator if user searches for any specific village name */}
            <button
              type="button"
              onClick={() => {
                const customName = searchQuery.trim();
                const slug =
                  customName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '') || `mp-gp-${Date.now()}`;
                handleSelectGp({
                  id: `sehore/sehore/${slug}`,
                  name: customName,
                  tehsil: 'सीहोर जनपद',
                  district: 'मध्य प्रदेश',
                  voters: 3850,
                  villages: [customName, `${customName} कलां`, 'मजरा टोला'],
                });
              }}
              className="w-full bg-[#ECFDF5] rounded-2xl p-4 border-2 border-[#16A34A] flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div>
                <div className="text-sm font-extrabold text-[#065F46]">
                  ग्राम पंचायत &ldquo;{searchQuery.trim()}&rdquo; को सक्रिय करें
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                  पूरा वोटर रोल, परिवार लिस्ट, वंशावली और बूथ डेटा तुरंत खोलें
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-[#16A34A] text-white text-xs font-extrabold shrink-0">
                सक्रिय करें →
              </span>
            </button>
          </div>
        ) : (
          /* 3-Column District Grid for all 55 MP Districts (matches XRecorder 00:14) */
          <div className="space-y-2.5">
            <div className="text-xs font-extrabold text-slate-500 px-1">
              ज़िला चुनें ({places.length} ज़िले)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {places.map((d) => (
                <button
                  key={d[0]}
                  type="button"
                  onClick={() => setSelectedDistSlug(d[0])}
                  className="bg-white rounded-2xl py-3.5 px-2 border border-slate-200/90 hover:border-[#1D4ED8] hover:bg-blue-50/40 text-center text-sm font-extrabold text-slate-900 transition-colors cursor-pointer truncate"
                >
                  {d[1]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface WardPickScreenProps {
  gpId: string;
  gpName: string;
  tehsil: string;
  district: string;
  voters: number;
  villages: string[];
  onBack: () => void;
  onSelectWardAndActivate: (
    gp: {
      id: string;
      name: string;
      tehsil: string;
      district: string;
      voters: number;
      villages: string[];
    },
    wardNumber: number
  ) => void;
}

export const WardPickScreen: React.FC<WardPickScreenProps> = ({
  gpId,
  gpName,
  tehsil,
  district,
  voters,
  villages,
  onBack,
  onSelectWardAndActivate,
}) => {
  const dataset = useMemo(
    () =>
      generateMpPanchayatDataset({
        id: gpId,
        name: gpName,
        tehsil,
        district,
        voters,
        villages,
        isDemo: false,
      }),
    [gpId, gpName, tehsil, district, voters, villages]
  );

  const demographics = useMemo(
    () => computePanchayatDemographics(dataset),
    [dataset]
  );

  const [pickedWard, setPickedWard] = useState<number>(1);

  const activeWardInfo = useMemo(
    () =>
      demographics.wardStats.find((w) => w.ward === pickedWard) ||
      demographics.wardStats[0],
    [demographics, pickedWard]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पंचायतें</span>
        </button>
        <h1 className="text-2xl font-extrabold">{gpName}</h1>
        <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
          वार्ड चुनें · कुल {dataset.roll.wards.length} वार्ड
        </p>
      </div>

      <div className="p-3.5 space-y-3.5 flex-1">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200">
          <div className="text-xs font-extrabold text-slate-500 mb-2.5">
            अपना वार्ड चुनें ({dataset.roll.wards.length} वार्ड):
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demographics.wardStats.map((w) => {
              const isSelected = w.ward === pickedWard;
              return (
                <button
                  key={w.ward}
                  type="button"
                  onClick={() => setPickedWard(w.ward)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#DCFCE7] border-[#16A34A] text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-extrabold">वार्ड {w.ward}</div>
                    <div className="text-[11px] font-bold text-slate-600 tabular-nums">
                      {w.voters} वोट · {w.families} परिवार
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeWardInfo && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">
                वार्ड {activeWardInfo.ward} की झलक ({gpName})
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#15803D] text-xs font-extrabold tabular-nums">
                {activeWardInfo.voters} वोटर · {activeWardInfo.families} परिवार
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                onSelectWardAndActivate(
                  {
                    id: gpId,
                    name: gpName,
                    tehsil,
                    district,
                    voters,
                    villages,
                  },
                  activeWardInfo.ward
                )
              }
              className="w-full py-3.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                वार्ड {activeWardInfo.ward} का डेटा और परिवार लिस्ट खोलें
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SeatPickScreenProps {
  kind: 'samiti' | 'zila';
  places: RawDistrict[];
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onActivatePanchayat: (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  }) => void;
}

export const SeatPickScreen: React.FC<SeatPickScreenProps> = ({
  kind,
  places,
  onBack,
  onNavigate,
}) => {
  const [selectedDistSlug, setSelectedDistSlug] = useState<string | null>(null);
  const [expandedSeat, setExpandedSeat] = useState<number | null>(null);

  const selectedDistrict = useMemo(
    () =>
      selectedDistSlug
        ? places.find((d) => d[0] === selectedDistSlug) || null
        : null,
    [places, selectedDistSlug]
  );

  // Build authentic constituency seats grouping Gram Panchayats (matches XRecorder 04:26)
  const seatsList = useMemo(() => {
    if (!selectedDistrict) return [];
    const allGps: {
      id: string;
      name: string;
      tehsil: string;
      district: string;
      voters: number;
      villages: string[];
    }[] = [];

    for (const b of selectedDistrict[2] || []) {
      for (const g of b[2] || []) {
        allGps.push({
          id: g[0],
          name: g[1],
          tehsil: `${b[1]} जनपद`,
          district: `${selectedDistrict[1]} (मध्य प्रदेश)`,
          voters: Number(g[2]) || 3500,
          villages: Array.isArray(g[3]) && g[3].length > 0 ? g[3] : [g[1]],
        });
      }
    }

    const seatCount = kind === 'samiti' ? 15 : 12;
    const seats = [];
    for (let s = 1; s <= seatCount; s++) {
      const gpsForSeat = allGps.filter((_, idx) => idx % 4 === s % 4);
      const fallbackGps =
        gpsForSeat.length > 0 ? gpsForSeat : allGps.slice(0, 3);
      const gpCount = kind === 'zila' ? 12 + (s % 4) : 4 + (s % 3);
      const totalVoters =
        kind === 'zila' ? 34200 + s * 1420 : 11400 + s * 640;
      seats.push({
        seatNumber: s,
        title: `वार्ड ${s}`,
        gpCount,
        gps: fallbackGps,
        totalVoters,
      });
    }
    return seats;
  }, [selectedDistrict, kind]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5">
        <button
          type="button"
          onClick={() => {
            if (selectedDistrict) setSelectedDistSlug(null);
            else onBack();
          }}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{selectedDistrict ? 'ज़िले' : 'पीछे'}</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {selectedDistrict ? selectedDistrict[1] : 'अपनी सीट चुनें'}
        </h1>
        <p className="text-xs text-blue-100 mt-0.5 font-medium">
          {selectedDistrict
            ? `${seatsList.length} वार्ड`
            : kind === 'samiti'
            ? 'पंचायत समिति सदस्य का चुनाव'
            : 'ज़िला परिषद सदस्य का चुनाव'}
        </p>
      </div>

      <div className="p-3.5 space-y-3 flex-1">
        {selectedDistrict ? (
          <div className="space-y-2.5">
            {seatsList.map((s) => {
              const isExpanded = expandedSeat === s.seatNumber;
              return (
                <div
                  key={s.seatNumber}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({
                        screen: 'plans',
                        title: `${
                          kind === 'zila' ? 'ज़िला परिषद' : 'पंचायत समिति'
                        } · ${s.title}`,
                        subtitle: `${selectedDistrict[1]} · ${s.gpCount} पंचायतें · ${s.totalVoters.toLocaleString('en-IN')} वोटर`,
                        gpCount: s.gpCount,
                        voters: s.totalVoters,
                        gpToActivate: s.gps[0],
                      })
                    }
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <div>
                      <div className="text-base font-extrabold text-slate-900">
                        {s.title}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 tabular-nums">
                        {s.gpCount} पंचायतें ·{' '}
                        {s.totalVoters.toLocaleString('en-IN')} वोटर
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>

                  <div className="px-4 pb-3 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSeat(isExpanded ? null : s.seatNumber)
                      }
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1D4ED8] cursor-pointer"
                    >
                      <span>{s.gpCount} पंचायतें देखें</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.gps.map((g) => (
                          <span
                            key={g.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="text-xs font-extrabold text-slate-500 px-1">
              ज़िला चुनें ({places.length} ज़िले)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {places.map((d) => (
                <button
                  key={d[0]}
                  type="button"
                  onClick={() => setSelectedDistSlug(d[0])}
                  className="bg-white rounded-2xl py-3.5 px-2 border border-slate-200/90 hover:border-[#1D4ED8] hover:bg-blue-50/40 text-center text-sm font-extrabold text-slate-900 transition-colors cursor-pointer truncate"
                >
                  {d[1]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PlansCheckoutScreenProps {
  title: string;
  subtitle: string;
  gpCount: number;
  voters: number;
  gpToActivate?: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  };
  onBack: () => void;
  onOpenDemo: () => void;
  onActivate: () => void;
}

export const PlansCheckoutScreen: React.FC<PlansCheckoutScreenProps> = ({
  title,
  subtitle,
  gpToActivate,
  onBack,
  onOpenDemo,
  onActivate,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'unlimited' | 'basic'>(
    'unlimited'
  );

  const unlimitedFeatures = [
    'अनलिमिटेड कार्यकर्ता अपने फ़ोन से जुड़ें',
    'कौन सा कार्यकर्ता कितना काम कर रहा है — साफ़ दिखे',
    'हर परिवार की वंशावली और आपसी रिश्ते',
    'जाति और वार्ड के हिसाब से पूरा समीकरण',
    'आपकी फ़ोटो और चिन्ह वाली वोटर पर्ची',
    'पोलिंग के दिन बचे वोटों की लाइव लिस्ट',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-24">
      <header className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पीछे</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">प्लान चुनें</h1>
        <p className="text-xs text-blue-100 mt-0.5 font-medium">{subtitle}</p>
      </header>

      <div className="p-3.5 space-y-3.5 flex-1">
        {/* Selected Seat / Panchayat Summary Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-extrabold text-slate-900">
              {title}
            </div>
            <div className="text-xs text-slate-500 font-semibold mt-0.5 tabular-nums">
              {subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-extrabold text-[#1D4ED8] inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
          >
            <span>बदलें</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Social Proof Banner (matches XRecorder 04:28) */}
        <div className="bg-[#ECFDF5] border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-[#16A34A] text-white text-xs font-extrabold shrink-0">
            168% वेरिफ़ाइड
          </span>
          <span className="text-xs font-bold text-[#065F46] leading-snug">
            मध्य प्रदेश की हज़ारों पंचायतों में उम्मीदवार इस्तेमाल कर रहे हैं
          </span>
        </div>

        {/* Plan 1: चुनाव मैनेजर अनलिमिटेड (₹2,499) */}
        <div
          onClick={() => setSelectedPlan('unlimited')}
          className={`bg-white rounded-2xl p-4 border-2 transition-colors cursor-pointer space-y-3 ${
            selectedPlan === 'unlimited'
              ? 'border-[#16A34A]'
              : 'border-slate-200'
          }`}
        >
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold">
            सबसे ज़्यादा चुना गया
          </span>

          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-lg font-extrabold text-slate-900">
                चुनाव मैनेजर अनलिमिटेड
              </div>
              <div className="text-xs text-slate-500 font-medium">
                आप + अनलिमिटेड कार्यकर्ता
              </div>
            </div>
            <div className="text-right tabular-nums shrink-0">
              <div className="text-2xl font-extrabold text-slate-900">
                ₹2,499
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">
                एक बार · पूरे चुनाव तक
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            {unlimitedFeatures.map((feat) => (
              <div key={feat} className="flex items-start gap-2.5 text-xs">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-semibold text-slate-700">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan 2: चुनाव मैनेजर (₹1,299) */}
        <div
          onClick={() => setSelectedPlan('basic')}
          className={`bg-white rounded-2xl p-4 border-2 transition-colors cursor-pointer ${
            selectedPlan === 'basic'
              ? 'border-[#1D4ED8]'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-base font-extrabold text-slate-900">
                चुनाव मैनेजर
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                सिर्फ़ आपके फ़ोन पर चलेगा, कार्यकर्ता नहीं जुड़ेंगे
              </div>
            </div>
            <div className="text-right tabular-nums shrink-0">
              <div className="text-xl font-extrabold text-slate-900">
                ₹1,299
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">
                एक बार · पूरे चुनाव तक
              </div>
            </div>
          </div>
        </div>

        {/* Help & Contact Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="text-xs font-bold text-slate-500">
            कोई सवाल है? हमसे बात करें
          </div>
          <a
            href="mailto:contact@sarpanchjeeto.com"
            className="flex items-center gap-2.5 text-xs font-extrabold text-slate-800 hover:text-[#1D4ED8]"
          >
            <Mail className="w-4 h-4 text-[#1D4ED8]" />
            <span>contact@sarpanchjeeto.com</span>
          </a>
          <a
            href="https://wa.me/919826045120"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 text-xs font-extrabold text-[#15803D] hover:underline pt-1"
          >
            <MessageCircle className="w-4 h-4 text-[#16A34A]" />
            <span>WhatsApp पर बात करें</span>
          </a>
        </div>
      </div>

      {/* Sticky Bottom Action Bar (matches XRecorder 04:28) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-3">
        <div className="max-w-[440px] mx-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenDemo}
            className="px-3.5 py-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-slate-600" />
            <span>डेमो देखें</span>
          </button>
          <button
            type="button"
            onClick={onActivate}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-extrabold text-center cursor-pointer tabular-nums"
          >
            {selectedPlan === 'unlimited'
              ? `चुनाव मैनेजर अनलिमिटेड लें · ₹2,499`
              : `चुनाव मैनेजर लें · ₹1,299`}
            {gpToActivate ? ` (${gpToActivate.name})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

interface JhalakStepsScreenProps {
  gpId: string;
  gpName: string;
  tehsil: string;
  district: string;
  voters: number;
  villages: string[];
  initialStep?: number;
  plans: PlanItem[];
  onBack: () => void;
  onNavigate?: (route: AppRoute) => void;
  onActivatePanchayat: (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  }) => void;
}

export const JhalakStepsScreen: React.FC<JhalakStepsScreenProps> = ({
  gpId,
  gpName,
  tehsil,
  district,
  voters,
  villages,
  initialStep = 1,
  onBack,
  onNavigate,
  onActivatePanchayat,
}) => {
  const [step, setStep] = useState<number>(initialStep);
  const [nameQuery, setNameQuery] = useState<string>('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [simBonusUs, setSimBonusUs] = useState<number>(0);

  const dataset = useMemo(
    () =>
      generateMpPanchayatDataset({
        id: gpId,
        name: gpName,
        tehsil,
        district,
        voters,
        villages,
        isDemo: false,
      }),
    [gpId, gpName, tehsil, district, voters, villages]
  );

  const leaningMap = useMemo(() => {
    const m = new Map();
    for (const l of dataset.camp.leaning) {
      m.set(l.voter_id, l);
    }
    return m;
  }, [dataset]);

  const families = useMemo(
    () =>
      buildFamilySummaries(
        dataset,
        leaningMap,
        new Set(),
        new Map(),
        new Map(),
        new Map()
      ),
    [dataset, leaningMap]
  );

  const demographics = useMemo(
    () => computePanchayatDemographics(dataset),
    [dataset]
  );

  const baseTally = useMemo(
    () => computeVoteTally(dataset.roll.people, leaningMap),
    [dataset, leaningMap]
  );

  const matchingFamilies = useMemo(() => {
    const q = nameQuery.trim();
    if (!q) return families.slice(0, 6);
    return families
      .filter((f) =>
        matchesSearchQuery(
          [
            f.headName,
            f.displayTitle,
            f.house,
            `मकान ${f.house}`,
            f.caste,
            ...f.voters.map((v) => `${v.n} ${v.rv || ''}`),
          ],
          q
        )
      )
      .slice(0, 8);
  }, [families, nameQuery]);

  const mySelectedFamily = useMemo(() => {
    if (selectedFamilyId) {
      return families.find((f) => f.id === selectedFamilyId) || families[0];
    }
    return families[0];
  }, [families, selectedFamilyId]);

  const handleFinishAndActivate = () => {
    if (onNavigate) {
      onNavigate({
        screen: 'plans',
        title: `सरपंच चुनाव · ग्राम पंचायत ${gpName}`,
        subtitle: `${tehsil} · ${district} · ${demographics.totalVoters.toLocaleString('en-IN')} वोटर`,
        gpCount: 1,
        voters: demographics.totalVoters,
        gpToActivate: {
          id: gpId,
          name: gpName,
          tehsil,
          district,
          voters: demographics.totalVoters,
          villages,
        },
      });
      return;
    }
    onActivatePanchayat({
      id: gpId,
      name: gpName,
      tehsil,
      district,
      voters: demographics.totalVoters,
      villages,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      {/* Top 5-Step Progress Header */}
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5 rounded-b-[28px]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onBack();
            }}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-100 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step > 1 ? 'पीछे' : 'पंचायतें'}</span>
          </button>

          {/* 5 Step Dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  s === step
                    ? 'w-7 bg-[#FBBF24]'
                    : s < step
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-white/30'
                }`}
                aria-label={`स्टेप ${s}`}
              />
            ))}
          </div>

          <span className="text-xs font-extrabold text-blue-100 tabular-nums">
            {step}/5
          </span>
        </div>

        <h1 className="text-2xl font-extrabold">{gpName}</h1>
        <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
          {tehsil.replace(' जनपद', '')} · {district.replace(' (मध्य प्रदेश)', '')} ·{' '}
          {demographics.totalVoters.toLocaleString('en-IN')} वोटर ·{' '}
          {demographics.totalFamilies} परिवार · {demographics.totalWards} वार्ड
        </p>
      </div>

      <div className="px-3.5 pt-3.5 space-y-3.5 flex-1 flex flex-col justify-between">
        {/* STEP 1: Find Your Family & Live Vanshavali Preview */}
        {step === 1 && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="text-base font-extrabold text-slate-900">
                अपना नाम लिखें
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {gpName} की वोटर लिस्ट में अपना परिवार देखें
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="अपना या पिता का नाम"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-[#1D4ED8] bg-white text-sm font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                {matchingFamilies.map((f) => {
                  const isPicked = mySelectedFamily?.id === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFamilyId(f.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                        isPicked
                          ? 'bg-blue-50 border-[#1D4ED8]'
                          : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {f.displayTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold tabular-nums">
                          वार्ड {f.ward} · मकान {f.house} · जाति: {f.caste}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-white text-xs font-extrabold tabular-nums">
                        {f.totalVoters} वोट
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {mySelectedFamily && (
              <div className="bg-white rounded-2xl p-4 border-2 border-[#1D4ED8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-[11px] font-extrabold">
                    आपका परिवार · हर परिवार की ऐसी वंशावली
                  </span>
                  <span className="text-xs font-extrabold text-slate-600 tabular-nums">
                    वार्ड {mySelectedFamily.ward} · मकान {mySelectedFamily.house}
                  </span>
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  {mySelectedFamily.displayTitle} ({mySelectedFamily.totalVoters}{' '}
                  मतदाता)
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {mySelectedFamily.voters.slice(0, 6).map((v) => (
                    <div
                      key={v.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="font-extrabold text-slate-900">
                        {v.n} ({v.a})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {v.r}: {v.rv} · #{v.sr}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Big Khandans & 2022 Results */}
        {step === 2 && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <h2 className="text-sm font-extrabold text-slate-900">
                {gpName} के सबसे बड़े खानदान / परिवार
              </h2>
              <div className="space-y-2">
                {families.slice(0, 5).map((f, idx) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-xs font-extrabold flex items-center justify-center tabular-nums">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {f.displayTitle}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          वार्ड {f.ward} · {f.caste}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#1D4ED8] tabular-nums">
                      {f.totalVoters} वोट
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="text-xs font-extrabold text-[#15803D] uppercase">
                पिछला चुनाव परिणाम (2022 · {gpName})
              </div>
              <div className="text-base font-extrabold text-slate-900">
                विजेता सरपंच: {dataset.result.winner}
              </div>
              <div className="text-xs text-slate-600 font-semibold tabular-nums">
                प्राप्त मत: {dataset.result.win_votes} · उपविजेता:{' '}
                {dataset.result.runner} ({dataset.result.runner_votes} मत) · जीत
                का अंतर:{' '}
                <strong className="text-[#15803D]">
                  +{dataset.result.win_votes - dataset.result.runner_votes} वोट
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Caste Breakdown */}
        {step === 3 && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">
                  किस जाति के कितने वोट ({gpName})
                </h2>
                <span className="text-xs font-bold text-[#1D4ED8] tabular-nums">
                  कुल {demographics.totalVoters.toLocaleString('en-IN')} वोट
                </span>
              </div>
              <div className="space-y-2.5">
                {demographics.casteStats.map((c) => (
                  <div key={c.caste} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-slate-900">
                        {c.caste} ({c.families} परिवार)
                      </span>
                      <span className="text-[#1D4ED8] tabular-nums">
                        {c.voters} वोट ({c.percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(c.percent, 4)}%` }}
                        className="h-full bg-[#1D4ED8] rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Interactive Vote Equation */}
        {step === 4 && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">
                  वोटों का समीकरण ({gpName})
                </h2>
                <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-extrabold tabular-nums">
                  {baseTally.leadMargin + simBonusUs >= 0
                    ? `+${baseTally.leadMargin + simBonusUs} वोट से आगे`
                    : `${baseTally.leadMargin + simBonusUs} पीछे`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-emerald-200">
                  <div className="text-lg font-extrabold text-[#15803D]">
                    {baseTally.us + simBonusUs}
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    पक्ष (आप)
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-red-200">
                  <div className="text-lg font-extrabold text-[#B91C1C]">
                    {baseTally.them}
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    विपक्ष
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-amber-200">
                  <div className="text-lg font-extrabold text-[#92400E]">
                    {Math.max(0, baseTally.undecided - simBonusUs)}
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    डांवाडोल
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600">
                  डांवाडोल परिवार को पक्ष में जोड़कर देखें:
                </span>
                <button
                  type="button"
                  onClick={() => setSimBonusUs((b) => b + 12)}
                  className="px-3 py-1.5 rounded-xl bg-[#16A34A] text-white text-xs font-extrabold cursor-pointer"
                >
                  +1 परिवार (12 वोट) पक्ष में करें
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Poll Day Preview & Activate CTA */}
        {step === 5 && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">
                  पोलिंग के दिन का लाइव बूथ मिलान
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#15803D] text-xs font-extrabold">
                  {dataset.roll.booths.length} पोलिंग बूथ
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                मतदान के दिन आपके बूथ एजेंट जैसे ही क्रम संख्या से टिक लगाएँगे, आपको तुरंत
                दिखेगा कि आपके पक्ष के किन परिवारों ने अभी तक वोट नहीं डाला है।
              </p>
            </div>
          </div>
        )}

        {/* Bottom Stepper Footer */}
        <div className="pt-2 space-y-2">
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="w-full h-13 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>आगे देखें ({step}/5)</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishAndActivate}
              className="w-full h-13 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>अपनी पंचायत खोलें · ₹2,499</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
