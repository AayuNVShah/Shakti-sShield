export type Language = 'hi' | 'gu';

export type MonitoringStatus =
  | 'READY'
  | 'MONITORING'
  | 'SUSPICIOUS'
  | 'SCAM_WARNING'
  | 'ANALYSIS_UNAVAILABLE';

export type RedFlag =
  | 'AUTHORITY_IMPERSONATION'
  | 'THREAT_OR_COERCION'
  | 'URGENCY'
  | 'OTP_OR_CREDENTIAL_REQUEST'
  | 'MONEY_TRANSFER_REQUEST'
  | 'SUSPICIOUS_KYC'
  | 'SUSPICIOUS_COURIER'
  | 'REMOTE_ACCESS_REQUEST'
  | 'NONE';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ChunkAnalysisResponse {
  chunkIndex: number;
  startTime: number;
  endTime: number;
  language: string;
  transcript_excerpt: string;
  red_flags: RedFlag[];
  evidence: string[];
  severity: Severity;
  confidence: number;
  recommended_action: string;
  warning_hi: string;
  warning_gu: string;
  needs_more_context: boolean;
  receivedAt: number;
}

export interface CallScenario {
  id: string;
  title: string;
  titleHi: string;
  titleGu: string;
  language: Language;
  languageLabel: string;
  audioUrl: string;
  expectedCategory: 'scam' | 'genuine';
  primaryThreat: string;
  expectedRedFlags: RedFlag[];
  description: string;
  durationEstimateSec: number;
  sampleTranscript: string;
}

export interface LiveEvent {
  id: string;
  timestamp: string;
  playbackTime: number;
  chunkIndex: number;
  severity: Severity;
  redFlags: RedFlag[];
  evidence: string[];
  transcriptExcerpt: string;
  summary: string;
  recommendedAction: string;
}

export interface SessionEvidenceSummary {
  sessionId: string;
  scenarioId: string;
  status: MonitoringStatus;
  accumulatedRedFlags: RedFlag[];
  highestSeverity: Severity;
  evidenceQuotes: string[];
  transcripts: string[];
  alertTriggered: boolean;
  alertTriggeredAtTime?: number;
  warningHi?: string;
  warningGu?: string;
  recommendedAction?: string;
}

export interface DemoTestResult {
  scenarioId: string;
  title: string;
  expected: 'scam' | 'genuine';
  detectedStatus: MonitoringStatus;
  passed: boolean;
  alertTriggeredBeforeEnd: boolean;
  alertLatencySec: number | null;
  detectedFlags: RedFlag[];
  durationSec: number;
  evidenceSample: string;
}

// User Spoken Audio & Data Leak Interceptor Types
export type SensitiveType =
  | 'OTP'
  | 'BANK_PIN'
  | 'CARD_DETAILS'
  | 'PASSWORD'
  | 'AADHAAR_OR_PAN'
  | 'NONE';

export interface UserAudioAnalysisResponse {
  sessionId: string;
  chunkIndex: number;
  transcript: string;
  contains_sensitive_info: boolean;
  sensitive_type: SensitiveType;
  sensitive_excerpts: string[];
  redaction_start_sec: number;
  redaction_end_sec: number;
  safety_alert: string;
  safety_alert_hi: string;
  safety_alert_gu: string;
  receivedAt: number;
}

export interface OutgoingInterceptionEvent {
  id: string;
  timestamp: string;
  chunkIndex: number;
  sensitiveType: SensitiveType;
  maskedTranscript: string;
  rawExcerpt: string;
  isDubbed: boolean;
  dubbedAudioUrl?: string;
  safetyAlert: string;
}
