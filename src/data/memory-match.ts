/**
 * Memory Match — preschool COGNITIVE (working memory).
 *
 * Sixth and last of the 2026-08 design set (docs/GAME-DESIGNS-2026-08.md §6).
 * Cards face down, flip two, keep them if they match. The only game in the
 * repo whose skill is *remembering* rather than recognising, discriminating
 * or sequencing.
 *
 * ── Why a non-match is not a wrong answer ──────────────────────────
 *
 * Every other preschool game here follows §5 rule 8: a wrong tap gets a red
 * tint, an error tone, a shake and a spoken correction. **This game
 * deliberately does not**, and the distinction is worth stating because it
 * looks like an omission.
 *
 * Rule 8 is about answers that are *wrong*. Flipping two cards that don't
 * match is not a wrong answer — it is how the game is played. On the first
 * flip of a board there is no information to be wrong about, and a child who
 * plays perfectly still turns over non-matching pairs. Shame-coding the
 * primary mechanic would make the game feel like failing at something the
 * child is in fact doing correctly. So a non-match holds both cards face up
 * long enough to encode (~1.2s), says something warm — *"Not a pair yet.
 * Remember where they are!"* — and flips them back with no tone and no
 * shake. A match pops, confettis and names the animal.
 *
 * There is no timer, no move counter and no score shown to the child.
 *
 * ── The run is the progression (this answers design-doc Q5) ────────
 *
 * The design doc wanted the board to grow 3 pairs → 4 → 6, and asked whether
 * that should be a bespoke stage model or a bent `preschool-stages.ts`.
 * Neither: the growth is the shape of **one run**. A sitting plays all three
 * boards back to back, small to large, and nothing about difficulty is
 * persisted.
 *
 * That falls out of §5 rule 11 ("a bounded set is played to completion")
 * once you notice 3 + 4 + 6 = 13 — so a run can deal every animal in the
 * pool exactly once and finish. It also removes the reason Q5 was hard:
 * `StageMeta` is `{ rounds, maxN, frameSize, allThemes }`, of which `maxN`
 * and `frameSize` are meaningless for a memory board, and widening a
 * three-consumer shared module to carry two dead fields for a fourth would
 * make it worse for the three that use it properly.
 *
 * Growing *within* a sitting is also the better pedagogy. A stage the child
 * has to re-earn depends on what happened last time, which a 3-year-old does
 * not remember and a parent cannot see; three boards in a row ramp while she
 * is already warmed up, and every play ends on the hardest one she can do.
 *
 * ── Why these thirteen animals ─────────────────────────────────────
 *
 * Identities come from the shipped Animals deck (`animals.ts`) by name, so
 * the emoji stay in one place, and a curated subset rather than the full 42
 * because a memory card has to be identifiable at a glance and at tile size.
 * The pool is picked for *visual* separation rather than taxonomic spread —
 * a child matching pictures needs the cards to look unalike, so the set
 * mixes face emoji with whole-body ones and spreads the colours out.
 */

import { ALL_CARDS as ANIMAL_CARDS } from '@/data/animals';
import { THEMES, type PreschoolTheme } from '@/lib/preschool-themes';

export { THEMES, THEME_BY_KEY } from '@/lib/preschool-themes';
export type { PreschoolTheme, ThemeMeta } from '@/lib/preschool-themes';

// ── The pool ───────────────────────────────────────────────────────

export type AnimalId =
  | 'cat'
  | 'dog'
  | 'cow'
  | 'pig'
  | 'frog'
  | 'bee'
  | 'lion'
  | 'elephant'
  | 'monkey'
  | 'fish'
  | 'duck'
  | 'turtle'
  | 'butterfly';

export interface MemoryAnimal {
  readonly id: AnimalId;
  /** Display + spoken name, e.g. "Cat". */
  readonly name: string;
  /** The card face. */
  readonly emoji: string;
  /** Spoken plural — "fish", not "fishs". */
  readonly plural: string;
  /** Spoken article — "an elephant", not "a elephant". */
  readonly article: 'a' | 'an';
}

/**
 * The curated thirteen, resolved against the Animals deck below. Thirteen is
 * what 3 + 4 + 6 pairs needs, so one run deals each animal exactly once.
 *
 * Plural and article are spelled out per entry rather than derived. Every
 * one of these words is *spoken aloud*, and both rules have exceptions in
 * this very pool — naive `+ "s"` gives "fishs" and "butterflys", and a
 * first-letter vowel test would give "an unicorn" the moment someone adds
 * the deck's unicorn. Thirteen literals cost less than either bug.
 */
interface PoolSpec {
  readonly deckName: string;
  readonly plural: string;
  readonly article: 'a' | 'an';
}

const POOL_SPEC: Readonly<Record<AnimalId, PoolSpec>> = {
  cat: { deckName: 'Cat', plural: 'cats', article: 'a' },
  dog: { deckName: 'Dog', plural: 'dogs', article: 'a' },
  cow: { deckName: 'Cow', plural: 'cows', article: 'a' },
  pig: { deckName: 'Pig', plural: 'pigs', article: 'a' },
  frog: { deckName: 'Frog', plural: 'frogs', article: 'a' },
  bee: { deckName: 'Bee', plural: 'bees', article: 'a' },
  lion: { deckName: 'Lion', plural: 'lions', article: 'a' },
  elephant: { deckName: 'Elephant', plural: 'elephants', article: 'an' },
  monkey: { deckName: 'Monkey', plural: 'monkeys', article: 'a' },
  fish: { deckName: 'Fish', plural: 'fish', article: 'a' },
  duck: { deckName: 'Duck', plural: 'ducks', article: 'a' },
  turtle: { deckName: 'Turtle', plural: 'turtles', article: 'a' },
  butterfly: { deckName: 'Butterfly', plural: 'butterflies', article: 'a' },
};

const DECK_BY_NAME = new Map(ANIMAL_CARDS.map((c) => [c.name, c]));

/**
 * Resolve the pool against the shipped deck.
 *
 * Throws rather than falling back, and does so at module load: a renamed or
 * removed animal is a content bug that should stop the build, not surface as
 * a blank card in front of a child. Same stance as Rhyme Time's load-time
 * assertion.
 */
export const POOL: readonly MemoryAnimal[] = (
  Object.keys(POOL_SPEC) as AnimalId[]
).map((id) => {
  const spec = POOL_SPEC[id];
  const card = DECK_BY_NAME.get(spec.deckName);
  if (!card) {
    throw new Error(
      `memory-match: "${spec.deckName}" is not in the Animals deck. ` +
        'Either it was renamed there, or this pool needs updating.',
    );
  }
  return {
    id,
    name: card.name,
    emoji: card.e,
    plural: spec.plural,
    article: spec.article,
  };
});

const POOL_BY_ID: Readonly<Record<AnimalId, MemoryAnimal>> = Object.fromEntries(
  POOL.map((a) => [a.id, a]),
) as Record<AnimalId, MemoryAnimal>;

export const lookupAnimal = (id: AnimalId): MemoryAnimal => POOL_BY_ID[id];

// ── Board shape ────────────────────────────────────────────────────

/**
 * Pairs on each board, in play order. Small first so the child learns the
 * mechanic on a board that is almost impossible to find hard, then twice
 * more with more to hold.
 *
 * Six pairs (twelve cards) is the ceiling on purpose: it is a real memory
 * load for a 3-year-old but it lays out as a clean 4 x 3 that still fits a
 * phone, and with no timer and no fail state the only cost of forgetting is
 * another flip.
 */
export const BOARD_SIZES: readonly number[] = [3, 4, 6];

/** Pairs in a whole run — 13, which is also the size of the pool. */
export const TOTAL_PAIRS = BOARD_SIZES.reduce((n, s) => n + s, 0);

export const BOARD_COUNT = BOARD_SIZES.length;

export interface MemoryCard {
  /** Which animal is on the face. Two cards per board share this. */
  readonly animal: AnimalId;
  /** Position in the dealt board, 0-based. Stable identity for the DOM. */
  readonly slot: number;
}

export interface MemoryBoard {
  /** 0-based board number within the run. */
  readonly index: number;
  /** Pairs on this board — `cards.length / 2`. */
  readonly pairs: number;
  /** The dealt cards, in display order. */
  readonly cards: readonly MemoryCard[];
  /** Backdrop for this board, rotated so each one feels like a new place. */
  readonly theme: PreschoolTheme;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Fisher-Yates shuffle of a copy of `xs`. */
const shuffled = <T>(xs: readonly T[], rand: () => number): T[] => {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

// ── Run generation ─────────────────────────────────────────────────

/**
 * Deal a whole run: three boards, growing, sharing out the pool so **every
 * animal appears on exactly one board** (§5 rule 11).
 *
 * Dealing from a single shuffled pool rather than sampling per board is what
 * guarantees that. Sampling independently would let the cat turn up on all
 * three boards while the turtle never appears, which in a game the child
 * replays is the difference between meeting thirteen animals and meeting
 * four.
 */
export const generateRun = (rand: () => number = Math.random): MemoryBoard[] => {
  const deck = shuffled(POOL, rand);
  const themes = shuffled(THEMES, rand);

  let taken = 0;
  return BOARD_SIZES.map((pairs, index) => {
    const animals = deck.slice(taken, taken + pairs);
    taken += pairs;

    const faces = shuffled(
      animals.flatMap((a) => [a.id, a.id]),
      rand,
    );

    return {
      index,
      pairs,
      cards: faces.map((animal, slot) => ({ animal, slot })),
      theme: (themes[index % themes.length] ?? THEMES[0]!).key,
    };
  });
};

// ── Narration ──────────────────────────────────────────────────────

export interface BoardNarration {
  /** Spoken when a board is dealt. */
  readonly intro: string;
  /** Spoken when the board is cleared. */
  readonly cleared: string;
}

/**
 * What the child hears when a board opens and when it is cleared.
 *
 * The intro says how many pairs rather than how many cards, because "find
 * three pairs" describes the goal and "six cards" describes the furniture.
 */
export const buildBoardNarration = (board: MemoryBoard): BoardNarration => {
  const n = board.pairs;
  const last = board.index === BOARD_COUNT - 1;

  return {
    intro:
      board.index === 0
        ? `Let's play memory! Find ${n} matching pairs. Tap a card to turn it over.`
        : `Nice! Now a bigger board. Find ${n} pairs this time.`,
    cleared: last
      ? 'You cleared the biggest board!'
      : 'Board cleared! Here comes another one.',
  };
};

/** Spoken when two flipped cards match. */
export const matchLine = (animal: AnimalId): string =>
  `You found the two ${lookupAnimal(animal).plural}!`;

/** "a cat", "an elephant" — for the miss line, which names both cards. */
const withArticle = (id: AnimalId): string => {
  const a = lookupAnimal(id);
  return `${a.article} ${a.name.toLowerCase()}`;
};

/**
 * Spoken when two flipped cards don't match.
 *
 * Names both animals, because the point of the pause is to encode *what* is
 * *where*, and hearing the two names while looking at them is the help a
 * 3-year-old can actually use. Never says wrong, no, or try again — see the
 * file header on why a non-match isn't a wrong answer.
 */
export const missLine = (a: AnimalId, b: AnimalId): string => {
  const first = withArticle(a);
  return `${first.charAt(0).toUpperCase()}${first.slice(1)} and ${withArticle(
    b,
  )}. Not a pair yet. Remember where they are!`;
};

// ── Stats ──────────────────────────────────────────────────────────

export const STATS_KEY = 'memory_match_stats_v1';

export interface MemoryMatchStats {
  /** Full runs finished — all three boards cleared. */
  readonly sessions: number;
  /** Pairs found, across every board. */
  readonly rounds: number;
  /**
   * Pairs matched without either of their cards having been turned over and
   * missed earlier — i.e. found by remembering rather than by elimination.
   * Keeps the four-field shape meaningful for a game with no wrong answers.
   */
  readonly correctFirstTry: number;
  /** `YYYY-MM-DD`, or `''` when never played. */
  readonly lastPlayed: string;
}

const ZERO: MemoryMatchStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

/** SSR-safe read — returns the zero state on the server or if storage is off. */
export const loadMemoryMatchStats = (): MemoryMatchStats => {
  if (typeof localStorage === 'undefined') return ZERO;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO;
    const parsed = JSON.parse(raw) as Partial<MemoryMatchStats>;
    return {
      sessions: Number(parsed.sessions) || 0,
      rounds: Number(parsed.rounds) || 0,
      correctFirstTry: Number(parsed.correctFirstTry) || 0,
      lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : '',
    };
  } catch {
    return ZERO;
  }
};

export const saveMemoryMatchStats = (stats: MemoryMatchStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage disabled / private mode — match site convention. */
  }
};
