/**
 * Opposites Friends — contrast vocabulary for ages 3–4.
 *
 * "The elephant is **big**. Which one is **small**?" A target word is shown
 * with its picture; three option cards sit below it and the child taps the
 * one that means the opposite.
 *
 * ── Why this game ──────────────────────────────────────────────────
 *
 * Opposites are how a preschooler first learns that words come in
 * *contrasting pairs* rather than as isolated labels, and comparative
 * language ("bigger", "hotter", "slower") is an explicit early-math and
 * early-language standard. More Friends already teaches one contrast —
 * more vs less, by counting — and this generalises the same move to nine
 * more dimensions the child can see rather than count.
 *
 * ── Content comes from the shipped Flashcards deck ─────────────────
 *
 * Identity (`name` + the spoken fact) is read out of the `opposites` deck
 * in `@/data/flashcards`, so the two games can never drift on what a word
 * means. That deck used to encode a **false pair** — `Strong` opposite
 * `Light` — which was fixed by authoring `Weak` and `Heavy`, giving the
 * ten clean pairs below. Nothing here re-authors deck content.
 *
 * What *is* pinned locally, following the Feeling Friends precedent:
 *
 *   - **The picture.** The deck renders `Big` / `Small` as 🔆 / 🔅, the
 *     high- and low-brightness symbols. Those work in a browse deck where
 *     the word is printed underneath, but here the picture has to carry
 *     the concept to a child who cannot read, and two nearly identical
 *     sun glyphs carry nothing. `EMOJI` overrides only where that is true;
 *     every other word keeps the deck's own emoji.
 *   - **The hint.** One short "what to look for" line per word, spoken
 *     during the guided correction so a miss teaches the *concept*
 *     ("small means little — look for the tiny one") rather than just
 *     pointing at the answer.
 *
 * Stats are bespoke (`opposites_friends_stats_v1`), the standard
 * four-field preschool shape with no stages — the auto-advancing stage
 * system is math-specific. Filed under `preschool-cognitive`; no new
 * stats family.
 */

import { DECKS } from '@/data/flashcards';
import { WRONG_LEAD } from '@/data/preschool-narration';
import {
  THEMES,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';

export { THEMES, THEME_BY_KEY } from '@/lib/preschool-themes';
export type { PreschoolTheme, ThemeMeta } from '@/lib/preschool-themes';


// ── The pool ───────────────────────────────────────────────────────

export type OppositeId =
  | 'up' | 'down'
  | 'big' | 'small'
  | 'hot' | 'cold'
  | 'day' | 'night'
  | 'fast' | 'slow'
  | 'strong' | 'weak'
  | 'heavy' | 'light'
  | 'happy' | 'sad'
  | 'loud' | 'quiet'
  | 'new' | 'old';

export interface OppositeMeta {
  readonly id: OppositeId;
  /** Display + spoken word, e.g. "Big". */
  readonly name: string;
  /** Big emoji used as the card face. */
  readonly emoji: string;
  /** Kid-friendly fact from the shared deck, spoken after a correct tap. */
  readonly fact: string;
  /**
   * What to look for, spoken during the guided correction — e.g. "small
   * means little, so look for the tiny one". Phrased as a rule the child
   * can reuse next round, not as a description of this one picture.
   */
  readonly hint: string;
  /** The one word this is the opposite of. */
  readonly opposite: OppositeId;
}

/** The ten pairs, in rough order of how concrete they are to a 3-year-old. */
export const PAIRS: ReadonlyArray<readonly [OppositeId, OppositeId]> = [
  ['big', 'small'],
  ['hot', 'cold'],
  ['up', 'down'],
  ['day', 'night'],
  ['happy', 'sad'],
  ['fast', 'slow'],
  ['loud', 'quiet'],
  ['heavy', 'light'],
  ['strong', 'weak'],
  ['new', 'old'],
];

/**
 * Rounds in one full run — every pair asked in **both** directions, so
 * 10 pairs × 2 = 20. Derived from `PAIRS`, so adding an eleventh pair
 * lengthens the run instead of leaving it unreachable.
 *
 * Both directions count as separate questions on purpose; see
 * `generateRun`.
 */
export const TOTAL_ROUNDS = PAIRS.length * 2;

/**
 * Which `opposites` deck card backs each id. Looked up by `n` (the deck's
 * natural key) so a rename over there fails this build loudly instead of
 * silently rendering blank cards.
 */
const DECK_NAME: Readonly<Record<OppositeId, string>> = {
  up: 'Up', down: 'Down',
  big: 'Big', small: 'Small',
  hot: 'Hot', cold: 'Cold',
  day: 'Day', night: 'Night',
  fast: 'Fast', slow: 'Slow',
  strong: 'Strong', weak: 'Weak',
  heavy: 'Heavy', light: 'Light',
  happy: 'Happy', sad: 'Sad',
  loud: 'Loud', quiet: 'Quiet',
  new: 'New', old: 'Old',
};

/**
 * Picture overrides, applied only where the deck's emoji cannot carry the
 * concept on its own:
 *
 * - `big` / `small` — the deck ships 🔆 / 🔅 (brightness symbols). Swapped
 *   for the elephant and the ant, which are also the subjects of those two
 *   cards' facts, so picture and narration agree.
 * - `fast` — the deck ships 🏃 (a runner) while its fact is about a
 *   cheetah, and its partner `slow` is a turtle. 🐆 keeps the pair as two
 *   animals rather than a person versus an animal.
 *
 * Every other word keeps the deck emoji.
 */
const EMOJI: Partial<Record<OppositeId, string>> = {
  big: '🐘',
  small: '🐜',
  fast: '🐆',
};

/** Authored: the reusable rule spoken when the child needs a nudge. */
const HINT: Readonly<Record<OppositeId, string>> = {
  up: 'up means going higher, so look for the one pointing at the sky',
  down: 'down means going lower, so look for the one pointing at the ground',
  big: 'big means huge, so look for the largest one',
  small: 'small means little, so look for the tiniest one',
  hot: 'hot means warm like fire, so look for the one that would burn you',
  cold: 'cold means chilly like snow, so look for the frosty one',
  day: 'day is when the sun is out and everything is bright',
  night: 'night is when it is dark and the moon comes out',
  fast: 'fast means zooming along, so look for the speedy one',
  slow: 'slow means taking a long time, so look for the one that plods',
  strong: 'strong means powerful, so look for the one with big muscles',
  weak: 'weak means floppy, so look for the one that cannot hold itself up',
  heavy: 'heavy means hard to lift, so look for the one you need both hands for',
  light: 'light means easy to lift, so look for the one that floats',
  happy: 'happy is a smiling face',
  sad: 'sad is a crying face',
  loud: 'loud means very noisy, so look for the one that booms',
  quiet: 'quiet means hushed, so look for the one being silent',
  new: 'new means it has never been used, so look for the shiny one',
  old: 'old means it has been loved for a long time',
};

const OPPOSITE_OF: Readonly<Record<OppositeId, OppositeId>> = (() => {
  const map: Partial<Record<OppositeId, OppositeId>> = {};
  for (const [a, b] of PAIRS) {
    map[a] = b;
    map[b] = a;
  }
  return map as Record<OppositeId, OppositeId>;
})();

export const ALL_WORDS: readonly OppositeId[] = PAIRS.flat();

const META_BY_ID: Readonly<Record<OppositeId, OppositeMeta>> = (() => {
  const deck = DECKS.find((d) => d.key === 'opposites');
  if (!deck) {
    throw new Error(
      'opposites-friends: no "opposites" deck in @/data/flashcards. Every ' +
        'word is sourced from it — restore the deck.',
    );
  }

  const map: Partial<Record<OppositeId, OppositeMeta>> = {};
  for (const id of ALL_WORDS) {
    const name = DECK_NAME[id];
    const card = deck.cards.find((c) => c.n === name);
    if (!card) {
      throw new Error(
        `opposites-friends: the "opposites" deck has no "${name}" card. ` +
          `Restore it or drop the pair containing "${id}" from PAIRS.`,
      );
    }
    map[id] = {
      id,
      name: card.n,
      emoji: EMOJI[id] ?? card.e ?? '❓',
      fact: card.f,
      hint: HINT[id],
      opposite: OPPOSITE_OF[id],
    };
  }
  return map as Record<OppositeId, OppositeMeta>;
})();

export const lookupWord = (id: OppositeId): OppositeMeta => META_BY_ID[id];

// ── Tier progression ───────────────────────────────────────────────

/** Pairs whose contrast is visible in the picture with no explanation. */
const TIER_1_PAIRS: readonly number[] = [0, 1, 2, 3];
/** Still concrete, but the contrast is an action or a sound rather than a shape. */
const TIER_2_PAIRS: readonly number[] = [4, 5, 6];
/** The abstract end: force, weight and age. */
const TIER_3_PAIRS: readonly number[] = [7, 8, 9];

/** The tiers in play order. Together they index every pair exactly once. */
const TIERS: ReadonlyArray<readonly number[]> = [
  TIER_1_PAIRS,
  TIER_2_PAIRS,
  TIER_3_PAIRS,
];

/**
 * Words a 3-year-old could reasonably read as meaning the same thing. A
 * distractor drawn from the answer's group would make a "wrong" tap
 * defensible — asked for the opposite of *big*, a child pointing at
 * *light* (a feather) is not really mistaken — so those are banned from
 * the round entirely.
 *
 * Both groups are the same idea at opposite ends: physical magnitude.
 */
const MEANING_COLLISIONS: ReadonlyArray<readonly OppositeId[]> = [
  ['big', 'heavy', 'strong'],
  ['small', 'light', 'weak'],
];

/** Every word whose meaning crowds `word`'s. */
const collidesWith = (word: OppositeId): ReadonlySet<OppositeId> => {
  const out = new Set<OppositeId>();
  for (const group of MEANING_COLLISIONS) {
    if (!group.includes(word)) continue;
    for (const id of group) if (id !== word) out.add(id);
  }
  return out;
};

// ── Round shape ────────────────────────────────────────────────────

export interface OppositeRound {
  /** The word shown in the prompt card. */
  readonly target: OppositeId;
  /** Its opposite — the correct tile. */
  readonly answer: OppositeId;
  /** Words on the three option cards, in display order. One is `answer`. */
  readonly tiles: readonly [OppositeId, OppositeId, OppositeId];
  /** Position (0/1/2) of the correct card, so a tap validates without rescanning. */
  readonly correctIndex: 0 | 1 | 2;
  /** Tier this round came from (0-2). Parent stats / debug only. */
  readonly tier: 0 | 1 | 2;
  /** Theme rotated per round — drives the scene background ambience. */
  readonly theme: PreschoolTheme;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Pick a random element from `xs`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T =>
  xs[Math.floor(rand() * xs.length)]!;

/** Fisher-Yates shuffle of `xs` in place. */
const shuffleInPlace = <T>(xs: T[], rand: () => number): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};

/**
 * Two distinct distractors for a round.
 *
 * Always excluded: the target and the answer themselves, plus anything
 * whose meaning crowds either of them.
 *
 * What the tier changes is whether the two distractors may be *each
 * other's* opposite. At tiers 1–2 they come from different dimensions, so
 * the only complete pair on screen is the one being asked about. At tier 3
 * they are drawn as a pair where possible — the tray then shows two full
 * opposite-pairs and the child has to track which dimension the question
 * was about, which is the real end-of-session difficulty.
 */
const pickDistractors = (
  target: OppositeId,
  answer: OppositeId,
  tier: 0 | 1 | 2,
  rand: () => number,
): readonly [OppositeId, OppositeId] => {
  const banned = new Set<OppositeId>([target, answer]);
  for (const w of collidesWith(target)) banned.add(w);
  for (const w of collidesWith(answer)) banned.add(w);

  const pool = shuffleInPlace(
    ALL_WORDS.filter((w) => !banned.has(w)),
    rand,
  );
  const first = pool[0]!;
  const partner = lookupWord(first).opposite;

  if (tier === 2) {
    // Prefer the matching pair; fall back to any other word when the
    // partner was banned out of the pool.
    const second = pool.find((w) => w === partner) ?? pool.find((w) => w !== first)!;
    return [first, second];
  }

  const second = pool.find((w) => w !== first && w !== partner) ?? pool[1]!;
  return [first, second];
};

// ── Run ────────────────────────────────────────────────────────────

/** One question: a pair index plus which end of it is being asked. */
interface RunStep {
  readonly pairIdx: number;
  readonly forward: boolean;
  readonly tier: 0 | 1 | 2;
}

/**
 * Order one tier's questions so the same pair is never asked twice in a row.
 *
 * This matters as much as the shuffle does. "Which one is small?"
 * immediately after "which one is big?" is answerable by pointing at the
 * card you just ignored — the child can score it without engaging with
 * either word. Separating a pair's two directions is what makes the second
 * one a real question.
 *
 * Greedy by remaining count: at each step take the pair with the most
 * questions still owed that isn't the one just asked, breaking ties at
 * random so runs still vary. Every pair owes exactly two questions and
 * every tier holds at least three pairs, so a valid ordering always exists
 * (the usual bound is that the most frequent item must fit in `ceil(n/2)`
 * slots — two never exceeds three) and taking the most-owed pair first is
 * what stops the algorithm painting itself into a corner at the end, which
 * is exactly where a shuffle-then-repair pass fails.
 */
const orderTier = (
  pairIdxs: readonly number[],
  tier: 0 | 1 | 2,
  rand: () => number,
  startWith: Omit<RunStep, 'tier'> | null = null,
): RunStep[] => {
  const owed = new Map<number, number>(pairIdxs.map((i) => [i, 2]));
  // Which way round a pair is asked first; its second question flips it.
  const firstForward = new Map<number, boolean>(pairIdxs.map((i) => [i, rand() < 0.5]));

  const out: RunStep[] = [];
  let prev = -1;

  // A pinned opening question just becomes the first greedy choice, so the
  // rest of the tier is built around it and the no-repeat rule holds
  // through the join like anywhere else.
  if (startWith && owed.has(startWith.pairIdx)) {
    firstForward.set(startWith.pairIdx, startWith.forward);
    out.push({ ...startWith, tier });
    owed.set(startWith.pairIdx, 1);
    prev = startWith.pairIdx;
  }

  while (out.length < pairIdxs.length * 2) {
    const candidates = [...owed].filter(([idx, n]) => n > 0 && idx !== prev);
    const most = Math.max(...candidates.map(([, n]) => n));
    const [pairIdx, remaining] = pick(
      candidates.filter(([, n]) => n === most),
      rand,
    );

    const forward =
      remaining === 2 ? firstForward.get(pairIdx)! : !firstForward.get(pairIdx)!;
    out.push({ pairIdx, forward, tier });
    owed.set(pairIdx, remaining - 1);
    prev = pairIdx;
  }

  return out;
};

/**
 * Build one full run: **every pair asked in both directions** (CONTEXT.md
 * §5 rule 11, adopted here 2026-08-22).
 *
 * The set being exhausted is the twenty *questions*, not the ten pairs.
 * Asking both directions was always the pedagogy — it's what stops the
 * child learning "the small card is the answer" instead of the relation —
 * but the old 8-round session picked a direction at random per pair, so
 * within any one sitting each pair was only ever asked one way. The
 * relation was taught across replays and left to chance within a play.
 *
 * Tier order still runs concrete → abstract, and `orderTier` keeps a
 * pair's two directions apart.
 *
 * `rand` is injectable so the page can SSR a deterministic round 0
 * (`generateRun(() => 0.42)[0]`) and the specs can assert a stable first
 * paint.
 *
 * `startWith` pins the word the run opens on, which is how the page hands
 * the SSR'd round 0 over to a fresh random run. It exists so the page
 * doesn't have to generate freely and then cut that question out: removing
 * a round from the middle of a run leaves its two former neighbours
 * adjacent, and those can be the same pair — the exact collision
 * `orderTier` is here to prevent. Pinning has no such gap. Ignored if the
 * word isn't in the first tier (it always is: the SSR round is a run's
 * round 0), and the caller should check `run[0]` before relying on it.
 */
export const generateRun = (
  rand: () => number = Math.random,
  startWith?: OppositeId,
): OppositeRound[] => {
  const rounds: OppositeRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  const startPairIdx =
    startWith === undefined ? -1 : PAIRS.findIndex((p) => p.includes(startWith));
  const pinned: Omit<RunStep, 'tier'> | null =
    startPairIdx < 0
      ? null
      : { pairIdx: startPairIdx, forward: PAIRS[startPairIdx]![0] === startWith };

  const steps: RunStep[] = TIERS.flatMap((tierPool, tierIndex) =>
    orderTier(tierPool, tierIndex as 0 | 1 | 2, rand, tierIndex === 0 ? pinned : null),
  );

  for (const { pairIdx, forward, tier } of steps) {
    const pair = PAIRS[pairIdx]!;
    const target = forward ? pair[0] : pair[1];
    const answer = forward ? pair[1] : pair[0];

    const [d1, d2] = pickDistractors(target, answer, tier, rand);
    const triple: OppositeId[] = [answer, d1, d2];
    shuffleInPlace(triple, rand);
    const tiles: readonly [OppositeId, OppositeId, OppositeId] = [
      triple[0]!, triple[1]!, triple[2]!,
    ];

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({
      target,
      answer,
      tiles,
      correctIndex: tiles.indexOf(answer) as 0 | 1 | 2,
      tier,
      theme,
    });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

export interface RoundNarration {
  /** Asks the question — "This one is big. Which one is small?" */
  readonly intro: string;
  /** Celebrates, names the pair, then delivers the answer's fact. */
  readonly correct: string;
  /** Opens the guided correction. */
  readonly rerun: string;
  /** Names what the child tapped, neutrally, and restates the goal. */
  readonly wrongIs: (tapped: OppositeId) => string;
  /** Points at the right card and gives the reusable rule. */
  readonly reveal: string;
}

/**
 * Build the round's script.
 *
 * The round is never failed and no score is shown. The correction names
 * the tapped word without judging it, restates what we're hunting for,
 * and closes on the *rule* ("small means little, so look for the tiniest
 * one") so the next round is easier rather than just answered.
 */
export const buildNarration = (round: OppositeRound): RoundNarration => {
  const target = lookupWord(round.target);
  const answer = lookupWord(round.answer);
  const t = target.name.toLowerCase();
  const a = answer.name.toLowerCase();

  return {
    intro: `This one is ${t}. Which one is ${a}?`,
    correct: `Yes! ${target.name} and ${answer.name} are opposites. ${answer.fact}`,
    rerun: `${WRONG_LEAD} Let's look at them together.`,
    wrongIs: (tapped: OppositeId): string => {
      const w = lookupWord(tapped);
      return `That one is ${w.name.toLowerCase()}. We're looking for ${a}.`;
    },
    reveal: `This one is ${a} — ${answer.hint}. ${target.name} and ${answer.name} are opposites!`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

export const STATS_KEY = 'opposites_friends_stats_v1';

export interface OppositesFriendsStats {
  readonly sessions: number;
  readonly rounds: number;
  readonly correctFirstTry: number;
  /** `YYYY-MM-DD`, or `''` when never played. */
  readonly lastPlayed: string;
}

const ZERO: OppositesFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

/** SSR-safe read — returns the zero state on the server or if storage is off. */
export const loadOppositesFriendsStats = (): OppositesFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO;
    const parsed = JSON.parse(raw) as Partial<OppositesFriendsStats>;
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

export const saveOppositesFriendsStats = (stats: OppositesFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage disabled / private mode — match site convention. */
  }
};
