import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  GitBranch,
  HelpCircle,
  MapPin,
  MessageSquareWarning,
  Plus,
  Send,
  Users,
  X,
} from 'lucide-react';
import { AppRoute, FamilySummary, VoteTally } from '../types/sarpanch';

interface KaamScreenProps {
  panchayatName: string;
  families: FamilySummary[];
  tally: VoteTally;
  escalatedIds: string[];
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
  onOpenMereChunav: () => void;
}

export const KaamScreen: React.FC<KaamScreenProps> = ({
  panchayatName,
  families,
  tally,
  escalatedIds,
  onBack,
  onNavigate,
  onOpenMereChunav,
}) => {
  const undecidedFamiliesCount = families.filter(
    (f) => f.counts.undecided > 0
  ).length;
  const themFamiliesCount = families.filter((f) => f.counts.them > 0).length;
  const notAskedFamiliesCount = families.filter(
    (f) => f.counts.not_asked > 0
  ).length;
  const escalatedCount = Math.max(escalatedIds.length, 3);

  const items = [
    {
      id: 'escalated',
      title: 'कार्यकर्ता ने इनसे बात करने को कहा',
      subtitle: `${escalatedCount} परिवार · नोट के साथ`,
      iconBg: 'bg-[#FEF3C7]',
      iconColor: 'text-[#D97706]',
      borderLeft: 'border-l-4 border-l-[#F59E0B]',
      icon: <MessageSquareWarning className="w-5 h-5 text-[#D97706]" />,
      onClick: () => onNavigate({ screen: 'escalated' }),
    },
    {
      id: 'undecided',
      title: 'डांवाडोल परिवारों से मिलें',
      subtitle: `${undecidedFamiliesCount} परिवार · ${tally.undecided.toLocaleString('en-IN')} वोट डांवाडोल`,
      iconBg: 'bg-[#FFFBEB]',
      iconColor: 'text-[#D97706]',
      borderLeft: '',
      icon: <HelpCircle className="w-5 h-5 text-[#D97706]" />,
      onClick: () =>
        onNavigate({ screen: 'side', side: 'undecided', fromKaam: true }),
    },
    {
      id: 'them',
      title: 'विपक्ष के परिवारों से मिलें',
      subtitle: `${themFamiliesCount} परिवार · ${tally.them.toLocaleString('en-IN')} वोट विपक्ष में`,
      iconBg: 'bg-[#FEF2F2]',
      iconColor: 'text-[#DC2626]',
      borderLeft: '',
      icon: <Users className="w-5 h-5 text-[#DC2626]" />,
      onClick: () =>
        onNavigate({ screen: 'side', side: 'them', fromKaam: true }),
    },
    {
      id: 'not_asked',
      title: 'बात बाकी वाले परिवारों से मिलें',
      subtitle: `${notAskedFamiliesCount} परिवार · ${tally.not_asked.toLocaleString('en-IN')} वोट, बड़े परिवार पहले`,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      borderLeft: '',
      icon: <Users className="w-5 h-5 text-slate-600" />,
      onClick: () =>
        onNavigate({ screen: 'side', side: 'not_asked', fromKaam: true }),
    },
    {
      id: 'parchis',
      title: 'वोटर पर्ची बाँटें',
      subtitle: `${tally.totalVoters.toLocaleString('en-IN')} पर्ची · वार्ड वाइज़ PDF और WhatsApp`,
      iconBg: 'bg-[#EFF6FF]',
      iconColor: 'text-[#1D4ED8]',
      borderLeft: '',
      icon: <FileText className="w-5 h-5 text-[#1D4ED8]" />,
      onClick: () => onNavigate({ screen: 'parchis' }),
    },
  ];

  return (
    <div className="min-h-[780px] flex flex-col bg-[#F1F5F9] text-slate-900">
      <header className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5">
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
            <h1 className="text-2xl font-extrabold tracking-tight">
              आज का काम
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 font-semibold">
              {panchayatName} · 5 काम
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

      <div className="p-3.5 space-y-2.5 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`w-full bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-blue-300 flex items-center justify-between gap-3.5 text-left transition-colors cursor-pointer ${item.borderLeft}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl ${item.iconBg} flex items-center justify-center shrink-0`}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900">
                  {item.title}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5 tabular-nums">
                  {item.subtitle}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

interface EscalatedFamiliesScreenProps {
  panchayatName: string;
  families: FamilySummary[];
  escalatedIds: string[];
  teamWorkerNames: string[];
  onBack: () => void;
  onSelectFamily: (familyId: string) => void;
  onOpenMereChunav: () => void;
}

export const EscalatedFamiliesScreen: React.FC<
  EscalatedFamiliesScreenProps
> = ({
  panchayatName,
  families,
  escalatedIds,
  teamWorkerNames,
  onBack,
  onSelectFamily,
  onOpenMereChunav,
}) => {
  const defaultEscalatedFamilies = families.slice(0, 3);
  const customEscalated = families.filter((f) => escalatedIds.includes(f.id));
  const displayFamilies =
    customEscalated.length >= 3
      ? customEscalated
      : [
          ...customEscalated,
          ...defaultEscalatedFamilies.filter(
            (df) => !customEscalated.some((cf) => cf.id === df.id)
          ),
        ].slice(0, Math.max(3, customEscalated.length));

  const w1 = teamWorkerNames[1] || 'प्रहलाद';
  const w2 = teamWorkerNames[2] || 'विकास';

  const workerNotes = [
    `${w1} · पूरे परिवार से · पूरा परिवार आपसे मिलकर तय करेगा`,
    `${w2} · ${displayFamilies[1]?.voters?.[0]?.n || 'संतोष'} से · बड़े भाई नाराज़ हैं, आप एक बार जाकर मिलें`,
    `${w1} · पूरे परिवार से · सड़क और नाली की शिकायत है, आप बात करें`,
    `${w2} · मुखिया से · बुजुर्गों से एक बार आशीर्वाद लेने जाएँ`,
  ];

  return (
    <div className="min-h-[780px] flex flex-col bg-[#F1F5F9] text-slate-900">
      <header className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>आज का काम</span>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight">
              कार्यकर्ता ने बात करने को कहा
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 font-semibold tabular-nums">
              {panchayatName} · {displayFamilies.length} परिवार
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

      <div className="p-3.5 space-y-3 flex-1">
        {displayFamilies.map((fam, idx) => {
          const note = workerNotes[idx % workerNotes.length];
          return (
            <button
              key={fam.id}
              type="button"
              onClick={() => onSelectFamily(fam.id)}
              className="w-full bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-blue-400 text-left space-y-2.5 transition-colors cursor-pointer"
            >
              {/* Yellow Worker Note Banner */}
              <div className="bg-[#FEF3C7] text-[#92400E] px-3 py-1.5 rounded-xl text-xs font-extrabold">
                {note}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-extrabold text-slate-900 truncate">
                      {fam.displayTitle}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold tabular-nums">
                      वार्ड {fam.ward} · मकान {fam.house} · जाति {fam.caste}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#1D4ED8] text-center tabular-nums">
                    <div className="text-sm font-extrabold leading-none">
                      {fam.totalVoters}
                    </div>
                    <div className="text-[10px] font-bold">वोट</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {fam.counts.us > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold tabular-nums">
                    पक्ष {fam.counts.us}
                  </span>
                )}
                {fam.counts.them > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-extrabold tabular-nums">
                    विपक्ष {fam.counts.them}
                  </span>
                )}
                {fam.counts.undecided > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] text-[11px] font-extrabold tabular-nums">
                    डांवाडोल {fam.counts.undecided}
                  </span>
                )}
                {fam.counts.not_asked > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-extrabold tabular-nums">
                    बात बाकी {fam.counts.not_asked}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface SupportChatScreenProps {
  panchayatName: string;
  onBack: () => void;
}

export const SupportChatScreen: React.FC<SupportChatScreenProps> = ({
  panchayatName,
  onBack,
}) => {
  const [messages, setMessages] = useState<
    { id: number; sender: 'team' | 'user'; text: string; time: string }[]
  >([
    {
      id: 1,
      sender: 'team',
      text: 'नमस्ते, आपका स्वागत है। अपना सवाल नीचे लिखें — हमारी टीम जल्द जवाब देगी।',
      time: 'अभी',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const quickQuestions = [
    'पंचायत लिस्ट में नहीं मिल रही',
    'पेमेंट हो गया पर खुला नहीं',
    'कार्यकर्ता कैसे जोड़ें',
  ];

  const handleSend = (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;
    const nextUserMsg = {
      id: Date.now(),
      sender: 'user' as const,
      text: clean,
      time: 'अभी',
    };

    let reply = `धन्यवाद! ग्राम पंचायत ${panchayatName} के आपके सवाल "${clean}" को सरपंच जीतो सपोर्ट टीम ने नोट कर लिया है। आप WhatsApp (+91 98260-45120) पर भी तुरंत सहायता ले सकते हैं।`;
    if (clean.includes('पंचायत लिस्ट')) {
      reply =
        'म.प्र. के सभी 55 ज़िलों और 313 जनपद पंचायतों की ग्राम पंचायतें ऐप में जुड़ी हैं। ऊपर "नया चुनाव" में जाकर अपना ज़िला चुनें या नाम लिखकर खोजें।';
    } else if (clean.includes('पेमेंट')) {
      reply =
        'पेमेंट होने के तुरंत बाद आपकी पंचायत का पूरा डेटा और वंशावली अनलॉक हो जाती है। यदि नेटवर्क के कारण देरी हो, तो ऐप को एक बार रीफ़्रेश करें।';
    } else if (clean.includes('कार्यकर्ता')) {
      reply =
        'होम स्क्रीन पर "कार्यकर्ता" बटन दबाएँ -> "+ कार्यकर्ता जोड़ें" पर टैप करें और उन्हें वार्ड की ज़िम्मेदारी सौंपकर WhatsApp से लिंक भेजें।';
    }

    setMessages((prev) => [
      ...prev,
      nextUserMsg,
      {
        id: Date.now() + 1,
        sender: 'team',
        text: reply,
        time: 'अभी',
      },
    ]);
    setInputText('');
  };

  return (
    <div className="min-h-[780px] flex flex-col bg-[#F1F5F9] text-slate-900">
      <header className="bg-[#1D4ED8] text-white px-4 pt-4 pb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-blue-100 hover:text-white font-semibold mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पीछे</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <h1 className="text-xl font-extrabold tracking-tight">
            सरपंच जीतो टीम
          </h1>
        </div>
        <p className="text-xs text-blue-100 mt-0.5">
          सवाल पूछें या अपनी बात लिखें
        </p>
      </header>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#1D4ED8] text-white font-bold rounded-br-sm'
                  : 'bg-white text-slate-800 border border-slate-200 font-medium rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        <div className="pt-2 space-y-2">
          <div className="text-xs font-bold text-slate-400">
            आम सवाल — टैप करें:
          </div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                className="px-3.5 py-2 rounded-full bg-white border border-emerald-300 text-[#15803D] text-xs font-extrabold hover:bg-emerald-50 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="अपनी बात लिखें..."
          className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="भेजें"
          className="w-11 h-11 rounded-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

interface MereChunavSheetProps {
  open: boolean;
  activePanchayatId: string;
  activePanchayatName: string;
  quickSwitchPanchayats: {
    id: string;
    name: string;
    label: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  }[];
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
  onSelectPanchayat: (gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters: number;
    villages: string[];
  }) => void;
}

export const MereChunavSheet: React.FC<MereChunavSheetProps> = ({
  open,
  activePanchayatId,
  activePanchayatName,
  quickSwitchPanchayats,
  onClose,
  onNavigate,
  onSelectPanchayat,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="मेरे चुनाव"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-[440px] w-full p-5 space-y-3.5 border border-slate-200 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-1 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">मेरे चुनाव</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* मेरी वंशावली Card (matches XRecorder 01:43) */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate({ screen: 'vansh' });
          }}
          className="w-full p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                मेरी वंशावली ({activePanchayatName})
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                अपने परिवार का पेड़ और खास दिन
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-600 shrink-0" />
        </button>

        {/* + नया चुनाव Dashed Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate({ screen: 'chunav' });
          }}
          className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-[#1D4ED8] text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>नया चुनाव (सरपंच / जनपद / ज़िला / वार्ड)</span>
        </button>

        {/* Saved / Quick-Switch MP Panchayats */}
        <div className="pt-1 space-y-2">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase px-1">
            मध्य प्रदेश पंचायत बदलें (प्रत्येक पंचायत का अलग डेटा)
          </div>
          <div className="space-y-1.5">
            {quickSwitchPanchayats.map((qp) => {
              const isCurrent = activePanchayatId === qp.id;
              return (
                <button
                  key={qp.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectPanchayat(qp);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                    isCurrent
                      ? 'bg-[#EFF6FF] border-[#1D4ED8]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <span>ग्राम पंचायत {qp.name}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-[#1D4ED8] text-white text-[10px] font-extrabold">
                          सक्रिय
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5 tabular-nums">
                      {qp.tehsil} · {qp.district} ·{' '}
                      {qp.voters.toLocaleString('en-IN')} वोट
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface VideoWalkthroughModalProps {
  open: boolean;
  onClose: () => void;
}

export const VideoWalkthroughModal: React.FC<VideoWalkthroughModalProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ऐप कैसे चलता है (2 मिनट का वीडियो)"
    >
      <div className="relative w-full max-w-[390px] bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="वीडियो बंद करें"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/65 hover:bg-black text-white flex items-center justify-center border border-white/20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <video
          src="/assets/aistudio/app-v3_48a410dd.mp4"
          controls
          autoPlay
          playsInline
          className="w-full max-h-[84vh] object-contain bg-black"
        />
      </div>
    </div>
  );
};
