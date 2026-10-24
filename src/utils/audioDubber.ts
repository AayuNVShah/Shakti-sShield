import { getAudioContext, sliceAudioBufferToWav } from './audioChunker';

/**
 * Audio Dubber & Censor Engine
 * Replaces sensitive voice audio with a 1000Hz telecom censor bleep
 * to prevent spoken OTPs, PINs, and credentials from reaching fraudsters.
 */
export async function dubSensitiveAudio(
  audioBuffer: AudioBuffer,
  startSec: number = 0,
  endSec: number = 4
): Promise<{ dubbedBuffer: AudioBuffer; dubbedWavBlob: Blob; dubbedAudioUrl: string }> {
  const ctx = getAudioContext();
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  // Create a clone of the buffer to modify
  const dubbedBuffer = ctx.createBuffer(numChannels, length, sampleRate);

  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(length, Math.floor(endSec * sampleRate));

  for (let c = 0; c < numChannels; c++) {
    const srcData = audioBuffer.getChannelData(c);
    const dstData = dubbedBuffer.getChannelData(c);

    // Copy original audio
    dstData.set(srcData);

    // Censor tone frequency (standard telecom bleep: 1000Hz)
    const bleepFreq = 1000;
    const fadeSamples = Math.min(240, Math.floor((endSample - startSample) / 10));

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / sampleRate;
      // 1000Hz pure tone + subtle harmonic
      let tone = Math.sin(2 * Math.PI * bleepFreq * t) * 0.45;
      tone += Math.sin(2 * Math.PI * (bleepFreq * 2) * t) * 0.08;

      // Soft attack & release envelope to avoid popping
      let env = 1.0;
      if (i - startSample < fadeSamples) {
        env = (i - startSample) / fadeSamples;
      } else if (endSample - i < fadeSamples) {
        env = (endSample - i) / fadeSamples;
      }

      dstData[i] = tone * env;
    }
  }

  // Encode the dubbed buffer to a WAV Blob
  const { blob } = sliceAudioBufferToWav(dubbedBuffer, 0, dubbedBuffer.duration, sampleRate);
  const dubbedAudioUrl = URL.createObjectURL(blob);

  return {
    dubbedBuffer,
    dubbedWavBlob: blob,
    dubbedAudioUrl,
  };
}

/**
 * Masks sensitive sequences in transcripts
 */
export function maskSensitiveTranscript(
  rawTranscript: string,
  sensitiveExcerpts: string[]
): string {
  let masked = rawTranscript;
  if (!sensitiveExcerpts || sensitiveExcerpts.length === 0) {
    // Regex fallback for 4-8 digit sequences
    return masked.replace(/\b\d{4,8}\b/g, '•••••• [BLEEPED]');
  }

  for (const excerpt of sensitiveExcerpts) {
    if (excerpt && excerpt.trim().length > 0) {
      const escaped = excerpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      masked = masked.replace(regex, '•••••• [BLEEPED & DUBBED]');
    }
  }

  return masked;
}
