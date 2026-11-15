import React from 'react';
import { Home, MoreHorizontal, Search, Users } from 'lucide-react';
import { AppRoute } from '../types/sarpanch';

interface BottomTabBarProps {
  currentScreen: AppRoute['screen'];
  onNavigate: (route: AppRoute) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const tabs: {
    id: 'home' | 'parivar' | 'search' | 'more';
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'home',
      label: 'होम',
      icon: <Home className="w-5 h-5" />,
      isActive:
        currentScreen === 'home' ||
        currentScreen === 'janen' ||
        currentScreen === 'poll' ||
        currentScreen === 'tick',
      onClick: () => onNavigate({ screen: 'home' }),
    },
    {
      id: 'parivar',
      label: 'परिवार',
      icon: <Users className="w-5 h-5" />,
      isActive:
        currentScreen === 'parivar' ||
        currentScreen === 'family' ||
        currentScreen === 'parchis' ||
        currentScreen === 'side' ||
        currentScreen === 'makan',
      onClick: () => onNavigate({ screen: 'parivar' }),
    },
    {
      id: 'search',
      label: 'खोजें',
      icon: <Search className="w-5 h-5" />,
      isActive: currentScreen === 'search' || currentScreen === 'jati',
      onClick: () => onNavigate({ screen: 'search' }),
    },
    {
      id: 'more',
      label: 'और',
      icon: <MoreHorizontal className="w-5 h-5" />,
      isActive:
        currentScreen === 'more' ||
        currentScreen === 'ummidwar' ||
        currentScreen === 'parchiset' ||
        currentScreen === 'refer' ||
        currentScreen === 'vansh' ||
        currentScreen === 'team' ||
        currentScreen === 'result' ||
        currentScreen === 'chunav',
      onClick: () => onNavigate({ screen: 'more' }),
    },
  ];

  return (
    <nav
      aria-label="निचला ऐप नेविगेशन"
      className="sticky bottom-0 z-20 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-4 gap-1 rounded-b-none sm:rounded-b-3xl"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={t.onClick}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            t.isActive
              ? 'text-[#1D4ED8] bg-blue-50/80 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-bold'
          }`}
        >
          {t.icon}
          <span className="text-[11px] mt-0.5 leading-none">{t.label}</span>
        </button>
      ))}
    </nav>
  );
};
