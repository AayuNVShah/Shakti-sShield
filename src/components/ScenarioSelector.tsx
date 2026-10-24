import React from 'react';
import { CallScenario } from '../types';
import { AlertTriangle, CheckCircle2, ShieldAlert, PhoneCall } from 'lucide-react';

interface ScenarioSelectorProps {
  scenarios: CallScenario[];
  selectedScenarioId: string;
  onSelectScenario: (scenario: CallScenario) => void;
  disabled: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  disabled,
}) => {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Select Pre-Recorded Call Scenario (4 Demos)
        </label>
        <span className="text-xs text-slate-500">
          Realistic telecom audio
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {scenarios.map((scenario) => {
          const isSelected = scenario.id === selectedScenarioId;
          const isScam = scenario.expectedCategory === 'scam';

          return (
            <button
              key={scenario.id}
              onClick={() => onSelectScenario(scenario)}
              disabled={disabled}
              className={`group relative flex flex-col justify-between rounded-xl p-3.5 text-left transition-all duration-200 border ${
                isSelected
                  ? 'border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Top Row: Language & Category Indicator */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isScam ? 'bg-rose-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-slate-400">
                    {scenario.languageLabel}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isScam ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isScam ? 'Scam Drill' : 'Genuine Call'}
                </span>
              </div>

              {/* Title and threat */}
              <div className="mt-2.5 mb-2">
                <div className="flex items-center gap-1.5">
                  {isScam ? (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                  <h3 className="text-sm font-semibold text-white group-hover:text-rose-200 transition-colors">
                    {scenario.title}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  {scenario.description}
                </p>
              </div>

              {/* Bottom metadata */}
              <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-400">
                  <PhoneCall className="h-3 w-3 text-slate-400" />
                  ~{scenario.durationEstimateSec}s
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {scenario.language === 'hi' ? 'हिंदी में' : 'ગુજરાતીમાં'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
