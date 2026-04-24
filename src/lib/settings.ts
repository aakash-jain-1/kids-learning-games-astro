// Unified settings store (fixes audit H1).
// One LocalStorage key for dark mode, sound, auto-speak, and font size.
// Applies on every page on load, syncs across all games.

export type FontSize = 'small' | 'medium' | 'large';

export interface KidsSettings {
  dark: boolean;
  sound: boolean;
  autoSpeak: boolean;
  fontSize: FontSize;
}

export const SETTINGS_KEY = 'kids_settings_v1';

export const DEFAULT_SETTINGS: KidsSettings = {
  dark: false,
  sound: true,
  autoSpeak: false,
  fontSize: 'medium',
};

export function getSettings(): KidsSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<KidsSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<KidsSettings>): KidsSettings {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // storage full or disabled — fall back to in-memory for this session
  }
  applySettings(next);
  window.dispatchEvent(new CustomEvent<KidsSettings>('kids-settings-change', { detail: next }));
  return next;
}

export function applySettings(s: KidsSettings): void {
  const body = document.body;
  body.classList.toggle('dark-mode', s.dark);
  body.classList.remove('font-small', 'font-medium', 'font-large');
  body.classList.add(`font-${s.fontSize}`);

  const togDark = document.getElementById('togDark') as HTMLInputElement | null;
  const togSound = document.getElementById('togSound') as HTMLInputElement | null;
  const togSpeak = document.getElementById('togSpeak') as HTMLInputElement | null;
  if (togDark) togDark.checked = s.dark;
  if (togSound) togSound.checked = s.sound;
  if (togSpeak) togSpeak.checked = s.autoSpeak;

  document.querySelectorAll<HTMLElement>('.font-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === s.fontSize);
  });
}

export function initSettings(): KidsSettings {
  const s = getSettings();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applySettings(s), { once: true });
  } else {
    applySettings(s);
  }
  return s;
}
