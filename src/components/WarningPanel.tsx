import React, { useState } from 'react';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  PhoneOff,
  ShieldAlert,
  Info,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Language, MonitoringStatus, RedFlag, Severity } from '../types';
import { speakWarningAloud, stopSpeaking } from '../utils/speechSynthesis';

interface WarningPanelProps {
  status: MonitoringStatus;
  language: Language;
  redFlags: RedFlag[];
  highestSeverity: Severity;
  warningHi?: string;
  warningGu?: string;
  recommendedAction?: string;
  evidenceQuotes: string[];
  onHangUp: () => void;
  isCallActive: boolean;
}

const RED_FLAG_LABELS: Record<
  RedFlag,
  { labelEn: string; labelHi: string; labelGu: string; description: string }
> = {
  AUTHORITY_IMPERSONATION: {
    labelEn: 'Authority Impersonation',
    labelHi: 'अधिकारी बनकर ठगी (CBI/पुलिस/बैंक)',
    labelGu: 'પોલીસ કે બેંક અધિકારી તરીકે ખોટી ઓળખ',
    description: 'Claiming to be CBI, Mumbai Police, RBI, or Bank Manager without warrant.',
  },
  THREAT_OR_COERCION: {
    labelEn: 'Threat & Coercion',
    labelHi: 'धमकी व डिजिटल अरेस्ट का डर',
    labelGu: 'ધમકી અને ડિજિટલ અરેસ્ટનો ભય',
    description: 'Threatening non-bailable arrest warrants, home raids, or instant legal action.',
  },
  URGENCY: {
    labelEn: 'Urgency & Pressure',
    labelHi: 'अति-जल्दबाज़ी का दबाव',
    labelGu: 'અતિ-ઉતાવળ અને માનસિક દબાણ',
    description: 'Insisting on compliance within minutes, prohibiting hanging up.',
  },
  OTP_OR_CREDENTIAL_REQUEST: {
    labelEn: 'OTP / Credential Demand',
    labelHi: 'ओटीपी या पासवर्ड की मांग',
    labelGu: 'ઓટીપી કે ગુપ્ત પાસવર્ડની માંગણી',
    description: 'Asking for 6-digit OTP, ATM PIN, or Internet banking passwords.',
  },
  MONEY_TRANSFER_REQUEST: {
    labelEn: 'Coercive Money Transfer',
    labelHi: 'रुपये ट्रांसफर करने की मांग',
    labelGu: 'નાણાં ટ્રાન્સફર કરવાની ફરજિયાત માંગ',
    description: 'Demanding payments into "escrow accounts" or "bail deposits".',
  },
  SUSPICIOUS_KYC: {
    labelEn: 'Suspicious KYC Expiry',
    labelHi: 'फर्जी केवाईसी खाता ब्लॉक धमकी',
    labelGu: 'શંકાસ્પદ કેવાયસી બ્લોકિંગ ધમકી',
    description: 'Falsely claiming debit card or bank account will be suspended today.',
  },
  SUSPICIOUS_COURIER: {
    labelEn: 'Contraband Courier Threat',
    labelHi: 'फर्जी पार्सल व नशीले पदार्थ जब्ती',
    labelGu: 'ડ્રગ્સ કુરિયર જપ્તીનું બહાનું',
    description: 'Claiming a parcel sent in your name was seized with narcotics or passports.',
  },
  REMOTE_ACCESS_REQUEST: {
    labelEn: 'Remote Screen Access App',
    labelHi: 'स्क्रीन शेयरिंग ऐप इंस्टॉल कराना',
    labelGu: 'રિમોટ સ્ક્રીન શેરિંગ એપ્લિકેશન',
    description: 'Instructing victim to install AnyDesk, TeamViewer, or QuickSupport.',
  },
  NONE: {
    labelEn: 'No Scam Flags',
    labelHi: 'कोई संदिग्ध गतिविधि नहीं',
    labelGu: 'કોઈ શંકાસ્પદ બાબત નથી',
    description: 'Standard conversational tone with no extortion or credential harvesting.',
  },
};

export const WarningPanel: React.FC<WarningPanelProps> = ({
  status,
  language,
  redFlags,
  highestSeverity,
  warningHi,
  warningGu,
  recommendedAction,
  evidenceQuotes,
  onHangUp,
  isCallActive,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const activeRedFlags = redFlags.filter((f) => f !== 'NONE');
  const isAlarm = status === 'SCAM_WARNING';
  const isSuspicious = status === 'SUSPICIOUS';

  const localizedAdvice =
    language === 'gu'
      ? warningGu || 'સાવધાન! કોઈપણ વ્યક્તિગત માહિતી કે ઓટીપી શેર કરશો નહીં.'
      : warningHi || 'सावधान! कोई भी व्यक्तिगत जानकारी या ओटीपी किसी के साथ साझा न करें।';

  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakWarningAloud(localizedAdvice, language);
    setIsSpeaking(false);
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all shadow-xl ${
        isAlarm
          ? 'border-rose-600 bg-gradient-to-b from-rose-950/70 via-slate-900 to-slate-950 ring-1 ring-rose-500/40'
          : isSuspicious
          ? 'border-amber-700/60 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950'
          : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          {isAlarm ? (
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          ) : isSuspicious ? (
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          )}
          <div>
            <h3 className="text-base font-bold text-white">
              {isAlarm
                ? 'Active Scam Advisory & Intervention'
                : isSuspicious
                ? 'Heightened Scam Caution'
                : 'Safety & Advisory Feed'}
            </h3>
            <p className="text-xs text-slate-400">
              Evidence-based caller evaluation in {language === 'gu' ? 'Gujarati' : 'Hindi'}
            </p>
          </div>
        </div>

        {/* Severity Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Severity:</span>
          <span
            className={`font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              highestSeverity === 'critical'
                ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50'
                : highestSeverity === 'high'
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : highestSeverity === 'medium'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {highestSeverity}
          </span>
        </div>
      </div>

      {/* Primary Localized Advisory Banner */}
      <div
        className={`my-4 rounded-xl p-4 border transition-all ${
          isAlarm
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
            : isSuspicious
            ? 'bg-amber-950/30 border-amber-800/60 text-amber-100'
            : 'bg-slate-950/60 border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
              {language === 'gu' ? 'મુખ્ય સુરક્ષા સલાહ' : 'मुख्य सुरक्षा सलाह'}
            </span>
            <p
              className={`text-sm sm:text-base font-medium leading-relaxed ${
                language === 'gu' ? 'font-gu' : 'font-hi'
              }`}
            >
              {localizedAdvice}
            </p>
            {recommendedAction && (
              <p className="text-xs text-slate-400 font-sans pt-1">
                <span className="text-slate-300 font-semibold">Action: </span>
                {recommendedAction}
              </p>
            )}
          </div>

          {/* Replay Warning Aloud Button */}
          <button
            onClick={handleSpeak}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow transition-all ${
              isSpeaking
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4" />
                <span>Speaking...</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                <span>Play Aloud</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detected Red Flags Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Detected Red Flags ({activeRedFlags.length})
          </label>
          {activeRedFlags.length > 0 && (
            <span className="text-[11px] text-rose-400 font-medium">
              Matches Indian Cyber Crime Patterns
            </span>
          )}
        </div>

        {activeRedFlags.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeRedFlags.map((flag) => {
              const info = RED_FLAG_LABELS[flag] || RED_FLAG_LABELS.NONE;
              return (
                <div
                  key={flag}
                  className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300">
                      {info.labelEn}
                    </span>
                    <span className="text-[10px] font-mono text-rose-400/80">
                      FLAGGED
                    </span>
                  </div>
                  <p
                    className={`text-xs text-rose-200 mt-1 font-medium ${
                      language === 'gu' ? 'font-gu' : 'font-hi'
                    }`}
                  >
                    {language === 'gu' ? info.labelGu : info.labelHi}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {info.description}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {status === 'MONITORING'
                ? 'No red flags detected in current audio slice. Monitoring ongoing...'
                : 'No red flags identified. Standard conversational inquiry.'}
            </span>
          </div>
        )}
      </div>

      {/* Direct Quote Evidence Excerpts */}
      {evidenceQuotes.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Caller Audio Evidence Excerpts
          </label>
          <div className="space-y-1.5">
            {evidenceQuotes.slice(-3).map((quote, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs text-slate-300 font-mono flex items-start gap-2"
              >
                <span className="text-rose-400 shrink-0 font-bold">"</span>
                <span className="italic">{quote}</span>
                <span className="text-rose-400 shrink-0 font-bold">"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Guidance & Instant Hang Up */}
      {isAlarm && isCallActive && (
        <div className="mt-4 pt-3 border-t border-rose-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-rose-400">Indian Cybercrime Helpline: </span>
            <span className="font-mono text-white font-bold">Dial 1930</span> or report to{' '}
            <span className="font-mono text-slate-400">cybercrime.gov.in</span>
          </div>
          <button
            onClick={onHangUp}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/40 transition-all active:scale-95"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Hang Up Now</span>
          </button>
        </div>
      )}
    </div>
  );
};
