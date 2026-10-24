import React from 'react';
import { Shield, ShieldAlert, RotateCcw, Volume2, Globe, PlayCircle, BarChart3 } from 'lucide-react';
import { Language, MonitoringStatus } from '../types';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  status: MonitoringStatus;
  activeView: 'live' | 'benchmark';
  onViewChange: (view: 'live' | 'benchmark') => void;
  onResetSession: () => void;
  isCallActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  status,
  activeView,
  onViewChange,
  onResetSession,
  isCallActive,
}) => {
  const isAlarm = status === 'SCAM_WARNING';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Shield Logo */}
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              isAlarm
                ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
            }`}
          >
            {isAlarm ? <ShieldAlert className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
            {isCallActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Scam Call Shield
              </h1>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                AI Defense
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time Indian scam detection · Hindi & Gujarati
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live vs Benchmark View */}
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => onViewChange('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === 'live'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live Call Monitor</span>
              <span className="sm:hidden">Live</span>
            </button>
            <button
              onClick={() => onViewChange('benchmark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === 'benchmark'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Demo Test Mode</span>
              <span className="sm:hidden">Tests</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 border border-slate-800 text-xs">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentLanguage === 'hi'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              हिंदी
            </button>
            <span className="text-slate-600">/</span>
            <button
              onClick={() => onLanguageChange('gu')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                currentLanguage === 'gu'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ગુજરાતી
            </button>
          </div>

          {/* Reset Session Button */}
          <button
            onClick={onResetSession}
            title="Reset session & clear live evidence"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
