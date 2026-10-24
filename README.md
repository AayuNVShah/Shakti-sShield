# Scam Call Shield: Real-Time Phone Scam Detection (Hindi & Gujarati)

Scam Call Shield is a specialized safety web application that monitors prerecorded Indian phone calls in real time, streams sequential audio chunks to Gemini's native audio understanding model, and triggers evidence-based scam alerts and safety interventions before the call concludes.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience preferences have been confirmed and incorporated into this blueprint:

- **Confirmed Decision 1 (Audio Styling)**: Realistic telecom audio with ambient phone line texture (bandpass frequency profile, telephone compression, and subtle line texture) for the four bundled Hindi and Gujarati scenarios.
- **Confirmed Decision 2 (Warning Escalation)**: Full-screen alert takeover modal on critical scam verdicts (e.g. Digital Arrest threats, urgent OTP/credential demands) requiring explicit user acknowledgment, while keeping live transcript and evidence timeline accessible.
- **Confirmed Decision 3 (Model Selection)**: `gemini-3.8-flash` via the official `@google/genai` SDK on the Node.js backend using `inlineData` with audio MIME types and strict `responseSchema` JSON validation.

---

### 1. Overview & Core Concept

- **What It Does**: Simulates an incoming suspicious phone call (Digital Arrest scam, Bank KYC fraud, Fake Courier parcel threat, or a Genuine inquiry), breaks down the audio into 4–5 second sequential segments as it plays, analyzes caller intent and acoustic content natively with Gemini, and intervenes with localized warnings (Hindi / Gujarati) before financial damage or panic occurs.
- **Target Audience / Persona**: Everyday Indian citizens, vulnerable seniors, and mobile device users who are frequent targets of high-pressure cybercrime (Digital Arrest, courier extortion, KYC phishing), as well as fraud analysts and consumer protection researchers.
- **Key Value**: Proactive intervention during the call rather than post-fraud reporting. By detecting red flags (coercion, OTP demands, authority impersonation) mid-conversation, the user is warned and coached to hang up immediately.

---

### 2. User Experience & Visual Design

- **Layout & Viewport Posture**:
  - **Mobile-First Responsive Canvas**: Compact mobile presentation (375px–430px) that smoothly adapts into a high-density, multi-column dashboard on desktop viewports (`max-w-6xl`) with telemetry, live waveform visualizer, call controls, and event log.
  - **Visual Identity & Theme**: High-contrast, trustworthy defense styling. Slate & navy surfaces (`#0b132b`, `#1c2541`), emerald safe states (`#10b981`), amber suspicious cautions (`#f59e0b`), and crimson critical alarm rings (`#ef4444`).
  - **Typography**: Clean sans-serif hierarchy (Inter/system) paired with clear Devanagari and Gujarati rendering for localized warning advisories.

- **Primary User Flows**:
  1. **Scenario Selection**: User selects one of four realistic demo calls:
     - *Digital Arrest Scam (Hindi)*: Fake police officer claiming seized narcotics parcel, demanding video call isolation and bail deposit.
     - *Fake KYC Scam (Gujarati)*: Fake bank executive threatening bank account suspension within 1 hour unless OTP is verified.
     - *Fake Courier Scam (Hindi)*: Customs/FedEx impersonator demanding money transfer for contraband clearance.
     - *Genuine Delivery Call (Gujarati)*: Legitimate courier asking for street directions and house landmark without any demands.
  2. **Active Call Monitoring**: User hits Play. Audio playback starts with an interactive waveform visualizer.
  3. **Streaming Incremental Analysis**: 4–5s audio chunks are continuously extracted from the decoded audio buffer and transmitted sequentially to `/api/analyze-chunk`.
  4. **Dynamic Escalation & Full-Screen Takeover**:
     - *Ready* $\rightarrow$ *Monitoring* $\rightarrow$ *Suspicious* $\rightarrow$ *Scam Warning (Critical)*.
     - Once critical red flags (OTP request, extortion, arrest threats) are detected, the UI immediately engages a high-visibility modal takeover explaining the scam mechanism and advising to disconnect.
  5. **Localized Audio Advice**: Replay advisory aloud in Hindi or Gujarati via SpeechSynthesis.
  6. **Automated Demo-Test Mode**: One-click benchmark running all 4 calls to prove alert trigger latency before call termination.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Audio Understanding vs. Client STT**:
  - *Chosen Approach*: Stream raw PCM/WAV slices directly to Gemini `gemini-3.8-flash` via the Node.js backend.
  - *Why*: Gemini natively analyzes tonal urgency, accent, authoritative aggression, and natural Hindi/Gujarati speech without relying on fragile client-side browser speech recognition or leaking API keys.
  - *Alternative Considered*: Browser Web Speech API was rejected due to lack of native Gujarati support, zero acoustic emotion analysis, and the prompt requirement forbidding it.

- **Decision 2: Sequential Non-Overlapping Audio Queue with Session Tracking**:
  - *Chosen Approach*: Client keeps an in-memory queue of analyzed chunk indices `[0, 1, 2...]` with an active `sessionId`. If a user pauses or resets the session, in-flight promises are safely aborted.
  - *Why*: Guarantees zero duplicate billing, prevents out-of-order race conditions, and maintains strict causality across call progression.

- **Decision 3: Two-Tier Policy Engine (Gemini Red Flag Extraction + Deterministic Policy)**:
  - *Chosen Approach*: Gemini extracts structured facts (`red_flags`, `evidence`, `language`, `confidence`); a deterministic state machine evaluates thresholds (e.g. single OTP or Coercive Money demand $\rightarrow$ immediate CRITICAL; multiple medium flags $\rightarrow$ SUSPICIOUS $\rightarrow$ SCAM).
  - *Why*: Prevents model hallucination or inconsistent prompt thresholds from softening safety decisions.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Client)                         │
│                                                                        │
│  ┌───────────────────────┐      ┌───────────────────────────────────┐  │
│  │ Call Scenario Picker  │      │ Live Status & Shield Indicator    │  │
│  │ (Digital Arrest/KYC)  │      │ [Ready / Monitoring / Critical]   │  │
│  └──────────┬────────────┘      └─────────────────▲─────────────────┘  │
│             │                                     │                    │
│  ┌──────────▼────────────┐      ┌─────────────────┴─────────────────┐  │
│  │ Audio Engine & Player │      │ Full-Screen Alert Takeover Modal  │  │
│  │ (Web Audio Buffer)    │      │ (Red Flags, Localized Hindi/Gu)   │  │
│  └──────────┬────────────┘      └─────────────────▲─────────────────┘  │
│             │                                     │                    │
│             │ 4-5s Slice (WAV)                    │ Alert Trigger      │
│             ▼                                     │                    │
│  ┌────────────────────────────────────────────────┴─────────────────┐  │
│  │ Chunk Pipeline Scheduler (Deduplication, Queue, Session State)   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ POST /api/analyze-chunk
                                      │ { audioBase64, chunkIndex, lang }
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Node / Express Backend                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ @google/genai SDK (models/gemini-3.8-flash)                      │  │
│  │ System: Indian Phone Scam Detection Guard                        │  │
│  │ Schema: Structured JSON (red_flags, evidence, severity, advice)  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │ Parsed Structured Output         │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ Deterministic Decision Policy & Aggregate Session Cache          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Data Models**:
  - `ScamRedFlag`: `AUTHORITY_IMPERSONATION`, `THREAT_OR_COERCION`, `URGENCY`, `OTP_OR_CREDENTIAL_REQUEST`, `MONEY_TRANSFER_REQUEST`, `SUSPICIOUS_KYC`, `SUSPICIOUS_COURIER`, `REMOTE_ACCESS_REQUEST`, `NONE`.
  - `AnalysisChunkResult`: `{ chunkIndex, startTime, endTime, language, transcriptExcerpt, redFlags, evidence, severity, confidence, warningHi, warningGu }`.
  - `SessionSummary`: `{ sessionId, currentStatus, accumulatedRedFlags, highestSeverity, totalChunks, alertTriggeredAtTime, callScenarioId }`.

- **Test Suite (Demo Benchmark Mode)**:
  - Automated runner executing all 4 calls in succession or batch mode.
  - Metrics captured: Detection latency (seconds into call before alert), accuracy of red flag classification, and proof that the alert fired prior to call completion.
