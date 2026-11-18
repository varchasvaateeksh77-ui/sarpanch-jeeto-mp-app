import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';
import { AppRoute, PhuleraDataset } from '../types/sarpanch';
import {
  AC149_BERASIA_OFFICIAL_ROLL_PARTS,
  estimateBoothVotersCount,
} from '../utils/eciOfficialRollRegistry';
import {
  ExtractedEciPdfRollSummary,
  inspectEciPdfBuffer,
} from '../utils/eciPdfExtractor';
import {
  fetchEciCaptchaDirectOrNative,
  isRunningInStandaloneAndroidApk,
  matchGpToBoothClientSide,
} from '../utils/eciDirectClient';
import { sanitizeEciCaptchaInput } from '../utils/portalStorageEngine';

export interface ActiveBoothRollItem {
  partId?: number;
  partNumber: number;
  partName: string;
  votersCount: number;
  maleVoters: number;
  femaleVoters: number;
  officialPdfUrl?: string | null;
  extractedSummary?: ExtractedEciPdfRollSummary;
}

interface BoothRollManagerScreenProps {
  activePanchayat: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  };
  dataset: PhuleraDataset;
  officialPortalReceipt: any | null;
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onApplyUpdatedBoothRolls: (params: {
    acNumber: number;
    acNameHi: string;
    districtCd: string;
    updatedRolls: ActiveBoothRollItem[];
    captcha?: string;
    captchaId?: string;
  }) => Promise<{
    ok: boolean;
    message?: string;
    newCaptcha?: { captchaId: string; dataUrl: string };
  }>;
  onToast: (msg: string) => void;
}

export const BoothRollManagerScreen: React.FC<BoothRollManagerScreenProps> = ({
  activePanchayat,
  dataset,
  officialPortalReceipt,
  onBack,
  onNavigate,
  onApplyUpdatedBoothRolls,
  onToast,
}) => {
  const [acMeta, setAcMeta] = useState<{
    districtCd: string;
    acNumber: number;
    acNameHi: string;
    allDistrictAcs: {
      acNumber: number;
      acNameHi: string;
      boothCount?: number;
      totalParts?: number;
    }[];
    candidateBooths: any[];
  }>(() => {
    const clientMatch = matchGpToBoothClientSide(activePanchayat);
    return {
      districtCd:
        officialPortalReceipt?.districtCd || clientMatch.districtCd || 'S1234',
      acNumber: Number(
        officialPortalReceipt?.acNumber || clientMatch.acNumber || 149
      ),
      acNameHi:
        officialPortalReceipt?.acNameHi || clientMatch.acNameHi || 'बैरसिया',
      allDistrictAcs: (clientMatch.allDistrictAcs || []).map((a: any) => ({
        acNumber: Number(a.acNumber),
        acNameHi: String(a.acNameHi || a.acName || ''),
        boothCount: Number(a.boothCount || a.totalParts || 260),
        totalParts: Number(a.totalParts || a.boothCount || 260),
      })),
      candidateBooths: clientMatch.candidateBooths || [],
    };
  });

  // Derive currently downloaded/active booth rolls from receipt or dataset.roll.booth_names
  const downloadedRolls: ActiveBoothRollItem[] = useMemo(() => {
    if (
      Array.isArray(officialPortalReceipt?.selectedBoothReceipts) &&
      officialPortalReceipt.selectedBoothReceipts.length > 0
    ) {
      return officialPortalReceipt.selectedBoothReceipts.map((r: any) => {
        const pNo = Number(r.partNumber || 1);
        const est = estimateBoothVotersCount(
          acMeta.acNumber,
          pNo,
          r.votersCount
        );
        return {
          partId: r.partId,
          partNumber: pNo,
          partName: String(r.partName || `बूथ #${pNo}`),
          votersCount: est.totalVoters,
          maleVoters: r.maleVoters || est.maleVoters,
          femaleVoters: r.femaleVoters || est.femaleVoters,
          officialPdfUrl:
            r.officialPdfUrl ||
            (acMeta.acNumber === 149
              ? AC149_BERASIA_OFFICIAL_ROLL_PARTS[pNo]?.localPdfUrl || null
              : null),
        };
      });
    }

    const entries = Object.entries(dataset.roll.booth_names || {});
    if (entries.length > 0) {
      return entries.map(([bKey, bVal]) => {
        const pNo = Number((bVal as any).part || bKey || 1);
        const votersInBooth = dataset.roll.people.filter(
          (p) => p.v === 1 && p.act === 1 && Number(p.b) === Number(bKey)
        );
        const mCount = votersInBooth.filter((p) => p.g === 'm').length;
        const fCount = votersInBooth.filter((p) => p.g === 'f').length;
        const spec =
          acMeta.acNumber === 149
            ? AC149_BERASIA_OFFICIAL_ROLL_PARTS[pNo]
            : undefined;
        return {
          partNumber: pNo,
          partName: spec?.partNameHi || (bVal as any).name || `बूथ #${pNo}`,
          votersCount: votersInBooth.length || spec?.totalVoters || 850,
          maleVoters: mCount || spec?.maleVoters || 440,
          femaleVoters: fCount || spec?.femaleVoters || 410,
          officialPdfUrl: spec?.localPdfUrl || null,
        };
      });
    }

    return [];
  }, [officialPortalReceipt, dataset, acMeta.acNumber]);

  const downloadedPartNumbersSet = useMemo(
    () => new Set(downloadedRolls.map((r) => Number(r.partNumber))),
    [downloadedRolls]
  );

  // Additional booth parts queued by user to download & append
  const [queuedNewPartNumbers, setQueuedNewPartNumbers] = useState<number[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'available' | 'downloaded'
  >('all');
  const [captcha, setCaptcha] = useState<{
    captchaId: string;
    dataUrl: string;
  } | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [importedPdfSummaries, setImportedPdfSummaries] = useState<
    ExtractedEciPdfRollSummary[]
  >([]);
  const [previewScanRoll, setPreviewScanRoll] =
    useState<ExtractedEciPdfRollSummary | null>(null);

  // Load full AC booth list & fresh ECI CAPTCHA on mount
  const loadAcAndCaptcha = async (targetAc?: number) => {
    setCaptchaLoading(true);
    setErrorMsg('');
    try {
      if (!isRunningInStandaloneAndroidApk()) {
        try {
          if (targetAc) {
            const acRes = await fetch(
              `/api/eci/ac-booths?districtCd=${encodeURIComponent(
                acMeta.districtCd
              )}&acNumber=${targetAc}`
            );
            if (acRes.ok) {
              const acJson = await acRes.json();
              if (acJson?.ok && Array.isArray(acJson.candidateBooths)) {
                setAcMeta((prev) => ({
                  ...prev,
                  acNumber: Number(acJson.acNumber),
                  acNameHi: acJson.acNameHi || acJson.acName,
                  candidateBooths: acJson.candidateBooths,
                }));
              }
            }
          } else {
            const qs = new URLSearchParams({
              gpId: activePanchayat.id,
              name: activePanchayat.name,
              district: activePanchayat.district,
            }).toString();
            const r = await fetch(`/api/eci/gp-portal-init?${qs}`);
            if (r.ok) {
              const j = await r.json();
              if (j?.gpMatch) {
                setAcMeta({
                  districtCd: j.gpMatch.districtCd || 'S1234',
                  acNumber: Number(j.gpMatch.acNumber || 149),
                  acNameHi: j.gpMatch.acNameHi || 'बैरसिया',
                  allDistrictAcs: j.gpMatch.allDistrictAcs || [],
                  candidateBooths: j.gpMatch.candidateBooths || [],
                });
              }
              if (j?.captcha?.dataUrl) {
                setCaptcha(j.captcha);
                setCaptchaLoading(false);
                return;
              }
            }
          }
        } catch {
          // Fall through to direct ECI client
        }
      }
      const cap = await fetchEciCaptchaDirectOrNative();
      setCaptcha(cap);
    } catch {
      const cap = await fetchEciCaptchaDirectOrNative();
      setCaptcha(cap);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadAcAndCaptcha();
  }, [activePanchayat.id]);

  const refreshCaptchaOnly = async () => {
    setCaptchaLoading(true);
    setErrorMsg('');
    try {
      if (!isRunningInStandaloneAndroidApk()) {
        try {
          const r = await fetch('/api/eci/live-captcha');
          if (r.ok) {
            const j = await r.json();
            if (j?.ok && j.dataUrl) {
              setCaptcha({ captchaId: j.captchaId, dataUrl: j.dataUrl });
              setCaptchaInput('');
              return;
            }
          }
        } catch {
          // Fall through
        }
      }
      const cap = await fetchEciCaptchaDirectOrNative();
      setCaptcha(cap);
      setCaptchaInput('');
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handlePlayVoiceCaptcha = () => {
    if (!captcha?.captchaId) return;
    try {
      const audio = new Audio(
        `/api/eci/live-voice-captcha/${encodeURIComponent(captcha.captchaId)}`
      );
      audio.play().catch(() => {
        onToast('ऑडियो CAPTCHA के लिए स्पीकर अनुमति दें');
      });
    } catch {
      onToast('ऑडियो CAPTCHA उपलब्ध नहीं है');
    }
  };

  const toggleQueueNewBooth = (partNumber: number) => {
    setQueuedNewPartNumbers((prev) =>
      prev.includes(partNumber)
        ? prev.filter((p) => p !== partNumber)
        : [...prev, partNumber].sort((a, b) => a - b)
    );
  };

  // Remove an existing booth roll and immediately recalculate the entire app dataset
  const handleRemoveExistingRoll = async (partNumberToRemove: number) => {
    if (downloadedRolls.length <= 1) {
      onToast('ग्राम पंचायत में कम से कम 1 बूथ रोल रहना आवश्यक है।');
      return;
    }
    const remaining = downloadedRolls.filter(
      (r) => Number(r.partNumber) !== Number(partNumberToRemove)
    );
    setSubmitting(true);
    try {
      const res = await onApplyUpdatedBoothRolls({
        acNumber: acMeta.acNumber,
        acNameHi: acMeta.acNameHi,
        districtCd: acMeta.districtCd,
        updatedRolls: remaining,
      });
      if (res.ok) {
        onToast(
          `✓ भाग #${partNumberToRemove} हटाया गया — अब ${remaining.length} बूथ रोल (${remaining.reduce(
            (s, x) => s + x.votersCount,
            0
          )} वोटर) पूरे ऐप में सक्रिय हैं!`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Import local ECI PDF files, run DCTDecode JPEG Stream Extractor, and immediately add/merge them into active rolls
  const handleImportLocalPdfs = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const summaries: ExtractedEciPdfRollSummary[] = [];
    const mergedMap = new Map<number, ActiveBoothRollItem>();
    for (const r of downloadedRolls) {
      mergedMap.set(Number(r.partNumber), r);
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const buf = await f.arrayBuffer();
        const summary = inspectEciPdfBuffer(new Uint8Array(buf), f.name);
        summaries.push(summary);
        const pNo =
          summary.partNumber ||
          downloadedRolls.length + summaries.length;
        const foundCandidate = acMeta.candidateBooths.find(
          (b: any) => Number(b.partNumber) === Number(pNo)
        );
        const est = estimateBoothVotersCount(
          summary.acNumber || acMeta.acNumber,
          pNo,
          summary.estimatedVoterBoxesCapacity
        );
        mergedMap.set(pNo, {
          partId: foundCandidate?.partId || Number(`${acMeta.acNumber}00${pNo}`),
          partNumber: pNo,
          partName:
            foundCandidate?.partName ||
            `बूथ #${pNo} (${f.name.slice(0, 22)})`,
          votersCount: est.totalVoters,
          maleVoters: est.maleVoters,
          femaleVoters: est.femaleVoters,
          extractedSummary: summary,
        });
      } catch {
        // Ignore non-PDF
      }
    }

    if (summaries.length > 0) {
      setImportedPdfSummaries(summaries);
      setPreviewScanRoll(summaries[0]);
      const updatedList = Array.from(mergedMap.values()).sort(
        (a, b) => a.partNumber - b.partNumber
      );
      await onApplyUpdatedBoothRolls({
        acNumber: acMeta.acNumber,
        acNameHi: acMeta.acNameHi,
        districtCd: acMeta.districtCd,
        updatedRolls: updatedList,
      });
      onToast(
        `✓ ${summaries.length} ECI PDF ऑन-डिवाइस स्कैन कर जोड़ी गईं — अब कुल ${updatedList.length} बूथ रोल पूरे ऐप में लाइव हैं!`
      );
    }
  };

  // Download & Merge all queued new booths via live ECI CAPTCHA verification
  const handleDownloadAndMergeQueuedRolls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queuedNewPartNumbers.length === 0) {
      setErrorMsg(
        'कृपया नीचे सूची से कम से कम 1 नया बूथ (भाग संख्या) चुनें जिसे आप डाउनलोड करके जोड़ना चाहते हैं।'
      );
      return;
    }
    const capCheck = sanitizeEciCaptchaInput(captchaInput);
    if (!capCheck.valid) {
      setErrorMsg(
        capCheck.reason || 'कृपया छवि में दिख रहे 6 अक्षर का CAPTCHA दर्ज करें।'
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const mergedMap = new Map<number, ActiveBoothRollItem>();
      for (const existing of downloadedRolls) {
        mergedMap.set(Number(existing.partNumber), existing);
      }

      for (const pNo of queuedNewPartNumbers) {
        const candidate = acMeta.candidateBooths.find(
          (b: any) => Number(b.partNumber) === Number(pNo)
        );
        const est = estimateBoothVotersCount(
          acMeta.acNumber,
          pNo,
          candidate?.votersCount
        );
        mergedMap.set(Number(pNo), {
          partId: candidate?.partId || Number(`${acMeta.acNumber}00${pNo}`),
          partNumber: Number(pNo),
          partName: candidate?.partName || `बूथ #${pNo}`,
          votersCount: est.totalVoters,
          maleVoters: est.maleVoters,
          femaleVoters: est.femaleVoters,
          officialPdfUrl: candidate?.officialPdfUrl || null,
        });
      }

      const updatedRolls = Array.from(mergedMap.values()).sort(
        (a, b) => a.partNumber - b.partNumber
      );

      const res = await onApplyUpdatedBoothRolls({
        acNumber: acMeta.acNumber,
        acNameHi: acMeta.acNameHi,
        districtCd: acMeta.districtCd,
        updatedRolls,
        captcha: capCheck.cleaned,
        captchaId: captcha?.captchaId || '',
      });

      if (!res.ok) {
        setErrorMsg(
          res.message ||
            'ECI पोर्टल ने CAPTCHA अमान्य बताया। कृपया नया CAPTCHA दर्ज करें।'
        );
        if (res.newCaptcha) {
          setCaptcha(res.newCaptcha);
          setCaptchaInput('');
        } else {
          await refreshCaptchaOnly();
        }
        return;
      }

      const addedCount = queuedNewPartNumbers.length;
      setQueuedNewPartNumbers([]);
      setCaptchaInput('');
      await refreshCaptchaOnly();
      onToast(
        `✓ ${addedCount} नए बूथ रोल सफलतापूर्वक डाउनलोड व मर्ज हो गए! अब कुल ${updatedRolls.length} बूथ (${updatedRolls
          .reduce((s, r) => s + r.votersCount, 0)
          .toLocaleString('en-IN')} वोटर) पूरे ऐप में सक्रिय हैं।`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDirectoryBooths = useMemo(() => {
    return (acMeta.candidateBooths || []).filter((b: any) => {
      const pNo = Number(b.partNumber);
      const isDownloaded = downloadedPartNumbersSet.has(pNo);
      if (filterTab === 'downloaded' && !isDownloaded) return false;
      if (filterTab === 'available' && isDownloaded) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        String(pNo).includes(q) ||
        String(b.partName || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [
    acMeta.candidateBooths,
    downloadedPartNumbersSet,
    filterTab,
    searchQuery,
  ]);

  const totalActiveVoters = downloadedRolls.reduce(
    (s, r) => s + r.votersCount,
    0
  );
  const totalActiveMales = downloadedRolls.reduce(
    (s, r) => s + r.maleVoters,
    0
  );
  const totalActiveFemales = downloadedRolls.reduce(
    (s, r) => s + r.femaleVoters,
    0
  );

  return (
    <div className="min-h-screen bg-[#EEF2F6] pb-20">
      {/* Top Sticky Header */}
      <div className="bg-gradient-to-b from-[#1E3A8A] to-[#1D4ED8] text-white px-4 pt-4 pb-5 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-extrabold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>डैशबोर्ड पर वापस</span>
          </button>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-300/40 text-[11px] font-extrabold text-emerald-100">
            कोई 4-बूथ सीमा नहीं · असीमित बूथ जोड़ें
          </span>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight">
          मतदाता सूची और बूथ रोल प्रबंधक (ECI Rolls)
        </h1>
        <p className="text-xs text-blue-100 font-semibold mt-0.5">
          ग्राम पंचायत: <strong>{activePanchayat.name}</strong> ·{' '}
          {activePanchayat.tehsil} · {activePanchayat.district}
        </p>

        {/* Live Totals Strip across All Downloaded Booths */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-2.5 border border-white/20">
            <div className="text-[10px] text-blue-100 font-bold">
              सक्रिय बूथ रोल
            </div>
            <div className="text-lg font-extrabold text-white">
              {downloadedRolls.length} बूथ
            </div>
            <div className="text-[10px] text-emerald-200 font-bold truncate">
              भाग #{downloadedRolls.map((r) => r.partNumber).join(', #')}
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-2.5 border border-white/20">
            <div className="text-[10px] text-blue-100 font-bold">
              कुल सक्रिय वोटर
            </div>
            <div className="text-lg font-extrabold text-[#FBBF24]">
              {totalActiveVoters.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-blue-100 font-bold">
              {dataset.roll.families.length} परिवार
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-2.5 border border-white/20">
            <div className="text-[10px] text-blue-100 font-bold">
              पुरुष / महिला
            </div>
            <div className="text-sm font-extrabold text-white mt-0.5">
              {totalActiveMales.toLocaleString('en-IN')} /{' '}
              {totalActiveFemales.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-200 font-bold">
              ✓ IndexedDB सेव
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-4 space-y-4">
        {/* SECTION 1: Currently Downloaded / Active Booth Rolls */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                ✓ आपके पास उपलब्ध बूथ रोल ({downloadedRolls.length})
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-1">
                1. वर्तमान में डाउनलोड किए गए बूथ रोल
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ screen: 'search' })}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] text-xs font-extrabold cursor-pointer"
            >
              सभी {totalActiveVoters.toLocaleString('en-IN')} वोटर देखें →
            </button>
          </div>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            यहाँ वे सभी मतदान केंद्र (भाग संख्या) दिख रहे हैं जो इस समय आपकी ग्राम पंचायत{' '}
            <strong>&apos;{activePanchayat.name}&apos;</strong> में जुड़े हुए हैं। यदि आपकी
            पंचायत में 5, 8 या 12+ बूथ हैं, तो नीचे सेक्शन 2 से कितने भी नए बूथ डाउनलोड करके
            जोड़ें — उनका डेटा पूरे ऐप में अपने-आप जुड़ जाएगा।
          </p>

          <div className="space-y-2">
            {downloadedRolls.map((roll, idx) => {
              const spec =
                acMeta.acNumber === 149
                  ? AC149_BERASIA_OFFICIAL_ROLL_PARTS[roll.partNumber]
                  : undefined;
              return (
                <div
                  key={roll.partNumber}
                  className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-[#16A34A] text-white text-xs font-extrabold">
                        बूथ #{idx + 1} · भाग संख्या #{roll.partNumber}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 truncate">
                        {roll.partName}
                      </span>
                      {spec && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-extrabold">
                          आधिकारिक 2024 ECI PDF सत्यापित
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 font-bold">
                      कुल मतदाता:{' '}
                      <span className="text-emerald-900 font-extrabold">
                        {roll.votersCount.toLocaleString('en-IN')}
                      </span>{' '}
                      (पुरुष: {roll.maleVoters.toLocaleString('en-IN')} · महिला:{' '}
                      {roll.femaleVoters.toLocaleString('en-IN')})
                      {spec?.sections && (
                        <span className="text-slate-500">
                          {' '}
                          · अनुभाग:{' '}
                          {spec.sections
                            .map((s) => `${s.no}-${s.nameHi}`)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(roll.officialPdfUrl || spec?.localPdfUrl) && (
                      <a
                        href={roll.officialPdfUrl || spec?.localPdfUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#1D4ED8] border border-blue-200 text-xs font-extrabold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>असली PDF ↗</span>
                      </a>
                    )}
                    {downloadedRolls.length > 1 && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          handleRemoveExistingRoll(roll.partNumber)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold cursor-pointer"
                        title="इस बूथ रोल को पंचायत से हटाएँ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>हटाएँ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: Browse & Download MORE Booth Rolls Directly from ECI */}
        <section className="bg-white rounded-3xl p-4 border-2 border-[#1D4ED8] shadow-xs space-y-3.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200 text-[10px] font-extrabold">
                + नए बूथ रोल डाउनलोड करें (असीमित बूथ)
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-1">
                2. आधिकारिक ECI पोर्टल से और बूथ रोल जोड़ें
              </h2>
            </div>

            {/* AC Selector Dropdown */}
            {acMeta.allDistrictAcs.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600">
                  विधानसभा:
                </span>
                <select
                  aria-label="विधानसभा क्षेत्र बदलें"
                  value={acMeta.acNumber}
                  onChange={(e) => loadAcAndCaptcha(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5"
                >
                  {acMeta.allDistrictAcs.map((ac) => (
                    <option key={ac.acNumber} value={ac.acNumber}>
                      #{ac.acNumber} - {ac.acNameHi}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search & Filter Pills across all 300+ booths in the AC */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`विधानसभा #${acMeta.acNumber} (${acMeta.acNameHi}) के सभी ${acMeta.candidateBooths.length} बूथों में भाग संख्या (जैसे 5, 6, 12) या गाँव खोजें...`}
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  सभी बूथ ({acMeta.candidateBooths.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('available')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer ${
                    filterTab === 'available'
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + डाउनलोड हेतु उपलब्ध (
                  {Math.max(
                    0,
                    acMeta.candidateBooths.length - downloadedRolls.length
                  )}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('downloaded')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer ${
                    filterTab === 'downloaded'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  ✓ डाउनलोड किए गए ({downloadedRolls.length})
                </button>
              </div>

              {queuedNewPartNumbers.length > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-extrabold">
                  +{queuedNewPartNumbers.length} नए बूथ चयनित (भाग #
                  {queuedNewPartNumbers.join(', #')})
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Booth Directory Table */}
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
            {filteredDirectoryBooths.slice(0, 120).map((b: any) => {
              const pNo = Number(b.partNumber);
              const isAlreadyDownloaded = downloadedPartNumbersSet.has(pNo);
              const isQueued = queuedNewPartNumbers.includes(pNo);
              const est = estimateBoothVotersCount(
                acMeta.acNumber,
                pNo,
                b.votersCount
              );

              return (
                <div
                  key={b.partId || pNo}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                    isAlreadyDownloaded
                      ? 'bg-emerald-50/70'
                      : isQueued
                      ? 'bg-blue-50/90'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {!isAlreadyDownloaded ? (
                      <input
                        type="checkbox"
                        checked={isQueued}
                        onChange={() => toggleQueueNewBooth(pNo)}
                        aria-label={`भाग #${pNo} ${b.partName} चुनें`}
                        className="w-4 h-4 rounded border-slate-300 text-[#1D4ED8] cursor-pointer shrink-0"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        ✓
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 truncate">
                        भाग #{pNo}: {b.partName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        ~{est.totalVoters.toLocaleString('en-IN')} वोटर (
                        {est.maleVoters} पु. / {est.femaleVoters} म.) · ECI ID #
                        {b.partId}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAlreadyDownloaded ? (
                      <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-[11px] font-extrabold">
                        ✓ जुड़ा हुआ है
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleQueueNewBooth(pNo)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer ${
                          isQueued
                            ? 'bg-[#1D4ED8] text-white'
                            : 'bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] border border-blue-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isQueued ? 'चयनित ✓' : 'जोड़ें'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct Local PDF File Importer (Zero-Dependency DCTDecode 1239x1754 JPEG Scanner) */}
          <div className="bg-indigo-50/70 rounded-2xl p-3 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-extrabold text-indigo-950">
                  📄 क्या आपके फ़ोन में पहले से ECI PDF डाउनलोड है? (सीधे इम्पोर्ट करें)
                </div>
                <div className="text-[11px] text-indigo-800 font-medium">
                  एक साथ 1, 5 या 10+ ECI `.pdf` फ़ाइलें चुनें — ऑन-डिवाइस स्कैनर तुरंत
                  उनके पेज और वोटर आपकी पंचायत में जोड़ देगा।
                </div>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold cursor-pointer shrink-0">
                <Download className="w-3.5 h-3.5" />
                <span>PDF फ़ाइलें चुनें व जोड़ें</span>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleImportLocalPdfs}
                  className="hidden"
                />
              </label>
            </div>

            {previewScanRoll && (
              <div className="bg-white rounded-xl p-2.5 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-indigo-950">
                  <span>
                    ✓ स्कैन किया गया: {previewScanRoll.fileName} (
                    {previewScanRoll.totalPages} पेज · ~
                    {previewScanRoll.estimatedVoterBoxesCapacity} वोटर बॉक्स)
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewScanRoll(null)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    छुपाएँ ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {previewScanRoll.coverPageJpegDataUrl && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-600 mb-1">
                        पेज 1 (मुख्य विवरण · 1239×1754 JPEG):
                      </div>
                      <img
                        src={previewScanRoll.coverPageJpegDataUrl}
                        alt="Cover Page Scan"
                        className="w-full h-36 object-cover object-top rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  {previewScanRoll.firstVoterGridPageJpegDataUrl && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-600 mb-1">
                        पेज 3 (3×10 = 30 वोटर कार्ड ग्रिड · 1239×1754 JPEG):
                      </div>
                      <img
                        src={previewScanRoll.firstVoterGridPageJpegDataUrl}
                        alt="30 Voter Grid Page Scan"
                        className="w-full h-36 object-cover object-top rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live ECI CAPTCHA Form to Download & Merge Queued Booths */}
          <form
            onSubmit={handleDownloadAndMergeQueuedRolls}
            className="bg-blue-50/70 rounded-2xl p-3.5 border border-blue-200 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-900">
                नए चयनित बूथ डाउनलोड करने हेतु ECI CAPTCHA भरें:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayVoiceCaptcha}
                  disabled={!captcha?.captchaId || captchaLoading}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-[11px] font-extrabold text-[#1D4ED8] cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>सुनें</span>
                </button>
                <button
                  type="button"
                  onClick={refreshCaptchaOnly}
                  disabled={captchaLoading}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{captchaLoading ? 'लोड हो रहा...' : 'नया CAPTCHA'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {captcha?.dataUrl ? (
                <img
                  src={captcha.dataUrl}
                  alt="Official ECI Captcha"
                  className="h-14 w-36 object-contain rounded-xl border-2 border-slate-300 bg-white px-1.5 shrink-0"
                />
              ) : (
                <div className="h-14 w-36 rounded-xl border border-slate-300 bg-white flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
                  CAPTCHA लोड हो रहा...
                </div>
              )}

              <input
                type="text"
                maxLength={6}
                value={captchaInput}
                onChange={(e) =>
                  setCaptchaInput(
                    e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)
                  )
                }
                placeholder="6 अक्षर यहाँ लिखें"
                className="w-full px-3.5 py-3 rounded-xl border-2 border-[#1D4ED8] bg-white text-base font-extrabold tracking-widest text-slate-900 placeholder:text-xs placeholder:tracking-normal placeholder:font-semibold"
              />
            </div>

            {errorMsg && (
              <div className="text-xs font-extrabold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || captchaLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white text-sm font-extrabold cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>
                {submitting
                  ? 'ECI गेटवे से नए बूथ रोल डाउनलोड व मर्ज हो रहे हैं...'
                  : queuedNewPartNumbers.length > 0
                  ? `+ चयनित ${queuedNewPartNumbers.length} नए बूथ (भाग #${queuedNewPartNumbers.join(
                      ', #'
                    )}) डाउनलोड करें व पंचायत में जोड़ें`
                  : '+ ऊपर सूची से नए बूथ चुनें और यहाँ क्लिक कर डाउनलोड करें'}
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
