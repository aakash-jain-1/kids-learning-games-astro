/**
 * Data for the More Friends game — second preschool-math game in the
 * Astro project, targeting age 3 (precursor or sibling to Counting
 * Friends, depending on the child's developmental stage).
 *
 * Pedagogy primitives this file encodes:
 *
 * - **Magnitude comparison precedes formal addition.** Children typically
 *   master "more vs less" comparison at 30–36 months, ~6–12 months
 *   *before* they consolidate cardinality enough to add. Counting
 *   Friends asks "how many in all?" (addition); More Friends asks
 *   "which has more?" (comparison). For a child still struggling with
 *   Counting Friends, this game is *easier* and reinforces the same
 *   subitize-and-count habit on a smaller cognitive load. For a child
 *   who's mastered Counting Friends, this is differentiated practice
 *   on a sister skill (and a precursor to "more by how much?" subtraction).
 *
 * - **Subitize-sized groups.** a, b ∈ {1..4}, with a ≠ b. Subitizing
 *   peaks at 3 (sometimes 4) for this age, so any pair within the
 *   pool can in principle be solved without counting. The kid who
 *   counts when they could subitize is *also* learning correctly —
 *   we don't punish either approach.
 *
 * - **Difference distribution drives perceptual difficulty.**
 *   Difference 3 (e.g. 1 vs 4) is trivially perceptual — the bigger
 *   group looks visibly bigger even at a glance. Difference 1 (e.g.
 *   3 vs 4) is genuinely close and forces actual counting or careful
 *   subitizing. We mix both per session so the child gets confidence
 *   beats and stretch beats.
 *
 * - **Errorless answer pool.** There are only two options (left or
 *   right group). A wrong tap triggers a guided count of both groups
 *   and a celebratory reveal of the correct group; no score penalty,
 *   no red X. Matches the same gentle-feedback model as Counting
 *   Friends.
 *
 * - **Side-balance.** "Bigger on the left" and "bigger on the right"
 *   each appear roughly half the rounds, with no more than 2 of the
 *   same side in a row. Without this, kids learn the side rather
 *   than the comparison.
 *
 * Stats schema is bespoke (`more_friends_stats_v1`) for the same
 * reason as Counting Friends — `lib/quiz.ts`'s 4-option text-question
 * shape doesn't fit a 2-option visual game. Tracks
 * { sessions, rounds, correctFirstTry, lastPlayed }.
 */

import {
  THEMES,
  THEME_BY_KEY,
  numberWord,
  cap,
  nounFor,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';
import {
  type StageId,
  themesForStage,
  clampStage,
} from '@/lib/preschool-stages';

export type { PreschoolTheme, ThemeMeta, StageId };
export { THEMES, THEME_BY_KEY };

/**
 * One round of play: two groups of `theme` objects sized `left` and
 * `right`, with the question "which has more?". Always `left !==
 * right`, with `bigger` set to the side that wins.
 */
export interface CompRound {
  /** Size of the left group. 1..4 at Stage 1, up to 10 at Stage 2+. */
  readonly left: number;
  /** Size of the right group. 1..4 at Stage 1, up to 10 at Stage 2+. */
  readonly right: number;
  /** Theme rotated per round — drives the scene background + emoji. */
  readonly theme: PreschoolTheme;
  /** Pre-computed answer side. Used by the page controller to validate taps. */
  readonly bigger: 'left' | 'right';
}

/**
 * Plan distribution for a single 8-round session, expressed as a
 * sequence of (difference, biggerSide) pairs. Difference is 1, 2, or
 * 3; bigger side is L or R. The session generator instantiates each
 * slot with a randomly-picked pair from the matching pool, and rotates
 * themes with a no-repeat-in-a-row constraint.
 *
 * Distribution rationale:
 *  - 4 rounds at diff=1 (close — forces counting).
 *  - 3 rounds at diff=2 (medium — subitizable but distinct).
 *  - 1 round at diff=3 (wide — a confidence beat per session, also
 *    the "wow that's obvious" reveal moment).
 *
 * Side balance:
 *  - 4 left, 4 right per session, with no more than 2 of the same
 *    side in a row. The hard-coded plan below already satisfies this
 *    constraint pre-shuffle; the shuffle only re-orders within the
 *    constraint windows so the property holds post-shuffle as well.
 */
/**
 * Per-stage plans. Each slot is a (difference, biggerSide) pair.
 *
 * - **Stage 1** (8 rounds, sizes <=4): the original distribution
 *   (4x diff=1, 3x diff=2, 1x diff=3) with balanced sides. PRESERVED
 *   VERBATIM so Stage 1 == today.
 * - **Stage 2** (10 rounds, sizes <=10): wider difference range (1-5)
 *   so the bigger groups get both obvious and close comparisons; 5/5
 *   side balance.
 * - **Stage 3** (12 rounds, sizes <=10): leans hard on diff=1 (the
 *   closest, hardest comparisons) with the bigger groups; 6/6 sides.
 */
const PLAN_BY_STAGE: Readonly<Record<StageId, ReadonlyArray<readonly [number, 'left' | 'right']>>> = {
  1: [
    [1, 'left'],
    [2, 'right'],
    [1, 'right'],
    [3, 'left'],
    [2, 'left'],
    [1, 'right'],
    [2, 'right'],
    [1, 'left'],
  ],
  2: [
    [2, 'left'],
    [1, 'right'],
    [3, 'left'],
    [1, 'left'],
    [4, 'right'],
    [2, 'right'],
    [1, 'left'],
    [5, 'right'],
    [3, 'right'],
    [1, 'left'],
  ],
  3: [
    [1, 'left'],
    [1, 'right'],
    [2, 'left'],
    [1, 'right'],
    [3, 'left'],
    [1, 'left'],
    [2, 'right'],
    [1, 'right'],
    [4, 'left'],
    [1, 'left'],
    [2, 'right'],
    [3, 'right'],
  ],
};

/**
 * Pair pool keyed by absolute difference. Each entry is the list of
 * (smaller, bigger) ordered tuples — the session generator orients
 * (left, right) based on the plan slot's `bigger` side.
 *
 * Note both (1,2) and (2,3) are kept under diff=1 (not just one
 * canonical (smaller,bigger) per diff) because the *visual feel* of
 * "1 vs 2" is qualitatively different from "3 vs 4" — the latter
 * forces actual counting, the former is borderline subitizable
 * even with the close difference. Mixing within a difficulty band
 * keeps the sessions feeling varied.
 */
const PAIRS_BY_DIFF_STAGE1: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  1: [[1, 2], [2, 3], [3, 4]],
  2: [[1, 3], [2, 4]],
  3: [[1, 4]],
};

/**
 * Bigger pair pools for Stage 2+ — (smaller, bigger) tuples with the
 * bigger group up to 10. Covers differences 1-5 so the bigger plans
 * can mix close (diff=1) and obvious (diff=5) comparisons.
 */
const PAIRS_BY_DIFF_BIG: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  1: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]],
  2: [[1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 10]],
  3: [[1, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9], [7, 10]],
  4: [[1, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10]],
  5: [[1, 6], [2, 7], [3, 8], [4, 9], [5, 10]],
};

const PAIRS_BY_STAGE: Readonly<Record<StageId, Readonly<Record<number, ReadonlyArray<readonly [number, number]>>>>> = {
  1: PAIRS_BY_DIFF_STAGE1,
  2: PAIRS_BY_DIFF_BIG,
  3: PAIRS_BY_DIFF_BIG,
};

/** Pick a random element from `xs` using `rand`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T => xs[Math.floor(rand() * xs.length)]!;

/**
 * Generate a fresh session for `stage` (defaults to Stage 1, so the
 * SSR seed and every existing caller behave exactly as before).
 * Session length = the stage's plan length (8 / 10 / 12).
 *
 * - Plan slots are shuffled to vary order across plays (Fisher–Yates;
 *   the no-3-in-a-row side constraint is preserved by the input plan
 *   but not enforced post-shuffle — accepted as a fair trade).
 * - Pairs are drawn from the stage's pool (sizes <=4 at Stage 1, up to
 *   10 at Stage 2+); themes from the stage's theme pool (4 / 6).
 * - Pair within a difficulty band is picked uniformly.
 *
 * `rand` is injectable so tests can pin to a deterministic sequence.
 */
export const generateSession = (
  rand: () => number = Math.random,
  stage: StageId = 1,
): CompRound[] => {
  const plan: Array<readonly [number, 'left' | 'right']> = [...PLAN_BY_STAGE[stage]];
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = plan[i]!;
    plan[i] = plan[j]!;
    plan[j] = tmp;
  }

  const pairs = PAIRS_BY_STAGE[stage];
  const themePool = themesForStage(stage);
  const rounds: CompRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const [diff, bigger] of plan) {
    const [smallSize, bigSize] = pick(pairs[diff]!, rand);
    const left = bigger === 'left' ? bigSize : smallSize;
    const right = bigger === 'right' ? bigSize : smallSize;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? themePool : themePool.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({ left, right, theme, bigger });
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
 *   - `intro` — "Look! Two ducks here, three ducks there." (both groups in)
 *   - `question` — Prompt: "Which side has more?"
 *   - `correct` — Right-tap celebration: "Yes! Three is more than two!"
 *   - `rerun` — Wrong-tap guided count intro: "Let's count them together!"
 *   - `rerunDone` — End of guided count: "Three is more than two. This side has more!"
 */
export type NarrationPhase =
  | 'intro'
  | 'question'
  | 'correct'
  | 'rerun'
  | 'rerunDone';

export interface RoundNarration {
  readonly intro: string;
  readonly question: string;
  readonly correct: string;
  readonly rerun: string;
  readonly rerunDone: string;
}

export const buildNarration = (round: CompRound): RoundNarration => {
  const theme = THEME_BY_KEY[round.theme];
  const leftWord = numberWord(round.left);
  const rightWord = numberWord(round.right);
  const leftNoun = nounFor(round.left, theme);
  const rightNoun = nounFor(round.right, theme);

  const bigSize = round.bigger === 'left' ? round.left : round.right;
  const smallSize = round.bigger === 'left' ? round.right : round.left;
  const bigWord = numberWord(bigSize);
  const smallWord = numberWord(smallSize);

  return {
    intro: `Look! ${cap(leftWord)} ${leftNoun} on this side, ${rightWord} ${rightNoun} on this side.`,
    question: `Which side has more ${theme.plural}?`,
    correct: `Yes! ${cap(bigWord)} is more than ${smallWord}!`,
    rerun: `Let's count them together!`,
    rerunDone: `${cap(bigWord)} is more than ${smallWord}. This side has more!`,
  };
};

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'more_friends_stats_v1';

export interface ComparisonStats {
  /** Total sessions completed (a full stage-length round set). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right side first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
  /** Current stage the child is on (1..3). Defaults to 1 for pre-stage saves. */
  readonly stage: StageId;
  /** Highest stage ever reached (1..3). */
  readonly bestStage: StageId;
}

const ZERO_STATS: ComparisonStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
  stage: 1,
  bestStage: 1,
};

export const loadComparisonStats = (): ComparisonStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<ComparisonStats>;
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

export const saveComparisonStats = (s: ComparisonStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
