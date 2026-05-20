/**
 * Per-game learning state — `kids_progress_v1:<gameId>` LocalStorage
 * helper. Extracted from `alphabets-game.astro` once Numbers became the
 * second consumer (refactor trigger documented in PROGRESS.md → rule
 * #3 / "Codified during the Alphabets port" block).
 *
 * Storage shape per game: a sorted JSON array of stable string ids
 * identifying the items the child has interacted with (e.g.
 * `["A","B","C"]` for alphabets; `["1","2","3"]` for numbers).
 *
 * Reads are fault-tolerant — any parse error or a missing key resets
 * to an empty `Set<string>`. Writes silently swallow quota / private-
 * mode errors so progress tracking never blocks gameplay.
 *
 * Convention: callers convert their per-game ids (string letters,
 * numeric digits, etc.) to `string` before passing into this module so
 * the storage shape stays uniform across games.
 *
 * Retention instrumentation (T-retention, 2026-05-20): every
 * successful `saveLearned` also calls `recordPlay(gameId)` from
 * `@/lib/retention` so the sitewide `/stats` activity chart picks
 * up card-set play even when the child doesn't open or finish the
 * quiz. The recordPlay call is intentionally placed at the
 * `saveLearned` level (one site) rather than per-tile-tap callsite
 * (7 grid + 4 card-pure pages) so adding retention to a 17th game
 * is automatic. Recording fails silently in SSR / private-mode
 * contexts — same convention as `saveLearned` itself.
 */

import { recordPlay } from '@/lib/retention';

const KEY_PREFIX = 'kids_progress_v1:';

const keyFor = (gameId: string): string => `${KEY_PREFIX}${gameId}`;

/**
 * Load the learned set for a game. Returns an empty `Set<string>` on
 * any parse / quota / unsupported-environment error.
 */
export const loadLearned = (gameId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(keyFor(gameId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
};

/**
 * Persist the learned set for a game. Sorts ids alphabetically so the
 * stored representation is stable across loads (handy for diffing in
 * dev tools and for cross-device sync if we ever add it).
 */
export const saveLearned = (gameId: string, learned: Set<string>): void => {
  try {
    localStorage.setItem(
      keyFor(gameId),
      JSON.stringify([...learned].sort()),
    );
    recordPlay(gameId);
  } catch {
    /* Storage quota / private mode — silently continue. */
  }
};

/** Convenience: clear a game's learned set (used by "Start Over"). */
export const clearLearned = (gameId: string): void => {
  try {
    localStorage.removeItem(keyFor(gameId));
  } catch {
    /* noop */
  }
};
