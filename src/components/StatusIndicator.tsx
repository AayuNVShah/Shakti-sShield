import React from 'react';
import { MonitoringStatus, Language } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';

interface StatusIndicatorProps {
  status: MonitoringStatus;
  language: Language;
  isAnalyzing: boolean;
  totalFlagsCount: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  language,
  isAnalyzing,
  totalFlagsCount,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'READY':
        return {
          title: 'System Ready',
          titleHi: 'सिस्टम तैयार है',
          titleGu: 'સિસ્ટમ તૈયાર છે',
          subtitle: 'Select any scenario and press Play to stream call audio.',
          bgColor: 'bg-slate-900',
          borderColor: 'border-slate-800',
          textColor: 'text-slate-300',
          iconColor: 'text-slate-400',
          ringColor: 'ring-slate-700',
          icon: ShieldCheck,
        };
      case 'MONITORING':
        return {
          title: 'Active Monitoring',
          titleHi: 'सक्रिय निगरानी जारी है',
          titleGu: 'સક્રિય મોનિટરિંગ ચાલુ છે',
          subtitle: 'Streaming audio chunks to Gemini. Evaluating speech in real time.',
          bgColor: 'bg-emerald-950/30',
          borderColor: 'border-emerald-800/40',
          textColor: 'text-emerald-400',
          iconColor: 'text-emerald-400',
          ringColor: 'ring-emerald-500/30',
          icon: Radio,
        };
      case 'SUSPICIOUS':
        return {
          title: 'Suspicious Activity Detected',
          titleHi: 'संदेहास्पद कॉल संकेत मिले',
          titleGu: 'શંકાસ્પદ કૉલ લક્ષણ મળ્યા',
          subtitle: `${totalFlagsCount} early red flag(s) identified. Heightened inspection active.`,
          bgColor: 'bg-amber-950/40',
          borderColor: 'border-amber-700/60',
          textColor: 'text-amber-400',
          iconColor: 'text-amber-400',
          ringColor: 'ring-amber-500/40',
          icon: AlertTriangle,
        };
      case 'SCAM_WARNING':
        return {
          title: 'CRITICAL SCAM WARNING',
          titleHi: 'सावधान: गंभीर धोखाधड़ी का खतरा!',
          titleGu: 'સાવધાન: ગંભીર છેતરપિંડી જોખમ!',
          subtitle: 'Definitive scam patterns verified. Immediate protective action required.',
          bgColor: 'bg-rose-950/50',
          borderColor: 'border-rose-600',
          textColor: 'text-rose-400',
          iconColor: 'text-rose-400',
          ringColor: 'ring-rose-500',
          icon: ShieldAlert,
        };
      case 'ANALYSIS_UNAVAILABLE':
      default:
        return {
          title: 'Analysis Unavailable',
          titleHi: 'विश्लेषण अनुपलब्ध है',
          titleGu: 'વિશ્લેષણ ઉપલબ્ધ નથી',
          subtitle: 'Unable to reach backend audio model. Proceed with strict caution.',
          bgColor: 'bg-slate-900/80',
          borderColor: 'border-rose-800/60',
          textColor: 'text-rose-400',
          iconColor: 'text-rose-400',
          ringColor: 'ring-rose-500/30',
          icon: AlertOctagon,
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;
  const isAlarm = status === 'SCAM_WARNING';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4.5 transition-all duration-300 ${config.bgColor} ${config.borderColor} shadow-lg`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950/60 ring-2 ${config.ringColor} ${
              isAlarm ? 'animate-alert-glow' : ''
            }`}
          >
            <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            {isAlarm && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Shield Status
              </span>
              {isAnalyzing && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Gemini analyzing audio...
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${config.textColor}`}>
                {config.title}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Localized text snippet */}
        <div className="hidden sm:block text-right">
          <div className="text-[11px] font-medium text-slate-400">
            {language === 'hi' ? 'स्थानीय चेतावनी' : 'પ્રાદેશિક ચેતવણી'}
          </div>
          <div className="text-xs font-semibold text-white font-hi">
            {language === 'hi' ? config.titleHi : config.titleGu}
          </div>
        </div>
      </div>
    </div>
  );
};
