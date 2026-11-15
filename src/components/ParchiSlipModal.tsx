import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Printer,
  Settings,
} from 'lucide-react';
import { FamilySummary, ParchiSettings } from '../types/sarpanch';

interface ParchiSlipModalProps {
  family: FamilySummary | null;
  panchayatName: string;
  candidateName: string;
  parchiSettings?: ParchiSettings;
  onOpenSettings?: () => void;
  onClose: () => void;
}

export const ParchiSlipModal: React.FC<ParchiSlipModalProps> = ({
  family,
  panchayatName,
  candidateName,
  parchiSettings = {
    perPage: 4,
    showPoster: true,
    posterTagline: 'गाँव के विकास के लिए आपका अपना उम्मीदवार',
    symbolText: 'छाता',
  },
  onOpenSettings,
  onClose,
}) => {
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  if (!family) return null;

  const handleWhatsAppShare = () => {
    const lines = [
      `*ग्राम पंचायत ${panchayatName} · परिवार वोटर पर्ची*`,
      `*${family.displayTitle}* (वार्ड ${family.ward} · मकान ${family.house})`,
      `मतदान केन्द्र: ${family.boothName} (बूथ ${family.booth})`,
      `--------------------------------`,
      ...family.voters.map(
        (v) =>
          `• *क्रम ${v.sr}* | *${v.n}* (${v.a || ''} वर्ष) | ${v.r}: ${v.rv} | पहचान पत्र: ${v.e}`
      ),
      `--------------------------------`,
      `निवेदक: *${candidateName}* (सरपंच पद उम्मीदवार · चुनाव चिन्ह: ${parchiSettings.symbolText})`,
    ];
    const text = lines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 flex items-start sm:items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="परिवार वोटर पर्ची"
    >
      <div className="bg-[#F1F5F9] min-h-screen sm:min-h-0 sm:rounded-3xl max-w-[440px] w-full sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Royal Blue Header (matches Video 2 00:24) */}
        <div className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>पीछे</span>
            </button>

            <div className="flex items-center gap-1.5">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>सेटिंग</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिंट करें</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-3 py-1.5 rounded-full bg-[#16A34A] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                {copiedWhatsApp ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>कॉपी</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-xl font-extrabold">{family.displayTitle}</h3>
              <p className="text-xs text-blue-100 tabular-nums mt-0.5">
                वार्ड {family.ward} · मकान {family.house} · बूथ {family.booth}
              </p>
            </div>
            <div className="text-right tabular-nums shrink-0">
              <div className="text-2xl font-extrabold leading-none">
                {family.totalVoters}
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">पर्ची</div>
            </div>
          </div>
        </div>

        {/* Printable Parchi Slips List */}
        <div
          id="parchi-print-area"
          className="p-3.5 overflow-y-auto space-y-3 flex-1"
        >
          {family.voters.map((v) => {
            const isFemale = v.g === 'f';
            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {/* Green/Gold Candidate Poster Banner on top of every slip (matches Video 2 00:24) */}
                {parchiSettings.showPoster && (
                  <div className="bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#1E3A8A] text-white px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-amber-300 text-slate-900 font-extrabold text-sm flex items-center justify-center shrink-0 border-2 border-white">
                        {candidateName.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-amber-300 truncate">
                          {candidateName}
                        </div>
                        <div className="text-[10px] text-emerald-100 truncate">
                          सरपंच प्रत्याशी · ग्राम पंचायत {panchayatName}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-slate-900 rounded-xl px-2.5 py-1 text-center shrink-0">
                      <div className="text-xs font-extrabold">
                        ☂️ {parchiSettings.symbolText}
                      </div>
                    </div>
                  </div>
                )}

                {/* Slip Blue/Pink Header */}
                <div
                  className={`px-3.5 py-1.5 text-white flex items-center justify-between text-xs font-extrabold ${
                    isFemale ? 'bg-[#DB2777]' : 'bg-[#1D4ED8]'
                  }`}
                >
                  <span className="bg-white text-slate-900 px-2 py-0.5 rounded text-xs font-extrabold tabular-nums">
                    {v.sr}
                  </span>
                  <span className="font-mono-code text-xs tracking-tight">
                    {v.e}
                  </span>
                </div>

                {/* Slip Details */}
                <div className="p-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-slate-900">
                      नाम: {v.n}
                    </span>
                    <span className="text-slate-600 font-bold tabular-nums">
                      उम्र: {v.a} · {isFemale ? 'महिला' : 'पुरुष'}
                    </span>
                  </div>
                  <div className="text-slate-600 font-semibold">
                    {v.r}: <strong className="text-slate-800">{v.rv}</strong> ·
                    मकान: <strong className="text-slate-800">{v.h}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums pt-1.5 border-t border-slate-100">
                    वार्ड {v.w} · बूथ {family.booth} ({family.boothName})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
