/**
 * Data for the Number Friends game — third preschool-math game in the
 * Astro project, targeting age 3, completing the preschool-math triad
 * with Counting Friends (set→numeral, addition) and More Friends (set
 * vs set, magnitude comparison).
 *
 * Pedagogy primitives this file encodes:
 *
 * - **Numeral-to-set translation.** Counting Friends asks "how many
 *   in all?" — set→numeral. More Friends asks "which has more?" — set
 *   vs set comparison. Number Friends asks the missing third: "show
 *   me three!" — numeral→set. The child sees a numeral target and
 *   has to find the group that has exactly that many objects. This
 *   is a distinct cognitive operation from counting (which produces
 *   a numeral from a set) and from comparison (which produces a
 *   relation between two sets); it requires recognising the numeral
 *   AND translating it back to a quantity. Closes the cardinality
 *   triangle for age 3.
 *
 * - **Subitize-friendly targets.** Targets ∈ {2, 3, 4, 5}. 1 is
 *   trivially obvious (one object always reads as "one") and gets
 *   skipped. 5 stretches the subitize range slightly but stays at
 *   the five-frame anchor that Counting Friends uses for its
 *   numeral buttons.
 *
 * - **Three answer panels.** Two would be too easy for a 3yo (50%
 *   guess rate); four would crowd the visual space. Three matches
 *   the "three numeral options" pattern Counting Friends uses, so
 *   the visual difficulty curve is consistent across the triad.
 *
 * - **Two decoy strategies per session.**
 *   - "Near" rounds (4 of 8): both decoys are at target ± 1. Forces
 *     careful counting; the child can't shortcut by visual size.
 *   - "Mixed" rounds (4 of 8): one decoy at target ± 1, one decoy at
 *     target ± 2 (or further when target=5 caps). Gives the child a
 *     confidence beat per round (the far decoy is obviously wrong)
 *     while still requiring counting to discriminate the near
 *     decoy from the target.
 *
 * - **Errorless wrong-tap flow** matches the established pattern:
 *   on wrong tap, narrate a guided count of the *tapped* group
 *   ("one, two, four — that's four ducks, not three") then a
 *   guided count of the *correct* group ("look! one, two, three —
 *   three ducks!"), then reveal the correct panel with a pulsing
 *   ring. No score penalty, no red X.
 *
 * Stats schema is bespoke (`number_friends_stats_v1`) for the same
 * reason as Counting Friends and More Friends — `lib/quiz.ts`'s
 * 4-option text-question shape doesn't fit a 3-option visual game
 * for a 3yo. Tracks `{ sessions, rounds, correctFirstTry,
 * lastPlayed }`.
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
 * One round of play: a numeral `target` displayed at the top of the
 * scene, three group panels below with the sizes given by `sizes`.
 * Exactly one of the sizes equals `target`; the other two are decoys.
 * `correctIndex` is the position (0/1/2) of the matching group in
 * `sizes` so the page controller can validate taps without re-scanning.
 */
export interface HuntRound {
  /** The numeral the child is hunting for. 2..5 at Stage 1, up to 10 at Stage 2+. */
  readonly target: number;
  /** Sizes of the three group panels, in display order. Exactly one equals `target`. 1..12 (depends on stage). */
  readonly sizes: readonly [number, number, number];
  /** Position (0/1/2) of the matching group in `sizes`. */
  readonly correctIndex: 0 | 1 | 2;
  /** Theme rotated per round — drives the scene background + emoji. */
  readonly theme: PreschoolTheme;
  /** Difficulty band — used by the narration script + parent stats display. */
  readonly difficulty: 'near' | 'mixed';
}

/**
 * Plan distribution for a single 8-round session. Pre-shuffle this
 * lays out 4 "near" rounds (both decoys at ±1) and 4 "mixed" rounds
 * (one ±1 decoy, one ±2 decoy). Targets cycle 2/3/4/5 evenly so each
 * appears twice per session. Post-shuffle the order is randomised
 * but the count-per-target and count-per-difficulty stay the same.
 *
 * Why 4+4? Pure-near sessions feel relentlessly hard for a 3yo (every
 * round needs counting); pure-mixed sessions feel too easy (the far
 * decoy is always a giveaway). Mixing gives the child confidence
 * beats *and* counting practice in equal measure.
 */
/**
 * Per-stage plans — each slot is a (target, difficulty) pair.
 *
 * - **Stage 1** (8 rounds, targets 2-5): the original 4-near + 4-mixed
 *   layout, targets 2/3/4/5 each appearing twice. PRESERVED VERBATIM so
 *   Stage 1 == today.
 * - **Stage 2** (10 rounds, targets 2-10): spreads targets across the
 *   ten-frame range, 6 near + 4 mixed.
 * - **Stage 3** (12 rounds, targets 3-10): leans on bigger targets and
 *   "near" decoys (the hardest discrimination), 9 near + 3 mixed.
 */
const PLAN_BY_STAGE: Readonly<Record<StageId, ReadonlyArray<readonly [number, 'near' | 'mixed']>>> = {
  1: [
    [2, 'near'],
    [3, 'near'],
    [4, 'near'],
    [5, 'near'],
    [2, 'mixed'],
    [3, 'mixed'],
    [4, 'mixed'],
    [5, 'mixed'],
  ],
  2: [
    [2, 'mixed'],
    [3, 'near'],
    [4, 'mixed'],
    [5, 'near'],
    [6, 'near'],
    [7, 'mixed'],
    [8, 'near'],
    [9, 'mixed'],
    [10, 'near'],
    [6, 'near'],
  ],
  3: [
    [3, 'near'],
    [4, 'near'],
    [5, 'near'],
    [6, 'near'],
    [7, 'near'],
    [8, 'near'],
    [9, 'near'],
    [10, 'near'],
    [5, 'mixed'],
    [7, 'mixed'],
    [9, 'mixed'],
    [10, 'near'],
  ],
};

/**
 * Pick decoy sizes for a `target` and `difficulty`. Always returns a
 * length-2 tuple of distinct sizes (and distinct from `target`),
 * each in {1..6}. Invariants enforced by the table below — see the
 * comments per row for why each cell looks the way it does.
 */
const decoysFor = (
  target: number,
  difficulty: 'near' | 'mixed',
  rand: () => number,
): readonly [number, number] => {
  if (difficulty === 'near') {
    // Both decoys at ±1 from target. With target=2 the lower neighbour
    // would be 1 and upper 3 — both valid. With target=5 the upper
    // neighbour would be 6 — also valid (a five-frame can briefly
    // hold a 6 visually; we cap visible items at 5 below by clamping
    // the size to 5 if needed in the page CSS, but the *count* is
    // still 6 so the comparison reads true). For safety we never
    // emit a 0 (lower bound is 1).
    const lower = Math.max(1, target - 1);
    const upper = target + 1;
    return [lower, upper];
  }
  // Mixed: one ±1 neighbour + one ±2 neighbour. Pick the side of the
  // ±1 (lower vs upper) randomly so 50% of mixed rounds put the
  // close decoy on the higher side and 50% on the lower side.
  const closeIsLower = rand() < 0.5;
  const close = closeIsLower ? Math.max(1, target - 1) : target + 1;
  // For the far decoy use ±2 on the *opposite* side of `close` so the
  // group of three (target + close + far) spans a wider range and
  // the child sees an obvious wrong + a tricky decoy.
  const far = closeIsLower
    ? target + 2
    : Math.max(1, target - 2);
  // Edge case: target=2, closeIsLower=true → close=1, far=4. Fine.
  // Edge case: target=2, closeIsLower=false → close=3, far=0 → clamped
  // to 1. But 1 collides with… wait, 1 doesn't collide with 2 or 3.
  // Still fine.
  return [close, far];
};

/** Pick a random element from `xs` using `rand`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T => xs[Math.floor(rand() * xs.length)]!;

/**
 * Generate a fresh session for `stage` (defaults to Stage 1, so the
 * SSR seed and every existing caller behave exactly as before).
 * Session length = the stage's plan length (8 / 10 / 12).
 *
 * - Plan slots are shuffled to vary order across plays. Per-target and
 *   per-difficulty counts are preserved by construction.
 * - For each slot we pick decoys from `decoysFor`, then shuffle the
 *   `[target, decoy1, decoy2]` triple into a random display order so
 *   `correctIndex` rotates evenly across rounds.
 * - Themes rotate with a "no two in a row" rule, drawn from the stage's
 *   theme pool (4 themes at Stage 1, all 6 at Stage 2+).
 *
 * `rand` is injectable so tests can pin to a deterministic sequence.
 */
export const generateSession = (
  rand: () => number = Math.random,
  stage: StageId = 1,
): HuntRound[] => {
  const plan: Array<readonly [number, 'near' | 'mixed']> = [...PLAN_BY_STAGE[stage]];
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = plan[i]!;
    plan[i] = plan[j]!;
    plan[j] = tmp;
  }

  const themePool = themesForStage(stage);
  const rounds: HuntRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const [target, difficulty] of plan) {
    const [d1, d2] = decoysFor(target, difficulty, rand);

    // Build the [target, d1, d2] triple and shuffle into display order.
    const triple: number[] = [target, d1, d2];
    for (let i = triple.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = triple[i]!;
      triple[i] = triple[j]!;
      triple[j] = tmp;
    }
    const sizes: readonly [number, number, number] = [triple[0]!, triple[1]!, triple[2]!];
    const correctIndex = sizes.indexOf(target) as 0 | 1 | 2;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? themePool : themePool.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({ target, sizes, correctIndex, theme, difficulty });
  }

  return rounds;
};

/**
 * Build the narration script for one round.
 *
 * Phases:
 *   - `intro` — "Show me three ducks! Find three ducks."
 *   - `correct` — Right-tap celebration: "Yes! Three ducks!"
 *   - `rerun` — Wrong-tap intro: "Hmm! Let's count them together."
 *   - `rerunDoneWrong(tappedSize)` — count of tapped wrong group:
 *     "Four ducks! That was four, not three."
 *   - `rerunDoneRight(targetSize, theme)` — count of correct group:
 *     "Three ducks! Look — three ducks!"
 */
export type NarrationPhase =
  | 'intro'
  | 'correct'
  | 'rerun'
  | 'rerunDoneWrong'
  | 'rerunDoneRight';

export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly rerunDoneWrong: (tappedSize: number) => string;
  readonly rerunDoneRight: string;
}

export const buildNarration = (round: HuntRound): RoundNarration => {
  const theme = THEME_BY_KEY[round.theme];
  const targetWord = numberWord(round.target);
  const targetNoun = nounFor(round.target, theme);

  return {
    intro: `Show me ${targetWord} ${targetNoun}! Find ${targetWord} ${targetNoun}.`,
    correct: `Yes! ${cap(targetWord)} ${targetNoun}!`,
    rerun: `Hmm! Let's count them together.`,
    rerunDoneWrong: (tappedSize: number): string => {
      const w = numberWord(tappedSize);
      const n = nounFor(tappedSize, theme);
      return `${cap(w)} ${n}! That was ${w}, not ${targetWord}.`;
    },
    rerunDoneRight: `Look — ${targetWord} ${targetNoun}! ${cap(targetWord)} ${targetNoun}.`,
  };
};

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'number_friends_stats_v1';

export interface NumberFriendsStats {
  /** Total sessions completed (a full stage-length round set). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right panel first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
  /** Current stage the child is on (1..3). Defaults to 1 for pre-stage saves. */
  readonly stage: StageId;
  /** Highest stage ever reached (1..3). */
  readonly bestStage: StageId;
}

const ZERO_STATS: NumberFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
  stage: 1,
  bestStage: 1,
};

export const loadNumberFriendsStats = (): NumberFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<NumberFriendsStats>;
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

export const saveNumberFriendsStats = (s: NumberFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
