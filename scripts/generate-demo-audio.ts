import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const outputDir = path.resolve(process.cwd(), 'public/demo-audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const scenarios = [
  {
    id: 'digital_arrest_hi',
    filename: 'digital_arrest_hi.wav',
    voice: 'Fenrir',
    text: 'सावधान! मैं सीबीआई हेडक्वार्टर नई दिल्ली से डीएसपी विक्रम राठौड़ बोल रहा हूँ। आपके आधार कार्ड से मुंबई एयरपोर्ट पर एक संदिग्ध पार्सल पकड़ा गया है, जिसमें 140 ग्राम ड्रग्स और फर्जी पासपोर्ट मिले हैं। आपके खिलाफ तुरंत गैर-जमानती अरेस्ट वारंट जारी हो चुका है। आप अभी डिजिटल अरेस्ट में हैं! फोन बिल्कुल मत काटना। केस क्लीयर कराने के लिए तुरंत हमारे सरकारी एस्क्रो अकाउंट में सिक्योरिटी डिपॉजिट ट्रांसफर करें!',
  },
  {
    id: 'fake_kyc_gu',
    filename: 'fake_kyc_gu.wav',
    voice: 'Puck',
    text: 'નમસ્તે સાહેબ, હું સ્ટેટ બેન્ક હેડ ઓફિસથી મેનેજર શર્મા બોલું છું. તમારા બેન્ક ખાતાનું કેવાયસી આજે જ એક્સપાયર થઈ ગયું છે અને તમારું એટીએમ કાર્ડ એક કલાકમાં બ્લોક થઈ જશે. ખાતું ચાલુ રાખવા માટે હમણાં જ તમારા મોબાઈલ પર આવેલો છ અંકનો ઓટીપી નંબર મને આપો. જો તમે તરત જ ઓટીપી નહીં આપો તો પચ્ચીસ હજાર રૂપિયા દંડ કપાશે!',
  },
  {
    id: 'fake_courier_hi',
    filename: 'fake_courier_hi.wav',
    voice: 'Charon',
    text: 'हेलो, यह फेडेक्स और कस्टम्स डिपार्टमेंट मुंबई का अर्जेंट कॉल है। आपके नाम पर ताइवान भेजा जा रहा पार्सल नारकोटिक्स ब्यूरो ने जब्त कर लिया है। इसमें पांच अवैध पासपोर्ट और प्रतिबंधित नशीला सामान मिला है। आप पर मनी लॉन्ड्रिंग का केस दर्ज हो रहा है। जेल जाने से बचना है तो तुरंत वेरिफिकेशन पेनल्टी अमाउंट हमारे दिए गए खाते में ट्रांसफर करें!',
  },
  {
    id: 'genuine_call_gu',
    filename: 'genuine_call_gu.wav',
    voice: 'Kore',
    text: 'નમસ્તે સાહેબ, હું બ્લુ ડાર્ટ કુરિયર ડિલિવરી બોય બોલું છું. તમારું એક પાર્સલ આવ્યું છે. હું તમારી સોસાયટીના ગેટ પાસે પહોંચી ગયો છું. તમારો ફ્લેટ નંબર બી-૪૦૨ છે ને? જો તમે ઘરે હોવ તો હું પાર્સલ આપવા આવું છું, કોઈ ઓટીપી કે પૈસા આપવાની જરૂર નથી, બસ સહી કરી આપજો.',
  },
];

function applyTelecomFilter(wavBuffer: Buffer): Buffer {
  if (wavBuffer.length < 44) return wavBuffer;
  const header = wavBuffer.subarray(0, 44);
  const data = wavBuffer.subarray(44);
  const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const filtered = new Int16Array(samples.length);

  let lowPass = 0;
  let prevSample = 0;
  for (let i = 0; i < samples.length; i++) {
    const raw = samples[i];
    const highPassed = raw - prevSample * 0.92;
    prevSample = raw;
    lowPass += (highPassed - lowPass) * 0.45;
    const noise = (Math.random() - 0.5) * 120;
    let sample = lowPass * 1.25 + noise;
    if (sample > 30000) sample = 30000;
    if (sample < -30000) sample = -30000;
    filtered[i] = sample;
  }

  const result = Buffer.alloc(44 + filtered.byteLength);
  header.copy(result, 0);
  Buffer.from(filtered.buffer, filtered.byteOffset, filtered.byteLength).copy(result, 44);
  return result;
}

function generateFallbackWav(durationSeconds: number, scenarioId: string): Buffer {
  const sampleRate = 24000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  const baseFreq = scenarioId.includes('kyc') ? 180 : scenarioId.includes('arrest') ? 140 : 220;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cadence = Math.sin(t * 3.5) > -0.2 ? 1 : 0.05;
    const s1 = Math.sin(2 * Math.PI * baseFreq * t);
    const s2 = 0.5 * Math.sin(2 * Math.PI * (baseFreq * 2.2) * t);
    const s3 = 0.25 * Math.sin(2 * Math.PI * (baseFreq * 3.4) * t);
    const noise = (Math.random() - 0.5) * 0.08;
    const value = Math.max(-1, Math.min(1, (s1 + s2 + s3) * 0.4 * cadence + noise));
    buffer.writeInt16LE(Math.floor(value * 32767), 44 + i * 2);
  }
  return buffer;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  }) : null;

  for (const scenario of scenarios) {
    const targetPath = path.join(outputDir, scenario.filename);
    console.log(`Processing demo call audio: ${scenario.filename}...`);

    let wavData: Buffer | null = null;
    if (ai) {
      try {
        console.log(`Generating speech with Gemini TTS for ${scenario.id}...`);
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: scenario.text,
                  speechMetadata: {
                    style: scenario.id.includes('genuine') 
                      ? 'Polite friendly local delivery courier'
                      : 'Authoritative urgent high-pressure telecom caller',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: scenario.voice },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          console.log(`Successfully received TTS WAV for ${scenario.filename} (${base64Audio.length} chars)`);
          const rawWav = Buffer.from(base64Audio, 'base64');
          wavData = applyTelecomFilter(rawWav);
        }
      } catch (err) {
        console.error(`TTS generation failed for ${scenario.filename}:`, err);
      }
    }

    if (!wavData) {
      console.log(`Using fallback audio for ${scenario.filename}`);
      wavData = generateFallbackWav(18, scenario.id);
    }

    fs.writeFileSync(targetPath, wavData);
    console.log(`Wrote ${targetPath} (${wavData.length} bytes)`);
  }
}

main().catch(err => {
  console.error('Fatal error in audio generation:', err);
  process.exit(1);
});
