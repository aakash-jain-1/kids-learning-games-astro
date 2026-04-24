// Singleton AudioContext (fixes audit M2).
// One shared context across the whole app instead of one per game.

import { getSettings } from './settings';

type AudioCtor = typeof AudioContext;
interface WebkitWindow {
  webkitAudioContext?: AudioCtor;
}

let _ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (_ctx) return _ctx;
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    _ctx = new Ctor();
    return _ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationSec: number, gain = 0.1): void {
  if (!getSettings().sound) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // audio session may have been suspended by the OS; swallow silently
  }
}

export function playCorrect(): void {
  tone(880, 0.15);
}

export function playWrong(): void {
  tone(220, 0.3);
}

export function playTap(): void {
  tone(520, 0.05, 0.06);
}
