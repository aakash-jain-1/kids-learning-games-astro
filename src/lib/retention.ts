/**
 * Retention instrumentation — sitewide play-history tracking
 * (T-retention, 2026-05-20).
 *
 * **Why a sitewide key, not per-game schema bumps?**
 *
 * Each per-game schema already tracks `lastPlayed` (ISO YYYY-MM-DD
 * string), which is enough to surface "last played: today /
 * yesterday / 3 days ago" on each `/stats` card. The cross-game
 * activity question — *did the child come back this week, and which
 * games did they touch each day?* — is one level up: it's
 * fundamentally a sitewide datapoint, not a per-game one.
 *
 * Adding a `playHistory: readonly string[]` field to all 3
 * preschool-math schemas + the shared quiz schema + the shared
 * learned-set schema would mean:
 *   - 3 schema bumps with new backward-compat defaults in 3 loaders.
 *   - Coordinating writes in 5+ writer call sites.
 *   - A registry that has to iterate every entry's history and
 *     merge the dates to render the chart.
 *
 * A single `kids_play_history_v1` key whose value is
 * `Record<YYYY-MM-DD, string[]>` (date → array of gameIds played
 * that day, deduped) is dramatically simpler:
 *   - One new lib (this file).
 *   - One write call per game writer: `recordPlay(gameId)`.
 *   - One read for the chart: `getPlayHistory()`.
 *   - Per-card "last played" stays exactly where it is —
 *     `lastPlayed` on the existing schemas is unchanged.
 *
 * **Persistence semantics**:
 *
 *   - `recordPlay(gameId)` adds today's gameId to the date bucket
 *     for today, deduped. Calling it 100 times in one round still
 *     results in exactly one entry for that gameId today.
 *   - History is rolling: we keep the last 30 days max. Older
 *     buckets get trimmed on every write to keep storage bounded.
 *   - Per-game `clear()` from the stats registry does NOT remove
 *     entries from the sitewide history (that would erase the
 *     activity calendar when a parent resets one game's stats —
 *     unhelpful and potentially confusing). Only the sitewide
 *     "Reset everything" button removes this key.
 *
 * **What writes call `recordPlay`?**
 *
 *   - The 3 preschool-math `bumpStats` writers (per round).
 *   - `saveQuizState` in `src/lib/quiz.ts` (per quiz completion;
 *     the 13 mountQuiz games inherit this for free).
 *   - `markLearned` in `src/lib/progress.ts` (per tile-tap on
 *     card-set games; ensures we record activity even when the
 *     child doesn't finish the quiz).
 *
 * **What does NOT call `recordPlay`?**
 *
 *   - SSR contexts (typeof localStorage === 'undefined'); we noop.
 *   - Read-only operations like `loadQuizState`. Activity is a
 *     write-side signal.
 *   - Storage failures (private mode, quota exceeded); we noop —
 *     same convention as the rest of the site's localStorage code.
 */

/** Storage key for the sitewide play-history map. */
export const PLAY_HISTORY_KEY = 'kids_play_history_v1';

/** Max days to retain in the rolling window — older buckets are trimmed on every write. */
export const PLAY_HISTORY_MAX_DAYS = 30;

/** Schema: date (YYYY-MM-DD) → array of gameIds played that day (deduped, no order guarantee). */
export type PlayHistory = Readonly<Record<string, readonly string[]>>;

/**
 * Today's date as YYYY-MM-DD in local time.
 *
 * Local time, not UTC, because retention from the parent's
 * perspective tracks "did they play today" relative to the
 * parent's wall clock — a midnight-UTC boundary feels wrong if the
 * child plays at 11pm on what the parent considers Monday but UTC
 * already calls Tuesday.
 *
 * Exported 2026-08-23 so the per-game `lastPlayed` writes can use it too.
 * They were stamping `new Date().toISOString().slice(0, 10)`, i.e. UTC,
 * while `formatLastPlayed` below compares against *this* function — so east
 * of UTC every session before the UTC rollover (00:00–05:30 local in
 * UTC+5:30) rendered as "yesterday" the moment it was played.
 */
export const todayLocal = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * SSR-safe read. Returns an empty map on the server, on parse
 * failure, or when storage is unavailable.
 */
export const getPlayHistory = (): PlayHistory => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PLAY_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    // Defensive parse: each bucket must be an array of strings.
    // Anything else is dropped silently.
    const out: Record<string, readonly string[]> = {};
    for (const [date, ids] of Object.entries(parsed)) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!Array.isArray(ids)) continue;
      const filtered = ids.filter((x): x is string => typeof x === 'string');
      out[date] = filtered;
    }
    return out;
  } catch {
    return {};
  }
};

/**
 * Append `gameId` to today's bucket if not already present, then
 * trim buckets older than `PLAY_HISTORY_MAX_DAYS`.
 *
 * Safe to call repeatedly within a single round — duplicate calls
 * for the same gameId on the same day are noops at the data level.
 */
export const recordPlay = (gameId: string): void => {
  if (typeof localStorage === 'undefined') return;
  const today = todayLocal();
  const history = getPlayHistory();

  const todaysIds = history[today] ?? [];
  if (todaysIds.includes(gameId)) {
    // Already recorded today — nothing to write. Skip the
    // trim work too; it'll happen on the next genuine append.
    return;
  }

  const updated: Record<string, readonly string[]> = {};
  // Re-collect kept dates with their existing buckets.
  // Sort newest-first so the slice is deterministic across
  // browsers (Object.entries iteration order isn't guaranteed
  // across engines for non-integer string keys, though all
  // modern engines preserve insertion order for our shape).
  const allDates = Object.keys(history).sort().reverse();
  for (const d of allDates.slice(0, PLAY_HISTORY_MAX_DAYS)) {
    updated[d] = history[d] ?? [];
  }
  // Now upsert today's bucket.
  updated[today] = [...todaysIds, gameId];

  try {
    localStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    /* storage full / disabled — site convention is silent noop. */
  }
};

/**
 * Clear the sitewide play history. Called by the `/stats` page's
 * "Reset everything" button, NOT by per-game card resets (per
 * the design rationale at the top of this file).
 */
export const clearPlayHistory = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(PLAY_HISTORY_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Format an ISO YYYY-MM-DD date as relative time:
 *
 *   - empty string  → 'never'
 *   - today         → 'today'
 *   - yesterday     → 'yesterday'
 *   - within 7 days → '3 days ago'
 *   - within 14     → 'last week'
 *   - within 30     → '2 weeks ago' / '3 weeks ago'
 *   - older         → the original ISO string (parents who care
 *                     about "exactly when 6 weeks ago" can still see it)
 *
 * Locale-agnostic English for now — matches the rest of the site's
 * copy (caption text in the triad, alert() text in the 13 mountQuiz
 * games). If we ever localise the site, this is a single function
 * to update.
 */
export const fmtRelativeDate = (iso: string): string => {
  if (!iso) return 'never';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const today = todayLocal();
  if (iso === today) return 'today';

  // Diff in days using local-time midnight to avoid DST/timezone
  // off-by-one when the parent's clock is in BST/EST/etc.
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  const [iy, im, id] = iso.split('-').map(Number) as [number, number, number];
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const isoMs = new Date(iy, im - 1, id).getTime();
  const diffDays = Math.round((todayMs - isoMs) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return 'last week';
  if (diffDays >= 14 && diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks ago`;
  }

  // Future dates (clock skew, manual date overrides) and >= 30
  // days old fall back to the raw ISO. Parents who care about
  // "exactly when 6 weeks ago" can still read the date.
  return iso;
};

/**
 * The last `n` calendar days as YYYY-MM-DD strings, oldest first
 * (so the array reads left-to-right as "older → today" — the
 * natural visual order for the activity chart).
 */
export const lastNDays = (n: number): readonly string[] => {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Start from `n - 1` days ago and walk forward to today.
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
};

/**
 * Short weekday label for a YYYY-MM-DD date — 'Mon', 'Tue', ...,
 * 'Sun'. Used for the activity chart's day labels under each
 * column.
 */
export const weekdayShort = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  return NAMES[date.getDay()] ?? '';
};
