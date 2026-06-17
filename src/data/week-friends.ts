/**
 * Data for the Week Friends game — second preschool-COGNITIVE game in
 * the Astro project (added 2026-06-17), targeting age 3-4. Teaches the
 * days of the week as an ordered sequence, sister to Sorting Friends in
 * the cognitive family (sorting + sequencing are both pre-academic
 * THINKING skills, distinct from math and literacy).
 *
 * ── Pedagogy primitives ────────────────────────────────────────────
 *
 * - **Days of the week is a rote SEQUENCE skill first.** The recognized
 *   early-learning guidance (and every preschool classroom) treats the
 *   week the way it treats counting: a fixed ordered list learned
 *   through song + repetition + visual order, long before the abstract
 *   "yesterday / today / tomorrow" relations land (~age 4-5). So the
 *   core task here is **"what day comes next?"** — extract the order
 *   from a run of consecutive days and project it forward. This is the
 *   exact mechanic the proven Pattern Sequences controller uses, applied
 *   to real day content with the days-of-the-week song as the anchor.
 *
 * - **Sunday-first.** Matches the ubiquitous preschool "Days of the
 *   Week" song (sung to the Addams Family tune: "Sunday, Monday,
 *   Tuesday…") and the JS `Date.getDay()` convention (0 = Sunday), so
 *   the index doubles as the calendar position.
 *
 * - **No week wrap.** A round shows a consecutive run that stays WITHIN
 *   the week (Sun→Sat) and asks for the next day, never wrapping
 *   Saturday→Sunday. Cyclic "after Saturday comes Sunday" is a harder,
 *   later concept; keeping runs in-week keeps the answer unambiguous for
 *   a 3yo (which is what makes the errorless flow honest).
 *
 * - **Errorless wrong tap.** A wrong option gets a 250ms kinesthetic
 *   shake (no colour shift, no buzzer), then a gentle "let's sing the
 *   days" walk over the shown run, then the correct day is revealed and
 *   the slot fills. No penalty, no red X — same age-safe principle as
 *   the rest of the preschool family.
 *
 * - **Tiered, 8 rounds.** Difficulty rises across the session: short
 *   runs from the start of the week first, then longer runs starting
 *   mid-week, then the longest runs with adjacent-day distractors (the
 *   day right before/after the target) for a closer discrimination.
 *
 * Stats schema is bespoke (`week_friends_stats_v1`) but identical in
 * shape to Sorting / Letter / Sound Friends — `{ sessions, rounds,
 * correctFirstTry, lastPlayed }` (no stages; the staged maxN system is
 * math-specific) — so the registry's `preschoolStatsEntry` factory takes
 * it with zero shape changes.
 *
 * Theme catalog is shared with the rest of the preschool family via
 * `@/lib/preschool-themes`; themes drive the background ambience only,
 * the day sequence is theme-independent.
 */

import {
  THEMES,
  THEME_BY_KEY,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';

export type { PreschoolTheme, ThemeMeta };
export { THEMES, THEME_BY_KEY };

// ── Day content ────────────────────────────────────────────────────

/** One day of the week — name + short label + motif emoji + card color.
 *  `index` is the Sunday-first position (0 = Sunday), matching the song
 *  order and `Date.getDay()`. */
export interface DayMeta {
  readonly index: number;
  readonly name: string;
  readonly short: string;
  readonly emoji: string;
  /** Distinct card color (each day reads as its own "friend"). */
  readonly color: string;
}

/** The seven days, Sunday-first. Order === array position === `index`. */
export const DAYS: readonly DayMeta[] = [
  { index: 0, name: 'Sunday', short: 'Sun', emoji: '☀️', color: '#ff7043' },
  { index: 1, name: 'Monday', short: 'Mon', emoji: '🌙', color: '#5c6bc0' },
  { index: 2, name: 'Tuesday', short: 'Tue', emoji: '🌳', color: '#26a69a' },
  { index: 3, name: 'Wednesday', short: 'Wed', emoji: '🐛', color: '#8d6e63' },
  { index: 4, name: 'Thursday', short: 'Thu', emoji: '⛅', color: '#42a5f5' },
  { index: 5, name: 'Friday', short: 'Fri', emoji: '🐟', color: '#26c6da' },
  { index: 6, name: 'Saturday', short: 'Sat', emoji: '🎉', color: '#ab47bc' },
];

export const TOTAL_DAYS = DAYS.length;

/** Lookup by Sunday-first index, clamped to a valid day. */
export const lookupDay = (index: number): DayMeta =>
  DAYS[Math.max(0, Math.min(TOTAL_DAYS - 1, index))]!;

// ── Round shape ────────────────────────────────────────────────────

/**
 * One round: a `run` of consecutive day indices shown left-to-right
 * (e.g. [0,1,2] = Sun, Mon, Tue) ending in a "?" slot, and three day
 * `options`. The child taps the option whose index === `target` (the
 * day that comes after the last day in the run).
 */
export interface DayRound {
  /** Consecutive day indices shown before the "?" slot (length 2..4). */
  readonly run: readonly number[];
  /** The correct next-day index for the "?" slot. */
  readonly target: number;
  /** Three option day-indices, in display order. Exactly one === `target`. */
  readonly options: readonly [number, number, number];
  /** Position (0/1/2) of the correct option in `options`. */
  readonly correctIndex: 0 | 1 | 2;
  /** Difficulty tier (0..2) — drives analytics; not shown to the child. */
  readonly tier: 0 | 1 | 2;
  /** Theme rotated per round — drives the background ambience. */
  readonly theme: PreschoolTheme;
}

interface RoundPlan {
  readonly runLength: 2 | 3 | 4;
  readonly tier: 0 | 1 | 2;
  /** Tier 2: bias distractors toward the target's neighbours (closer call). */
  readonly adjacentDistractors: boolean;
}

/**
 * 8-round plan. Tier 1 (rounds 1-3): short runs, easy distractors.
 * Tier 2 (rounds 4-6): longer runs starting anywhere in the week.
 * Tier 3 (rounds 7-8): longest runs + adjacent-day distractors.
 */
const PLAN: readonly RoundPlan[] = [
  { runLength: 2, tier: 0, adjacentDistractors: false },
  { runLength: 2, tier: 0, adjacentDistractors: false },
  { runLength: 3, tier: 0, adjacentDistractors: false },
  { runLength: 2, tier: 1, adjacentDistractors: false },
  { runLength: 3, tier: 1, adjacentDistractors: false },
  { runLength: 3, tier: 1, adjacentDistractors: true },
  { runLength: 3, tier: 2, adjacentDistractors: true },
  { runLength: 4, tier: 2, adjacentDistractors: true },
];

export const TOTAL_ROUNDS = PLAN.length;

// ── Helpers ────────────────────────────────────────────────────────

const pick = <T>(xs: readonly T[], rand: () => number): T =>
  xs[Math.floor(rand() * xs.length)]!;

const shuffleInPlace = <T>(xs: T[], rand: () => number): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = xs[i]!;
    xs[i] = xs[j]!;
    xs[j] = tmp;
  }
  return xs;
};

const uniq = (xs: readonly number[]): number[] => [...new Set(xs)];

/**
 * Choose two distinct distractor day-indices (neither === target).
 * When `adjacent` is set, the target's in-week neighbours
 * (target±1, target+2) are tried first so the round is a closer
 * discrimination; the remainder is filled from the other days.
 */
const pickDistractors = (
  target: number,
  adjacent: boolean,
  rand: () => number,
): [number, number] => {
  const others = shuffleInPlace(
    DAYS.map((d) => d.index).filter((i) => i !== target),
    rand,
  );

  let ordered: number[];
  if (adjacent) {
    const near = shuffleInPlace(
      uniq([target - 1, target + 1, target + 2]).filter(
        (i) => i >= 0 && i < TOTAL_DAYS && i !== target,
      ),
      rand,
    );
    ordered = uniq([...near, ...others]);
  } else {
    ordered = others;
  }

  return [ordered[0]!, ordered[1]!];
};

// ── Session generation ────────────────────────────────────────────

/**
 * Generate a fresh 8-round session.
 *
 * - Round k draws its plan from `PLAN[k]`: a run length + tier.
 * - A random in-week start `s` is chosen so the run [s .. s+L-1] and
 *   the target `s+L` all stay within Sun(0)..Sat(6) — no week wrap.
 * - Options = the target + two distractors (adjacency-biased on the
 *   hardest tier), shuffled into display order.
 * - Themes rotate with a "no two in a row" rule, like the rest of the
 *   preschool family.
 *
 * `rand` is injectable so tests + the SSR seed can pin a deterministic
 * sequence; default uses `Math.random`.
 */
export const generateSession = (rand: () => number = Math.random): DayRound[] => {
  const rounds: DayRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const plan of PLAN) {
    const L = plan.runLength;
    // Valid starts keep the target (s + L) inside the week.
    const maxStart = TOTAL_DAYS - 1 - L; // target index <= 6
    const start = Math.floor(rand() * (maxStart + 1));
    const run: number[] = [];
    for (let i = 0; i < L; i++) run.push(start + i);
    const target = start + L;

    const [d1, d2] = pickDistractors(target, plan.adjacentDistractors, rand);
    const optionsArr = shuffleInPlace([target, d1, d2], rand);
    const options: readonly [number, number, number] = [
      optionsArr[0]!,
      optionsArr[1]!,
      optionsArr[2]!,
    ];
    const correctIndex = options.indexOf(target) as 0 | 1 | 2;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({ run, target, options, correctIndex, tier: plan.tier, theme });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

/**
 * Narration script for one round (mirrors Pattern Sequences' shape):
 *   - `intro` — "Sunday, Monday… what day comes next?"
 *   - `correct` — "Yes! Tuesday comes after Monday!"
 *   - `rerun` — wrong-tap intro: "Hmm! Let's sing the days."
 *   - `dayWord(i)` — the day name, spoken per item during the guided
 *      run walk on a wrong tap ("Sunday… Monday…").
 *   - `reveal` — "Tuesday! Tuesday comes after Monday."
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly reveal: string;
  readonly dayWord: (index: number) => string;
}

export const buildNarration = (round: DayRound): RoundNarration => {
  const runNames = round.run.map((i) => lookupDay(i).name);
  const lastShown = lookupDay(round.run[round.run.length - 1]!).name;
  const targetName = lookupDay(round.target).name;
  return {
    intro: `${runNames.join(', ')}… what day comes next?`,
    correct: `Yes! ${targetName} comes after ${lastShown}!`,
    rerun: `Hmm! Let's sing the days.`,
    reveal: `${targetName}! ${targetName} comes after ${lastShown}.`,
    dayWord: (index: number): string => lookupDay(index).name,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'week_friends_stats_v1';

export interface WeekFriendsStats {
  /** Total sessions completed (full 8 rounds). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right next-day first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: WeekFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadWeekFriendsStats = (): WeekFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<WeekFriendsStats>;
    return {
      sessions: typeof p.sessions === 'number' ? p.sessions : 0,
      rounds: typeof p.rounds === 'number' ? p.rounds : 0,
      correctFirstTry: typeof p.correctFirstTry === 'number' ? p.correctFirstTry : 0,
      lastPlayed: typeof p.lastPlayed === 'string' ? p.lastPlayed : '',
    };
  } catch {
    return ZERO_STATS;
  }
};

export const saveWeekFriendsStats = (s: WeekFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
