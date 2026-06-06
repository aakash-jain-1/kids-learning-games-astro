/**
 * Data for the Sorting Friends game — first preschool-COGNITIVE game in
 * the Astro project (added 2026-06-06), targeting age 3-4. Fills the
 * "cognitive — sorting / categorization" domain gap called out in
 * ROADMAP.md (a core age-3 pre-math thinking skill that the math and
 * literacy families don't touch).
 *
 * ── Pedagogy primitives ────────────────────────────────────────────
 *
 * - **Single-attribute categorization, tap-all form.** Each round names
 *   ONE category ("things that live in the sea") and asks the child to
 *   tap EVERY item in a tray that belongs. Sorting by a single attribute
 *   is the canonical age-3 cognitive task in the early-learning
 *   standards (IL/OH/SC ELS: "sorts and classifies objects by one
 *   attribute"); the tap-all framing is the digital analogue of the
 *   classic sorting-mat activity.
 *
 * - **Sibling-bucket distractors (unambiguous membership).** A round's
 *   non-belonging tiles are drawn from OTHER buckets of the SAME sort
 *   dimension — a habitat round mixes sea / land / sky animals, a kind
 *   round mixes food / toys. Within a dimension the buckets are mutually
 *   exclusive, so every tile has a single, unambiguous answer. This is
 *   what makes the errorless flow honest: there's never a "well, it
 *   could go either way" tile to shake at a 3yo.
 *
 * - **Errorless wrong tap.** Tapping a non-belonging tile never ends the
 *   round or deducts anything — it gets a 250ms kinesthetic shake (no
 *   colour shift, no buzzer) and a gentle spoken correction ("a dog
 *   lives on land, not the sea"), then the child keeps going. Same
 *   age-safe principle as the rest of the preschool family.
 *
 * - **Tiered prompts, 8 rounds.** Difficulty rises across the session:
 *   the most concrete + familiar dimension (habitat) leads, then kind,
 *   then the more abstract size sort. No `preschool-stages` machinery —
 *   that staged maxN/frameSize system is math-specific. Stats schema is
 *   bespoke (`sorting_friends_stats_v1`), identical in shape to Letter /
 *   Sound Friends (no stage fields). See `src/data/stats-registry.ts`
 *   for the registry plumbing (the new preschool-cognitive family).
 *
 * - **First-try = a clean round.** With a multi-select mechanic there's
 *   no single "first tap" to score, so `correctFirstTry` counts rounds
 *   completed with ZERO wrong taps (the child found every target without
 *   touching a distractor). `rounds` counts every completed round.
 */

import {
  THEMES,
  THEME_BY_KEY,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';

export type { PreschoolTheme, ThemeMeta };
export { THEMES, THEME_BY_KEY };

// ── Sort dimensions + buckets ──────────────────────────────────────

/** A sort dimension groups mutually-exclusive buckets (the contrast set). */
export type SortDimension = 'habitat' | 'kind' | 'size';

/** One categorisable bucket within a dimension. */
export type SortCategory =
  | 'sea' | 'land' | 'sky' // habitat
  | 'food' | 'toy' // kind
  | 'big' | 'small'; // size

/** One sortable item — a label + emoji. `id` is stable for DOM/test hooks. */
export interface SortItem {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
}

/**
 * Item pools keyed by bucket. Within a dimension the buckets are
 * mutually exclusive (an animal is sea OR land OR sky, never two), which
 * is what keeps the errorless contrast honest. Emoji follow the same
 * tile-face convention as `@/data/animals.ts` (`e` field).
 */
const POOLS: Readonly<Record<SortCategory, readonly SortItem[]>> = {
  // habitat dimension
  sea: [
    { id: 'fish', label: 'Fish', emoji: '🐟' },
    { id: 'octopus', label: 'Octopus', emoji: '🐙' },
    { id: 'whale', label: 'Whale', emoji: '🐳' },
    { id: 'crab', label: 'Crab', emoji: '🦀' },
    { id: 'dolphin', label: 'Dolphin', emoji: '🐬' },
    { id: 'shark', label: 'Shark', emoji: '🦈' },
  ],
  land: [
    { id: 'dog', label: 'Dog', emoji: '🐶' },
    { id: 'lion', label: 'Lion', emoji: '🦁' },
    { id: 'rabbit', label: 'Rabbit', emoji: '🐰' },
    { id: 'cow', label: 'Cow', emoji: '🐮' },
    { id: 'elephant', label: 'Elephant', emoji: '🐘' },
    { id: 'frog', label: 'Frog', emoji: '🐸' },
  ],
  sky: [
    { id: 'bird', label: 'Bird', emoji: '🐦' },
    { id: 'butterfly', label: 'Butterfly', emoji: '🦋' },
    { id: 'bee', label: 'Bee', emoji: '🐝' },
    { id: 'owl', label: 'Owl', emoji: '🦉' },
    { id: 'parrot', label: 'Parrot', emoji: '🦜' },
    { id: 'duck', label: 'Duck', emoji: '🦆' },
  ],
  // kind dimension
  food: [
    { id: 'apple', label: 'Apple', emoji: '🍎' },
    { id: 'banana', label: 'Banana', emoji: '🍌' },
    { id: 'pizza', label: 'Pizza', emoji: '🍕' },
    { id: 'carrot', label: 'Carrot', emoji: '🥕' },
    { id: 'strawberry', label: 'Strawberry', emoji: '🍓' },
    { id: 'bread', label: 'Bread', emoji: '🍞' },
  ],
  toy: [
    { id: 'ball', label: 'Ball', emoji: '⚽' },
    { id: 'teddy', label: 'Teddy', emoji: '🧸' },
    { id: 'blocks', label: 'Blocks', emoji: '🧱' },
    { id: 'kite', label: 'Kite', emoji: '🪁' },
    { id: 'balloon', label: 'Balloon', emoji: '🎈' },
    { id: 'drum', label: 'Drum', emoji: '🥁' },
  ],
  // size dimension (animals — same emoji set, sorted by real-world size)
  big: [
    { id: 'elephant-b', label: 'Elephant', emoji: '🐘' },
    { id: 'whale-b', label: 'Whale', emoji: '🐳' },
    { id: 'giraffe-b', label: 'Giraffe', emoji: '🦒' },
    { id: 'hippo-b', label: 'Hippo', emoji: '🦛' },
    { id: 'bear-b', label: 'Bear', emoji: '🐻' },
  ],
  small: [
    { id: 'ant-s', label: 'Ant', emoji: '🐜' },
    { id: 'mouse-s', label: 'Mouse', emoji: '🐭' },
    { id: 'bee-s', label: 'Bee', emoji: '🐝' },
    { id: 'ladybug-s', label: 'Ladybug', emoji: '🐞' },
    { id: 'chick-s', label: 'Chick', emoji: '🐤' },
  ],
};

/**
 * Display metadata per bucket — the prompt phrasing + a prompt emoji +
 * the short clause used in narration ("lives in the sea"). The clause is
 * grammatical as both a question ("does it live in the sea?") and a
 * statement ("a dog lives on land, not the sea").
 */
interface CategoryMeta {
  readonly category: SortCategory;
  readonly dimension: SortDimension;
  /** Short label for the prompt pill, e.g. "live in the sea". */
  readonly promptLabel: string;
  /** Prompt emoji shown in the category card. */
  readonly promptEmoji: string;
  /** Predicate clause for narration, e.g. "lives in the sea". */
  readonly clause: string;
  /** Sibling buckets in the same dimension (distractor source). */
  readonly siblings: readonly SortCategory[];
}

const CATEGORY_META: Readonly<Record<SortCategory, CategoryMeta>> = {
  sea: { category: 'sea', dimension: 'habitat', promptLabel: 'live in the sea', promptEmoji: '🌊', clause: 'lives in the sea', siblings: ['land', 'sky'] },
  land: { category: 'land', dimension: 'habitat', promptLabel: 'live on land', promptEmoji: '🌳', clause: 'lives on land', siblings: ['sea', 'sky'] },
  sky: { category: 'sky', dimension: 'habitat', promptLabel: 'fly in the sky', promptEmoji: '☁️', clause: 'flies in the sky', siblings: ['sea', 'land'] },
  food: { category: 'food', dimension: 'kind', promptLabel: 'are yummy to eat', promptEmoji: '🍎', clause: 'is food', siblings: ['toy'] },
  toy: { category: 'toy', dimension: 'kind', promptLabel: 'are toys to play with', promptEmoji: '🧸', clause: 'is a toy', siblings: ['food'] },
  big: { category: 'big', dimension: 'size', promptLabel: 'are big animals', promptEmoji: '🐘', clause: 'is big', siblings: ['small'] },
  small: { category: 'small', dimension: 'size', promptLabel: 'are small animals', promptEmoji: '🐜', clause: 'is small', siblings: ['big'] },
};

// ── Tier progression ───────────────────────────────────────────────

/**
 * Per-round plan (8 rounds). Each round names a target category, how
 * many target tiles to show, and how many distractor tiles. Difficulty
 * climbs: habitat first (most concrete + familiar), then kind, then the
 * more abstract size sort; tray size and target count grow gently.
 */
interface RoundPlan {
  readonly category: SortCategory;
  readonly targets: number;
  readonly distractors: number;
  readonly tier: 0 | 1 | 2;
}

const PLAN_BY_ROUND: readonly RoundPlan[] = [
  // Tier 1 — habitat, smallest trays
  { category: 'sea', targets: 2, distractors: 2, tier: 0 },
  { category: 'land', targets: 2, distractors: 2, tier: 0 },
  { category: 'sky', targets: 2, distractors: 3, tier: 0 },
  // Tier 2 — kind + habitat, medium trays
  { category: 'food', targets: 3, distractors: 2, tier: 1 },
  { category: 'toy', targets: 2, distractors: 3, tier: 1 },
  { category: 'sea', targets: 3, distractors: 2, tier: 1 },
  // Tier 3 — size, largest trays
  { category: 'big', targets: 3, distractors: 3, tier: 2 },
  { category: 'small', targets: 3, distractors: 3, tier: 2 },
];

export const TOTAL_ROUNDS = PLAN_BY_ROUND.length;

// ── Round shape ────────────────────────────────────────────────────

/** A tile in a round's tray — an item plus whether it belongs to the target. */
export interface SortTile {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
  /** True if this tile belongs to the round's target category. */
  readonly belongs: boolean;
}

/**
 * One round: a target `category` (the child finds all its members), a
 * shuffled `tiles` tray (`targetCount` belong, the rest are sibling-bucket
 * distractors), and presentation metadata.
 */
export interface SortRound {
  readonly dimension: SortDimension;
  readonly category: SortCategory;
  readonly promptLabel: string;
  readonly promptEmoji: string;
  /** Predicate clause for narration ("lives in the sea"). */
  readonly clause: string;
  readonly tiles: readonly SortTile[];
  /** Number of belonging tiles — the round completes when all are found. */
  readonly targetCount: number;
  readonly tier: 0 | 1 | 2;
  readonly theme: PreschoolTheme;
}

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

/** Take `n` distinct random items from `pool`. */
const takeN = (pool: readonly SortItem[], n: number, rand: () => number): SortItem[] => {
  const copy = [...pool];
  shuffleInPlace(copy, rand);
  return copy.slice(0, n);
};

// ── Session generation ────────────────────────────────────────────

/**
 * Generate a fresh 8-round session.
 *
 * - Round k draws its plan from `PLAN_BY_ROUND[k]`: a target category +
 *   target/distractor counts.
 * - Target tiles come from the category's pool; distractor tiles are
 *   pulled from sibling buckets of the SAME dimension (so the contrast
 *   is meaningful and membership unambiguous).
 * - Tiles are shuffled into a random display order.
 * - Themes rotate with a "no two in a row" rule.
 *
 * `rand` is injectable so tests + the SSR seed can pin a deterministic
 * sequence; default uses `Math.random`.
 */
export const generateSession = (rand: () => number = Math.random): SortRound[] => {
  const rounds: SortRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const plan of PLAN_BY_ROUND) {
    const meta = CATEGORY_META[plan.category];

    const targetItems = takeN(POOLS[plan.category], plan.targets, rand);

    // Distractors: round-robin across sibling buckets so a round mixes
    // both siblings where possible (e.g. land + sky for a sea round).
    const distractorPool: SortItem[] = [];
    const siblingTakes = meta.siblings.map((sib) =>
      takeN(POOLS[sib], plan.distractors, rand),
    );
    let si = 0;
    while (distractorPool.length < plan.distractors) {
      const fromSibling = siblingTakes[si % siblingTakes.length]!;
      const next = fromSibling.shift();
      if (next) distractorPool.push(next);
      si++;
      // Safety: every sibling exhausted — stop to avoid an infinite loop.
      if (si > siblingTakes.length * 8) break;
    }

    const tiles: SortTile[] = [
      ...targetItems.map((it) => ({ ...it, belongs: true })),
      ...distractorPool.map((it) => ({ ...it, belongs: false })),
    ];
    shuffleInPlace(tiles, rand);

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({
      dimension: meta.dimension,
      category: plan.category,
      promptLabel: meta.promptLabel,
      promptEmoji: meta.promptEmoji,
      clause: meta.clause,
      tiles,
      targetCount: targetItems.length,
      tier: plan.tier,
      theme,
    });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

/**
 * Narration script for one round.
 *
 * - `intro` — "Find all the friends that live in the sea! Tap the ones
 *    that belong."
 * - `correctItem(tile)` — "Yes! A fish lives in the sea!"
 * - `wrongItem(tile)` — "Hmm, a dog lives on land, not the sea. Try
 *    another!" (errorless — names the right home, no scolding)
 * - `complete(n)` — "Hooray! You found all 3 sea friends!"
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correctItem: (tile: SortTile) => string;
  readonly wrongItem: (tile: SortTile) => string;
  readonly complete: (found: number) => string;
}

/** Lowercase the first letter of a tile label for mid-sentence use. */
const lc = (s: string): string => (s ? s[0]!.toLowerCase() + s.slice(1) : s);

export const buildNarration = (round: SortRound): RoundNarration => {
  const { promptLabel, clause, category } = round;
  // A short, kid-friendly group noun for the completion line.
  const groupNoun =
    category === 'food'
      ? 'yummy'
      : category === 'toy'
        ? 'toy'
        : category === 'big'
          ? 'big'
          : category === 'small'
            ? 'small'
            : category; // sea / land / sky read naturally ("sea friends")

  return {
    intro: `Find all the friends that ${promptLabel}! Tap the ones that belong.`,
    correctItem: (tile: SortTile): string => `Yes! A ${lc(tile.label)} ${clause}!`,
    wrongItem: (tile: SortTile): string => {
      // Name the tile's own correct home if we can find it; otherwise a
      // generic "belongs somewhere else" still reads kindly.
      const home = findClauseForItem(tile.id) ?? 'belongs somewhere else';
      return `Hmm, a ${lc(tile.label)} ${home}, not ${shortTarget(round.category)}. Try another!`;
    },
    complete: (found: number): string => `Hooray! You found all ${found} ${groupNoun} friends!`,
  };
};

/** Short "where" phrase for the target, used in the wrong-tap correction. */
const shortTarget = (category: SortCategory): string =>
  category === 'sea'
    ? 'the sea'
    : category === 'land'
      ? 'the land'
      : category === 'sky'
        ? 'the sky'
        : category === 'food'
          ? 'food'
          : category === 'toy'
            ? 'a toy'
            : category === 'big'
              ? 'big'
              : 'small';

/** Find the predicate clause for an item id by scanning the pools. */
const findClauseForItem = (id: string): string | null => {
  for (const cat of Object.keys(POOLS) as SortCategory[]) {
    if (POOLS[cat].some((it) => it.id === id)) {
      return CATEGORY_META[cat].clause;
    }
  }
  return null;
};

// ── Stats ──────────────────────────────────────────────────────────

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'sorting_friends_stats_v1';

export interface SortingFriendsStats {
  /** Total sessions completed (full 8 rounds). */
  readonly sessions: number;
  /** Total individual rounds completed. */
  readonly rounds: number;
  /** Rounds completed with ZERO wrong taps (a clean first-try sort). */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: SortingFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadSortingFriendsStats = (): SortingFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<SortingFriendsStats>;
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

export const saveSortingFriendsStats = (s: SortingFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
