// Web Speech API wrapper, centralised so settings (auto-speak, future language
// preferences) live in one place.

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  onEnd?: () => void;
}

/**
 * Chrome wedges its speech queue when `speak()` runs in the same task as a
 * `cancel()`: the new utterance never fires `start`, `speaking` reports
 * `true`, and **no audio is produced**. Letting the cancel settle on a later
 * task avoids it. Measured on Chrome 147 / macOS, 2026-08-17.
 */
const CANCEL_SETTLE_MS = 120;

/** Timer for an utterance deferred behind a `cancel()`, so it can be dropped. */
let pendingSpeak: number | null = null;

function clearPendingSpeak(): void {
  if (pendingSpeak === null) return;
  window.clearTimeout(pendingSpeak);
  pendingSpeak = null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  clearPendingSpeak();
  window.speechSynthesis.cancel();
}

/**
 * Run `speakIntro` on the first user gesture.
 *
 * Browsers block `speechSynthesis` until the page has been interacted with,
 * so every round-based game defers its opening narration to the first
 * tap/keypress instead of speaking on load.
 *
 * The gesture that unblocks speech is usually also a *play* action — a tap on
 * an answer tile or a replay button, whose own handler narrates. Speaking the
 * intro as well would hand the synth two utterances for one gesture and the
 * second would cut off the first, so the intro is skipped when the gesture
 * landed on an interactive control rather than inert page chrome.
 */
export function onFirstGesture(speakIntro: () => void): void {
  if (typeof document === 'undefined') return;
  let fired = false;
  const handler = (ev: Event): void => {
    if (fired) return;
    fired = true;
    const target = ev.target;
    if (target instanceof Element && target.closest('button, a, [role="button"], input, label')) {
      return;
    }
    requestAnimationFrame(speakIntro);
  };
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported()) return;
  const synth = window.speechSynthesis;

  // A queued-but-not-yet-started utterance is now stale — drop it rather
  // than letting it speak over the caller's new phrase.
  clearPendingSpeak();

  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = opts.rate ?? 0.9;
  utt.pitch = opts.pitch ?? 1.1;
  if (opts.lang) utt.lang = opts.lang;
  if (opts.onEnd) utt.onend = opts.onEnd;

  // Only cancel when something is actually in flight; an unconditional
  // cancel on an idle synth is what used to trigger the wedge above.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    pendingSpeak = window.setTimeout(() => {
      pendingSpeak = null;
      synth.speak(utt);
    }, CANCEL_SETTLE_MS);
    return;
  }

  synth.speak(utt);
}
