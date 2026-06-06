/**
 * Data for Number Bond Pop — fifth preschool-math game, targeting age
 * 3-4, completing the early-math arc with the cardinality triad:
 *
 *   compare (More Friends) -> count (Counting Friends) ->
 *   recognise (Number Friends) -> DECOMPOSE (Number Bond Pop)
 *
 * Pedagogy primitives this file encodes (grounded in the golden-standard
 * survey done before the build — NAEYC "Number Composition", Bridges
 * Pre-K developmental progressions, HeadStart P-MATH, NRICH subitising):
 *
 * - **Concrete part-whole, never abstract.** The child never sees an
 *   equation or a `+`/`=` symbol. A bond frame for the WHOLE shows
 *   `have` cells already filled with a themed object and `gap` cells
 *   empty; the question is the concrete "how many more to make five?".
 *   The answer options are *concrete quantities* (bunches of balloons),
 *   not numerals — the research is explicit that producing a
 *   missing-addend numeral is the abstract step to defer past age 3.
 *
 * - **See the gap.** Because the empty cells are literally visible, a
 *   3yo can solve by perceptual subitising / counting the holes rather
 *   than by symbolic arithmetic. "Fill the remaining empty spaces" is
 *   the canonical age-3 make-N activity (Bridges, HeadStart).
 *
 * - **Five-frame first, ten-frame later.** Stage 1 is always make-5 on
 *   a five-frame (the developmentally-appropriate anchor). Stages 2-3
 *   open wholes up to 10 on a ten-frame, but only for a child who has
 *   demonstrated mastery via the auto-advance gate — "how many more to
 *   make 10" is a by-60-months milestone, so it stays behind the stage.
 *
 * - **Part-whole language.** Narration says "Three and two make five!"
 *   (composition), never "3 + 2 = 5".
 *
 * - **Three answer options.** Matches the triad's discrimination grain
 *   (two = 50% guess, four = visual crowding). Exactly one bunch equals
 *   the gap; the other two are near/far decoys.
 *
 * - **Errorless wrong-tap flow.** On a wrong tap: a 250ms kinesthetic
 *   shake (no colour/penalty), then a guided count of the *empty* cells
 *   ("we need one, two — two more!"), then the correct bunch is revealed
 *   and pops in to complete the frame. No score penalty, no red X.
 *
 * Stats schema is bespoke (`number_bond_stats_v1`) and identical in
 * shape to the rest of the staged triad: `{ sessions, rounds,
 * correctFirstTry, lastPlayed, stage, bestStage }`.
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
  STAGE_META,
  themesForStage,
  clampStage,
} from '@/lib/preschool-stages';

export type { PreschoolTheme, ThemeMeta, StageId };
export { THEMES, THEME_BY_KEY };

/**
 * One round of play: the bond frame shows `whole` cells with `have`
 * filled and `gap = whole - have` empty. Three option bunches sit
 * below with the sizes in `options`; exactly one equals `gap`.
 * `correctIndex` is the position (0/1/2) of the matching bunch so the
 * page controller can validate taps without re-scanning.
 */
export interface BondRound {
  /** The target total to make. 5 at Stage 1, 5..10 at Stage 2+. */
  readonly whole: number;
  /** How many cells are already filled. 1..whole-1. */
  readonly have: number;
  /** How many more are needed — the correct answer. `whole - have`. */
  readonly gap: number;
  /** Sizes of the three option bunches, in display order. Exactly one equals `gap`. */
  readonly options: readonly [number, number, number];
  /** Position (0/1/2) of the matching bunch in `options`. */
  readonly correctIndex: 0 | 1 | 2;
  /** Theme rotated per round — drives the scene background + emoji. */
  readonly theme: PreschoolTheme;
  /** Difficulty band — used by the decoy chooser + parent stats display. */
  readonly difficulty: 'near' | 'mixed';
}

/**
 * Per-stage plans — each slot is a `[whole, have, difficulty]` triple
 * (so the gap is `whole - have`).
 *
 * - **Stage 1** (8 rounds): always make-5, `have` cycling 1..4 so the
 *   gap covers 4/3/2/1 — twice each across a near pass + a mixed pass.
 *   This is the developmentally-appropriate five-frame anchor.
 * - **Stage 2** (10 rounds): wholes 5..10 with a spread of gaps,
 *   leaning on "near" decoys but seeding confidence beats with "mixed".
 * - **Stage 3** (12 rounds): wholes 6..10 with bigger gaps and mostly
 *   "near" decoys — the hardest discrimination in the game.
 */
const PLAN_BY_STAGE: Readonly<
  Record<StageId, ReadonlyArray<readonly [number, number, 'near' | 'mixed']>>
> = {
  1: [
    [5, 1, 'near'],
    [5, 2, 'near'],
    [5, 3, 'near'],
    [5, 4, 'near'],
    [5, 1, 'mixed'],
    [5, 2, 'mixed'],
    [5, 3, 'mixed'],
    [5, 4, 'mixed'],
  ],
  2: [
    [5, 2, 'mixed'],
    [6, 2, 'near'],
    [6, 4, 'mixed'],
    [7, 3, 'near'],
    [7, 5, 'mixed'],
    [8, 3, 'near'],
    [8, 6, 'mixed'],
    [9, 4, 'near'],
    [10, 5, 'near'],
    [10, 7, 'mixed'],
  ],
  3: [
    [6, 1, 'near'],
    [7, 2, 'near'],
    [8, 3, 'near'],
    [9, 4, 'near'],
    [10, 5, 'near'],
    [10, 4, 'near'],
    [8, 2, 'near'],
    [9, 3, 'near'],
    [7, 1, 'mixed'],
    [9, 2, 'mixed'],
    [10, 3, 'mixed'],
    [10, 6, 'near'],
  ],
};

/**
 * Pick two decoy bunch sizes for a `gap` and `difficulty`. Always
 * returns a length-2 tuple of distinct sizes, each in `[1, maxN]` and
 * distinct from `gap`.
 *
 * - **near**: both decoys hug the gap (±1, then ±2 as fallback) — forces
 *   the child to count the holes rather than eyeball a wildly-wrong bunch.
 * - **mixed**: one close (±1) decoy + one far (±2) decoy on the opposite
 *   side, so each mixed round gives a confidence beat (the far bunch is
 *   obviously too many/few) alongside a trickier near decoy.
 *
 * Candidates are built as an ordered preference list and the first two
 * valid, distinct entries are taken; a top-up loop guarantees we never
 * return fewer than two even at the edges (e.g. gap = 1).
 */
const decoysFor = (
  gap: number,
  difficulty: 'near' | 'mixed',
  maxN: number,
  rand: () => number,
): readonly [number, number] => {
  const candidates: number[] = [];
  const push = (n: number): void => {
    if (n >= 1 && n <= maxN && n !== gap && !candidates.includes(n)) {
      candidates.push(n);
    }
  };

  if (difficulty === 'near') {
    push(gap - 1);
    push(gap + 1);
    push(gap + 2);
    push(gap - 2);
  } else {
    const closeIsLower = rand() < 0.5;
    push(closeIsLower ? gap - 1 : gap + 1); // close (±1)
    push(closeIsLower ? gap + 2 : gap - 2); // far (∓2)
    // Fallbacks if either of the above was out of range / collided.
    push(gap + 1);
    push(gap - 1);
    push(gap + 2);
    push(gap - 2);
  }

  // Top-up: guarantee at least two candidates even when the gap sits at
  // an extreme (e.g. gap = 1 drops every "lower" candidate).
  let k = 3;
  while (candidates.length < 2) {
    push(gap + k);
    push(gap - k);
    k++;
    if (k > maxN + 2) break; // defensive — never loop forever
  }

  return [candidates[0]!, candidates[1]!];
};

/** Pick a random element from `xs` using `rand`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T => xs[Math.floor(rand() * xs.length)]!;

/**
 * Generate a fresh session for `stage` (defaults to Stage 1, so the SSR
 * seed and every existing caller behave exactly the same). Session
 * length = the stage's plan length (8 / 10 / 12).
 *
 * - Plan slots are shuffled to vary order across plays; the per-whole and
 *   per-difficulty counts are preserved by construction.
 * - For each slot we pick decoys from `decoysFor`, then shuffle the
 *   `[gap, decoy1, decoy2]` triple into a random display order so
 *   `correctIndex` rotates evenly across rounds.
 * - Themes rotate with a "no two in a row" rule, drawn from the stage's
 *   theme pool (4 themes at Stage 1, all 6 at Stage 2+).
 *
 * `rand` is injectable so tests + the SSR seed can pin a deterministic
 * sequence.
 */
export const generateSession = (
  rand: () => number = Math.random,
  stage: StageId = 1,
): BondRound[] => {
  const maxN = STAGE_META[stage].maxN;
  const plan: Array<readonly [number, number, 'near' | 'mixed']> = [...PLAN_BY_STAGE[stage]];
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = plan[i]!;
    plan[i] = plan[j]!;
    plan[j] = tmp;
  }

  const themePool = themesForStage(stage);
  const rounds: BondRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const [whole, have, difficulty] of plan) {
    const gap = whole - have;
    const [d1, d2] = decoysFor(gap, difficulty, maxN, rand);

    // Build the [gap, d1, d2] triple and shuffle into display order.
    const triple: number[] = [gap, d1, d2];
    for (let i = triple.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = triple[i]!;
      triple[i] = triple[j]!;
      triple[j] = tmp;
    }
    const options: readonly [number, number, number] = [triple[0]!, triple[1]!, triple[2]!];
    const correctIndex = options.indexOf(gap) as 0 | 1 | 2;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? themePool : themePool.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({ whole, have, gap, options, correctIndex, theme, difficulty });
  }

  return rounds;
};

/**
 * Build the narration script for one round.
 *
 * Phases:
 *   - `intro` — "We have three ducks. How many more to make five?"
 *   - `correct` — "Yes! Three and two make five!"
 *   - `rerun` — wrong-tap intro: "Hmm! Let's count what we need."
 *   - `rerunDone` — after counting the empty cells: "We need two more!
 *     Three and two make five."
 *   - `fillStep(n)` — counting-on as each empty cell fills: "four", "five".
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly rerunDone: string;
  readonly fillStep: (n: number) => string;
}

export const buildNarration = (round: BondRound): RoundNarration => {
  const theme = THEME_BY_KEY[round.theme];
  const haveWord = numberWord(round.have);
  const gapWord = numberWord(round.gap);
  const wholeWord = numberWord(round.whole);
  const wholeNoun = nounFor(round.whole, theme);
  const haveNoun = nounFor(round.have, theme);

  return {
    intro: `We have ${haveWord} ${haveNoun}. How many more to make ${wholeWord}?`,
    correct: `Yes! ${cap(haveWord)} and ${gapWord} make ${wholeWord}!`,
    rerun: `Hmm! Let's count what we need.`,
    rerunDone: `We need ${gapWord} more! ${cap(haveWord)} and ${gapWord} make ${wholeWord} ${wholeNoun}.`,
    fillStep: (n: number): string => numberWord(n),
  };
};

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'number_bond_stats_v1';

export interface NumberBondStats {
  /** Total sessions completed (a full stage-length round set). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right bunch first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
  /** Current stage the child is on (1..3). Defaults to 1 for pre-stage saves. */
  readonly stage: StageId;
  /** Highest stage ever reached (1..3). */
  readonly bestStage: StageId;
}

const ZERO_STATS: NumberBondStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
  stage: 1,
  bestStage: 1,
};

export const loadNumberBondStats = (): NumberBondStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<NumberBondStats>;
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

export const saveNumberBondStats = (s: NumberBondStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
