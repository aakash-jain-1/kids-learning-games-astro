/**
 * Data for the Counting Friends game — first preschool-math game in the
 * Astro project, targeting age 3.
 *
 * Pedagogy primitives this file encodes:
 * - **Counting-all**: every round shows two visible groups (Group A + Group B);
 *   the child is expected to count *all* objects from 1, not count-on from
 *   the first group. Counting-on is age 4–5.
 * - **Subitize-sized addends**: a, b ∈ {1..4}, sum ≤ 5. Subitizing is
 *   reliable up to 3 (sometimes 4) at this age, and the five-frame is the
 *   right anchor for sums ≤ 5.
 * - **Story-context pairs**: each round has a themed scene ("ducks swim",
 *   "apples on a tree") so the addition has narrative/working-memory
 *   support. 2025 RCTs (Springer, *Educational Studies in Mathematics*)
 *   show this beats abstract `2 + 3` framings for 3–4yos.
 * - **Errorless answer pool**: the 3 numeral options are always
 *   `[sum-1, sum, sum+1]` shuffled. Distractors are by-1 (close enough to
 *   teach numerical proximity, far enough to be detectable when the child
 *   counts).
 *
 * No `QuizQuestion[]` export here — `lib/quiz.ts`'s 4-option text-question
 * shape doesn't fit a 3yo. Stats panel uses the same `QuizState`
 * persistence helpers (`loadQuizState` / `saveQuizState`) so parent-facing
 * metrics stay consistent across all 14 games, but the in-page flow is
 * its own tiny controller.
 */

// The theme catalog lived inline here from 2026-05-15 (Counting Friends ship)
// through 2026-05-18 (More Friends ship). It was extracted to
// `src/lib/preschool-themes.ts` when the second preschool-math game shipped,
// per the project's "refactor on second consumer" rule. The re-exports
// below keep existing imports — `import { THEMES, ... } from '@/data/addition'`
// — working unchanged on the Counting Friends page.

import {
  THEMES as _THEMES,
  THEME_BY_KEY as _THEME_BY_KEY,
  type PreschoolTheme,
  type ThemeMeta as _ThemeMeta,
  numberWord as _numberWord,
  cap as _cap,
  nounFor as _nounFor,
} from '@/lib/preschool-themes';
import {
  type StageId,
  themesForStage,
  clampStage,
} from '@/lib/preschool-stages';

export type { StageId };

/** Alias of `PreschoolTheme` from `@/lib/preschool-themes`. Kept here
 *  so the Counting Friends page (`counting-friends-game.astro`) keeps
 *  importing `AdditionTheme` from this module unchanged. New code in
 *  other preschool-math games should import `PreschoolTheme` from the
 *  lib directly. */
export type AdditionTheme = PreschoolTheme;
export type ThemeMeta = _ThemeMeta;
export const THEMES = _THEMES;
export const THEME_BY_KEY = _THEME_BY_KEY;

/**
 * One round of play: two groups of `theme` objects, sized `a` and `b`,
 * with the question "how many in all?" answered by tapping one of three
 * numeral buttons.
 */
export interface Round {
  /** Size of Group A (left side of the scene). 1..6 (depends on stage). */
  readonly a: number;
  /** Size of Group B (right side of the scene). 1..6 (depends on stage). */
  readonly b: number;
  /** Pre-computed `a + b`. 2..5 at Stage 1, up to 10 at Stage 2+. */
  readonly sum: number;
  /** Theme rotated per round — drives the scene background + emoji. */
  readonly theme: AdditionTheme;
  /**
   * The 3 numerals shown as answer buttons, in display order. Always a
   * shuffled `[sum-1, sum, sum+1]` (so distractors are by-1; close enough
   * to teach numerical proximity, far enough to be detectable when the
   * child actually counts).
   */
  readonly options: readonly [number, number, number];
}

/**
 * Pair pool keyed by sum. For each target sum we list every two-addend
 * combination in {1..4}² that lands on it. The session generator picks
 * one pair per round at random.
 *
 * Note that sum=3 → [1+2, 2+1] are kept as separate pairs even though
 * they're commutative — children at this age don't yet generalise
 * commutativity, so showing both is deliberate exposure (the visual
 * "2 ducks then 1 more" vs "1 duck then 2 more" rounds feel different
 * to the child even though we know they're algebraically the same).
 */
const PAIRS_BY_SUM: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  2: [[1, 1]],
  3: [[1, 2], [2, 1]],
  4: [[1, 3], [2, 2], [3, 1]],
  5: [[1, 4], [2, 3], [3, 2], [4, 1]],
  // Sums 6-10 unlock at Stage 2 (ten-frame). Individual addends are
  // capped at 6 so a single group never renders more than 6 emoji —
  // the *total* reaches 10, but each group stays comfortably
  // tap-to-countable on a phone.
  6: [[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]],
  7: [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]],
  8: [[2, 6], [3, 5], [4, 4], [5, 3], [6, 2]],
  9: [[3, 6], [4, 5], [5, 4], [6, 3]],
  10: [[4, 6], [5, 5], [6, 4]],
};

/**
 * Frequency-weighted target-sum sequence per stage.
 *
 * - **Stage 1** (8 rounds, sums <=5): the original (1x, 2x, 2x, 3x)
 *   distribution for (2, 3, 4, 5). Heavier on sum=5 (top of the
 *   five-frame); sum=2 only once (subitize-only floor, boring in
 *   repetition). PRESERVED VERBATIM so Stage 1 == today.
 * - **Stage 2** (10 rounds, sums <=10): a gentle ramp across the new
 *   range so the child meets every band on the way up to the
 *   ten-frame ceiling.
 * - **Stage 3** (12 rounds, sums <=10): weighted toward the larger
 *   sums (6-10) where counting-all really stretches.
 */
const SUM_PLAN_BY_STAGE: Readonly<Record<StageId, readonly number[]>> = {
  1: [2, 3, 3, 4, 4, 5, 5, 5],
  2: [2, 3, 4, 5, 6, 6, 7, 8, 9, 10],
  3: [4, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10],
};

/** Produce a length-3 tuple `[sum-1, sum, sum+1]` shuffled in place. */
const buildOptions = (sum: number, rand: () => number): readonly [number, number, number] => {
  const pool: number[] = [sum - 1, sum, sum + 1];
  // Fisher–Yates on a fixed length-3 array. Tiny, deterministic, no allocation churn.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return [pool[0]!, pool[1]!, pool[2]!];
};

/** Pick a random element from `xs` using `rand`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T => xs[Math.floor(rand() * xs.length)]!;

/**
 * Generate a fresh session for `stage` (defaults to Stage 1, so every
 * existing caller — including the SSR seed in
 * `counting-friends-game.astro` — behaves exactly as before).
 *
 * - Sum sequence is the stage's plan, shuffled so the same child
 *   playing twice in a row doesn't see identical plans. Session length
 *   = the plan length (8 / 10 / 12 for stages 1 / 2 / 3).
 * - Themes rotate with a "no two in a row" rule, drawn from the stage's
 *   theme pool (4 themes at Stage 1, all 6 at Stage 2+).
 * - Pair within a sum is picked uniformly from the options for that sum.
 * - Options are shuffled `[sum-1, sum, sum+1]` (unchanged — the digit is
 *   the primary cue; the dot-frame maxes out at `frameSize`).
 *
 * `rand` is injectable so tests can pin to a deterministic sequence.
 */
export const generateSession = (
  rand: () => number = Math.random,
  stage: StageId = 1,
): Round[] => {
  const sums: number[] = [...SUM_PLAN_BY_STAGE[stage]];
  // Shuffle the sum plan in place.
  for (let i = sums.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = sums[i]!;
    sums[i] = sums[j]!;
    sums[j] = tmp;
  }

  const themePool = themesForStage(stage);
  const rounds: Round[] = [];
  let prevTheme: AdditionTheme | null = null;

  for (const sum of sums) {
    const [a, b] = pick(PAIRS_BY_SUM[sum]!, rand);

    // Pick a theme not equal to the previous one (when feasible). With
    // >=4 themes the "no repeat" constraint never deadlocks.
    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? themePool : themePool.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({
      a,
      b,
      sum,
      theme,
      options: buildOptions(sum, rand),
    });
  }

  return rounds;
};

/**
 * Build the narration script for one round. Returned as a tagged
 * sequence of phases so the page script can pace each phase against
 * its visual cue (group fly-in, count animation, etc.) rather than
 * speaking the entire script in one TTS utterance.
 *
 * Phases:
 *   - `intro` — Group A reveal: "Look! Two ducks are swimming."
 *   - `addition` — Group B reveal: "Then three more ducks come!"
 *   - `question` — Prompt: "How many ducks in all?"
 *   - `correct` — Right-answer celebration: "Yes! Five! Two and three make five!"
 *   - `rerun` — Wrong-answer guided count intro: "Let's count them together!"
 *   - `rerunDone` — End of guided count: "Five ducks!"
 */
export type NarrationPhase =
  | 'intro'
  | 'addition'
  | 'question'
  | 'correct'
  | 'rerun'
  | 'rerunDone';

export interface RoundNarration {
  readonly intro: string;
  readonly addition: string;
  readonly question: string;
  readonly correct: string;
  readonly rerun: string;
  readonly rerunDone: string;
}

// numberWord / cap / nounFor moved to `@/lib/preschool-themes` on
// 2026-05-18 (More Friends ship) — they're useful to every preschool-
// math game, not just addition. Aliased to local consts here so the
// existing buildNarration body doesn't need to be edited.
const numberWord = _numberWord;
const cap = _cap;
const nounFor = _nounFor;

export const buildNarration = (round: Round): RoundNarration => {
  const theme = THEME_BY_KEY[round.theme];
  const aWord = numberWord(round.a);
  const bWord = numberWord(round.b);
  const sumWord = numberWord(round.sum);
  const aNoun = nounFor(round.a, theme);
  const bNoun = nounFor(round.b, theme);
  const sumNoun = theme.plural;

  return {
    intro: `Look! ${cap(aWord)} ${aNoun} ${theme.verbPhrase}.`,
    addition: `Then ${bWord} more ${bNoun} come!`,
    question: `How many ${sumNoun} in all?`,
    correct: `Yes! ${cap(sumWord)} ${sumNoun}! ${cap(aWord)} and ${bWord} make ${sumWord}.`,
    rerun: `Let's count them together!`,
    rerunDone: `${cap(sumWord)} ${sumNoun}! ${cap(aWord)} and ${bWord} make ${sumWord}.`,
  };
};

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'counting_friends_stats_v1';

export interface AdditionStats {
  /** Total sessions completed (a full stage-length round set). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right numeral first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
  /** Current stage the child is on (1..3). Defaults to 1 for pre-stage saves. */
  readonly stage: StageId;
  /** Highest stage ever reached (1..3) — the high-water mark for the parent dashboard. */
  readonly bestStage: StageId;
}

const ZERO_STATS: AdditionStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
  stage: 1,
  bestStage: 1,
};

export const loadAdditionStats = (): AdditionStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<AdditionStats>;
    const stage = typeof p.stage === 'number' ? clampStage(p.stage) : 1;
    const bestStage = typeof p.bestStage === 'number' ? clampStage(p.bestStage) : stage;
    return {
      sessions: typeof p.sessions === 'number' ? p.sessions : 0,
      rounds: typeof p.rounds === 'number' ? p.rounds : 0,
      correctFirstTry: typeof p.correctFirstTry === 'number' ? p.correctFirstTry : 0,
      lastPlayed: typeof p.lastPlayed === 'string' ? p.lastPlayed : '',
      stage,
      bestStage: clampStage(Math.max(stage, bestStage)),
    };
  } catch {
    return ZERO_STATS;
  }
};

export const saveAdditionStats = (s: AdditionStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
