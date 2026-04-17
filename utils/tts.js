import { Platform } from 'react-native';

/**
 * Web Speech API wrapper for Italian TTS.
 * Does nothing on non-web platforms (iOS/Android will use expo-speech later).
 */

let cachedVoice = null; // null = not looked up, false = no voice found
let voicesLoadedPromise = null;

export function isSupported() {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'speechSynthesis' in window
  );
}

function loadVoices() {
  if (voicesLoadedPromise) return voicesLoadedPromise;
  voicesLoadedPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) return resolve(existing);
    const handler = () => {
      synth.removeEventListener('voiceschanged', handler);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
    // Safari fallback: voiceschanged sometimes doesn't fire
    setTimeout(() => resolve(synth.getVoices()), 1000);
  });
  return voicesLoadedPromise;
}

async function getItalianVoice() {
  if (!isSupported()) return null;
  if (cachedVoice !== null) return cachedVoice || null;

  const voices = await loadVoices();
  const italian = voices.filter(
    (v) => v.lang && v.lang.toLowerCase().startsWith('it'),
  );
  // Prefer female-sounding names (common Italian female voice names across OS/browsers)
  const femalePattern = /female|donna|alice|elsa|federica|paola|carla|silvia|isabella/i;
  const female = italian.find((v) => femalePattern.test(v.name));
  cachedVoice = female || italian[0] || false;
  return cachedVoice || null;
}

/**
 * Speak a single phrase. Returns a promise that resolves when done.
 * Cancels any pending utterance before speaking.
 */
export function speak(text, { onEnd, onError } = {}) {
  if (!isSupported() || !text) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'it-IT';
  utter.rate = 0.95;

  // Voice assignment is async — but utterance can still be queued, voice applied on speak
  getItalianVoice().then((voice) => {
    if (voice) utter.voice = voice;
  });

  utter.onend = () => onEnd?.();
  utter.onerror = (e) => {
    onError?.(e);
    onEnd?.();
  };
  synth.speak(utter);
}

export function cancel() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
}
