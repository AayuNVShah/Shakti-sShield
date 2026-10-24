/**
 * In-browser Web Audio decoder and WAV chunk encoder.
 * Slices decoded PCM audio into clean 4-6 second standalone WAV buffers.
 */

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

export async function fetchAndDecodeAudio(url: string): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

/**
 * Encodes a section of an AudioBuffer into a standard 16-bit PCM WAV Blob
 */
export function sliceAudioBufferToWav(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number,
  targetSampleRate = 24000
): { blob: Blob; base64Promise: Promise<string> } {
  const actualStart = Math.max(0, startSec);
  const actualEnd = Math.min(audioBuffer.duration, endSec);
  const duration = Math.max(0.1, actualEnd - actualStart);

  const startSample = Math.floor(actualStart * audioBuffer.sampleRate);
  const endSample = Math.floor(actualEnd * audioBuffer.sampleRate);
  const sliceLength = Math.max(1, endSample - startSample);

  // We mix down to mono for efficient Gemini audio transmission
  const channelData = audioBuffer.getChannelData(0);
  const isMultiChannel = audioBuffer.numberOfChannels > 1;
  const channelData2 = isMultiChannel ? audioBuffer.getChannelData(1) : null;

  // Simple resample / downsample ratio
  const ratio = audioBuffer.sampleRate / targetSampleRate;
  const targetLength = Math.floor(sliceLength / ratio);

  // Allocate WAV buffer: 44 bytes header + (targetLength * 2 bytes per sample)
  const wavBytes = 44 + targetLength * 2;
  const buffer = new ArrayBuffer(wavBytes);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + targetLength * 2, true);
  writeString(view, 8, 'WAVE');
  // Format chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, targetSampleRate, true); // SampleRate
  view.setUint32(28, targetSampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample
  // Data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, targetLength * 2, true);

  // Write 16-bit PCM samples with linear interpolation
  let offset = 44;
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = startSample + Math.floor(i * ratio);
    let sample = 0;
    if (srcIndex < channelData.length) {
      sample = channelData[srcIndex];
      if (channelData2 && srcIndex < channelData2.length) {
        sample = (sample + channelData2[srcIndex]) * 0.5;
      }
    }

    // Clamp between -1.0 and 1.0
    sample = Math.max(-1, Math.min(1, sample));
    // Scale to 16-bit signed integer
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });

  const base64Promise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { blob, base64Promise };
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
