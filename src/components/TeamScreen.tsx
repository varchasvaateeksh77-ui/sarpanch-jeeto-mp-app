import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  X,
} from 'lucide-react';
import { TeamWorker, WardAssignment } from '../types/sarpanch';

interface TeamScreenProps {
  team: TeamWorker[];
  wardAssignments: WardAssignment[];
  wards: number[];
  todayActivity: Record<string, number>;
  onBack: () => void;
  onAddWorker: (name: string, assignedWards: number[]) => void;
  onToggleWorkerWard: (accountId: number, ward: number) => void;
}

export const TeamScreen: React.FC<TeamScreenProps> = ({
  team,
  wardAssignments,
  wards,
  todayActivity,
  onBack,
  onAddWorker,
  onToggleWorkerWard,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [selectedNewWards, setSelectedNewWards] = useState<number[]>([1]);
  const [editingWorker, setEditingWorker] = useState<TeamWorker | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const candidate = team.find((t) => t.role === 'candidate') || team[0];
  const workers = team.filter((t) => t.role === 'worker');

  const totalToday = Object.values(todayActivity).reduce((a, b) => a + b, 0);

  const avatarColors = [
    'bg-[#DCFCE7] text-[#15803D]',
    'bg-[#FEF9C3] text-[#854D0E]',
    'bg-[#FFEDD5] text-[#9A3412]',
    'bg-[#EDE9FE] text-[#5B21B6]',
    'bg-[#DBEAFE] text-[#1E40AF]',
  ];

  const getWorkerWards = (accountId: number) =>
    wardAssignments
      .filter((w) => w.account_id === accountId && w.active)
      .map((w) => w.ward)
      .sort((a, b) => a - b);

  return (
    <div className="min-h-[780px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-6">
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
              कार्यकर्ता
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 tabular-nums">
              {workers.length} कार्यकर्ता · {wards.length} वार्ड
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right tabular-nums">
              <div className="text-2xl font-extrabold leading-none">
                {totalToday}
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">घर आज</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </span>
              <span className="text-[10px] text-blue-100 font-bold mt-0.5">
                डेमो
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-3.5 space-y-3 flex-1">
        {/* Privacy Guarantee Banner */}
        <div className="bg-[#F0FDF4] border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-100 text-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </span>
          <div>
            <div className="text-sm font-extrabold text-[#14532D]">
              आपका हिसाब सिर्फ आपके पास
            </div>
            <p className="text-xs font-bold text-[#15803D] mt-0.5 leading-relaxed">
              कोई और नहीं देख सकता। सिर्फ वही देखेंगे, जिन्हें आप टीम में जोड़ेंगे।
            </p>
          </div>
        </div>

        {/* Candidate Row */}
        {candidate && (
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-base font-extrabold flex items-center justify-center shrink-0">
                {candidate.name.slice(0, 1)}
              </span>
              <div>
                <div className="text-base font-extrabold text-slate-900">
                  {candidate.name}{' '}
                  <span className="text-slate-400 font-semibold text-sm">
                    · आप
                  </span>
                </div>
                <div className="mt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    सारे वार्ड
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right tabular-nums">
              <div className="text-base font-extrabold text-slate-700">
                {todayActivity[candidate.name] || 0}
              </div>
              <div className="text-xs text-slate-400">घर आज</div>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between px-1 pt-1 text-xs font-bold text-slate-500">
          <span>कार्यकर्ता (वार्ड बदलने के लिए टैप करें)</span>
          <span>आज</span>
        </div>

        {/* Worker Cards */}
        <div className="space-y-2.5">
          {workers.map((w, idx) => {
            const wList = getWorkerWards(w.account_id);
            const colorCls = avatarColors[idx % avatarColors.length];
            const todayCount = todayActivity[w.name] || 0;
            return (
              <button
                key={w.account_id}
                type="button"
                onClick={() => setEditingWorker(w)}
                className="w-full bg-white rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between hover:border-blue-300 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-11 h-11 rounded-full text-base font-extrabold flex items-center justify-center shrink-0 ${colorCls}`}
                  >
                    {w.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-base font-extrabold text-slate-900 truncate">
                      {w.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {wList.length > 0 ? (
                        wList.map((wn) => (
                          <span
                            key={wn}
                            className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold tabular-nums"
                          >
                            वार्ड {wn}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          कोई वार्ड नहीं चुना
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-lg font-extrabold text-slate-500 tabular-nums shrink-0 ml-2">
                  {todayCount}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom CTA: WhatsApp से कार्यकर्ता बुलाएँ */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full h-13 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp से कार्यकर्ता बुलाएँ</span>
          </button>
        </div>
      </div>

      {/* Modal: Edit Worker Wards */}
      {editingWorker && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="कार्यकर्ता वार्ड ज़िम्मेदारी"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingWorker.name} · वार्ड ज़िम्मेदारी
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setEditingWorker(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {wards.map((wNum) => {
                const isAssigned = getWorkerWards(
                  editingWorker.account_id
                ).includes(wNum);
                return (
                  <button
                    key={wNum}
                    type="button"
                    onClick={() =>
                      onToggleWorkerWard(editingWorker.account_id, wNum)
                    }
                    className={`p-2.5 rounded-xl border text-xs font-extrabold cursor-pointer ${
                      isAssigned
                        ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    वार्ड {wNum} {isAssigned ? '✓' : ''}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setEditingWorker(null)}
              className="w-full py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
            >
              सेव करें
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add New Worker via WhatsApp Invite */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="नया कार्यकर्ता जोड़ें"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newWorkerName.trim()) return;
              onAddWorker(newWorkerName.trim(), selectedNewWards);
              setNewWorkerName('');
              setCopiedInvite(true);
              setTimeout(() => {
                setCopiedInvite(false);
                setShowAddModal(false);
              }, 900);
            }}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                नया कार्यकर्ता टीम में जोड़ें
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                कार्यकर्ता का नाम
              </label>
              <input
                type="text"
                required
                placeholder="जैसे: रमेश कुमार"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                कौन-सा वार्ड सौंपना है?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {wards.map((wNum) => {
                  const active = selectedNewWards.includes(wNum);
                  return (
                    <button
                      key={wNum}
                      type="button"
                      onClick={() =>
                        setSelectedNewWards((prev) =>
                          prev.includes(wNum)
                            ? prev.filter((x) => x !== wNum)
                            : [...prev, wNum]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                        active
                          ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      वार्ड {wNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#16A34A] text-white text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>कार्यकर्ता जोड़ा गया व लिंक तैयार!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>टीम में जोड़ें व WhatsApp लिंक बनाएँ</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
