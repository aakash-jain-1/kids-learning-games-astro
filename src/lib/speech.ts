// Web Speech API wrapper, centralised so settings (auto-speak, future language
// preferences) live in one place.

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  onEnd?: () => void;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = opts.rate ?? 0.9;
  utt.pitch = opts.pitch ?? 1.1;
  if (opts.lang) utt.lang = opts.lang;
  if (opts.onEnd) utt.onend = opts.onEnd;
  window.speechSynthesis.speak(utt);
}
