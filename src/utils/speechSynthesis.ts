import { Language } from '../types';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakWarningAloud(text: string, language: Language): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser environment');
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const langCode = language === 'gu' ? 'gu-IN' : 'hi-IN';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Try finding preferred Indian accent voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(language) ||
          v.lang.toLowerCase().includes('in') ||
          v.name.toLowerCase().includes('india')
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        currentUtterance = null;
        resolve();
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Error initiating speech synthesis:', err);
      resolve();
    }
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}
