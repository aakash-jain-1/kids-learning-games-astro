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
 *   This is also what bounds the game's content, and it's worth being
 *   precise about the consequence: the askable questions are "what comes
 *   after X" for X = Sunday..Friday, i.e. **six**, with Sunday itself
 *   unaskable because nothing in-week precedes it. Sunday is still on
 *   screen constantly — it opens most runs and appears as an option — it
 *   simply can't be the answer until the game teaches the wrap.
 *
 * - **Errorless wrong tap.** A wrong option gets a 250ms kinesthetic
 *   shake (no colour shift, no buzzer), then a gentle "let's sing the
 *   days" walk over the shown run, then the correct day is revealed and
 *   the slot fills. No penalty, no red X — same age-safe principle as
 *   the rest of the preschool family.
 *
 * - **A run is every day it can ask for** (changed 2026-08-22 under
 *   CONTEXT.md §5 rule 11). Six rounds: Monday through Saturday, each the
 *   answer exactly once, tiered so difficulty climbs. This one *shortens*
 *   the game — the old plan was eight rounds — and it's still the right
 *   trade, because those eight rounds picked a random start each time, so
 *   a sitting could ask "what comes after Sunday" three times and never
 *   once ask about Friday. Coverage of a seven-item list was left to
 *   chance in a game whose entire subject is that list.
 *
 * - **Run length is decided by the target, not drawn.** The days shown
 *   before the "?" are simply as much of the week as fits, up to the
 *   tier's ceiling (2 / 3 / 4). Early days therefore get short runs and
 *   late days get long ones, which is the difficulty gradient the old plan
 *   was approximating with random starts. Monday gets a one-card run —
 *   "Sunday… what comes next?" — which is the first line of the song and
 *   the easiest question in the game, so it opens the run.
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
import { WRONG_LEAD, rightLead } from '@/data/preschool-narration';

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
  /** Consecutive day indices shown before the "?" slot (length 1..4). */
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

// ── Tier progression ───────────────────────────────────────────────

/**
 * The askable days, grouped into tiers and played in this order. Every
 * day the game *can* ask for is here exactly once; Sunday is absent
 * because nothing in-week precedes it (see the header note on wrap).
 *
 * The tiers double as the difficulty gradient, because how much week a
 * round can show is fixed by which day it asks for — Monday can only ever
 * show Sunday, Saturday can show four days.
 */
const TIER_1_TARGETS: readonly number[] = [1, 2]; // Monday, Tuesday
const TIER_2_TARGETS: readonly number[] = [3, 4]; // Wednesday, Thursday
const TIER_3_TARGETS: readonly number[] = [5, 6]; // Friday, Saturday

const TIERS: ReadonlyArray<readonly number[]> = [
  TIER_1_TARGETS,
  TIER_2_TARGETS,
  TIER_3_TARGETS,
];

/** How much of the week a round may show before the "?", per tier. */
const RUN_LENGTH_CAP: readonly number[] = [2, 3, 4];

/**
 * Rounds in one full run — 6, one per askable day.
 *
 * Derived from the tiers so teaching the Saturday→Sunday wrap later (which
 * would add Sunday as a seventh target) lengthens the run on its own.
 */
export const TOTAL_ROUNDS = TIERS.reduce((n, tier) => n + tier.length, 0);

// Every askable day appears in exactly one tier. Asserted at module load:
// "you found every day" is only true if the tiers partition Mon..Sat, and
// a typo would otherwise quietly drop a day or ask for one twice.
(() => {
  const flat = TIERS.flat();
  if (new Set(flat).size !== flat.length) {
    throw new Error('week-friends: a day appears in more than one tier');
  }
  const askable = DAYS.map((d) => d.index).filter((i) => i >= 1);
  const missing = askable.filter((i) => !flat.includes(i));
  if (missing.length > 0) {
    throw new Error(
      `week-friends: days missing from the tiers: ${missing.map((i) => lookupDay(i).name).join(', ')}`,
    );
  }
})();

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

// ── Run generation ─────────────────────────────────────────────────

/**
 * Generate a fresh run — every askable day, once each.
 *
 * - Tiers play in order; the two days within a tier are shuffled, so the
 *   gradient is fixed but the answers never march Mon, Tue, Wed…, which a
 *   child could recite straight off the song without looking at the cards.
 * - The shown run is the days immediately before the target, as many as
 *   the tier allows and the week can supply: `[target - L .. target - 1]`.
 *   No wrap, by construction.
 * - Options = the target + two distractors (adjacency-biased on the
 *   hardest tier), shuffled into display order.
 * - Themes rotate with a "no two in a row" rule, like the rest of the
 *   preschool family.
 *
 * `rand` is injectable so tests + the SSR seed can pin a deterministic
 * sequence; default uses `Math.random`.
 */
export const generateRun = (rand: () => number = Math.random): DayRound[] => {
  const rounds: DayRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  TIERS.forEach((tierPool, tierIndex) => {
    const tier = tierIndex as 0 | 1 | 2;
    const adjacent = tier === 2;

    for (const target of shuffleInPlace([...tierPool], rand)) {
      // As much week as the tier allows, bounded by what precedes the
      // target — Monday can only ever show Sunday.
      const L = Math.min(RUN_LENGTH_CAP[tier]!, target);
      const run: number[] = [];
      for (let i = target - L; i < target; i++) run.push(i);

      const [d1, d2] = pickDistractors(target, adjacent, rand);
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

      rounds.push({ run, target, options, correctIndex, tier, theme });
    }
  });

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

/**
 * Narration script for one round (mirrors Pattern Sequences' shape):
 *   - `intro` — "Sunday, Monday… what day comes next?"
 *   - `correct` — "Yes! Tuesday comes after Monday!"
 *   - `rerun` — wrong-tap intro: "Not that one. Let's sing the days."
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
    correct: `${rightLead(targetName)} ${targetName} comes after ${lastShown}!`,
    rerun: `${WRONG_LEAD} Let's sing the days.`,
    reveal: `${targetName}! ${targetName} comes after ${lastShown}.`,
    dayWord: (index: number): string => lookupDay(index).name,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'week_friends_stats_v1';

export interface WeekFriendsStats {
  /**
   * Completed runs through every askable day. Named `sessions` because
   * the on-disk shape is shared across every preschool game; it counted
   * 8-round sessions before 2026-08-22.
   */
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
