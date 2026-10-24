import React from 'react';
import { LiveEvent, Language } from '../types';
import { Clock, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Lock } from 'lucide-react';

interface LiveTimelineProps {
  events: LiveEvent[];
  language: Language;
  isAnalyzing: boolean;
  activeChunkIndex: number;
}

export const LiveTimeline: React.FC<LiveTimelineProps> = ({
  events,
  language,
  isAnalyzing,
  activeChunkIndex,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold text-white">
            Dual-Stream Call Event Timeline (Inbound + Outbound)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{events.length} event(s) logged</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400 animate-spin" />
                <span>Processing audio with Gemini native audio understanding...</span>
              </div>
            ) : (
              <span>Timeline empty. Play the call or speak to the mic to begin live analysis.</span>
            )}
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {events.map((event) => {
              const isOutgoingDlp = event.id.startsWith('dlp_');
              const isCritical = event.severity === 'critical';
              const isHigh = event.severity === 'high';
              const isMedium = event.severity === 'medium';
              const activeFlags = event.redFlags.filter((f) => f !== 'NONE');

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div
                    className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 transition-all ${
                      isOutgoingDlp
                        ? 'bg-indigo-400 ring-2 ring-indigo-500/60'
                        : isCritical
                        ? 'bg-rose-500 ring-2 ring-rose-500/50'
                        : isHigh
                        ? 'bg-amber-500 ring-1 ring-amber-500/40'
                        : isMedium
                        ? 'bg-yellow-400'
                        : 'bg-emerald-400'
                    }`}
                  />

                  {/* Event Card */}
                  <div
                    className={`rounded-xl border p-3.5 transition-all ${
                      isOutgoingDlp
                        ? 'border-indigo-800/80 bg-indigo-950/40 text-indigo-100 shadow-md'
                        : isCritical
                        ? 'border-rose-900/80 bg-rose-950/30'
                        : isHigh
                        ? 'border-amber-900/60 bg-amber-950/20'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isOutgoingDlp ? (
                          <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold">
                            <Lock className="h-3.5 w-3.5 text-indigo-400" />
                            <span>OUTBOUND USER MIC (INTERCEPTED)</span>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold text-slate-300">
                              +{event.playbackTime.toFixed(1)}s
                            </span>
                            <span className="text-[11px] text-slate-500">
                              (Caller Chunk #{event.chunkIndex + 1})
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isOutgoingDlp
                              ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50'
                              : isCritical
                              ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-300'
                              : isMedium
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {isOutgoingDlp ? 'DUBBED / CENSORED' : event.severity}
                        </span>
                      </div>
                    </div>

                    {/* Transcript Excerpt */}
                    {event.transcriptExcerpt && (
                      <p className="mt-2 text-xs text-slate-200 font-sans italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                        "{event.transcriptExcerpt}"
                      </p>
                    )}

                    {/* Red Flags / DLP Tags */}
                    {activeFlags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {activeFlags.map((flag) => (
                          <span
                            key={flag}
                            className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${
                              isOutgoingDlp
                                ? 'bg-indigo-950 border border-indigo-700/80 text-indigo-300'
                                : 'bg-rose-950/80 border border-rose-800/60 text-rose-300'
                            }`}
                          >
                            {isOutgoingDlp ? '🛡 CENSOR: ' : '⚠ '}
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Evidence Quote / Interception note */}
                    {event.evidence && event.evidence.length > 0 && (
                      <div className="mt-1.5 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {isOutgoingDlp ? 'Action Taken: ' : 'Evidence: '}
                        </span>
                        {event.evidence.join('; ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
