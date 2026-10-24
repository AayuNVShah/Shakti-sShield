import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CallScenario,
  ChunkAnalysisResponse,
  Language,
  LiveEvent,
  MonitoringStatus,
  OutgoingInterceptionEvent,
  RedFlag,
  SessionEvidenceSummary,
} from './types';
import { CALL_SCENARIOS } from './scenarios';
import { Header } from './components/Header';
import { PrototypeSetupScreen } from './components/PrototypeSetupScreen';
import { AudioPlayerCard } from './components/AudioPlayerCard';
import { UserAudioProtectionPanel } from './components/UserAudioProtectionPanel';
import { StatusIndicator } from './components/StatusIndicator';
import { WarningPanel } from './components/WarningPanel';
import { AlertModalTakeover } from './components/AlertModalTakeover';
import { LiveTimeline } from './components/LiveTimeline';
import { DemoTestRunner } from './components/DemoTestRunner';
import {
  fetchAndDecodeAudio,
  getAudioContext,
  sliceAudioBufferToWav,
} from './utils/audioChunker';
import { evaluateSessionPolicy } from './utils/policyEngine';
import { stopSpeaking } from './utils/speechSynthesis';
import { ArrowLeft, SlidersHorizontal, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  // Navigation & Flow Mode ('setup' = Screen 1, 'session' = Screen 2)
  const [appStep, setAppStep] = useState<'setup' | 'session'>('setup');
  const [activeView, setActiveView] = useState<'live' | 'benchmark'>('live');

  // Prototype Controls
  const [language, setLanguage] = useState<Language>('hi');
  const [selectedScenario, setSelectedScenario] = useState<CallScenario>(CALL_SCENARIOS[0]);
  const [autoDubEnabled, setAutoDubEnabled] = useState<boolean>(true);
  const [fullScreenModalEnabled, setFullScreenModalEnabled] = useState<boolean>(true);

  // Audio Playback & Node references
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(18);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Audio Graph Refs
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const pausedAtTimeRef = useRef<number>(0);
  const playbackTimerRef = useRef<number | null>(null);

  // Inbound Caller Analysis Session & Queue State
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(-1);
  const [totalExpectedChunks, setTotalExpectedChunks] = useState<number>(4);
  const analyzedChunksSetRef = useRef<Set<number>>(new Set());
  const inFlightRequestRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);

  // Policy & Alert State
  const [status, setStatus] = useState<MonitoringStatus>('READY');
  const sessionSummaryRef = useRef<SessionEvidenceSummary>({
    sessionId: sessionIdRef.current,
    scenarioId: CALL_SCENARIOS[0].id,
    status: 'READY',
    accumulatedRedFlags: [],
    highestSeverity: 'low',
    evidenceQuotes: [],
    transcripts: [],
    alertTriggered: false,
  });

  const [sessionSummary, setSessionSummary] = useState<SessionEvidenceSummary>(
    sessionSummaryRef.current
  );
  const [events, setEvents] = useState<LiveEvent[]>([]);

  // Alert Takeover Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [modalAlertReason, setModalAlertReason] = useState<string>('');

  // -------------------------------------------------------------
  // Clean Audio Context & Teardown
  // -------------------------------------------------------------
  const stopAudioPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    stopSpeaking();
  }, []);

  const resetSession = useCallback(() => {
    isCancelledRef.current = true;
    stopAudioPlayback();
    setCurrentTime(0);
    pausedAtTimeRef.current = 0;
    sessionIdRef.current = `session_${Date.now()}`;
    analyzedChunksSetRef.current = new Set();
    inFlightRequestRef.current = false;
    setIsAnalyzing(false);
    setActiveChunkIndex(-1);
    setIsAlertModalOpen(false);

    const freshSummary: SessionEvidenceSummary = {
      sessionId: sessionIdRef.current,
      scenarioId: selectedScenario.id,
      status: 'READY',
      accumulatedRedFlags: [],
      highestSeverity: 'low',
      evidenceQuotes: [],
      transcripts: [],
      alertTriggered: false,
    };
    sessionSummaryRef.current = freshSummary;
    setSessionSummary(freshSummary);
    setStatus('READY');
    setEvents([]);
  }, [stopAudioPlayback, selectedScenario.id]);

  // Load audio buffer when scenario changes
  useEffect(() => {
    resetSession();
    let isCurrent = true;

    async function loadAudio() {
      try {
        const buffer = await fetchAndDecodeAudio(selectedScenario.audioUrl);
        if (isCurrent) {
          audioBufferRef.current = buffer;
          setDuration(buffer.duration);
          const chunks = Math.ceil(buffer.duration / 4.5);
          setTotalExpectedChunks(chunks);
        }
      } catch (err) {
        console.error('Failed to load audio buffer:', err);
      }
    }

    loadAudio();

    return () => {
      isCurrent = false;
    };
  }, [selectedScenario, resetSession]);

  // -------------------------------------------------------------
  // Caller Audio Chunk Analysis Pipeline (with ThinkingLevel.MINIMAL)
  // -------------------------------------------------------------
  const analyzeChunk = useCallback(
    async (chunkIdx: number, startSec: number, endSec: number) => {
      if (
        !audioBufferRef.current ||
        analyzedChunksSetRef.current.has(chunkIdx) ||
        inFlightRequestRef.current ||
        isCancelledRef.current
      ) {
        return;
      }

      analyzedChunksSetRef.current.add(chunkIdx);
      inFlightRequestRef.current = true;
      setIsAnalyzing(true);
      setActiveChunkIndex(chunkIdx);

      try {
        const { base64Promise } = sliceAudioBufferToWav(
          audioBufferRef.current,
          startSec,
          endSec
        );
        const base64Audio = await base64Promise;

        if (isCancelledRef.current) return;

        let response: Response | null = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts && !response && !isCancelledRef.current) {
          attempts++;
          try {
            response = await fetch('/api/analyze-chunk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionIdRef.current,
                chunkIndex: chunkIdx,
                startTime: startSec,
                endTime: endSec,
                audioBase64: base64Audio,
                mimeType: 'audio/wav',
                scenarioId: selectedScenario.id,
                clientLanguage: language,
                previousEvidence: sessionSummaryRef.current.evidenceQuotes,
              }),
            });
          } catch (netErr) {
            console.warn(`Network attempt #${attempts} failed:`, netErr);
            if (attempts < maxAttempts) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        if (isCancelledRef.current) return;

        if (!response || !response.ok) {
          console.error(`Chunk #${chunkIdx} analysis failed with status:`, response?.status);
          setStatus('ANALYSIS_UNAVAILABLE');
          return;
        }

        const chunkResult: ChunkAnalysisResponse = await response.json();
        if (isCancelledRef.current) return;

        // Apply Deterministic Policy
        const policy = evaluateSessionPolicy(sessionSummaryRef.current, chunkResult);

        const updatedSummary: SessionEvidenceSummary = {
          ...sessionSummaryRef.current,
          status: policy.nextStatus,
          accumulatedRedFlags: policy.accumulatedRedFlags,
          highestSeverity: policy.highestSeverity,
          evidenceQuotes: policy.evidenceQuotes,
          warningHi: policy.warningHi,
          warningGu: policy.warningGu,
          recommendedAction: policy.recommendedAction,
        };

        if (
          policy.shouldTriggerAlertModal &&
          !sessionSummaryRef.current.alertTriggered &&
          fullScreenModalEnabled
        ) {
          updatedSummary.alertTriggered = true;
          updatedSummary.alertTriggeredAtTime = endSec;
          setModalAlertReason(policy.alertReason || 'Critical phone scam indicators detected.');
          setIsAlertModalOpen(true);
        }

        sessionSummaryRef.current = updatedSummary;
        setSessionSummary({ ...updatedSummary });
        setStatus(policy.nextStatus);

        // Add to Live Event Timeline
        const newEvent: LiveEvent = {
          id: `caller_evt_${chunkIdx}_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          playbackTime: endSec,
          chunkIndex: chunkIdx,
          severity: chunkResult.severity,
          redFlags: chunkResult.red_flags,
          evidence: chunkResult.evidence || [],
          transcriptExcerpt: chunkResult.transcript_excerpt || '',
          summary: chunkResult.recommended_action || '',
          recommendedAction: chunkResult.recommended_action || '',
        };

        setEvents((prev) => [newEvent, ...prev]);
      } catch (err) {
        console.error('Audio chunk pipeline error:', err);
        setStatus('ANALYSIS_UNAVAILABLE');
      } finally {
        inFlightRequestRef.current = false;
        setIsAnalyzing(false);
      }
    },
    [fullScreenModalEnabled, language, selectedScenario.id]
  );

  // -------------------------------------------------------------
  // Outbound User Audio DLP Interception Handler
  // -------------------------------------------------------------
  const handleOutgoingInterception = useCallback(
    (interception: OutgoingInterceptionEvent) => {
      if (interception.isDubbed) {
        const dlpEvent: LiveEvent = {
          id: `dlp_${interception.id}`,
          timestamp: interception.timestamp,
          playbackTime: currentTime,
          chunkIndex: interception.chunkIndex,
          severity: 'critical',
          redFlags: ['OTP_OR_CREDENTIAL_REQUEST'],
          evidence: [
            `Sensitive ${interception.sensitiveType} detected & replaced with 1000Hz censor bleep`,
          ],
          transcriptExcerpt: interception.maskedTranscript,
          summary: interception.safetyAlert,
          recommendedAction:
            'Do NOT disclose verification codes. The outbound audio transmission was successfully dubbed.',
        };

        setEvents((prev) => [dlpEvent, ...prev]);

        // Elevate warning state
        setStatus('SCAM_WARNING');
        const updated = {
          ...sessionSummaryRef.current,
          status: 'SCAM_WARNING' as MonitoringStatus,
          highestSeverity: 'critical' as const,
          alertTriggered: true,
          alertTriggeredAtTime: currentTime,
          warningHi:
            'सावधान! आपने संवेदनशील ओटीपी/पिन बोला था। शील्ड ने इसे धोखेबाज तक पहुंचने से रोक दिया है!',
          warningGu:
            'સાવધાન! તમે ગુપ્ત ઓટીપી/પિન બોલ્યા હતા. શીલ્ડે આ ઓડિયો ડબ કરી ઠગ સુધી પહોંચતો રોકી દીધો છે!',
          recommendedAction:
            'Hang up immediately! Never read out SMS OTPs or passwords to incoming callers.',
        };
        sessionSummaryRef.current = updated;
        setSessionSummary(updated);

        if (fullScreenModalEnabled) {
          setModalAlertReason('Outgoing Data Loss Prevented: Spoken OTP was censored with a 1000Hz bleep tone!');
          setIsAlertModalOpen(true);
        }
      }
    },
    [currentTime, fullScreenModalEnabled]
  );

  // -------------------------------------------------------------
  // Audio Playback Controls
  // -------------------------------------------------------------
  const playFromTime = useCallback(
    (offsetSec: number) => {
      if (!audioBufferRef.current) return;
      isCancelledRef.current = false;
      const ctx = getAudioContext();

      if (!gainNodeRef.current) {
        gainNodeRef.current = ctx.createGain();
      }
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;

      if (!analyserNodeRef.current) {
        analyserNodeRef.current = ctx.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserNodeRef.current);
      analyserNodeRef.current.connect(ctx.destination);

      sourceNodeRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime - offsetSec;

      source.onended = () => {
        if (ctx.currentTime - playbackStartTimeRef.current >= audioBufferRef.current!.duration - 0.2) {
          stopAudioPlayback();
          setCurrentTime(duration);
        }
      };

      source.start(0, offsetSec);
      setIsPlaying(true);
      setIsPaused(false);
      if (status === 'READY') {
        setStatus('MONITORING');
      }

      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = window.setInterval(() => {
        if (!sourceNodeRef.current || !audioBufferRef.current) return;
        const currentPos = Math.min(
          audioBufferRef.current.duration,
          ctx.currentTime - playbackStartTimeRef.current
        );
        setCurrentTime(currentPos);

        const chunkSize = 4.5;
        const currentChunkIdx = Math.floor(currentPos / chunkSize);

        if (!analyzedChunksSetRef.current.has(currentChunkIdx)) {
          const start = currentChunkIdx * chunkSize;
          const end = Math.min(audioBufferRef.current.duration, (currentChunkIdx + 1) * chunkSize);
          analyzeChunk(currentChunkIdx, start, end);
        }
      }, 100);
    },
    [analyzeChunk, duration, isMuted, status, stopAudioPlayback, volume]
  );

  const handlePlay = () => {
    playFromTime(0);
  };

  const handlePause = () => {
    if (!isPlaying) return;
    const ctx = getAudioContext();
    pausedAtTimeRef.current = ctx.currentTime - playbackStartTimeRef.current;
    stopAudioPlayback();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!isPaused) return;
    playFromTime(pausedAtTimeRef.current);
  };

  const handleStop = () => {
    stopAudioPlayback();
    setCurrentTime(0);
    pausedAtTimeRef.current = 0;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(false);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVol;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = nextMuted ? 0 : volume;
    }
  };

  const handleSelectScenario = (scenario: CallScenario) => {
    if (isPlaying) {
      stopAudioPlayback();
    }
    setSelectedScenario(scenario);
    setLanguage(scenario.language);
  };

  const handleModalHangUp = () => {
    handleStop();
    setIsAlertModalOpen(false);
  };

  const handleModalDismiss = () => {
    setIsAlertModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Sticky Top Header */}
      <Header
        currentLanguage={language}
        onLanguageChange={(newLang) => setLanguage(newLang)}
        status={status}
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        onResetSession={resetSession}
        isCallActive={isPlaying && !isPaused}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {activeView === 'benchmark' ? (
          /* Automated Benchmark & Validation View */
          <DemoTestRunner scenarios={CALL_SCENARIOS} />
        ) : appStep === 'setup' ? (
          /* Screen 1: Prototype Setup & Audio Scenario Selection */
          <PrototypeSetupScreen
            scenarios={CALL_SCENARIOS}
            selectedScenario={selectedScenario}
            onSelectScenario={handleSelectScenario}
            language={language}
            onLanguageChange={(l) => setLanguage(l)}
            autoDubEnabled={autoDubEnabled}
            onToggleAutoDub={(v) => setAutoDubEnabled(v)}
            fullScreenModalEnabled={fullScreenModalEnabled}
            onToggleFullScreenModal={(v) => setFullScreenModalEnabled(v)}
            onStartSession={() => setAppStep('session')}
          />
        ) : (
          /* Screen 2: Active Protected Call Inspection Workspace */
          <div className="space-y-6">
            {/* Top Toolbar: Back to Setup / Change Scenario & Active Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/60 p-3.5 border border-slate-800">
              <button
                onClick={() => {
                  stopAudioPlayback();
                  setAppStep('setup');
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>← Change Audio Drill / Back to Setup</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Active Drill:</span>
                <span className="font-bold text-white text-xs">{selectedScenario.title}</span>
                <span className="rounded bg-rose-950 border border-rose-800/60 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                  {selectedScenario.languageLabel}
                </span>
              </div>
            </div>

            {/* Primary Status Indicator Banner */}
            <StatusIndicator
              status={status}
              language={language}
              isAnalyzing={isAnalyzing}
              totalFlagsCount={sessionSummary.accumulatedRedFlags.filter((f) => f !== 'NONE').length}
            />

            {/* Two-Column Dashboard: Left = Player + Mic DLP Panel + Timeline, Right = Warning & Advice */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Caller Player, User Mic DLP Interceptor & Dual-Stream Timeline */}
              <div className="space-y-6 lg:col-span-7">
                {/* Inbound Caller Player */}
                <AudioPlayerCard
                  scenario={selectedScenario}
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  isPaused={isPaused}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                  isAnalyzing={isAnalyzing}
                  currentChunkIndex={activeChunkIndex}
                  totalChunksExpected={totalExpectedChunks}
                  analyserNode={analyserNodeRef.current}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                />

                {/* User Mic Audio Input & Real-time Live Transcription & Dubbing */}
                <UserAudioProtectionPanel
                  language={language}
                  onInterceptionOccurred={handleOutgoingInterception}
                  isCallActive={isPlaying && !isPaused}
                />

                {/* Dual-Stream Live Timeline */}
                <LiveTimeline
                  events={events}
                  language={language}
                  isAnalyzing={isAnalyzing}
                  activeChunkIndex={activeChunkIndex}
                />
              </div>

              {/* Right Column: Warning Panel & Victim Defense (5 Cols on Desktop) */}
              <div className="space-y-6 lg:col-span-5">
                <WarningPanel
                  status={status}
                  language={language}
                  redFlags={sessionSummary.accumulatedRedFlags}
                  highestSeverity={sessionSummary.highestSeverity}
                  warningHi={sessionSummary.warningHi}
                  warningGu={sessionSummary.warningGu}
                  recommendedAction={sessionSummary.recommendedAction}
                  evidenceQuotes={sessionSummary.evidenceQuotes}
                  onHangUp={handleStop}
                  isCallActive={isPlaying && !isPaused}
                />

                {/* Cyber Security Quick Reference Guide */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-xs text-slate-400 space-y-3">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Indian Cybercrime Defense Golden Rules
                  </h4>
                  <ul className="space-y-2 list-disc list-inside text-slate-300">
                    <li>
                      <span className="font-semibold text-rose-300">No "Digital Arrest": </span>
                      Indian law and courts have no provision for arrest via WhatsApp, Skype, or phone calls.
                    </li>
                    <li>
                      <span className="font-semibold text-rose-300">Never Share OTP: </span>
                      No genuine RBI or bank employee will ever ask for SMS OTPs, PINs, or card CVVs.
                    </li>
                    <li>
                      <span className="font-semibold text-rose-300">No Escrow Deposits: </span>
                      Customs, Police, and courier companies never require verification funds transferred to personal UPI accounts.
                    </li>
                    <li>
                      <span className="font-semibold text-indigo-300">Active Audio Dubbing: </span>
                      If you accidentally start reading an OTP or PIN, Scam Call Shield censors the audio with a 1000Hz tone before it transmits.
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Official Indian Helpline: <span className="font-mono text-white font-bold">1930</span> · Report at{' '}
                    <span className="text-slate-300 font-mono">cybercrime.gov.in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Full-Screen Alert Takeover Modal */}
      <AlertModalTakeover
        isOpen={isAlertModalOpen}
        language={language}
        scenarioTitle={selectedScenario.title}
        redFlags={sessionSummary.accumulatedRedFlags}
        evidenceQuotes={sessionSummary.evidenceQuotes}
        warningHi={sessionSummary.warningHi || 'सावधान! तुरंत फोन काटें और किसी को पैसे या ओटीपी न दें।'}
        warningGu={sessionSummary.warningGu || 'સાવધાન! તરત જ ફોન કાપો અને કોઈને પણ પૈસા કે ઓટીપી આપશો નહીં.'}
        recommendedAction={
          sessionSummary.recommendedAction ||
          'Hang up call immediately. Never transfer funds or share verification OTPs.'
        }
        alertReason={modalAlertReason}
        onHangUpAndDismiss={handleModalHangUp}
        onDismiss={handleModalDismiss}
      />
    </div>
  );
}
