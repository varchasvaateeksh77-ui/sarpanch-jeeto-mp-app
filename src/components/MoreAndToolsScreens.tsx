import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Gift,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AppRoute,
  CandidateInfo,
  FamilySummary,
  ParchiSettings,
  PersonNode,
  VoterLeaning,
  VoteTally,
} from '../types/sarpanch';

interface MoreScreenProps {
  panchayatName: string;
  tehsilName: string;
  districtName: string;
  myCandidateName: string;
  candidates: CandidateInfo[];
  tally: VoteTally;
  parchiSettings: ParchiSettings;
  pollHideLeaning: boolean;
  onTogglePollHideLeaning: (val: boolean) => void;
  onOpenVideoWalkthrough: () => void;
  onOpenMereChunav: () => void;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onResetServerDemo: () => void;
  onToast: (msg: string) => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  panchayatName,
  candidates,
  parchiSettings,
  pollHideLeaning,
  onTogglePollHideLeaning,
  onOpenVideoWalkthrough,
  onOpenMereChunav,
  onBack,
  onNavigate,
  onResetServerDemo,
  onToast,
}) => {
  const [electionDate, setElectionDate] = useState<string>('');
  const [showDateInput, setShowDateInput] = useState(false);

  // Live ECI Gateway Console State
  const [showEciConsole, setShowEciConsole] = useState(false);
  const [eciSummary, setEciSummary] = useState<any>(null);
  const [selectedDistCd, setSelectedDistCd] = useState<string>('S1234');
  const [selectedAcNo, setSelectedAcNo] = useState<number>(152);
  const [selectedPartNo, setSelectedPartNo] = useState<number>(1);
  const [liveParts, setLiveParts] = useState<any[]>([]);
  const [loadingEciParts, setLoadingEciParts] = useState(false);
  const [captchaData, setCaptchaData] = useState<{
    captchaId: string;
    dataUrl: string;
  } | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [epicInput, setEpicInput] = useState('');
  const [eciActionResult, setEciActionResult] = useState<string>('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const loadEciDirectorySummary = async () => {
    try {
      const r = await fetch('/api/eci/live-directory');
      const j = await r.json();
      if (j?.ok) {
        setEciSummary(j);
      }
    } catch {
      // Ignore
    }
  };

  const fetchLiveEciPartsForAc = async (distCd: string, acNo: number) => {
    setLoadingEciParts(true);
    setEciActionResult('');
    try {
      const r = await fetch(
        `/api/eci/live-directory?districtCd=${encodeURIComponent(
          distCd
        )}&acNumber=${acNo}&live=1`
      );
      const j = await r.json();
      if (j?.ok && Array.isArray(j.parts)) {
        setLiveParts(j.parts);
        onToast(
          `ECI गेटवे से ${j.parts.length} असली मतदान केंद्र (Polling Booths) लाइव प्राप्त हुए!`
        );
      }
    } catch {
      onToast('ECI गेटवे से संपर्क करने में त्रुटि');
    } finally {
      setLoadingEciParts(false);
    }
  };

  const fetchLiveCaptcha = async () => {
    setLoadingCaptcha(true);
    setEciActionResult('');
    try {
      const r = await fetch('/api/eci/live-captcha');
      const j = await r.json();
      if (j?.ok && j.dataUrl) {
        setCaptchaData({ captchaId: j.captchaId, dataUrl: j.dataUrl });
        setCaptchaInput('');
      } else {
        onToast('CAPTCHA लोड नहीं हो सका');
      }
    } catch {
      onToast('ECI CAPTCHA सेवा त्रुटि');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  const handleLiveGenerateEroll = async () => {
    if (!captchaData || !captchaInput.trim()) {
      onToast('कृपया पहले 6-अक्षर का CAPTCHA दर्ज करें');
      return;
    }
    setEciActionResult('ECI सर्वर पर PDF जनरेट हो रहा है...');
    try {
      const r = await fetch('/api/eci/live-generate-eroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stateCd: 'S12',
          districtCd: selectedDistCd,
          acNumber: selectedAcNo,
          partNumber: selectedPartNo,
          langCd: 'HIN',
          captcha: captchaInput.trim(),
          captchaId: captchaData.captchaId,
        }),
      });
      const j = await r.json();
      setEciActionResult(JSON.stringify(j.eciResponse || j, null, 2));
      if (j?.ok) {
        onToast('ECI मतदाता सूची PDF File ID सफलतापूर्वक जनरेट हो गई!');
      } else {
        onToast(j?.eciResponse?.message || 'CAPTCHA अमान्य या त्रुटि');
      }
    } catch (e: any) {
      setEciActionResult(e?.message || 'Error');
    }
  };

  const handleLiveEpicSearch = async () => {
    if (!captchaData || !captchaInput.trim() || !epicInput.trim()) {
      onToast('कृपया EPIC नंबर और CAPTCHA दोनों दर्ज करें');
      return;
    }
    setEciActionResult('ECI Elasticsearch में EPIC खोजा जा रहा है...');
    try {
      const r = await fetch('/api/eci/live-epic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: epicInput.trim(),
          stateCd: 'S12',
          captcha: captchaInput.trim(),
          captchaId: captchaData.captchaId,
        }),
      });
      const j = await r.json();
      setEciActionResult(JSON.stringify(j.results ?? j, null, 2));
    } catch (e: any) {
      setEciActionResult(e?.message || 'Error');
    }
  };

  const candidateSummary = useMemo(() => {
    const names = candidates
      .filter((c) => !c.is_me && c.id !== 1)
      .map((c) => c.name);
    return ['आप', ...names].join(', ');
  }, [candidates]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      {/* Royal Blue Header (matches XRecorder 01:51) */}
      <div className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4 flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>पीछे</span>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">सेटिंग</h1>
        </div>

        <button
          type="button"
          onClick={onOpenMereChunav}
          className="flex flex-col items-center cursor-pointer"
        >
          <span className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#FBBF24]" />
          </span>
          <span className="text-[10px] text-blue-100 font-bold mt-0.5 truncate max-w-[64px]">
            {panchayatName}
          </span>
        </button>
      </div>

      <div className="p-3.5 space-y-3.5 flex-1">
        {/* Top Full-Width Blue Button: नया चुनाव (matches XRecorder 01:51) */}
        <button
          type="button"
          onClick={() => onNavigate({ screen: 'chunav' })}
          className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-white" />
            <span className="text-base font-extrabold">नया चुनाव</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Gold Bordered Button: ऐप भेजो, कॉइन कमाओ · 1 कॉइन (matches XRecorder 01:51) */}
        <button
          type="button"
          onClick={() => onNavigate({ screen: 'refer' })}
          className="w-full bg-[#FFFBEB] border-2 border-[#FBBF24] rounded-2xl p-4 flex items-center justify-between text-left cursor-pointer hover:bg-amber-50"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white font-extrabold text-xs flex items-center justify-center">
              ₹
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              ऐप भेजो, कॉइन कमाओ
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#B45309]">
            <span>1 कॉइन</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        {/* Section 1: अपना चुनाव */}
        <div className="space-y-1.5">
          <div className="px-1 text-xs font-extrabold text-slate-400">
            अपना चुनाव
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {/* उम्मीदवार */}
            <button
              type="button"
              onClick={() => onNavigate({ screen: 'ummidwar' })}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  उम्मीदवार
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  {candidateSummary}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
              </div>
            </button>

            {/* वोट का दिन */}
            <div className="p-4">
              <div
                onClick={() => setShowDateInput((prev) => !prev)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm font-extrabold text-slate-900">
                  वोट का दिन
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  <span>{electionDate || 'तारीख़ तय नहीं'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              {showDateInput && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="date"
                    value={electionDate}
                    onChange={(e) => {
                      setElectionDate(e.target.value);
                      onToast('वोट का दिन सेव कर लिया गया');
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                  {electionDate && (
                    <button
                      type="button"
                      onClick={() => setElectionDate('')}
                      className="text-xs font-extrabold text-red-600 cursor-pointer"
                    >
                      हटाएँ
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* पर्ची सेटिंग */}
            <button
              type="button"
              onClick={() => onNavigate({ screen: 'parchiset' })}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <span className="text-sm font-extrabold text-slate-900">
                पर्ची सेटिंग
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span>
                  {parchiSettings.perPage} पर्ची ·{' '}
                  {parchiSettings.showPoster ? 'पोस्टर' : 'सादा'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* पोलिंग के दिन पक्ष-विपक्ष छुपाएँ (Toggle Switch) */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  पोलिंग के दिन पक्ष-विपक्ष छुपाएँ
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  बूथ पर स्क्रीन दिखे तो भी पता न चले
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pollHideLeaning}
                onClick={() => onTogglePollHideLeaning(!pollHideLeaning)}
                className={`w-12 h-7 rounded-full transition-colors p-1 cursor-pointer shrink-0 ${
                  pollHideLeaning ? 'bg-[#16A34A]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    pollHideLeaning ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: और */}
        <div className="space-y-1.5">
          <div className="px-1 text-xs font-extrabold text-slate-400">और</div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => onNavigate({ screen: 'result' })}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <span className="text-sm font-extrabold text-slate-900">
                चुनाव रिज़ल्ट
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate({ screen: 'vansh' })}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <span className="text-sm font-extrabold text-slate-900">
                मेरी वंशावली व खास दिन
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Section 3: मदद (matches XRecorder 01:55 & 05:54) */}
        <div className="space-y-1.5">
          <div className="px-1 text-xs font-extrabold text-slate-400">मदद</div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => onNavigate({ screen: 'chat' })}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <span className="text-sm font-extrabold text-slate-900">
                पूछें
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <a
              href="https://wa.me/919826045120"
              target="_blank"
              rel="noreferrer"
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left"
            >
              <span className="text-sm font-extrabold text-[#15803D]">
                WhatsApp पर पूछें
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>

            <a
              href="mailto:contact@sarpanchjeeto.com"
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left"
            >
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  ईमेल पर पूछें
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  contact@sarpanchjeeto.com
                </div>
              </div>
              <Mail className="w-4 h-4 text-slate-400" />
            </a>

            <button
              type="button"
              onClick={onOpenVideoWalkthrough}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <span className="text-sm font-extrabold text-slate-900">
                ऐप कैसे चलाएँ (2 मिनट का वीडियो)
              </span>
              <Play className="w-4 h-4 text-[#DC2626] fill-current" />
            </button>

            <a
              href="/releases/SarpanchJeeto-MP-v1.0.apk"
              download="SarpanchJeeto-MP-v1.0.apk"
              onClick={() =>
                onToast('SarpanchJeeto-MP-v1.0.apk डाउनलोड शुरू हो गया!')
              }
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-left"
            >
              <div>
                <div className="text-sm font-extrabold text-[#1D4ED8]">
                  ऐप इंस्टॉल करें (Android .APK डाउनलोड)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  SarpanchJeeto-MP-v1.0.apk · एक टैप में इंस्टॉल करें
                </div>
              </div>
              <Smartphone className="w-4 h-4 text-[#1D4ED8]" />
            </a>
          </div>
        </div>

        {/* Section 4: Live ECI Gateway Scraper (gateway-voters.eci.gov.in) */}
        <div className="space-y-1.5">
          <div className="px-1 text-xs font-extrabold text-slate-400">
            लाइव ECI स्क्रैपर (मध्य प्रदेश S12 · 55,344 बूथ)
          </div>
          <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const next = !showEciConsole;
                setShowEciConsole(next);
                if (next && !eciSummary) {
                  loadEciDirectorySummary();
                  fetchLiveCaptcha();
                }
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-emerald-50/50 cursor-pointer text-left"
            >
              <div>
                <div className="text-sm font-extrabold text-emerald-900">
                  ECI लाइव डेटा व CAPTCHA स्क्रैपर खोलें
                </div>
                <div className="text-xs text-emerald-700 font-medium mt-0.5">
                  gateway-voters.eci.gov.in · 55 जिले · 230 विधानसभा · 55,344 असली मतदान केंद्र
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-emerald-700 transition-transform ${
                  showEciConsole ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showEciConsole && (
              <div className="p-3.5 border-t border-emerald-100 bg-emerald-50/30 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2 border border-emerald-100">
                    <div className="text-base font-extrabold text-emerald-800">
                      {eciSummary?.totalDistricts ?? 55}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      MP जिले (S12)
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-100">
                    <div className="text-base font-extrabold text-emerald-800">
                      {eciSummary?.totalAcs ?? 230}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      विधानसभा (AC)
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-100">
                    <div className="text-base font-extrabold text-emerald-800">
                      {(eciSummary?.totalPollingParts ?? 55344).toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      असली ECI बूथ
                    </div>
                  </div>
                </div>

                {/* District & AC Selector */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="text-xs font-extrabold text-slate-700">
                    1. बिना CAPTCHA लाइव मतदान केंद्र (Polling Parts) खींचें
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedDistCd}
                      onChange={(e) => {
                        const cd = e.target.value;
                        setSelectedDistCd(cd);
                        const distObj = (eciSummary?.districts || []).find(
                          (d: any) => d.districtCd === cd
                        );
                        if (distObj?.acs?.[0]?.acNumber) {
                          setSelectedAcNo(distObj.acs[0].acNumber);
                        }
                      }}
                      className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {(eciSummary?.districts || []).map((d: any) => (
                        <option key={d.districtCd} value={d.districtCd}>
                          {d.districtCd} - {d.districtNameHi || d.districtName}
                        </option>
                      ))}
                      {!eciSummary?.districts && (
                        <option value="S1234">S1234 - भोपाल (BHOPAL)</option>
                      )}
                    </select>

                    <select
                      value={selectedAcNo}
                      onChange={(e) => setSelectedAcNo(Number(e.target.value))}
                      className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {((
                        (eciSummary?.districts || []).find(
                          (d: any) => d.districtCd === selectedDistCd
                        )?.acs || []
                      ) as any[]).map((a: any) => (
                        <option key={a.acNumber} value={a.acNumber}>
                          AC {a.acNumber} - {a.acNameHi || a.acName} ({a.totalParts}{' '}
                          बूथ)
                        </option>
                      ))}
                      {!eciSummary?.districts && (
                        <option value={152}>AC 152 - बैरसिया (254 बूथ)</option>
                      )}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={loadingEciParts}
                    onClick={() =>
                      fetchLiveEciPartsForAc(selectedDistCd, selectedAcNo)
                    }
                    className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold cursor-pointer"
                  >
                    {loadingEciParts
                      ? 'ECI गेटवे से लाइव बूथ लोड हो रहे हैं...'
                      : 'ECI गेटवे से लाइव मतदान केंद्र (get-part-list) लोड करें'}
                  </button>

                  {liveParts.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50 text-[11px] space-y-1">
                      <div className="font-extrabold text-emerald-800">
                        कुल {liveParts.length} असली बूथ प्राप्त (प्रथम 25):
                      </div>
                      {liveParts.slice(0, 25).map((p: any) => (
                        <div
                          key={p.partId || p.partNumber}
                          onClick={() => setSelectedPartNo(p.partNumber)}
                          className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-emerald-100 cursor-pointer"
                        >
                          <span className="font-bold text-slate-800">
                            भाग #{p.partNumber}: {p.partName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ID: {p.partId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live AES-256-GCM Decrypted CAPTCHA + E-Roll / EPIC Search */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700">
                      2. लाइव ECI CAPTCHA (AES-256-GCM डिक्रिप्टेड)
                    </span>
                    <button
                      type="button"
                      onClick={fetchLiveCaptcha}
                      className="text-[11px] font-extrabold text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      {loadingCaptcha ? 'लोड हो रहा...' : 'नया CAPTCHA मंगाएं ↻'}
                    </button>
                  </div>

                  {captchaData && (
                    <div className="flex items-center gap-2">
                      <img
                        src={captchaData.dataUrl}
                        alt="Live ECI Captcha"
                        className="h-11 rounded border border-slate-300 bg-white px-1"
                      />
                      <input
                        type="text"
                        maxLength={6}
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="6-अक्षर CAPTCHA"
                        className="flex-1 text-xs font-extrabold border border-slate-300 rounded-lg px-2.5 py-2"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={selectedPartNo}
                      onChange={(e) => setSelectedPartNo(Number(e.target.value))}
                      className="w-20 text-xs font-bold border border-slate-300 rounded-lg px-2 py-1.5"
                      placeholder="भाग सं."
                    />
                    <button
                      type="button"
                      onClick={handleLiveGenerateEroll}
                      className="flex-1 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold cursor-pointer"
                    >
                      भाग #{selectedPartNo} की E-Roll PDF जनरेट करें
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <input
                      type="text"
                      value={epicInput}
                      onChange={(e) => setEpicInput(e.target.value)}
                      placeholder="EPIC नंबर (जैसे ABC1234567)"
                      className="flex-1 text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleLiveEpicSearch}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold cursor-pointer"
                    >
                      EPIC खोजें
                    </button>
                  </div>

                  {eciActionResult && (
                    <pre className="text-[10px] bg-slate-900 text-emerald-300 p-2 rounded-lg overflow-x-auto max-h-32">
                      {eciActionResult}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions: Clear All Test Runs, Reset & Logout */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onResetServerDemo}
            className="w-full py-3 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>सभी टेस्ट रन व सर्वर डेटा साफ़ करें (Clear Test Runs)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ screen: 'landing' })}
            className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-red-50 text-[#DC2626] text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>लॉगआउट</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface UmmidwarScreenProps {
  panchayatName: string;
  candidates: CandidateInfo[];
  tally: VoteTally;
  onBack: () => void;
  onSaveCandidatesList: (updated: CandidateInfo[]) => void;
}

export const UmmidwarScreen: React.FC<UmmidwarScreenProps> = ({
  panchayatName,
  candidates,
  tally,
  onBack,
  onSaveCandidatesList,
}) => {
  const myCand =
    candidates.find((c) => c.is_me || c.id === 1) || {
      id: 1,
      name: 'आप (पक्ष उम्मीदवार)',
      colour: '#16a34a',
      is_me: true,
      sort_order: 1,
      status: 'confirmed',
    };

  const rivals = candidates.filter((c) => !c.is_me && c.id !== 1);

  const [myName, setMyName] = useState(myCand.name);
  const [rivalNames, setRivalNames] = useState<Record<number, string>>(() => {
    const obj: Record<number, string> = {};
    for (const r of rivals) obj[r.id] = r.name;
    return obj;
  });
  const [newRivalName, setNewRivalName] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const handleSaveAll = () => {
    const next: CandidateInfo[] = [
      {
        ...myCand,
        name: myName.trim() || 'पक्ष उम्मीदवार',
      },
      ...rivals.map((r) => ({
        ...r,
        name: (rivalNames[r.id] || r.name).trim() || r.name,
      })),
    ];
    onSaveCandidatesList(next);
  };

  const handleAddRival = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRivalName.trim()) return;
    const maxId = candidates.reduce((m, c) => Math.max(m, c.id), 3);
    const nextId = maxId + 1;
    const colours = ['#dc2626', '#7c3aed', '#d97706', '#0284c7', '#db2777'];
    const added: CandidateInfo = {
      id: nextId,
      name: newRivalName.trim(),
      colour: colours[nextId % colours.length],
      is_me: false,
      sort_order: candidates.length + 1,
      status: 'confirmed',
    };
    const next = [...candidates, added];
    setRivalNames((prev) => ({ ...prev, [nextId]: added.name }));
    setNewRivalName('');
    onSaveCandidatesList(next);
  };

  const handleConfirmRemove = (id: number) => {
    const next = candidates.filter((c) => c.id !== id);
    setConfirmRemoveId(null);
    onSaveCandidatesList(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पीछे</span>
        </button>
        <h1 className="text-xl font-extrabold">
          चुनाव में कौन-कौन खड़े हैं?
        </h1>
        <p className="text-xs text-blue-100 mt-0.5">
          {panchayatName} · विपक्ष के मुख्य उम्मीदवारों के नाम लिखें
        </p>
      </div>

      <div className="p-3.5 space-y-3.5 flex-1">
        {/* Your Candidate Card */}
        <div className="bg-[#ECFDF5] rounded-2xl p-4 border border-emerald-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
              <span className="text-sm font-extrabold text-slate-900">आप</span>
              <span className="px-2 py-0.5 rounded bg-emerald-200/70 text-[#15803D] text-[10px] font-extrabold">
                आपका पक्ष
              </span>
            </div>
            <span className="text-xs font-extrabold text-[#15803D] tabular-nums">
              {tally.us} वोट
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-emerald-300 bg-white text-sm font-extrabold text-slate-900"
            />
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3.5 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-extrabold cursor-pointer"
            >
              सेव
            </button>
          </div>
        </div>

        {/* Rival Candidates List */}
        <div className="space-y-2.5">
          <div className="text-xs font-extrabold text-slate-500 px-1">
            विपक्ष के उम्मीदवार
          </div>

          {rivals.map((r) => {
            const votesForRival =
              r.id === 2 ? tally.c2 : r.id === 3 ? tally.c3 : 0;
            return (
              <div
                key={r.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: r.colour || '#dc2626' }}
                  />
                  <input
                    type="text"
                    value={rivalNames[r.id] ?? r.name}
                    onChange={(e) =>
                      setRivalNames((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-extrabold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="px-3 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
                  >
                    सेव
                  </button>
                  {rivals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(r.id)}
                      className="p-2 rounded-xl bg-red-50 text-[#DC2626] hover:bg-red-100 cursor-pointer"
                      aria-label={`${r.name} को हटाएँ`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {confirmRemoveId === r.id && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
                    <p className="font-bold text-red-900">
                      क्या आप <strong>{r.name}</strong> को हटाना चाहते हैं? इनके{' '}
                      {votesForRival} वोटर &ldquo;डांवाडोल&rdquo; में चले जाएँगे।
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmRemove(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white font-extrabold cursor-pointer"
                      >
                        हाँ, हटाएँ
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-300 font-extrabold cursor-pointer"
                      >
                        रद्द करें
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Rival Candidate Form */}
          <form
            onSubmit={handleAddRival}
            className="bg-white p-3.5 rounded-2xl border border-dashed border-blue-300 flex items-center gap-2"
          >
            <input
              type="text"
              value={newRivalName}
              onChange={(e) => setNewRivalName(e.target.value)}
              placeholder="+ और उम्मीदवार जोड़ें..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-900"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>जोड़ें</span>
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => {
            handleSaveAll();
            onBack();
          }}
          className="w-full py-3.5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-extrabold cursor-pointer"
        >
          आगे बढ़ें
        </button>
      </div>
    </div>
  );
};

interface ParchiSetScreenProps {
  panchayatName: string;
  myCandidateName: string;
  parchiSettings: ParchiSettings;
  sampleFamily: FamilySummary;
  onBack: () => void;
  onUpdateParchiSettings: (next: ParchiSettings) => void;
  onOpenSampleParchi: () => void;
}

export const ParchiSetScreen: React.FC<ParchiSetScreenProps> = ({
  panchayatName,
  myCandidateName,
  parchiSettings,
  sampleFamily,
  onBack,
  onUpdateParchiSettings,
  onOpenSampleParchi,
}) => {
  const symbols = [
    'छाता',
    'चश्मा',
    'अनाज बरसाता किसान',
    'नारियल का पेड़',
    'हैंडपंप',
    'टेबल पंखा',
  ];

  const sampleVoter = sampleFamily.voters[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पीछे</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">पर्ची सेटिंग</h1>
        <p className="text-xs text-blue-100 mt-0.5">
          पर्ची पर पोस्टर और एक पन्ने पर कितनी पर्ची
        </p>
      </div>

      <div className="p-3.5 space-y-3.5 flex-1">
        {/* A4 Slips Per Page Selector (4 / 6 / 8 — matches Video 2 00:42) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="text-xs font-extrabold text-slate-700">
            एक पन्ने पर कितनी पर्ची (PDF)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([4, 6, 8] as const).map((num) => {
              const isSelected = parchiSettings.perPage === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() =>
                    onUpdateParchiSettings({
                      ...parchiSettings,
                      perPage: num,
                    })
                  }
                  className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="text-lg font-extrabold tabular-nums">
                    {num}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {num === 4 && 'बड़ी पर्ची'}
                    {num === 6 && 'बीच का साइज़'}
                    {num === 8 && 'कम काग़ज़'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* हर पर्ची के ऊपर पोस्टर Card (matches Video 2 00:42) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                हर पर्ची के ऊपर पोस्टर
              </div>
              <div className="text-xs text-slate-500">
                WhatsApp और प्रिंट दोनों में हर पर्ची के साथ जाएगा
              </div>
            </div>
            <input
              type="checkbox"
              checked={parchiSettings.showPoster}
              onChange={(e) =>
                onUpdateParchiSettings({
                  ...parchiSettings,
                  showPoster: e.target.checked,
                })
              }
              className="w-5 h-5 accent-[#1D4ED8]"
            />
          </div>

          {/* Poster Banner Preview */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#1E3A8A] text-white p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full bg-amber-300 text-slate-900 font-extrabold text-sm flex items-center justify-center shrink-0">
                {myCandidateName.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-amber-300 truncate">
                  {myCandidateName}
                </div>
                <div className="text-[10px] text-emerald-100 truncate">
                  सरपंच प्रत्याशी · ग्राम पंचायत {panchayatName}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white text-slate-900 text-xs font-extrabold shrink-0">
              ☂️ {parchiSettings.symbolText}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              आपका चुनाव चिन्ह चुनें:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {symbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() =>
                    onUpdateParchiSettings({
                      ...parchiSettings,
                      symbolText: sym,
                    })
                  }
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer ${
                    parchiSettings.symbolText === sym
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* पर्ची ऐसी दिखेगी Live Preview */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="text-xs font-extrabold text-slate-500">
            पर्ची ऐसी दिखेगी
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            {parchiSettings.showPoster && (
              <div className="bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#1E3A8A] text-white px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-300">
                  {myCandidateName} · सरपंच प्रत्याशी
                </span>
                <span className="px-2 py-0.5 rounded bg-white text-slate-900 text-[10px] font-extrabold">
                  ☂️ {parchiSettings.symbolText}
                </span>
              </div>
            )}

            <div className="bg-[#1D4ED8] text-white px-3 py-1.5 flex items-center justify-between text-xs font-extrabold">
              <span className="bg-white text-[#1D4ED8] px-1.5 py-0.5 rounded tabular-nums">
                {sampleVoter?.sr || 827}
              </span>
              <span className="font-mono-code text-[11px]">
                {sampleVoter?.e || 'MP37-000827'}
              </span>
            </div>

            <div className="p-3 text-xs space-y-1">
              <div className="font-extrabold text-sm text-slate-900">
                नाम: {sampleVoter?.n || sampleFamily.headName} (उम्र{' '}
                {sampleVoter?.a || 45})
              </div>
              <div className="text-slate-600 font-semibold">
                {sampleVoter?.r || 'पिता'}: {sampleVoter?.rv || '—'} · वार्ड{' '}
                {sampleFamily.ward} · मकान {sampleFamily.house}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSampleParchi}
            className="w-full py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>पूरे परिवार की पर्ची देखें</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface FastTickScreenProps {
  panchayatName: string;
  wards: number[];
  allVoters: PersonNode[];
  leaningMap: Map<string, VoterLeaning>;
  turnoutSet: Set<string>;
  onBack: () => void;
  onToggleVoterTurnout: (voterId: string, voterName?: string) => void;
}

export const FastTickScreen: React.FC<FastTickScreenProps> = ({
  panchayatName,
  wards,
  allVoters,
  leaningMap,
  turnoutSet,
  onBack,
  onToggleVoterTurnout,
}) => {
  const [selectedWard, setSelectedWard] = useState<number>(wards[0] || 1);
  const [serialStr, setSerialStr] = useState<string>('');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const wardVoters = useMemo(
    () =>
      allVoters.filter(
        (p) => p.v === 1 && p.act === 1 && p.w === selectedWard
      ),
    [allVoters, selectedWard]
  );

  const matchedVoter = useMemo(() => {
    const num = Number(serialStr.trim());
    if (!num) return wardVoters[0] || null;
    return (
      wardVoters.find((v) => v.sr === num) ||
      allVoters.find((v) => v.v === 1 && v.act === 1 && v.sr === num) ||
      null
    );
  }, [wardVoters, allVoters, serialStr]);

  const handleMarkTurnout = (v: PersonNode) => {
    onToggleVoterTurnout(v.id, v.n);
    if (!turnoutSet.has(v.id)) {
      setRecentIds((prev) => [v.id, ...prev.filter((x) => x !== v.id)].slice(0, 8));
    }
    setSerialStr('');
  };

  return (
    <div className="min-h-[760px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
      <div className="bg-[#16A34A] text-white px-4 pt-4 pb-5 rounded-b-[28px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
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
                क्रम नंबर से टिक · {panchayatName}
              </h1>
              <p className="text-xs text-emerald-100">
                बूथ एजेंट फ़ास्ट कीपैड · क्रम संख्या लिखें और एक टैप में वोट टिक करें
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-extrabold tabular-nums">
            {turnoutSet.size} वोट पड़े
          </span>
        </div>
      </div>

      <div className="px-3.5 pt-3 space-y-3 flex-1">
        {/* Ward Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {wards.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWard(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                selectedWard === w
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              वार्ड {w}
            </button>
          ))}
        </div>

        {/* Serial Number Display + Matched Voter Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <input
              type="number"
              value={serialStr}
              onChange={(e) => setSerialStr(e.target.value)}
              placeholder="क्रम संख्या लिखें (जैसे 102)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-[#16A34A] bg-emerald-50/30 text-lg font-extrabold text-slate-900 tabular-nums"
            />
            {serialStr && (
              <button
                type="button"
                onClick={() => setSerialStr('')}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700 cursor-pointer"
              >
                साफ़ करें
              </button>
            )}
          </div>

          {matchedVoter ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1D4ED8] text-white text-xs font-extrabold tabular-nums">
                    क्रम #{matchedVoter.sr}
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {matchedVoter.n}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-semibold mt-1">
                  {matchedVoter.r}: {matchedVoter.rv} · वार्ड {matchedVoter.w} ·
                  मकान {matchedVoter.h}
                </div>
                <div className="text-[11px] font-extrabold mt-1">
                  {leaningMap.get(matchedVoter.id)?.candidate_id === 1 ? (
                    <span className="text-[#15803D]">● आपका पक्का वोटर (पक्ष)</span>
                  ) : (
                    <span className="text-slate-500">● सामान्य / अन्य</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleMarkTurnout(matchedVoter)}
                className={`px-4 py-3 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  turnoutSet.has(matchedVoter.id)
                    ? 'bg-emerald-100 text-[#15803D] border border-emerald-300'
                    : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {turnoutSet.has(matchedVoter.id) ? 'वोट पड़ गया ✓' : 'वोट दे आए'}
                </span>
              </button>
            </div>
          ) : (
            <div className="p-3 text-center text-xs font-bold text-slate-500">
              इस क्रम संख्या पर कोई वोटर नहीं मिला
            </div>
          )}

          {/* Fast Numeric Keypad */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '⌫'].map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === '⌫') setSerialStr((s) => s.slice(0, -1));
                    else setSerialStr((s) => (s + key).slice(0, 5));
                  }}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-sm tabular-nums cursor-pointer"
                >
                  {key}
                </button>
              )
            )}
          </div>
        </div>

        {/* Recent Ticks Undo List */}
        {recentIds.length > 0 && (
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2">
            <div className="text-xs font-extrabold text-slate-600">
              अभी टिक लगाए गए वोटर:
            </div>
            {recentIds.map((vid) => {
              const v = allVoters.find((p) => p.id === vid);
              if (!v) return null;
              return (
                <div
                  key={vid}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-50/60 border border-emerald-200"
                >
                  <span className="font-extrabold text-slate-900">
                    #{v.sr} · {v.n} (वार्ड {v.w})
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleVoterTurnout(v.id, v.n)}
                    className="text-[#DC2626] font-extrabold hover:underline cursor-pointer"
                  >
                    हटाएँ
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface ReferScreenProps {
  panchayatName: string;
  myCandidateName: string;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const ReferScreen: React.FC<ReferScreenProps> = ({
  panchayatName,
  myCandidateName,
  onBack,
  onToast,
}) => {
  const [upiId, setUpiId] = useState('sarpanch.mp@ybl');

  return (
    <div className="min-h-[760px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
      <div className="bg-[#D97706] text-white px-4 pt-4 pb-6 rounded-b-[28px]">
        <div className="flex items-center gap-2.5 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            aria-label="वापस जाएँ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100">
            रेफ़र प्रोग्राम · मध्य प्रदेश
          </span>
        </div>
        <h1 className="text-2xl font-extrabold">ऐप भेजो, कॉइन कमाओ</h1>
        <p className="text-xs text-amber-100 mt-1">
          आस-पास की पंचायतों के सरपंच उम्मीदवारों को जोड़ें और सीधे UPI में इनाम पाएँ
        </p>
      </div>

      <div className="px-3.5 -mt-4 space-y-3.5 flex-1">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="text-xl font-extrabold text-[#B45309] tabular-nums">
              ₹500
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              कुल रेफ़र कॉइन
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-xl font-extrabold text-[#15803D] tabular-nums">
              2 पंचायतें
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              आपके लिंक से जुड़ीं
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="text-sm font-extrabold text-slate-900">
            कैसे काम करता है?
          </div>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside font-medium">
            <li>
              नीचे दिए बटन से अपना खास रेफ़र लिंक पड़ोसी गाँव के सरपंच उम्मीदवारों को
              WhatsApp पर भेजें।
            </li>
            <li>
              जब वे अपनी पंचायत का चुनाव मैनेजर चालू करेंगे, आपको तुरंत{' '}
              <strong>₹250 कॉइन</strong> मिलेंगे।
            </li>
          </ol>
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }
              onToast('रेफ़र लिंक कॉपी हो गया! WhatsApp पर शेयर करें');
            }}
            className="w-full py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp पर रेफ़र लिंक भेजें ({myCandidateName})</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="text-xs font-extrabold text-slate-700">
            कमाई अपने खाते (UPI ID) में मँगाएँ ({panchayatName}):
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="आपकी UPI ID (जैसे 98260xxxxx@ybl)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-extrabold text-slate-900"
            />
            <button
              type="button"
              onClick={() => onToast('आपकी UPI ID सुरक्षित कर ली गई')}
              className="px-3.5 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
            >
              सेव करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VanshScreenProps {
  panchayatName: string;
  families: FamilySummary[];
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onToast: (msg: string) => void;
}

export const VanshScreen: React.FC<VanshScreenProps> = ({
  panchayatName,
  families,
  onBack,
  onNavigate,
  onToast,
}) => {
  const [occasions, setOccasions] = useState([
    {
      id: 'occ-1',
      familyTitle: families[0]?.displayTitle || 'मुखिया परिवार',
      personName: families[0]?.headName || 'मुखिया',
      type: 'जन्मदिन',
      date: '15 नवंबर',
      ward: families[0]?.ward || 1,
    },
    {
      id: 'occ-2',
      familyTitle: families[1]?.displayTitle || 'वरिष्ठ परिवार',
      personName: families[1]?.headName || 'वरिष्ठ जन',
      type: 'शादी की सालगिरह',
      date: '22 नवंबर',
      ward: families[1]?.ward || 2,
    },
  ]);

  const [newPerson, setNewPerson] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleAddOccasion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.trim() || !newDate.trim()) return;
    setOccasions((prev) => [
      {
        id: `occ-${Date.now()}`,
        familyTitle: `${newPerson.trim()} जी का परिवार`,
        personName: newPerson.trim(),
        type: 'जन्मदिन / खास दिन',
        date: newDate.trim(),
        ward: 1,
      },
      ...prev,
    ]);
    setNewPerson('');
    setNewDate('');
    onToast('परिवार का खास दिन (रिमाइंडर) जोड़ दिया गया');
  };

  return (
    <div className="min-h-[760px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
      <div className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5 rounded-b-[28px]">
        <div className="flex items-center gap-2.5 mb-1">
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
              मेरी वंशावली व खास दिन · {panchayatName}
            </h1>
            <p className="text-xs text-blue-100">
              गाँव के प्रमुख परिवारों की वंशावली और जन्मदिन/सालगिरह याद रखें
            </p>
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-3.5 space-y-3.5 flex-1">
        {/* Top Families Quick Vanshavali Launcher */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="text-xs font-extrabold text-slate-700">
            {panchayatName} के प्रमुख परिवारों का वंशावली वृक्ष खोलें:
          </div>
          <div className="space-y-2">
            {families.slice(0, 4).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  onNavigate({ screen: 'family', familyId: f.id })
                }
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {f.displayTitle}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    वार्ड {f.ward} · मकान {f.house} · {f.caste}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{f.totalVoters} सदस्य →</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Village Occasions & Greeting Reminders */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="text-xs font-extrabold text-slate-700">
            गाँव के परिवारों के आने वाले खास दिन (बधाई भेजें):
          </div>
          {occasions.map((oc) => (
            <div
              key={oc.id}
              className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-xs font-extrabold text-slate-900">
                  {oc.personName} ({oc.type} · {oc.date})
                </div>
                <div className="text-[11px] text-slate-600">{oc.familyTitle}</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onToast(`${oc.personName} के लिए WhatsApp बधाई संदेश कॉपी हुआ`)
                }
                className="px-2.5 py-1.5 rounded-lg bg-[#16A34A] text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>बधाई भेजें</span>
              </button>
            </div>
          ))}

          <form
            onSubmit={handleAddOccasion}
            className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            <input
              type="text"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              placeholder="व्यक्ति का नाम..."
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
            />
            <input
              type="text"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              placeholder="तारीख (जैसे 5 दिसंबर)..."
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
            />
            <button
              type="submit"
              className="py-2 px-3 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
            >
              + खास दिन जोड़ें
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
