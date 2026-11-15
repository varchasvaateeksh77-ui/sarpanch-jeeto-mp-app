import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Edit2,
  List,
  MapPin,
  MoreHorizontal,
  Phone,
  X,
} from 'lucide-react';
import {
  CandidateInfo,
  FamilySummary,
  PersonNode,
  SideKey,
  VanshavaliTreeNode,
  VoterTagDef,
} from '../types/sarpanch';

interface FamilyDetailScreenProps {
  family: FamilySummary;
  treeRoots: VanshavaliTreeNode[];
  castes: string[];
  candidates: CandidateInfo[];
  tags: VoterTagDef[];
  voterTagsMap: Map<string, string[]>;
  isEscalated?: boolean;
  onBack: () => void;
  onNextFamily: () => void;
  onOpenParchi: () => void;
  onUpdateFamilyCaste: (familyId: string, newCaste: string) => void;
  onUpdateFamilyContact: (
    familyId: string,
    name: string,
    phone: string
  ) => void;
  onUpdateVoterLeaning: (voterId: string, side: SideKey) => void;
  onUpdateAllFamilyLeaning: (familyId: string, side: SideKey) => void;
  onToggleVoterTag: (voterId: string, tagId: string) => void;
  onToggleEscalateFamily?: (familyId: string) => void;
}

const TAG_LABEL_MAP: Record<string, string> = {
  out: 'बाहर रहते हैं',
  bahar: 'बाहर रहते हैं',
  sasural: 'ससुराल में',
  gadi0001: 'गाड़ी चाहिए',
  influencer: 'प्रभावशाली',
  schemebenefit: 'योजना लाभार्थी',
};

function getNodeBorderAndBg(side: SideKey, isGhost: boolean) {
  if (isGhost) {
    return {
      borderLeft: '',
      box: 'bg-[#FEFCE8] border-amber-300',
      lineColor: 'border-emerald-700',
    };
  }
  if (side === 'us') {
    return {
      borderLeft: '',
      box: 'bg-[#F0FDF4] border-emerald-400',
      lineColor: 'border-[#15803D]',
    };
  }
  if (side === 'c2' || side === 'them') {
    return {
      borderLeft: '',
      box: 'bg-[#FEF2F2] border-red-400',
      lineColor: 'border-[#DC2626]',
    };
  }
  if (side === 'c3') {
    return {
      borderLeft: '',
      box: 'bg-[#F5F3FF] border-purple-400',
      lineColor: 'border-[#7C3AED]',
    };
  }
  if (side === 'undecided') {
    return {
      borderLeft: '',
      box: 'bg-[#FFFBEB] border-amber-400',
      lineColor: 'border-[#D97706]',
    };
  }
  return {
    borderLeft: '',
    box: 'bg-slate-50 border-slate-200',
    lineColor: 'border-slate-300',
  };
}

export const FamilyDetailScreen: React.FC<FamilyDetailScreenProps> = ({
  family,
  treeRoots,
  castes,
  candidates,
  tags,
  voterTagsMap,
  isEscalated = false,
  onBack,
  onNextFamily,
  onOpenParchi,
  onUpdateFamilyCaste,
  onUpdateFamilyContact,
  onUpdateVoterLeaning,
  onUpdateAllFamilyLeaning,
  onToggleVoterTag,
  onToggleEscalateFamily,
}) => {
  const [showCasteModal, setShowCasteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactNameInput, setContactNameInput] = useState(family.contactName);
  const [contactPhoneInput, setContactPhoneInput] = useState(
    family.contactPhone
  );
  const [selectedPersonForEdit, setSelectedPersonForEdit] =
    useState<PersonNode | null>(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);

  const hasSavedPhone = Boolean(
    family.contactPhone && family.contactPhone.trim().length >= 10
  );

  const handlePickFromPhonebook = async () => {
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts?: { multiple?: boolean }
        ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    };
    if (nav.contacts && typeof nav.contacts.select === 'function') {
      try {
        const selected = await nav.contacts.select(['name', 'tel'], {
          multiple: false,
        });
        if (selected && selected.length > 0) {
          const picked = selected[0];
          const rawTel = picked.tel?.[0] || '';
          const digits = rawTel.replace(/\D/g, '').slice(-10);
          const pickedName = picked.name?.[0]?.trim() || family.contactName;
          if (digits.length === 10) {
            onUpdateFamilyContact(family.id, pickedName, digits);
            return;
          }
        }
      } catch {
        // Fallback to manual modal if user cancels or browser blocks Contact Picker inside iframe
      }
    }
    setContactNameInput(family.contactName);
    setContactPhoneInput(family.contactPhone);
    setShowContactModal(true);
  };

  const c1Name =
    candidates.find((c) => c.is_me || c.id === 1)?.name || 'मंजू देवी';
  const c2Name =
    candidates.find((c) => c.id === 2)?.name || 'क्रांति देवी';
  const c3Name =
    candidates.find((c) => c.id === 3)?.name || 'बिनोद';

  const total = Math.max(family.totalVoters, 1);
  const usPct = (family.counts.us / total) * 100;
  const themPct = (family.counts.them / total) * 100;
  const undPct = (family.counts.undecided / total) * 100;
  const remPct = Math.max(0, 100 - usPct - themPct - undPct);

  const renderPersonRow = (p: PersonNode, isPrimary: boolean) => {
    const pTags = voterTagsMap.get(p.id) || [];
    const genderDot =
      p.g === 'f' ? 'bg-[#EC4899]' : 'bg-[#3B82F6]';
    return (
      <div
        key={p.id}
        className={`flex items-center flex-wrap gap-1.5 ${
          isPrimary ? '' : 'mt-1'
        }`}
      >
        {p.v === 1 && (
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${genderDot}`}
            aria-hidden="true"
          />
        )}
        <span
          className={`${
            isPrimary
              ? 'text-[15px] font-extrabold text-slate-900'
              : 'text-sm font-medium text-slate-700'
          }`}
        >
          {p.n}
        </span>
        {p.a !== undefined && (
          <span className="text-xs font-bold text-slate-400 tabular-nums">
            {p.a}
          </span>
        )}
        {p.nw === 1 && (
          <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-[10px] font-extrabold">
            नया
          </span>
        )}
        {pTags.map((tid) => (
          <span
            key={tid}
            className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[10px] font-extrabold"
          >
            {TAG_LABEL_MAP[tid] || tid}
          </span>
        ))}
      </div>
    );
  };

  const renderTreeNode = (node: VanshavaliTreeNode, depth = 0) => {
    const styles = getNodeBorderAndBg(node.leaning, node.isGhost);
    return (
      <div key={node.primary.id} className={depth > 0 ? 'mt-2.5' : 'mt-2'}>
        <button
          type="button"
          onClick={() => {
            if (!node.isGhost) {
              setSelectedPersonForEdit(node.primary);
            }
          }}
          className={`inline-block min-w-[200px] max-w-full text-left rounded-2xl border px-3.5 py-2 transition-colors ${
            styles.box
          } ${!node.isGhost ? `${styles.borderLeft} cursor-pointer hover:brightness-95` : ''}`}
        >
          {renderPersonRow(node.primary, true)}
          {node.spouses.map((sp) => renderPersonRow(sp, false))}
        </button>

        {node.children.length > 0 && (
          <div className="ml-4 pl-4 border-l-2 border-[#15803D] space-y-2.5 pt-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[780px] flex flex-col bg-[#F1F5F9] text-slate-900 rounded-none sm:rounded-3xl overflow-hidden border border-slate-200 pb-4">
      {/* Royal Blue Header */}
      <header className="bg-[#1D4ED8] text-white px-4 pt-3.5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            aria-label="पीछे जाएँ"
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/15 text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="परिवार का हिसाब बदलें"
              onClick={() => setShowBulkUpdateModal(true)}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-blue-100 font-bold mt-0.5">
                म.प्र.
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">
              {family.displayTitle}
            </h1>
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-sm text-blue-100 font-medium tabular-nums">
              <span>
                वार्ड {family.ward} · मकान {family.house} ·
              </span>
              <button
                type="button"
                onClick={() => setShowCasteModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                <span>{family.caste}</span>
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {hasSavedPhone ? (
              <a
                href={`tel:${family.contactPhone}`}
                aria-label="परिवार मुखिया को कॉल करें"
                className="w-11 h-11 rounded-full bg-[#16A34A] hover:bg-[#15803D] border-2 border-white/30 flex items-center justify-center text-white"
              >
                <Phone className="w-5 h-5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setContactNameInput(family.contactName);
                  setContactPhoneInput('');
                  setShowContactModal(true);
                }}
                aria-label="मुखिया का फ़ोन नंबर जोड़ें"
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 border-2 border-white/30 flex items-center justify-center text-white cursor-pointer"
              >
                <Phone className="w-5 h-5" />
              </button>
            )}
            <div className="bg-white/15 rounded-2xl px-3.5 py-1.5 text-center">
              <div className="text-2xl font-extrabold tabular-nums leading-none">
                {family.totalVoters}
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">वोट</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="px-3.5 -mt-2.5 space-y-2.5 flex-1">
        {/* Card 1: Alignment Bar */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80">
          <div className="h-2.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100 mb-2.5">
            <div
              style={{ width: `${usPct}%` }}
              className="bg-[#15803D] h-full transition-all"
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

          <div className="flex items-center flex-wrap gap-4 text-xs font-bold text-slate-700 tabular-nums">
            {family.counts.us > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                <span>पक्ष {family.counts.us}</span>
              </span>
            )}
            {family.counts.them > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span>विपक्ष {family.counts.them}</span>
              </span>
            )}
            {family.counts.undecided > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <span>डांवाडोल {family.counts.undecided}</span>
              </span>
            )}
            {family.counts.not_asked > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span>बात बाकी {family.counts.not_asked}</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Mukhiya Phone Card */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setContactNameInput(family.contactName);
                  setContactPhoneInput(family.contactPhone);
                  setShowContactModal(true);
                }}
                className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900 hover:text-blue-700 cursor-pointer text-left"
              >
                <span className="truncate">मुखिया: {family.contactName}</span>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {hasSavedPhone ? (
                <div className="text-xs font-bold text-slate-600 tabular-nums mt-0.5">
                  {family.contactPhone}
                </div>
              ) : (
                <div className="text-[11px] font-bold text-amber-700 mt-0.5">
                  नंबर दर्ज नहीं है (कार्यकर्ता / फ़ोनबुक से जोड़ें)
                </div>
              )}
            </div>
          </div>

          {hasSavedPhone ? (
            <a
              href={`tel:${family.contactPhone}`}
              className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-extrabold flex items-center gap-1.5 shrink-0"
            >
              <Phone className="w-4 h-4" />
              <span>कॉल करें</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handlePickFromPhonebook}
                className="px-3 py-2 rounded-xl bg-[#DCFCE7] hover:bg-emerald-200 text-[#15803D] text-xs font-extrabold cursor-pointer"
              >
                फ़ोनबुक
              </button>
              <button
                type="button"
                onClick={() => {
                  setContactNameInput(family.contactName);
                  setContactPhoneInput('');
                  setShowContactModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <span>+ नंबर जोड़ें</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 3: Worker -> Candidate Escalation (Synced to Server) */}
        <button
          type="button"
          onClick={() =>
            onToggleEscalateFamily && onToggleEscalateFamily(family.id)
          }
          className={`w-full rounded-2xl px-3.5 py-3 border flex items-center justify-between text-left transition-colors cursor-pointer ${
            isEscalated
              ? 'bg-[#FFFBEB] border-amber-300'
              : 'bg-white border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              कार्यकर्ता
            </span>
            <span className="text-sm font-extrabold text-[#1E3A8A]">
              {isEscalated
                ? 'उम्मीदवार की आज की कॉल लिस्ट में जोड़ा गया ✓'
                : 'उम्मीदवार से बात करवाएँ'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#1E3A8A]" />
        </button>

        {/* Card 4: Vanshavali Family Tree Canvas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 relative">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-bold text-slate-400">
                वंशावली (किसी भी सदस्य को टैप करके पक्ष/विपक्ष बदलें)
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenParchi}
                className="px-3.5 py-2 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-900 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <List className="w-4 h-4" />
                <span>पर्ची देखें</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkUpdateModal(true)}
                className="text-xs font-extrabold text-[#1E3A8A] hover:underline cursor-pointer"
              >
                अपडेट करें
              </button>
            </div>
          </div>

          <div className="pt-1 pb-2 overflow-x-auto">
            {treeRoots.map((root) => renderTreeNode(root, 0))}
          </div>
        </div>

        {/* Bottom Primary Button: अगला घर */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onNextFamily}
            className="w-full h-14 rounded-2xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>अगला घर</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal: Edit Individual Voter Leaning & Tags */}
      {selectedPersonForEdit && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="वोटर अपडेट करें"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedPersonForEdit.n}{' '}
                  {selectedPersonForEdit.a ? `(${selectedPersonForEdit.a})` : ''}
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {selectedPersonForEdit.r}: {selectedPersonForEdit.rv} · क्रम{' '}
                  {selectedPersonForEdit.sr} · {selectedPersonForEdit.e}
                </p>
              </div>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setSelectedPersonForEdit(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">
                वोट का रुझान चुनें:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      side: 'us' as SideKey,
                      label: `पक्ष (${c1Name})`,
                      cls: 'border-emerald-500 bg-emerald-50 text-emerald-900',
                    },
                    {
                      side: 'c2' as SideKey,
                      label: `${c2Name} (विपक्ष)`,
                      cls: 'border-red-500 bg-red-50 text-red-900',
                    },
                    {
                      side: 'c3' as SideKey,
                      label: `${c3Name} (विपक्ष)`,
                      cls: 'border-purple-500 bg-purple-50 text-purple-900',
                    },
                    {
                      side: 'undecided' as SideKey,
                      label: 'डांवाडोल',
                      cls: 'border-amber-500 bg-amber-50 text-amber-900',
                    },
                    {
                      side: 'not_asked' as SideKey,
                      label: 'बात बाकी',
                      cls: 'border-slate-300 bg-slate-50 text-slate-800',
                    },
                    {
                      side: 'no_vote' as SideKey,
                      label: 'वोट नहीं देंगे',
                      cls: 'border-slate-400 bg-slate-100 text-slate-700',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.side}
                    type="button"
                    onClick={() => {
                      onUpdateVoterLeaning(selectedPersonForEdit.id, opt.side);
                      for (const spId of selectedPersonForEdit.s || []) {
                        onUpdateVoterLeaning(spId, opt.side);
                      }
                      setSelectedPersonForEdit(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold text-left cursor-pointer hover:brightness-95 ${opt.cls}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-600">
                वोटर टैग जोड़ें / हटाएँ:
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const hasTag = (
                    voterTagsMap.get(selectedPersonForEdit.id) || []
                  ).includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        onToggleVoterTag(selectedPersonForEdit.id, t.id)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                        hasTag
                          ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.name} {hasTag ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Update Whole Family Alignment */}
      {showBulkUpdateModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="पूरे परिवार का हिसाब अपडेट करें"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                पूरे परिवार ({family.totalVoters} वोट) को एक साथ सेट करें
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowBulkUpdateModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  {
                    side: 'us' as SideKey,
                    label: `पूरा परिवार हमारे पक्ष में (${c1Name})`,
                    cls: 'bg-[#F0FDF4] border-emerald-300 text-[#15803D]',
                  },
                  {
                    side: 'c2' as SideKey,
                    label: `पूरा परिवार ${c2Name} (विपक्ष) में`,
                    cls: 'bg-[#FEF2F2] border-red-300 text-[#B91C1C]',
                  },
                  {
                    side: 'c3' as SideKey,
                    label: `पूरा परिवार ${c3Name} (विपक्ष) में`,
                    cls: 'bg-[#F5F3FF] border-purple-300 text-[#5B21B6]',
                  },
                  {
                    side: 'undecided' as SideKey,
                    label: 'पूरा परिवार डांवाडोल',
                    cls: 'bg-[#FFFBEB] border-amber-300 text-[#92400E]',
                  },
                  {
                    side: 'not_asked' as SideKey,
                    label: 'पूरा परिवार बात बाकी',
                    cls: 'bg-slate-100 border-slate-300 text-slate-700',
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.side}
                  type="button"
                  onClick={() => {
                    onUpdateAllFamilyLeaning(family.id, item.side);
                    setShowBulkUpdateModal(false);
                  }}
                  className={`p-3 rounded-xl border text-sm font-extrabold text-left cursor-pointer ${item.cls}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Caste */}
      {showCasteModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="जाति बदलें"
        >
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                परिवार की जाति चुनें
              </h3>
              <button
                type="button"
                aria-label="बंद करें"
                onClick={() => setShowCasteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {castes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onUpdateFamilyCaste(family.id, c);
                    setShowCasteModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-extrabold cursor-pointer ${
                    family.caste === c
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Mukhiya Contact */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="मुखिया संपर्क बदलें"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!contactNameInput.trim() || !contactPhoneInput.trim()) return;
              onUpdateFamilyContact(
                family.id,
                contactNameInput.trim(),
                contactPhoneInput.trim()
              );
              setShowContactModal(false);
            }}
            className="bg-white rounded-3xl max-w-xs w-full p-5 space-y-3 border border-slate-200"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              मुखिया का नाम व फ़ोन नंबर
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                मुखिया का नाम
              </label>
              <input
                type="text"
                required
                value={contactNameInput}
                onChange={(e) => setContactNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                मोबाइल नंबर
              </label>
              <input
                type="tel"
                required
                value={contactPhoneInput}
                onChange={(e) => setContactPhoneInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
              >
                सेव करें
              </button>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करें
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
