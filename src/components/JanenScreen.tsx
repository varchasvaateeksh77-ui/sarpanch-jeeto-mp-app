import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, MapPin } from 'lucide-react';
import { PanchayatDemographics } from '../utils/electionEngine';

interface JanenScreenProps {
  panchayatName: string;
  demographics: PanchayatDemographics;
  onBack: () => void;
  onSelectWard: (ward: number) => void;
  onOpenMereChunav?: () => void;
}

export const JanenScreen: React.FC<JanenScreenProps> = ({
  panchayatName,
  demographics,
  onBack,
  onSelectWard,
  onOpenMereChunav,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'ward' | 'caste'>('all');

  const maxWardVoters = Math.max(
    ...demographics.wardStats.map((w) => w.voters),
    1
  );

  const totalVoters = Math.max(demographics.totalVoters, 1);
  const femalePct = Math.round((demographics.femaleVoters / totalVoters) * 100);
  const malePct = 100 - femalePct;

  const maxAgeBucket = Math.max(
    demographics.ageBuckets.a18_25,
    demographics.ageBuckets.a26_40,
    demographics.ageBuckets.a41_60,
    demographics.ageBuckets.a60_plus,
    1
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      {/* Royal Blue Header */}
      <header className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>पीछे</span>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight">
              पंचायत को जानें
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
              {panchayatName} ·{' '}
              {demographics.totalVoters.toLocaleString('en-IN')} वोट
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
              चुनाव
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-3.5 space-y-3.5 flex-1">
        {/* Sub-navigation Tabs: सब, वार्ड, जाति */}
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'all', label: 'सब' },
              { id: 'ward', label: 'वार्ड' },
              { id: 'caste', label: 'जाति' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 6-Metric Overview Grid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
          <div className="grid grid-cols-3 gap-y-4 divide-x divide-slate-100 text-center">
            <div>
              <div className="text-xl font-extrabold text-[#1D4ED8] tabular-nums">
                {demographics.totalVoters.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                वोट
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#EA580C] tabular-nums">
                {demographics.totalFamilies}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                परिवार
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#7C3AED] tabular-nums">
                {demographics.totalVillages}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                गाँव
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-3" />

          <div className="grid grid-cols-3 gap-y-4 divide-x divide-slate-100 text-center">
            <div>
              <div className="text-xl font-extrabold text-[#DC2626] tabular-nums">
                {demographics.totalWards}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                वार्ड
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0284C7] tabular-nums">
                {demographics.totalBooths}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                बूथ
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#16A34A] tabular-nums">
                {demographics.newVoters}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                नए वोटर
              </div>
            </div>
          </div>
        </div>

        {/* Win Calculator Card: जीत के लिए कितने वोट */}
        {activeTab !== 'caste' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900">
              जीत के लिए कितने वोट
            </h2>

            <div className="flex items-center justify-between gap-1.5">
              <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                  {demographics.winCalculation.turnoutPercent2020}%
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  पिछली पोलिंग
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />

              <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                  {demographics.winCalculation.expectedPolledVotes.toLocaleString(
                    'en-IN'
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  वोट पड़ेंगे
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />

              <div className="flex-1 bg-[#DCFCE7] rounded-xl p-2.5 text-center border border-emerald-200">
                <div className="text-lg font-extrabold text-[#15803D] tabular-nums">
                  {demographics.winCalculation.safeWinTarget.toLocaleString(
                    'en-IN'
                  )}
                </div>
                <div className="text-[11px] text-[#15803D] font-bold mt-0.5">
                  पक्की जीत
                </div>
              </div>
            </div>

            <div className="bg-[#FEFCE8] border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 tabular-nums">
              पिछले चुनाव में {demographics.winCalculation.winner2020} की{' '}
              {demographics.winCalculation.margin2020} वोट से जीत,{' '}
              {demographics.winCalculation.winVotes2020} वोट मिले
            </div>
          </div>
        )}

        {/* Village-wise Votes Card */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900">
              गाँव वाइज़ वोट
            </h2>

            <div className="h-3 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100">
              {demographics.villageStats.map((v) => (
                <div
                  key={v.name}
                  style={{
                    width: `${(v.voters / demographics.totalVoters) * 100}%`,
                    backgroundColor: v.color,
                  }}
                  className="h-full"
                />
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {demographics.villageStats.map((v) => (
                <div
                  key={v.name}
                  className="py-2.5 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: v.color }}
                    />
                    <span className="font-extrabold text-slate-900">
                      {v.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span className="text-xs text-slate-500 font-medium">
                      वार्ड {v.wards.join(', ')}
                    </span>
                    <span className="font-extrabold text-slate-900 w-12 text-right">
                      {v.voters.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ward-wise Votes Card */}
        {(activeTab === 'all' || activeTab === 'ward') && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900">
              वार्ड वाइज़ वोट
            </h2>

            <div className="flex flex-wrap gap-1.5 text-xs font-bold tabular-nums">
              {demographics.boothStats.map((b, i) => {
                const colors = [
                  'bg-blue-50 text-blue-700',
                  'bg-purple-50 text-purple-700',
                  'bg-teal-50 text-teal-700',
                ];
                return (
                  <span
                    key={b.booth}
                    className={`px-2.5 py-1 rounded-full ${
                      colors[i % colors.length]
                    }`}
                  >
                    बूथ {b.booth} · {b.voters.toLocaleString('en-IN')}
                  </span>
                );
              })}
            </div>

            <div className="space-y-2.5 pt-1">
              {demographics.wardStats.map((w) => {
                const barColors = [
                  'bg-[#3B82F6]',
                  'bg-[#8B5CF6]',
                  'bg-[#10B981]',
                ];
                const barCls = barColors[(w.booth - 1) % barColors.length];
                const pct = (w.voters / maxWardVoters) * 100;
                return (
                  <button
                    key={w.ward}
                    type="button"
                    onClick={() => onSelectWard(w.ward)}
                    className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors cursor-pointer text-left"
                  >
                    <span className="text-xs font-extrabold text-slate-800 w-12 shrink-0 tabular-nums">
                      वार्ड {w.ward}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${barCls}`}
                      />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 w-10 text-right tabular-nums shrink-0">
                      {w.voters}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Caste-wise Votes Card */}
        {(activeTab === 'all' || activeTab === 'caste') && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                जाति वाइज़ अनुमानित वोट
              </h2>
              <span className="text-[11px] text-slate-500 font-semibold">
                {demographics.casteStats.length} प्रमुख समाज
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {demographics.casteStats.map((c) => (
                <div
                  key={c.caste}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="text-sm font-extrabold text-slate-900">
                      {c.caste}
                    </span>
                    <span className="text-slate-500 ml-2 tabular-nums">
                      ({c.families} परिवार)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-slate-500 font-semibold">
                      {c.percent}%
                    </span>
                    <span className="text-sm font-extrabold text-[#1D4ED8] w-12 text-right">
                      {c.voters}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* परिवार के हिसाब से (matches XRecorder 04:59) */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900">
              परिवार के हिसाब से
            </h2>
            <div className="grid grid-cols-4 gap-2 text-center tabular-nums">
              <div className="bg-[#FFF7ED] rounded-xl p-2.5">
                <div className="text-lg font-extrabold text-[#EA580C]">
                  {demographics.familySizeBuckets.b1_3}
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  1-3 वोट
                </div>
              </div>
              <div className="bg-[#FFF7ED] rounded-xl p-2.5">
                <div className="text-lg font-extrabold text-[#EA580C]">
                  {demographics.familySizeBuckets.b4_6}
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  4-6 वोट
                </div>
              </div>
              <div className="bg-[#FFF7ED] rounded-xl p-2.5">
                <div className="text-lg font-extrabold text-[#EA580C]">
                  {demographics.familySizeBuckets.b7_9}
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  7-9 वोट
                </div>
              </div>
              <div className="bg-[#FFF7ED] rounded-xl p-2.5">
                <div className="text-lg font-extrabold text-[#EA580C]">
                  {demographics.familySizeBuckets.b10_plus}
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  10+ वोट
                </div>
              </div>
            </div>
          </div>
        )}

        {/* खास वोटर (matches XRecorder 05:00) */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900">खास वोटर</h2>
            <div className="grid grid-cols-3 gap-y-4 divide-x divide-slate-100 text-center tabular-nums">
              <div>
                <div className="text-lg font-extrabold text-[#16A34A]">
                  {demographics.khasVoters.mukhiyaCount}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  मुखिया
                </div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-[#EA580C]">
                  {demographics.khasVoters.newVotersCount}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  नए वोटर (18-19)
                </div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-[#1D4ED8]">
                  {demographics.khasVoters.youthCount}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  युवा (18-25)
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-2" />

            <div className="grid grid-cols-3 gap-y-4 divide-x divide-slate-100 text-center tabular-nums">
              <div>
                <div className="text-lg font-extrabold text-[#7C3AED]">
                  {demographics.khasVoters.seniorCount}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  वरिष्ठ (60+)
                </div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {demographics.khasVoters.largestFamilySize} वोट
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  सबसे बड़ा परिवार
                </div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {demographics.khasVoters.avgFamilySize} वोट
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  औसत परिवार
                </div>
              </div>
            </div>
          </div>
        )}

        {/* वोटर: महिला vs पुरुष + उम्र के हिसाब से (matches XRecorder 05:02) */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
            <h2 className="text-sm font-extrabold text-slate-900">वोटर</h2>

            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100">
                <div
                  style={{ width: `${femalePct}%` }}
                  className="bg-[#EC4899] h-full"
                />
                <div
                  style={{ width: `${malePct}%` }}
                  className="bg-[#2563EB] h-full"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-extrabold tabular-nums">
                <span className="text-[#DB2777]">
                  महिला {demographics.femaleVoters.toLocaleString('en-IN')} ·{' '}
                  {femalePct}%
                </span>
                <span className="text-[#1D4ED8]">
                  पुरुष {demographics.maleVoters.toLocaleString('en-IN')} ·{' '}
                  {malePct}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="text-xs font-extrabold text-slate-600">
                उम्र के हिसाब से
              </div>
              {[
                {
                  label: '18-25',
                  count: demographics.ageBuckets.a18_25,
                },
                {
                  label: '26-40',
                  count: demographics.ageBuckets.a26_40,
                },
                {
                  label: '41-60',
                  count: demographics.ageBuckets.a41_60,
                },
                {
                  label: '60+',
                  count: demographics.ageBuckets.a60_plus,
                },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-3 tabular-nums"
                >
                  <span className="text-xs font-bold text-slate-500 w-12 shrink-0">
                    {b.label}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round((b.count / maxAgeBucket) * 100)}%`,
                      }}
                      className="h-full bg-[#3B82F6] rounded-full"
                    />
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 w-12 text-right shrink-0">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
