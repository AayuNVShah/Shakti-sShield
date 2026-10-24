import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  Sparkles,
  Lock,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Radio,
  FileText,
  Headphones,
  Check,
} from 'lucide-react';
import { Language, OutgoingInterceptionEvent, SensitiveType, UserAudioAnalysisResponse } from '../types';
import { getAudioContext, sliceAudioBufferToWav, fetchAndDecodeAudio } from '../utils/audioChunker';
import { dubSensitiveAudio, maskSensitiveTranscript } from '../utils/audioDubber';

interface UserAudioProtectionPanelProps {
  language: Language;
  onInterceptionOccurred: (event: OutgoingInterceptionEvent) => void;
  isCallActive: boolean;
}

export const UserAudioProtectionPanel: React.FC<UserAudioProtectionPanelProps> = ({
  language,
  onInterceptionOccurred,
  isCallActive,
}) => {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [protectionEnabled, setProtectionEnabled] = useState<boolean>(true);

  // Real-time live transcription state
  const [liveInterimTranscript, setLiveInterimTranscript] = useState<string>('');
  const [confirmedTranscriptHistory, setConfirmedTranscriptHistory] = useState<string[]>([]);

  // Bleeped audio player state
  const [bleepedAudioUrl, setBleepedAudioUrl] = useState<string | null>(null);
  const [isPlayingDubbed, setIsPlayingDubbed] = useState<boolean>(false);
  const [bleepAudioProgress, setBleepAudioProgress] = useState<number>(0);
  const [bleepAudioDuration, setBleepAudioDuration] = useState<number>(2.9);
  const [activeMaskedText, setActiveMaskedText] = useState<string>(
    'हाँ सर, मेरा ओटीपी नंबर •••••• [1000Hz CENSOR BLEEP] है।'
  );
  const [originalSpokenText, setOriginalSpokenText] = useState<string>(
    'हाँ सर, मेरा ओटीपी नंबर ५८२९१० है।'
  );

  // Latest Outgoing Interception Event
  const [latestInterception, setLatestInterception] = useState<OutgoingInterceptionEvent | null>(null);

  // Audio recording refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkIntervalRef = useRef<number | null>(null);
  const userChunkIndexRef = useRef<number>(0);
  const dubbedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognizerRef = useRef<any>(null);

  // Visualizer analyser
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Synthesize authentic speech audio + bleep on mount
  useEffect(() => {
    let isCurrent = true;
    async function initSampleBleep() {
      try {
        // Fetch pre-recorded victim speech: "हाँ सर, मेरा ओटीपी नंबर 582910 है।"
        const buffer = await fetchAndDecodeAudio('/demo-audio/victim_otp_leak_hi.wav');
        // Bleep the exact digit window from 1.25s to 2.75s
        const { dubbedAudioUrl } = await dubSensitiveAudio(buffer, 1.25, 2.75);

        if (isCurrent) {
          setBleepedAudioUrl(dubbedAudioUrl);
          setBleepAudioDuration(buffer.duration);
          setActiveMaskedText('हाँ सर, मेरा ओटीपी नंबर •••••• [1000Hz CENSOR BLEEP] है।');
          setOriginalSpokenText('हाँ सर, मेरा ओटीपी नंबर ५८२९१० है।');
        }
      } catch (e) {
        console.warn('Initial sample speech bleep fallback:', e);
      }
    }
    initSampleBleep();
    return () => {
      isCurrent = false;
    };
  }, []);

  // Stop mic & speech recognizer
  const stopMicrophone = useCallback(() => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (e) {}
      speechRecognizerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsMicActive(false);
    setMicVolume(0);
    setLiveInterimTranscript('');
  }, []);

  // Start live microphone capture with real-time live transcription
  const startMicrophone = async () => {
    setMicError(null);
    setLiveInterimTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!mediaStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.floor((avg / 255) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Browser SpeechRecognition for immediate live real-time transcription
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognizer = new SpeechRec();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = language === 'gu' ? 'gu-IN' : 'hi-IN';

          recognizer.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcriptChunk = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                setConfirmedTranscriptHistory((prev) => [...prev.slice(-3), transcriptChunk]);
                setLiveInterimTranscript('');
              } else {
                interim += transcriptChunk;
              }
            }
            if (interim) {
              setLiveInterimTranscript(interim);
            }
          };

          recognizer.onerror = (e: any) => {
            console.warn('Speech recognition interim note:', e.error);
          };

          recognizer.onend = () => {
            if (mediaStreamRef.current && isMicActive) {
              try {
                recognizer.start();
              } catch (err) {}
            }
          };

          recognizer.start();
          speechRecognizerRef.current = recognizer;
        } catch (recErr) {
          console.warn('Speech recognition startup note:', recErr);
        }
      }

      // Fast MediaRecorder setup (2.0s slices for high responsiveness)
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await processUserAudioSlice(webmBlob);
      };

      recorder.start();
      setIsMicActive(true);

      chunkIntervalRef.current = window.setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          recorder.start();
        }
      }, 2000);
    } catch (err: any) {
      console.error('Microphone access denied or unavailable:', err);
      setMicError(err.message || 'Microphone access denied. You can test using simulation presets below.');
      stopMicrophone();
    }
  };

  // Process user audio slice with Gemini MINIMAL thinking
  const processUserAudioSlice = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const chunkIdx = userChunkIndexRef.current++;

    try {
      const ctx = getAudioContext();
      const arrayBuf = await audioBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuf);

      const { base64Promise } = sliceAudioBufferToWav(
        audioBuffer,
        0,
        audioBuffer.duration,
        24000
      );
      const base64Audio = await base64Promise;

      const res = await fetch('/api/analyze-user-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `user_mic_${Date.now()}`,
          chunkIndex: chunkIdx,
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          clientLanguage: language,
        }),
      });

      if (!res.ok) {
        throw new Error(`DLP analysis failed with status: ${res.status}`);
      }

      const dlpData: UserAudioAnalysisResponse = await res.json();

      if (dlpData.transcript && dlpData.transcript.trim()) {
        setConfirmedTranscriptHistory((prev) => [
          ...prev.slice(-3),
          dlpData.transcript,
        ]);
        setOriginalSpokenText(dlpData.transcript);
      }

      if (dlpData.contains_sensitive_info && protectionEnabled) {
        // DUB the sensitive audio: user's voice remains, OTP numbers replaced with 1000Hz bleep tone!
        const { dubbedAudioUrl } = await dubSensitiveAudio(
          audioBuffer,
          dlpData.redaction_start_sec || 0.4,
          dlpData.redaction_end_sec || audioBuffer.duration
        );

        const masked = maskSensitiveTranscript(
          dlpData.transcript,
          dlpData.sensitive_excerpts
        );

        const event: OutgoingInterceptionEvent = {
          id: `interception_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          chunkIndex: chunkIdx,
          sensitiveType: dlpData.sensitive_type,
          maskedTranscript: masked,
          rawExcerpt: dlpData.sensitive_excerpts.join(', ') || 'Confidential Credential',
          isDubbed: true,
          dubbedAudioUrl,
          safetyAlert:
            language === 'gu'
              ? dlpData.safety_alert_gu
              : dlpData.safety_alert_hi,
        };

        setBleepedAudioUrl(dubbedAudioUrl);
        setBleepAudioDuration(audioBuffer.duration);
        setActiveMaskedText(masked);
        setLatestInterception(event);
        onInterceptionOccurred(event);
      } else if (dlpData.transcript && dlpData.transcript.trim()) {
        const event: OutgoingInterceptionEvent = {
          id: `speech_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          chunkIndex: chunkIdx,
          sensitiveType: 'NONE',
          maskedTranscript: dlpData.transcript,
          rawExcerpt: '',
          isDubbed: false,
          safetyAlert: 'Normal user speech: No credentials disclosed.',
        };
        setLatestInterception(event);
      }
    } catch (e: any) {
      console.warn('User audio slice processing note:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Test Simulation helper with authentic pre-recorded victim speech + bleep
  const simulateUserSpokenAudio = async (textToSimulate: string, type: SensitiveType, sensitiveExcerpt: string) => {
    setIsProcessing(true);
    setLiveInterimTranscript(textToSimulate);
    setOriginalSpokenText(textToSimulate);
    const chunkIdx = userChunkIndexRef.current++;

    try {
      let buffer: AudioBuffer;
      let bleepStart = 1.25;
      let bleepEnd = 2.75;

      if (type === 'OTP') {
        // Load authentic Hindi speech: "हाँ सर, मेरा ओटीपी नंबर 582910 है।"
        buffer = await fetchAndDecodeAudio('/demo-audio/victim_otp_leak_hi.wav');
        bleepStart = 1.25;
        bleepEnd = 2.75;
      } else if (type === 'BANK_PIN') {
        // Load authentic Gujarati speech: "હા સાહેબ, મારો એટીએમ પિન 4719 છે।"
        buffer = await fetchAndDecodeAudio('/demo-audio/victim_pin_leak_gu.wav');
        bleepStart = 1.35;
        bleepEnd = 2.65;
      } else {
        // Normal speech
        buffer = await fetchAndDecodeAudio('/demo-audio/victim_otp_leak_hi.wav');
        bleepStart = 0;
        bleepEnd = 0; // No bleeping
      }

      // Dub with 1000Hz bleep tone over the exact digits
      const { dubbedAudioUrl } = await dubSensitiveAudio(
        buffer,
        type !== 'NONE' ? bleepStart : 0,
        type !== 'NONE' ? bleepEnd : 0
      );

      const masked = maskSensitiveTranscript(textToSimulate, [sensitiveExcerpt]);

      const event: OutgoingInterceptionEvent = {
        id: `sim_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        chunkIndex: chunkIdx,
        sensitiveType: type,
        maskedTranscript: masked,
        rawExcerpt: sensitiveExcerpt,
        isDubbed: type !== 'NONE',
        dubbedAudioUrl: type !== 'NONE' ? dubbedAudioUrl : undefined,
        safetyAlert:
          type !== 'NONE'
            ? language === 'gu'
              ? `સુરક્ષા ચેતવણી: તમારા બોલાયેલ ${type} વિગતો સેન્સર/ડબ કરી દેવાઈ છે!`
              : `सुरक्षा चेतावनी: आपके द्वारा बोला गया ${type} तत्काल सेंसर/डब कर दिया गया है!`
            : 'सामान्य बातचीत: कोई संवेदनशील डेटा नहीं।',
      };

      setBleepedAudioUrl(dubbedAudioUrl);
      setBleepAudioDuration(buffer.duration);
      setActiveMaskedText(masked);
      setConfirmedTranscriptHistory((prev) => [...prev.slice(-3), textToSimulate]);
      setLatestInterception(event);
      if (type !== 'NONE') {
        onInterceptionOccurred(event);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle play/pause for bleeped audio player
  const togglePlayBleeped = () => {
    if (!bleepedAudioUrl) return;

    if (isPlayingDubbed) {
      if (dubbedAudioPlayerRef.current) {
        dubbedAudioPlayerRef.current.pause();
      }
      setIsPlayingDubbed(false);
      return;
    }

    if (!dubbedAudioPlayerRef.current || dubbedAudioPlayerRef.current.src !== bleepedAudioUrl) {
      const audio = new Audio(bleepedAudioUrl);
      dubbedAudioPlayerRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setBleepAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingDubbed(false);
        setBleepAudioProgress(0);
      };

      audio.onerror = () => {
        setIsPlayingDubbed(false);
        setBleepAudioProgress(0);
      };
    }

    dubbedAudioPlayerRef.current.currentTime = 0;
    dubbedAudioPlayerRef.current.play();
    setIsPlayingDubbed(true);
  };

  const handleReplayBleeped = () => {
    if (dubbedAudioPlayerRef.current && bleepedAudioUrl) {
      dubbedAudioPlayerRef.current.currentTime = 0;
      dubbedAudioPlayerRef.current.play();
      setIsPlayingDubbed(true);
    } else {
      togglePlayBleeped();
    }
  };

  useEffect(() => {
    return () => {
      stopMicrophone();
      if (dubbedAudioPlayerRef.current) {
        dubbedAudioPlayerRef.current.pause();
      }
    };
  }, [stopMicrophone]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Header & Outgoing Protection Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              isMicActive
                ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500 animate-pulse'
                : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40'
            }`}
          >
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                User Speech Input & Live DLP Censor
              </h3>
              <span className="rounded bg-indigo-950 border border-indigo-700/60 px-2 py-0.5 text-[10px] font-mono text-indigo-300 font-semibold">
                Fast Censor Dubbing
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live transcription + automatic 1000Hz bleeping of spoken secrets
            </p>
          </div>
        </div>

        {/* Protection Enable Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={protectionEnabled}
            onChange={(e) => setProtectionEnabled(e.target.checked)}
            className="h-4 w-4 accent-rose-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
          />
          <span className="font-semibold text-rose-300">Auto-Bleep Censor Active</span>
        </label>
      </div>

      {/* Mic Input Controls & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/70 p-3.5 border border-slate-800">
        <div className="flex items-center gap-3">
          {!isMicActive ? (
            <button
              onClick={startMicrophone}
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>Enable Microphone (Speak to Call)</span>
            </button>
          ) : (
            <button
              onClick={stopMicrophone}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-rose-300 transition-all active:scale-95 cursor-pointer"
            >
              <MicOff className="h-4 w-4 text-rose-400" />
              <span>Mute / Disable Mic</span>
            </button>
          )}

          {isMicActive && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-emerald-400">Listening live...</span>
              <div className="h-2 w-16 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5 animate-spin" />
            <span>Fast Gemini DLP scan active...</span>
          </div>
        )}
      </div>

      {micError && (
        <div className="rounded-xl border border-rose-900/80 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{micError}</span>
        </div>
      )}

      {/* 1. Real-Time Live Speech Transcription Box */}
      <div className="rounded-xl bg-slate-950/90 border border-slate-800/80 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <span>Real-time Live Speech Transcription</span>
          </div>
          {isMicActive && (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Stream
            </span>
          )}
        </div>

        <div className="min-h-[52px] rounded-lg bg-slate-900/80 p-3 border border-slate-800 flex flex-col justify-center text-xs sm:text-sm">
          {liveInterimTranscript ? (
            <div className="text-white font-medium flex items-center gap-2">
              <span className="text-amber-400 animate-pulse font-mono font-bold">● REC:</span>
              <span className="italic">{liveInterimTranscript}</span>
            </div>
          ) : confirmedTranscriptHistory.length > 0 ? (
            <div className="text-slate-300 space-y-1">
              <span className="text-[11px] text-slate-500 font-mono block">Last spoken utterance:</span>
              <p className="font-medium text-slate-200">
                "{confirmedTranscriptHistory[confirmedTranscriptHistory.length - 1]}"
              </p>
            </div>
          ) : (
            <span className="text-slate-500 text-xs italic">
              {isMicActive
                ? 'Speak now in Hindi or Gujarati... your speech will transcribe here in real time.'
                : 'Microphone is idle. Click "Enable Microphone" or test with simulation presets below.'}
            </span>
          )}
        </div>
      </div>

      {/* 2. DEDICATED SPACE: Censored & Bleeped Audio Audition Player */}
      <div className="rounded-xl border border-indigo-900/80 bg-gradient-to-br from-indigo-950/50 via-slate-950 to-slate-900/90 p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/50 pb-2.5">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Audition Censored / Bleeped Audio (Scammer's Earpiece)
            </span>
          </div>
          <span className="rounded bg-indigo-900/60 border border-indigo-600/50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300">
            1000Hz CENSOR TONE MASK
          </span>
        </div>

        {/* Breakdown Banner showing what is spoken vs what is bleeped */}
        <div className="rounded-lg bg-slate-950/80 p-2.5 border border-slate-800 text-xs space-y-1.5 font-mono">
          <div className="flex items-start gap-1.5 text-slate-300">
            <span className="text-slate-500 font-semibold shrink-0">1. Original Spoken:</span>
            <span className="italic text-slate-200">"{originalSpokenText}"</span>
          </div>
          <div className="flex items-start gap-1.5 text-rose-300">
            <span className="text-rose-400 font-semibold shrink-0">2. Scammer Hears:</span>
            <span className="font-bold">"{activeMaskedText}"</span>
          </div>
        </div>

        {/* Scrubber & Progress Bar */}
        <div className="space-y-1.5">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-all duration-75"
              style={{ width: `${bleepAudioProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              {isPlayingDubbed
                ? `${((bleepAudioProgress / 100) * bleepAudioDuration).toFixed(1)}s`
                : '0.0s'}
            </span>
            <span>{bleepAudioDuration.toFixed(1)}s</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayBleeped}
              disabled={!bleepedAudioUrl}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                isPlayingDubbed
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isPlayingDubbed ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>Pause Bleeped Audio</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Play Bleeped Audio (Listen to Censor Tone)</span>
                </>
              )}
            </button>

            <button
              onClick={handleReplayBleeped}
              disabled={!bleepedAudioUrl}
              title="Replay from start"
              className="flex items-center justify-center h-8 w-8 rounded-xl border border-indigo-800 bg-slate-900 text-indigo-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <Check className="h-3.5 w-3.5" />
            <span>Spoken speech preserved · Secrets bleeped</span>
          </div>
        </div>
      </div>

      {/* 3. One-Click Spoken Credentials Simulation Triggers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            One-Click Speech Censor & Dubbing Tests
          </label>
          <span className="text-[11px] text-slate-500">
            Instant 1000Hz bleep demo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() =>
              simulateUserSpokenAudio(
                'हाँ सर, मेरा ओटीपी नंबर ५८२९१० है।',
                'OTP',
                '५८२९१०'
              )
            }
            disabled={isProcessing}
            className="flex flex-col text-left rounded-xl border border-rose-900/60 bg-rose-950/20 p-2.5 hover:bg-rose-950/40 hover:border-rose-700 transition-colors text-xs cursor-pointer"
          >
            <span className="font-bold text-rose-300">Test OTP Leak (Hindi)</span>
            <span className="text-[11px] text-slate-400 font-hi">"मेरा OTP 582910 है"</span>
          </button>

          <button
            onClick={() =>
              simulateUserSpokenAudio(
                'હા સાહેબ, મારો એટીએમ પિન ૪૭૧૯ છે.',
                'BANK_PIN',
                '૪૭૧૯'
              )
            }
            disabled={isProcessing}
            className="flex flex-col text-left rounded-xl border border-amber-900/60 bg-amber-950/20 p-2.5 hover:bg-amber-950/40 hover:border-amber-700 transition-colors text-xs cursor-pointer"
          >
            <span className="font-bold text-amber-300">Test Bank PIN Leak (Gujarati)</span>
            <span className="text-[11px] text-slate-400 font-gu">"મારો એટીએમ પિન ૪૭૧૯ છે"</span>
          </button>

          <button
            onClick={() =>
              simulateUserSpokenAudio(
                'તમે કઈ બ્રાન્ચમાંથી બોલો છો? હું બેંકમાં રૂબરૂ આવીશ.',
                'NONE',
                ''
              )
            }
            disabled={isProcessing}
            className="flex flex-col text-left rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 hover:bg-slate-900 transition-colors text-xs cursor-pointer"
          >
            <span className="font-bold text-slate-300">Normal Reply (Safe)</span>
            <span className="text-[11px] text-slate-400 font-gu">"હું બેંકમાં રૂબરૂ આવીશ"</span>
          </button>
        </div>
      </div>

      {/* Live Interception Result Card */}
      {latestInterception && (
        <div
          className={`rounded-xl border p-4 transition-all ${
            latestInterception.isDubbed
              ? 'border-amber-600/80 bg-gradient-to-b from-amber-950/50 to-slate-950 text-amber-100 shadow-lg'
              : 'border-slate-800 bg-slate-950/60 text-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              {latestInterception.isDubbed ? (
                <ShieldAlert className="h-5 w-5 text-amber-400 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">
                {latestInterception.isDubbed
                  ? `TRANSMISSION INTERCEPTED: ${latestInterception.sensitiveType} CENSORED`
                  : 'OUTGOING TRANSMISSION: CLEAR'}
              </span>
            </div>

            {latestInterception.isDubbed && (
              <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                DUBBED WITH 1000Hz CENSOR BLEEP
              </span>
            )}
          </div>

          <div className="my-2.5 space-y-1">
            <span className="text-[11px] text-slate-400 block">
              Outgoing Spoken Speech (Scrubbed & Masked):
            </span>
            <p className="font-mono text-xs sm:text-sm font-semibold bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-rose-300">
              {latestInterception.maskedTranscript}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p
              className={`text-xs font-medium text-amber-200 ${
                language === 'gu' ? 'font-gu' : 'font-hi'
              }`}
            >
              {latestInterception.safetyAlert}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
