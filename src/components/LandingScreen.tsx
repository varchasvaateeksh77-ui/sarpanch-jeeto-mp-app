import React from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  PhoneCall,
  Scale,
  TrendingUp,
  Trophy,
  Users,
  BarChart3,
} from 'lucide-react';

interface LandingScreenProps {
  onStartDemo: () => void;
  onOpenLogin: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStartDemo,
  onOpenLogin,
}) => {
  return (
    <div className="min-h-[760px] flex flex-col bg-[#1E40AF] text-white rounded-none sm:rounded-3xl overflow-hidden border border-slate-200">
      {/* Royal Blue Hero Header */}
      <header className="pt-10 pb-8 px-6 flex flex-col items-center text-center bg-gradient-to-b from-[#1D4ED8] to-[#1E40AF]">
        <div
          className="w-24 h-24 rounded-full bg-[#FBBF24] flex items-center justify-center mb-3 border-4 border-white/15"
          aria-hidden="true"
        >
          {/* Sarpanch Jeeto Garlanded Winner Emblem SVG */}
          <svg
            viewBox="0 0 100 100"
            className="w-20 h-20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Raised victory arms */}
            <path
              d="M24 28 L36 52 L44 48 L30 22 Z"
              fill="#1E3A8A"
            />
            <path
              d="M76 28 L64 52 L56 48 L70 22 Z"
              fill="#1E3A8A"
            />
            {/* Fists */}
            <circle cx="25" cy="23" r="5" fill="#FEF3C7" stroke="#1E3A8A" strokeWidth="2.5" />
            <circle cx="75" cy="23" r="5" fill="#FEF3C7" stroke="#1E3A8A" strokeWidth="2.5" />
            {/* Torso / Jacket */}
            <path
              d="M32 92 L36 50 L64 50 L68 92 Z"
              fill="#1E3A8A"
            />
            {/* Head */}
            <circle
              cx="50"
              cy="38"
              r="10"
              fill="#FFFFFF"
              stroke="#1E3A8A"
              strokeWidth="2.5"
            />
            {/* Marigold Garland (Mala) */}
            <path
              d="M41 47 C41 68, 59 68, 59 47"
              stroke="#F59E0B"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="2 4"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          सरपंच जीतो · मध्य प्रदेश
        </h1>
        <p className="text-sm text-blue-100 mt-1">
          म.प्र. के 55 ज़िले व 23,000+ ग्राम पंचायतों का हर वोट, आपके फ़ोन में
        </p>
      </header>

      {/* White Feature Sheet */}
      <div className="flex-1 bg-white text-slate-900 rounded-t-[28px] px-5 pt-6 pb-8 flex flex-col justify-between">
        <ul className="space-y-3.5" aria-label="मुख्य सुविधाएँ">
          {/* Card 1: Voter Slip Preview */}
          <li className="pb-3.5 border-b border-slate-100 flex items-center gap-4">
            <div
              aria-hidden="true"
              className="w-36 shrink-0 bg-white border border-slate-200 rounded-xl p-2 -rotate-2"
            >
              <div className="bg-[#1D4ED8] text-white rounded-md px-2 py-0.5 flex items-center justify-between text-[11px] font-bold">
                <span className="bg-white text-[#1D4ED8] px-1 rounded text-[10px] tabular-nums">
                  101
                </span>
                <em className="not-italic font-mono-code tracking-tight text-[10px]">
                  MP29-123456
                </em>
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">
                नाम: रामलाल पाटीदार
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                मतदान केन्द्र: 12 (सीहोर)
              </div>
            </div>
            <div className="text-base font-bold text-[#1E3A8A] leading-snug">
              अपने वोटरों की पर्ची निकालें
            </div>
          </li>

          {/* Card 2: Vanshavali Family Tree Preview */}
          <li className="pb-3.5 border-b border-slate-100 flex items-center gap-4">
            <div
              aria-hidden="true"
              className="w-36 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center text-[10px] font-bold text-[#1E3A8A]"
            >
              <div className="px-2 py-0.5 bg-white border border-blue-300 rounded-full">
                दादा
              </div>
              <div className="w-16 h-2 border-t border-l border-r border-blue-300 mt-0.5" />
              <div className="w-full flex justify-around">
                <span className="px-2 py-0.5 bg-white border border-blue-300 rounded-full">
                  पिता
                </span>
                <span className="px-2 py-0.5 bg-white border border-blue-300 rounded-full">
                  काका
                </span>
              </div>
              <div className="w-24 h-2 border-t border-l border-r border-blue-300 mt-0.5" />
              <div className="w-full flex justify-between gap-0.5">
                <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-400 rounded-full">
                  आप
                </span>
                <span className="px-1.5 py-0.5 bg-white border border-blue-300 rounded-full">
                  बहन
                </span>
                <span className="px-1.5 py-0.5 bg-white border border-blue-300 rounded-full">
                  भाई
                </span>
              </div>
            </div>
            <div className="text-base font-bold text-[#1E3A8A] leading-snug">
              अपने परिवार की वंशावली बनाएँ
            </div>
          </li>

          {/* 8 Campaign Feature Items */}
          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <span>पोलिंग के दिन कौन वोट दे आया, कौन बाकी</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <span>हर वोटर का हिसाब: पक्ष, विपक्ष, डांवाडोल</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span>रोज़ का हिसाब, वार्ड-वार्ड</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span>विरोधी से कितने आगे, हर दिन</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-yellow-600 text-white flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </span>
            <span>डांवाडोल वोट: कैसे मनाना है</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </span>
            <span>आज किससे मिलना है, ऐप बताए</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </span>
            <span>कार्यकर्ताओं को वार्ड का ज़िम्मा</span>
          </li>

          <li className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
            <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </span>
            <span>वोट के दिन: अपने वोटों को कॉल करके बुलाएँ</span>
          </li>
        </ul>

        {/* Bottom CTA Block */}
        <div className="mt-6 pt-2">
          <button
            type="button"
            onClick={onStartDemo}
            className="w-full h-14 rounded-2xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.99] transition-all text-white font-extrabold text-xl flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>ऐप चलाकर देखें</span>
            <ChevronRight className="w-6 h-6 stroke-[2.5]" />
          </button>

          <div className="mt-4 text-center text-sm text-slate-600">
            <span>पहले से अकाउंट है? </span>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[#1D4ED8] font-bold underline underline-offset-2 hover:text-blue-900 cursor-pointer"
            >
              लॉगइन करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
