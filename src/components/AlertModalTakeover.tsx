import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneOff,
  Volume2,
  VolumeX,
  X,
  AlertOctagon,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { Language, RedFlag } from '../types';
import { speakWarningAloud, stopSpeaking } from '../utils/speechSynthesis';

interface AlertModalTakeoverProps {
  isOpen: boolean;
  language: Language;
  scenarioTitle: string;
  redFlags: RedFlag[];
  evidenceQuotes: string[];
  warningHi: string;
  warningGu: string;
  recommendedAction: string;
  alertReason: string;
  onHangUpAndDismiss: () => void;
  onDismiss: () => void;
}

export const AlertModalTakeover: React.FC<AlertModalTakeoverProps> = ({
  isOpen,
  language,
  scenarioTitle,
  redFlags,
  evidenceQuotes,
  warningHi,
  warningGu,
  recommendedAction,
  alertReason,
  onHangUpAndDismiss,
  onDismiss,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!isOpen) return null;

  const activeFlags = redFlags.filter((f) => f !== 'NONE');
  const localizedWarning = language === 'gu' ? warningGu : warningHi;

  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakWarningAloud(localizedWarning, language);
    setIsSpeaking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border-2 border-rose-500 bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-rose-950/80 animate-alert-glow">
        {/* Top Dismiss Icon */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
          title="Dismiss Modal (Keep Inspecting)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Alarm Banner & Shield */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/50">
            <ShieldAlert className="h-9 w-9 animate-bounce" />
          </div>

          <div className="space-y-1">
            <span className="inline-block rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-300 ring-1 ring-rose-500/50">
              High-Priority Security Intervention
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              CRITICAL PHONE SCAM DETECTED
            </h2>
            <p className="text-xs text-rose-200/90 font-medium">
              {alertReason || 'Immediate high-priority fraud patterns detected on live audio.'}
            </p>
          </div>
        </div>

        {/* Localized High-Contrast Warning Box */}
        <div className="my-5 rounded-2xl bg-rose-900/40 border border-rose-600/70 p-4 sm:p-5 text-white shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              {language === 'gu' ? 'તાત્કાલિક ચેતવણી સંદેશ' : 'तत्काल चेतावनी संदेश'}
            </span>
            <button
              onClick={handleSpeak}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                isSpeaking
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-rose-700 hover:bg-rose-600 text-white'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Speaking...</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Replay Voice Alert</span>
                </>
              )}
            </button>
          </div>
          <p
            className={`text-base sm:text-lg font-bold leading-relaxed text-rose-100 ${
              language === 'gu' ? 'font-gu' : 'font-hi'
            }`}
          >
            {localizedWarning}
          </p>
          <div className="mt-2 pt-2 border-t border-rose-800/60 text-xs text-rose-200">
            <span className="font-semibold text-white">Actionable Directive: </span>
            {recommendedAction}
          </div>
        </div>

        {/* Identified Red Flags & Evidence */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Confirmed Fraud Red Flags
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {activeFlags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-lg bg-rose-950 border border-rose-700/80 px-2.5 py-1 text-xs font-mono font-semibold text-rose-300"
                >
                  ⚠ {flag}
                </span>
              ))}
            </div>
          </div>

          {evidenceQuotes.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Caller Speech Evidence (Extracted directly from audio)
              </label>
              <div className="mt-1 max-h-24 overflow-y-auto space-y-1 rounded-xl bg-slate-950/70 p-2.5 border border-slate-800 text-xs text-slate-300 font-mono">
                {evidenceQuotes.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">›</span>
                    <span className="italic text-rose-200">"{q}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>Helpline: </span>
            <span className="font-bold text-white">Dial 1930</span>
            <span className="hidden sm:inline"> (National Cybercrime Reporting Portal)</span>
          </div>

          <div className="flex w-full sm:w-auto items-center justify-end gap-2.5">
            <button
              onClick={onDismiss}
              className="flex-1 sm:flex-none rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Inspect Details
            </button>
            <button
              onClick={onHangUpAndDismiss}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-red-600/50 transition-transform active:scale-95"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Hang Up Call Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
