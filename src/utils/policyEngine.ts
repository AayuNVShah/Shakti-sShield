import {
  ChunkAnalysisResponse,
  MonitoringStatus,
  RedFlag,
  SessionEvidenceSummary,
  Severity,
} from '../types';

export interface PolicyEvaluationResult {
  nextStatus: MonitoringStatus;
  highestSeverity: Severity;
  accumulatedRedFlags: RedFlag[];
  shouldTriggerAlertModal: boolean;
  alertReason?: string;
  evidenceQuotes: string[];
  warningHi: string;
  warningGu: string;
  recommendedAction: string;
}

const CRITICAL_FLAGS: Set<RedFlag> = new Set([
  'OTP_OR_CREDENTIAL_REQUEST',
  'REMOTE_ACCESS_REQUEST',
]);

export function evaluateSessionPolicy(
  currentSummary: SessionEvidenceSummary,
  newChunk: ChunkAnalysisResponse
): PolicyEvaluationResult {
  // Aggregate unique non-NONE red flags
  const existingFlags = new Set(currentSummary.accumulatedRedFlags);
  for (const flag of newChunk.red_flags) {
    if (flag !== 'NONE') {
      existingFlags.add(flag);
    }
  }
  const accumulatedRedFlags = Array.from(existingFlags);

  // Aggregate evidence quotes
  const quotesSet = new Set(currentSummary.evidenceQuotes);
  if (Array.isArray(newChunk.evidence)) {
    for (const quote of newChunk.evidence) {
      if (quote && quote.trim().length > 0) {
        quotesSet.add(quote.trim());
      }
    }
  }
  const evidenceQuotes = Array.from(quotesSet);

  // Determine highest severity encountered
  const severityRank: Record<Severity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  let currentRank = severityRank[currentSummary.highestSeverity] || 1;
  const chunkRank = severityRank[newChunk.severity] || 1;
  const highestSeverity: Severity =
    chunkRank > currentRank ? newChunk.severity : currentSummary.highestSeverity;

  // Immediate High-Priority Scam Triggers:
  // 1. Explicit request for OTP, PIN, password, or remote access app
  const hasCriticalFlag = accumulatedRedFlags.some((f) => CRITICAL_FLAGS.has(f));

  // 2. Coercive payment demand combined with threats, authority impersonation, or courier seizure
  const hasPaymentCoercion =
    accumulatedRedFlags.includes('MONEY_TRANSFER_REQUEST') &&
    (accumulatedRedFlags.includes('THREAT_OR_COERCION') ||
      accumulatedRedFlags.includes('AUTHORITY_IMPERSONATION') ||
      accumulatedRedFlags.includes('SUSPICIOUS_COURIER'));

  // 3. Digital Arrest threat (Threat + Authority Impersonation)
  const hasDigitalArrest =
    accumulatedRedFlags.includes('THREAT_OR_COERCION') &&
    accumulatedRedFlags.includes('AUTHORITY_IMPERSONATION');

  const isImmediateCritical = hasCriticalFlag || hasPaymentCoercion || hasDigitalArrest;

  let nextStatus: MonitoringStatus = 'MONITORING';
  let shouldTriggerAlertModal = false;
  let alertReason = '';

  if (isImmediateCritical || highestSeverity === 'critical') {
    nextStatus = 'SCAM_WARNING';
    // Trigger modal takeover only if not previously triggered
    if (!currentSummary.alertTriggered) {
      shouldTriggerAlertModal = true;
      if (hasCriticalFlag) {
        alertReason = 'Immediate high-priority alert: Explicit credential / OTP disclosure demand detected!';
      } else if (hasDigitalArrest) {
        alertReason = 'Immediate high-priority alert: Coercive Digital Arrest & Police impersonation threat!';
      } else {
        alertReason = 'Immediate high-priority alert: Coercive payment demand tied to legal intimidation!';
      }
    }
  } else if (accumulatedRedFlags.length >= 2 || highestSeverity === 'high') {
    // Escalate when multiple independent red flags appear across the call
    nextStatus = 'SCAM_WARNING';
    if (!currentSummary.alertTriggered) {
      shouldTriggerAlertModal = true;
      alertReason = `Escalated scam warning: Multiple independent fraud indicators detected (${accumulatedRedFlags.join(', ')})`;
    }
  } else if (accumulatedRedFlags.length === 1 || newChunk.severity === 'medium') {
    // Single suspicious flag or ambiguous high-pressure language
    nextStatus = 'SUSPICIOUS';
  } else {
    // Keep monitoring, never label as safe simply because no flags detected yet
    nextStatus = 'MONITORING';
  }

  // Localized warnings selection
  const warningHi =
    newChunk.warning_hi ||
    (isImmediateCritical
      ? 'सावधान! यह एक गंभीर फर्जी कॉल है। तुरंत फोन काटें और किसी को भी ओटीपी या पैसे न दें।'
      : 'सतर्क रहें: संदेहास्पद कॉल का विश्लेषण किया जा रहा है।');

  const warningGu =
    newChunk.warning_gu ||
    (isImmediateCritical
      ? 'સાવધાન! આ એક ગંભીર છેતરપિંડી કોલ છે. તરત જ ફોન કાપો અને કોઈને પણ ઓટીપી કે રૂપિયા આપશો નહીં.'
      : 'સાવચેત રહો: શંકાસ્પદ કૉલનું વિશ્લેષણ ચાલુ છે.');

  const recommendedAction =
    newChunk.recommended_action ||
    (isImmediateCritical
      ? 'Hang up immediately. Police, CBI, and Banks never demand money or OTPs over phone.'
      : 'Continue monitoring with caution. Do not reveal private personal credentials.');

  return {
    nextStatus,
    highestSeverity,
    accumulatedRedFlags,
    shouldTriggerAlertModal,
    alertReason,
    evidenceQuotes,
    warningHi,
    warningGu,
    recommendedAction,
  };
}
