import React from 'react';
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  Volume2,
  Lock,
  ArrowRight,
  Globe,
  Settings,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { CallScenario, Language } from '../types';

interface PrototypeSetupScreenProps {
  scenarios: CallScenario[];
  selectedScenario: CallScenario;
  onSelectScenario: (scenario: CallScenario) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  autoDubEnabled: boolean;
  onToggleAutoDub: (enabled: boolean) => void;
  fullScreenModalEnabled: boolean;
  onToggleFullScreenModal: (enabled: boolean) => void;
  onStartSession: () => void;
}

export const PrototypeSetupScreen: React.FC<PrototypeSetupScreenProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario,
  language,
  onLanguageChange,
  autoDubEnabled,
  onToggleAutoDub,
  fullScreenModalEnabled,
  onToggleFullScreenModal,
  onStartSession,
}) => {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 py-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Interactive Prototype Sandbox</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Scam Call Shield
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Detects Indian phone scams in <span className="text-rose-400 font-semibold">Hindi & Gujarati</span> in real time. Features an active <span className="text-indigo-400 font-semibold">Outgoing DLP Scrambler</span> that intercepts spoken OTPs/PINs and bleeps them out so they never reach the fraudster.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center shrink-0 w-full md:w-auto">
            <Shield className="h-10 w-10 text-rose-500 mb-2" />
            <span className="text-xs font-bold text-slate-200">2-Way Defense</span>
            <span className="text-[11px] text-slate-400">Caller AI + User Mic DLP</span>
          </div>
        </div>
      </div>

      {/* Step 1: Select Input Audio Scenario */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs text-white font-bold">1</span>
              <span>Select Caller Audio Drill</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose one of the four realistic telecom-filtered recordings
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {scenarios.length} Bundled Audio Drills
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {scenarios.map((scenario) => {
            const isSelected = scenario.id === selectedScenario.id;
            const isScam = scenario.expectedCategory === 'scam';

            return (
              <button
                key={scenario.id}
                onClick={() => {
                  onSelectScenario(scenario);
                  onLanguageChange(scenario.language);
                }}
                className={`group relative flex flex-col justify-between rounded-2xl p-5 text-left transition-all duration-200 border cursor-pointer ${
                  isSelected
                    ? 'border-rose-500 bg-rose-950/20 shadow-xl shadow-rose-950/50 ring-2 ring-rose-500'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  {/* Category & Language Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isScam
                          ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                      }`}
                    >
                      {isScam ? 'Scam Threat' : 'Genuine Call'}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {scenario.languageLabel}
                    </span>
                  </div>

                  {/* Title & Threat */}
                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-rose-200 transition-colors">
                    {scenario.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300 font-medium line-clamp-2">
                    {scenario.primaryThreat}
                  </p>

                  {/* Sample Caller Quote */}
                  <div className="mt-3 rounded-xl bg-slate-950/80 p-2.5 border border-slate-800/80 text-xs text-slate-400 font-mono italic">
                    "{scenario.sampleTranscript}"
                  </div>
                </div>

                {/* Footer info */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-mono">
                    <PhoneCall className="h-3.5 w-3.5 text-slate-400" />
                    ~{scenario.durationEstimateSec}s Telecom Audio
                  </span>
                  <span className={`font-semibold ${isSelected ? 'text-rose-400' : 'text-slate-400'}`}>
                    {isSelected ? '✓ Selected' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Prototype Controls & Configuration */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs text-white font-bold">2</span>
            <span>Prototype Shield Controls</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure real-time monitoring and outgoing audio privacy policies
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Control 1: Language */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
              <Globe className="h-4 w-4 text-rose-400" />
              <span>Target Language</span>
            </div>
            <p className="text-xs text-slate-400">
              Select primary language for speech alerts
            </p>
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => onLanguageChange('hi')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
                  language === 'hi' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी (Hindi)
              </button>
              <button
                onClick={() => onLanguageChange('gu')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
                  language === 'gu' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ગુજરાતી (Gujarati)
              </button>
            </div>
          </div>

          {/* Control 2: Auto-Dub Censor */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Lock className="h-4 w-4 text-indigo-400" />
                <span>Auto-Dub Censor</span>
              </div>
              <input
                type="checkbox"
                checked={autoDubEnabled}
                onChange={(e) => onToggleAutoDub(e.target.checked)}
                className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-400">
              Bleeps out spoken OTPs/PINs with a 1000Hz tone before audio reaches scammer.
            </p>
            <span className="inline-block text-[11px] font-mono font-semibold text-indigo-400">
              {autoDubEnabled ? '● Active: Censors Spoken Secrets' : '○ Bypassed'}
            </span>
          </div>

          {/* Control 3: Full-Screen Warning Modal */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Full-Screen Takeover</span>
              </div>
              <input
                type="checkbox"
                checked={fullScreenModalEnabled}
                onChange={(e) => onToggleFullScreenModal(e.target.checked)}
                className="h-4 w-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-400">
              Locks screen on critical threats (Digital Arrest, OTP demand) for user acknowledgment.
            </p>
            <span className="inline-block text-[11px] font-mono font-semibold text-rose-400">
              {fullScreenModalEnabled ? '● Active: Immediate Takeover' : '○ Card Advisory Only'}
            </span>
          </div>
        </div>
      </div>

      {/* Launch Protected Call Session Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-white">Selected Drill: </span>
          <span className="text-rose-400 font-bold">{selectedScenario.title}</span> ({selectedScenario.languageLabel})
        </div>

        <button
          onClick={onStartSession}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-8 py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-rose-600/40 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <span>Start Protected Call Session</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
