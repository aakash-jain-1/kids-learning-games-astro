/**
 * Data for the Pattern Sequences game — fourth preschool-math game in
 * the Astro project, targeting age 3, sister to the cardinality triad
 * (Counting Friends + More Friends + Number Friends).
 *
 * Pedagogy primitives this file encodes:
 *
 * - **Sequential pattern recognition.** The triad covered cardinality
 *   (count→numeral, set vs set, numeral→set). Pattern Sequences
 *   covers a different early-math foundation: extracting a *rule*
 *   from a finite sample and projecting it forward. The child sees
 *   five colored items in a sequence, with a "?" slot at the end,
 *   and three colored options below; tapping the option that
 *   continues the rule wins the round.
 *
 * - **Color as the pattern primitive.** Pre-attentively the most
 *   discriminable visual feature for age 3 — color pops in <200 ms,
 *   far faster than shape or emoji recognition. Lowest working-
 *   memory load (single attribute per item). Reinforces vocabulary
 *   the child is already exposed to in the existing /games/colors-
 *   game card-set. Canonical pedagogical primitive: Piaget seriation
 *   tasks, Montessori bead-stringing, and EYFS pattern work all use
 *   colored chips/beads for ages 3–4 (shapes get introduced age 5+).
 *
 * - **Four difficulty tiers across 8 rounds (2 per tier).**
 *   - AB (rounds at this tier): 2-color alternation. Simplest
 *     sequence pattern — accessible by age 3.
 *   - AAB: 2-color chunk pattern (two of one, then one of the other).
 *     Tests recognition of the 2-1 grouping.
 *   - ABB: 2-color chunk pattern, mirror of AAB. Same difficulty,
 *     different chunk shape — kept distinct so the session has
 *     genuine variety rather than four flavours of "easy + hard".
 *   - ABC: 3-color cycle. Hardest tier — requires holding three
 *     elements in working memory. At the upper end of the age-3-to-4
 *     bracket, well within reach by age 4.
 *
 * - **Five visible items + a "?" slot (six total positions).** Five
 *   is the minimum sample that exposes each cycle at least once
 *   (1.5 cycles for AAB/ABB/ABC, 2.5 cycles for AB) AND fits on a
 *   320px-wide phone with comfortable tap targets (48px circles +
 *   gap). Six visible would push the layout past comfortable on
 *   small mobile; five is the sweet spot.
 *
 * - **Three answer options.** Same as Counting Friends + Number
 *   Friends — three matches a 3yo's working-memory capacity for
 *   forced-choice. Two would be too easy (50% guess); four would
 *   crowd the visual space.
 *
 * - **Errorless wrong-tap flow.** Cancel speech → kinesthetic 250 ms
 *   shake on tapped wrong option → narrate "Not that one. Let's look at the
 *   pattern" → walk through the sequence highlighting each item and
 *   speaking its color ("red... blue... red... blue... red...") →
 *   reveal the correct option with a pulsing ring → narrate the
 *   answer → enable Next. No score penalty, no red X, no negative
 *   tone. Mirrors the established triad pattern (T-extra triad-
 *   extension, 2026-05-20).
 *
 * Stats schema is bespoke (`pattern_sequences_stats_v1`) but uses
 * the EXACT same shape as the triad games — `{ sessions, rounds,
 * correctFirstTry, lastPlayed }` — so the stats registry's existing
 * `preschoolMathEntry` factory takes this game with zero shape
 * changes.
 *
 * Theme catalog is shared with the triad via `@/lib/preschool-themes`
 * (Pond/Orchard/Sea/Garden); themes drive bg + caption flavor
 * but the pattern primitive (colored circles) is theme-independent.
 * That's a deliberate split: the rotation through themes keeps the
 * game visually fresh across rounds without forcing the data layer
 * to invent theme-specific color palettes.
 */

import {
  THEMES,
  THEME_BY_KEY,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';
import { WRONG_LEAD } from '@/data/preschool-narration';

export type { PreschoolTheme, ThemeMeta };
export { THEMES, THEME_BY_KEY };

/** The four pattern primitives. Drives the `data-color` attribute
 *  on each item span and the option buttons; CSS-side maps each
 *  key to a CSS custom property (--ps-color-<key>) for the fill. */
export type PatternColor = 'red' | 'blue' | 'yellow' | 'green';

const ALL_COLORS: readonly PatternColor[] = ['red', 'blue', 'yellow', 'green'];

/** Spoken label per color — used by the narration script. Lowercase
 *  because narration sentences embed it as a noun ("red", "blue"),
 *  not a sentence-start; capitalisation is applied via `cap` from
 *  the shared themes lib. */
export const COLOR_LABEL: Readonly<Record<PatternColor, string>> = {
  red: 'red',
  blue: 'blue',
  yellow: 'yellow',
  green: 'green',
};

/**
 * The four pattern types used across the 8 rounds. Difficulty
 * progression based on Piaget seriation and modern preschool-
 * curriculum benchmarks (Common Core preschool-math, EYFS,
 * Montessori). All four are within the 3-to-4yo bracket:
 *   - AB: alternation, age 3.
 *   - AAB / ABB: chunk patterns, age 3-3.5.
 *   - ABC: 3-color cycle, age 4.
 */
export type PatternKind = 'AB' | 'AAB' | 'ABB' | 'ABC';

/** Cycle definition per kind — indices into the round's chosen color
 *  set. AB → [0, 1] (2-cycle on 2 colors). AAB → [0, 0, 1] (3-cycle
 *  on 2 colors, AABAAB...). ABC → [0, 1, 2] (3-cycle on 3 colors). */
const CYCLE_FOR: Readonly<Record<PatternKind, readonly number[]>> = {
  AB: [0, 1],
  AAB: [0, 0, 1],
  ABB: [0, 1, 1],
  ABC: [0, 1, 2],
};

/** How many distinct colors each tier needs. */
const COLORS_NEEDED: Readonly<Record<PatternKind, 2 | 3>> = {
  AB: 2,
  AAB: 2,
  ABB: 2,
  ABC: 3,
};

/** Visible positions in the sequence (the "?" slot is the 6th
 *  position, evaluated separately as `correctColor`). Tuned to fit
 *  comfortably on a 320px phone — see header for the layout math. */
export const VISIBLE_LENGTH = 5;

/**
 * One round of play.
 *
 * The page renders `sequence` as five colored circles followed by a
 * dashed "?" slot, three option buttons below. The child taps an
 * option; if the option's color === `correctColor` (i.e. the tap
 * lands on `correctIndex`), the round resolves correct. Otherwise
 * the errorless wrong-tap flow walks through `sequence` while
 * narrating each color, then reveals the correct option.
 */
export interface PatternRound {
  /** Pattern kind — drives difficulty narration + analytics. */
  readonly kind: PatternKind;
  /** Visible portion of the sequence (length = VISIBLE_LENGTH). */
  readonly sequence: readonly PatternColor[];
  /** The correct color for the "?" slot. */
  readonly correctColor: PatternColor;
  /** Three option colors, in display order. Exactly one equals `correctColor`. */
  readonly options: readonly [PatternColor, PatternColor, PatternColor];
  /** Position (0/1/2) of the correct option in `options`. */
  readonly correctIndex: 0 | 1 | 2;
  /** Theme rotated per round — drives bg + caption flavor. */
  readonly theme: PreschoolTheme;
}

/**
 * 8-round plan: 2 rounds of each tier in difficulty order. Post-
 * shuffle the order is randomised but the count-per-tier stays at
 * 2-2-2-2.
 */
const PLAN: readonly PatternKind[] = [
  'AB', 'AB',
  'AAB', 'AAB',
  'ABB', 'ABB',
  'ABC', 'ABC',
];

/** Pick a random element from `xs` using `rand`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T =>
  xs[Math.floor(rand() * xs.length)]!;

/** Fisher–Yates in-place. Returns the same array for chaining. */
const shuffleInPlace = <T>(xs: T[], rand: () => number): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = xs[i]!;
    xs[i] = xs[j]!;
    xs[j] = tmp;
  }
  return xs;
};

/**
 * Pick `n` distinct colors from `ALL_COLORS` using `rand`. Used to
 * choose the round's color palette before applying the cycle. Two
 * AB rounds in the same session don't have to share colors — each
 * is rolled fresh — so the kid sees genuinely different palettes
 * across the 8 rounds.
 */
const pickDistinctColors = (
  n: 2 | 3,
  rand: () => number,
): readonly PatternColor[] => {
  const pool = shuffleInPlace([...ALL_COLORS], rand);
  return pool.slice(0, n);
};

/**
 * Generate a fresh 8-round session.
 *
 *   - PLAN slots are shuffled (Fisher–Yates) so tier order varies
 *     across plays. Tier counts stay at 2-2-2-2 by construction.
 *   - For each slot we pick distinct colors via `pickDistinctColors`,
 *     apply the tier's cycle to produce a 5-position visible
 *     sequence, then evaluate the cycle at position 5 to find the
 *     correct answer.
 *   - Options = correct + 2 distractors (any 2 colors from the
 *     remaining 3 in `ALL_COLORS`). Distractors include both
 *     "other-sequence colors" (which test pattern logic) and "novel
 *     colors not in the sequence" (which give a confidence beat).
 *     Mix is random per round, balanced across the session by
 *     construction.
 *   - Themes rotate with a "no two in a row" rule, same as the
 *     triad games.
 *
 * `rand` is injectable so tests can pin to a deterministic sequence.
 * Default uses `Math.random`.
 */
export const generateSession = (
  rand: () => number = Math.random,
): PatternRound[] => {
  const plan = shuffleInPlace([...PLAN], rand);
  const rounds: PatternRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const kind of plan) {
    const colors = pickDistinctColors(COLORS_NEEDED[kind], rand);
    const cycle = CYCLE_FOR[kind];

    // Build the visible sequence by walking the cycle.
    const sequence: PatternColor[] = [];
    for (let i = 0; i < VISIBLE_LENGTH; i++) {
      sequence.push(colors[cycle[i % cycle.length]!]!);
    }
    // The correct color at the "?" slot is just the cycle evaluated
    // at the next position.
    const correctColor =
      colors[cycle[VISIBLE_LENGTH % cycle.length]!]!;

    // Distractors: 2 colors from ALL_COLORS that aren't the correct
    // answer. Shuffle the pool, take the first 2 — gives a uniform
    // distribution across the 3 candidate distractor colors.
    const distractorPool = shuffleInPlace(
      ALL_COLORS.filter((c) => c !== correctColor) as PatternColor[],
      rand,
    );
    const distractors: readonly PatternColor[] = distractorPool.slice(0, 2);

    const optionsArr: PatternColor[] = shuffleInPlace(
      [correctColor, distractors[0]!, distractors[1]!],
      rand,
    );
    const options: readonly [PatternColor, PatternColor, PatternColor] = [
      optionsArr[0]!,
      optionsArr[1]!,
      optionsArr[2]!,
    ];
    const correctIndex = options.indexOf(correctColor) as 0 | 1 | 2;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({ kind, sequence, correctColor, options, correctIndex, theme });
  }

  return rounds;
};

/**
 * Build the narration script for one round.
 *
 * Phases (mirrors the triad's `RoundNarration` shape):
 *   - `intro` — "What comes next? Look at the pattern!"
 *   - `correct` — Right-tap celebration: "Yes! Red!"
 *   - `rerun` — Wrong-tap intro: "Not that one. Let's look at the pattern."
 *   - `colorWord(c)` — used during the wrong-tap walk-through to
 *     speak each item: "Red... blue... red..."
 *   - `reveal` — Wrong-tap conclusion: "Red! It was red."
 *
 * Note: theme is intentionally NOT incorporated into the narration
 * here. The pattern primitive (color) is theme-independent, and a
 * narration like "What comes next, ducks?" would feel bolted-on.
 * The theme reads visually (background + caption tone), not in the
 * spoken words. This is the deliberate split called out in the
 * file header.
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly reveal: string;
  /** Narration for each item in the visible sequence — used by the
   *  errorless wrong-tap walk-through. Returns the spoken color word. */
  readonly colorWord: (c: PatternColor) => string;
}

const cap1 = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const buildNarration = (round: PatternRound): RoundNarration => {
  const correctWord = COLOR_LABEL[round.correctColor];
  return {
    intro: `What comes next? Look at the pattern!`,
    correct: `Yes! ${cap1(correctWord)}!`,
    rerun: `${WRONG_LEAD} Let's look at the pattern.`,
    reveal: `${cap1(correctWord)}! It was ${correctWord}.`,
    colorWord: (c: PatternColor): string => COLOR_LABEL[c],
  };
};

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'pattern_sequences_stats_v1';

export interface PatternStats {
  /** Total sessions completed (full 8 rounds). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right color first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: PatternStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadPatternStats = (): PatternStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<PatternStats>;
    return {
      sessions: typeof p.sessions === 'number' ? p.sessions : 0,
      rounds: typeof p.rounds === 'number' ? p.rounds : 0,
      correctFirstTry:
        typeof p.correctFirstTry === 'number' ? p.correctFirstTry : 0,
      lastPlayed: typeof p.lastPlayed === 'string' ? p.lastPlayed : '',
    };
  } catch {
    return ZERO_STATS;
  }
};

export const savePatternStats = (s: PatternStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
