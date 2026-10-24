import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Sparkles,
  PhoneOff,
} from 'lucide-react';
import { CallScenario } from '../types';

interface AudioPlayerCardProps {
  scenario: CallScenario;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isAnalyzing: boolean;
  currentChunkIndex: number;
  totalChunksExpected: number;
  analyserNode: AnalyserNode | null;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  scenario,
  currentTime,
  duration,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onResume,
  onStop,
  isAnalyzing,
  currentChunkIndex,
  totalChunksExpected,
  analyserNode,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Real-time canvas visualizer with AnalyserNode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : new Uint8Array(64);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyserNode && isPlaying && !isPaused) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Idle ambient line
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 10 + Math.sin(i * 0.2 + Date.now() * 0.003) * 6;
        }
      }

      const barCount = 48;
      const step = Math.floor(dataArray.length / barCount) || 1;
      const barWidth = (width / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(3, percent * (height - 6));
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Color gradient from teal to amber/rose when high
        let fillColor = '#10b981';
        if (percent > 0.65) {
          fillColor = '#ef4444';
        } else if (percent > 0.35) {
          fillColor = '#f59e0b';
        } else {
          fillColor = '#06b6d4';
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying, isPaused]);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      {/* Upper header: Call status badge & audio stream status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isPlaying && !isPaused
                ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {scenario.title}
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                {scenario.language.toUpperCase()} TELECOM LINE
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isPlaying && !isPaused
                    ? 'bg-emerald-400 animate-ping'
                    : isPaused
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
              <span>
                {isPlaying && !isPaused
                  ? 'Call Connected & Monitoring Audio'
                  : isPaused
                  ? 'Call On Hold (Paused)'
                  : 'Ready to Dial'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Chunking Pipeline Tracker */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-3 py-1.5 border border-slate-800/80">
          <Sparkles
            className={`h-3.5 w-3.5 ${
              isAnalyzing ? 'text-amber-400 animate-spin' : 'text-slate-500'
            }`}
          />
          <div className="text-[11px] font-mono">
            <span className="text-slate-400">Chunk Pipeline: </span>
            <span className="font-semibold text-rose-400">
              #{currentChunkIndex >= 0 ? currentChunkIndex + 1 : 0}
            </span>
            <span className="text-slate-400">
              /{totalChunksExpected > 0 ? totalChunksExpected : '~4'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Live Waveform Visualizer & Timeline */}
      <div className="my-4 space-y-2">
        <div className="relative h-16 w-full overflow-hidden rounded-xl bg-slate-950/90 border border-slate-800/60 p-1 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={480}
            height={60}
            className="h-full w-full object-contain"
          />
          {(!isPlaying && !isPaused) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
              <span className="text-xs text-slate-400 font-medium">
                Click Play to start prerecorded telecom call & live Gemini audio analysis
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar & Timers */}
        <div className="space-y-1.5">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-rose-500 to-red-600 transition-all duration-100 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formatTime(currentTime)}</span>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Play/Pause/Resume/Stop & Volume */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Playback action buttons */}
        <div className="flex items-center gap-2">
          {!isPlaying && !isPaused ? (
            <button
              onClick={onPlay}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-500 active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play Call & Monitor</span>
            </button>
          ) : isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500 active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Resume Call</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-600/30 transition-all hover:bg-amber-500 active:scale-95"
            >
              <Pause className="h-4 w-4 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onStop}
            disabled={!isPlaying && !isPaused}
            title="Stop and terminate call"
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PhoneOff className="h-4 w-4 text-rose-400" />
            <span>Hang Up</span>
          </button>
        </div>

        {/* Volume slider & mute */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 px-3 py-1.5 border border-slate-800">
          <button
            onClick={onToggleMute}
            className="text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-slate-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="h-1.5 w-16 sm:w-24 accent-rose-500 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
