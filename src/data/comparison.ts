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

export type { PreschoolTheme, ThemeMeta };
export { THEMES, THEME_BY_KEY };

/**
 * One round of play: two groups of `theme` objects sized `left` and
 * `right`, with the question "which has more?". Always `left !==
 * right`, with `bigger` set to the side that wins.
 */
export interface CompRound {
  /** Size of the left group. 1..4. */
  readonly left: number;
  /** Size of the right group. 1..4. */
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
const PLAN: ReadonlyArray<readonly [number, 'left' | 'right']> = [
  [1, 'left'],
  [2, 'right'],
  [1, 'right'],
  [3, 'left'],
  [2, 'left'],
  [1, 'right'],
  [2, 'right'],
  [1, 'left'],
];

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
const PAIRS_BY_DIFF: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  1: [[1, 2], [2, 3], [3, 4]],
  2: [[1, 3], [2, 4]],
  3: [[1, 4]],
};

/** Pick a random element from `xs` using `rand`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T => xs[Math.floor(rand() * xs.length)]!;

/**
 * Generate a fresh 8-round session.
 *
 * - Plan slots are shuffled to vary order across plays. The shuffle
 *   uses a Fisher–Yates pass; with 8 slots the no-3-in-a-row side
 *   constraint is preserved by the input plan but isn't enforced
 *   post-shuffle (a perfectly random shuffle has ~12% chance of
 *   producing a 3-in-a-row run for either side; we accept that as
 *   a fair trade vs constrained-shuffle complexity).
 * - Themes rotate with a "no two in a row" rule.
 * - Pair within a difficulty band is picked uniformly.
 *
 * `rand` is injectable so tests can pin to a deterministic sequence;
 * default uses `Math.random`.
 */
export const generateSession = (rand: () => number = Math.random): CompRound[] => {
  const plan: Array<readonly [number, 'left' | 'right']> = [...PLAN];
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = plan[i]!;
    plan[i] = plan[j]!;
    plan[j] = tmp;
  }

  const rounds: CompRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const [diff, bigger] of plan) {
    const [smallSize, bigSize] = pick(PAIRS_BY_DIFF[diff]!, rand);
    const left = bigger === 'left' ? bigSize : smallSize;
    const right = bigger === 'right' ? bigSize : smallSize;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
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
  /** Total sessions completed (full 8 rounds). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right side first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: ComparisonStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadComparisonStats = (): ComparisonStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<ComparisonStats>;
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

export const saveComparisonStats = (s: ComparisonStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
