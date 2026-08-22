// Playback for vendored audio clips (real recordings), as opposed to the
// synthesised tones in `audio.ts` and the text-to-speech in `speech.ts`.
//
// Added 2026-08-17 for Animal Sounds, whose prompts are real animal calls.
// Kept deliberately small and generic so any future game that needs a short
// recorded sample (recorded narration, instrument sounds) can reuse it.
//
// Every path here has to degrade gracefully: a clip can 404, fail to decode,
// or be blocked by the autoplay policy, and a preschool game must still be
// playable when it does. So `playClip` reports failure through `onError`
// rather than throwing, and callers fall back to speech.

import { getSettings } from './settings';

/**
 * Where vendored clips live, relative to the site base.
 *
 * `BASE_URL` may or may not carry a trailing slash depending on how `base` is
 * written in `astro.config.mjs`, so normalise it the same way `index.astro`
 * and `GameNav.astro` do. Concatenating it blind produced
 * `/kids-learning-games-astrosounds/...`, and every clip failed to load.
 */
const BASE = import.meta.env.BASE_URL;
const CLIP_BASE = `${BASE}${BASE.endsWith('/') ? '' : '/'}sounds/`;

/**
 * Cache of `HTMLAudioElement`s by URL. Reusing one element per clip means a
 * replayed prompt is instant and the browser only fetches each file once.
 */
const cache = new Map<string, HTMLAudioElement>();

/** The clip currently playing, so a new prompt can cut off the old one. */
let current: HTMLAudioElement | null = null;

/**
 * Detaches the in-flight `playClip` call's listeners without running its
 * callbacks.
 *
 * Elements are cached and reused, so listeners left on an interrupted clip
 * are not inert — they fire the next time that same clip reaches `ended`,
 * running an abandoned round's `onEnd` alongside the current one. In Animal
 * Sounds that surfaced as the previous prompt's narration speaking over the
 * guided correction (each `speak()` cancelling the last), which reads as the
 * audio playing wrongly. Interrupting is deliberate, so neither `onEnd` nor
 * `onError` should fire — the caller has already moved on.
 */
let abortCurrent: (() => void) | null = null;

/** Resolve a clip path (e.g. `animals/cow.mp3`) to a full URL. */
export function clipUrl(path: string): string {
  return CLIP_BASE + path;
}

function element(url: string): HTMLAudioElement {
  let el = cache.get(url);
  if (!el) {
    el = new Audio(url);
    el.preload = 'auto';
    cache.set(url, el);
  }
  return el;
}

/**
 * Warm the cache so the first prompt doesn't wait on the network. Safe to
 * call on every page load — the service worker serves these from precache
 * after the first visit.
 */
export function preloadClips(paths: readonly string[]): void {
  if (typeof Audio === 'undefined') return;
  for (const p of paths) {
    try {
      element(clipUrl(p)).load();
    } catch {
      // A failed preload is not worth reporting; playback retries anyway.
    }
  }
}

/** Stop whatever clip is playing and rewind it for next time. */
export function stopClip(): void {
  abortCurrent?.();
  if (!current) return;
  try {
    current.pause();
    current.currentTime = 0;
  } catch {
    // Pausing a not-yet-loaded element can throw; nothing to recover.
  }
  current = null;
}

export interface PlayClipOptions {
  /** Called once when the clip finishes playing. */
  onEnd?: () => void;
  /** Called if the clip can't be played at all, so callers can fall back. */
  onError?: () => void;
}

/**
 * Play a clip by path (e.g. `animals/cow.mp3`).
 *
 * Respects the shared sound setting. When sound is off, or playback fails,
 * `onError` fires so the caller can fall back to speech — `onEnd` is only
 * for a clip that actually played.
 */
export function playClip(path: string, opts: PlayClipOptions = {}): void {
  const { onEnd, onError } = opts;

  if (typeof Audio === 'undefined' || !getSettings().sound) {
    onError?.();
    return;
  }

  stopClip();

  const el = element(clipUrl(path));
  let settled = false;
  const detach = (): void => {
    settled = true;
    el.removeEventListener('ended', onEnded);
    el.removeEventListener('error', onFailed);
    if (abortCurrent === detach) abortCurrent = null;
  };
  const finish = (ok: boolean): void => {
    if (settled) return;
    detach();
    if (current === el) current = null;
    if (ok) onEnd?.();
    else onError?.();
  };
  const onEnded = (): void => finish(true);
  const onFailed = (): void => finish(false);

  el.addEventListener('ended', onEnded);
  el.addEventListener('error', onFailed);
  abortCurrent = detach;

  try {
    el.currentTime = 0;
  } catch {
    // Seeking before metadata arrives can throw; playback still starts at 0.
  }

  current = el;
  const started = el.play();
  // Older browsers return undefined instead of a promise.
  if (started && typeof started.catch === 'function') {
    started.catch(() => finish(false));
  }
}

/**
 * Length of a cached clip in seconds, or `null` if not known yet. Callers
 * that chain narration after a clip use this to size a watchdog.
 */
export function clipDuration(path: string): number | null {
  const el = cache.get(clipUrl(path));
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return null;
  return el.duration;
}
