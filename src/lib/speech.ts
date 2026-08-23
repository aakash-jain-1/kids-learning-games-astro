// Web Speech API wrapper, centralised so settings (auto-speak, future language
// preferences) live in one place.

import { getSettings } from '@/lib/settings';

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

export interface FirstGestureOptions {
  /**
   * Selector for this game's answer options.
   *
   * The first tap that lands on one is swallowed and turned into the spoken
   * question, instead of being judged as an answer. See below for why.
   */
  asksFirst?: string;
}

/**
 * Run `speakIntro` on the first user gesture.
 *
 * Browsers block `speechSynthesis` until the page has been interacted with,
 * so every round-based game defers its opening narration to the first
 * tap/keypress instead of speaking on load.
 *
 * ── Why the first tap on an answer is swallowed ──
 *
 * This used to skip the intro whenever the gesture landed on any interactive
 * control, reasoning that the control's own handler narrates anyway. That is
 * true of a replay button. It is *not* true of an answer tile, and answer
 * tiles are what a child taps first, because they are the big colourful
 * things in the middle of the screen.
 *
 * The result, measured across nine games on 2026-08-23, was that the opening
 * question was never spoken at all. The child saw an unreadable caption, tapped
 * something, and the first words they heard were the correction:
 *
 *     first touch on a tile        -> "Hmm! Let's listen again."
 *     first touch on empty page    -> "Listen! Who makes that sound?"
 *
 * So round one was unanswerable by design for a pre-reader — they were asked
 * to answer a question nobody had asked yet.
 *
 * Now the first tap on an answer asks the question instead. The tap is
 * consumed (capture phase, so the game's own handler never sees it) and the
 * intro is spoken. The child's *next* tap is a real answer, made knowing what
 * was asked. Taps on other controls behave exactly as before.
 *
 * Nothing is swallowed when narration would be silent anyway — sound off, or
 * no speech support — because then the tap would be lost for nothing.
 */
export function onFirstGesture(speakIntro: () => void, opts: FirstGestureOptions = {}): void {
  if (typeof document === 'undefined') return;

  const optionSel = opts.asksFirst;
  let done = false;

  const finish = (speakNow: boolean): void => {
    if (done) return;
    done = true;
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
    document.removeEventListener('click', onAnswerClick, true);
    if (speakNow) requestAnimationFrame(speakIntro);
  };

  const isAnswer = (target: EventTarget | null): boolean =>
    !!optionSel && target instanceof Element && !!target.closest(optionSel);

  /**
   * Capture phase on `document`, so this runs before the option's own
   * listener and can stop the event reaching it.
   */
  const onAnswerClick = (ev: MouseEvent): void => {
    if (done || !isAnswer(ev.target)) return;
    if (!isSpeechSupported() || !getSettings().sound) {
      finish(false);
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    finish(true);
  };

  const onGesture = (ev: Event): void => {
    if (done) return;
    // Answers are handled by the click above — a pointerdown on one must not
    // consume the first-gesture slot, or the swallow never happens.
    if (isAnswer(ev.target)) return;
    const target = ev.target;
    if (target instanceof Element && target.closest('button, a, [role="button"], input, label')) {
      finish(false);
      return;
    }
    finish(true);
  };

  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);
  document.addEventListener('click', onAnswerClick, true);
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
