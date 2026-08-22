/**
 * Rhyme Time — rhyme recognition for ages 3–4.
 *
 * "Cat. What rhymes with cat?" One target word with its picture, three
 * picture cards below, tap the one that rhymes.
 *
 * Second preschool-literacy game after Sound Friends, and its natural
 * partner: Sound Friends teaches the sound a word *starts* with, this one
 * teaches the sound it *ends* with. Together they cover the two halves of
 * phonological awareness a preschooler is expected to develop, and rhyme
 * recognition is the one that emerges around age 3 (rhyme *production* is a
 * four-year-old skill and is deliberately out of scope).
 *
 * ── Why the content had to be restructured ─────────────────────────
 *
 * The `rhyming` deck in `@/data/flashcards` has 14 cards, but each one
 * encodes a whole pair as a single display string — `n: 'Cat – Hat'` — with
 * **one** emoji for the pair. That shape works for a browse deck and is
 * useless for a forced choice, which needs every word to be an
 * independently pictured, independently tappable item. So this module
 * declares the pairs as typed `FAMILIES` with an emoji per *word*.
 *
 * What it still takes from the deck is the **fact**, the little rhyming
 * sentence that uses both words ("The cat sat on the mat and wore a funny
 * hat!"). It's spoken after a correct tap, it's already authored, and
 * sourcing it by card name means a rename over there fails this build
 * loudly rather than silently dropping the payoff line.
 *
 * Five of the 14 pairs are dropped, for the two reasons a pair can be
 * unusable here:
 *
 *   - **Can't be pictured**, so the card is unanswerable: **sheep–sleep**,
 *     **song–long**, **sun–fun**, **frog–bog**.
 *   - **Can't be reliably *said***: **bow–snow**. `bow` is a homograph —
 *     /boʊ/ the ribbon, /baʊ/ the bend — and the child never sees the word,
 *     only hears it. A voice that reads the option list as /baʊ/ presents
 *     *bow* as rhyming with *snow* when the two words the child actually
 *     heard don't rhyme at all, which is worse than a missing round: it
 *     teaches a false rhyme, out loud, in a game about listening. 🎀 next to
 *     it doesn't help, because the whole judgement is made by ear.
 *
 * Nine pairs remain, one more than the eight rounds a session needs.
 *
 * ── The distractor rule is the pedagogy ────────────────────────────
 *
 * Two guarantees:
 *
 *   1. **No distractor may rhyme with the target.** Every family below has
 *      a distinct rime, so drawing distractors from other families gives
 *      this for free — and `assertDistinctRimes` keeps it that way if
 *      someone adds an eleventh pair.
 *   2. **Tier 3 sets the alliteration trap.** The classic preschool rhyme
 *      error is matching on the *first* sound instead of the last — asked
 *      what rhymes with *cat*, a child reaches for *car*. At tier 3 one
 *      distractor deliberately shares the target's onset, so the round can
 *      only be won by attending to the end of the word. That's why each
 *      word carries an `onset`.
 *
 * ── Why the rime is never spoken on its own ────────────────────────
 *
 * The obvious script is "they both end with *at*", and for `at` that's
 * fine. But speech synthesis has no idea that the `ow` in *bow* and *snow*
 * is /oʊ/ and not the /aʊ/ of *cow*, and mispronouncing the rime teaches
 * the child the wrong sound in the one moment the game is trying to teach
 * the right one. So the spoken script always demonstrates with the two
 * words back to back ("Listen — cat, hat") and says they sound the same at
 * the end; the rime is shown as *text* instead (`rime`, rendered as a chip
 * once the answer is revealed) where it can't be mispronounced.
 *
 * Stats are bespoke (`rhyme_time_stats_v1`), the standard four-field
 * preschool shape with no stages. Filed under `preschool-literacy`.
 */

import { DECKS } from '@/data/flashcards';
import {
  THEMES,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';

export { THEMES, THEME_BY_KEY } from '@/lib/preschool-themes';
export type { PreschoolTheme, ThemeMeta } from '@/lib/preschool-themes';

/** Rounds in one session. */
export const TOTAL_ROUNDS = 8;

// ── The pool ───────────────────────────────────────────────────────

export type RhymeFamilyId =
  | 'at' | 'og' | 'ee' | 'ouse'
  | 'ar' | 'oon' | 'ake'
  | 'ing' | 'ook';

export type RhymeWordId =
  | 'cat' | 'hat'
  | 'dog' | 'log'
  | 'bee' | 'tree'
  | 'mouse' | 'house'
  | 'star' | 'car'
  | 'moon' | 'spoon'
  | 'cake' | 'lake'
  | 'king' | 'ring'
  | 'book' | 'cook';

export interface RhymeWord {
  readonly id: RhymeWordId;
  /** Display + spoken word, e.g. "Cat". */
  readonly name: string;
  /** Big emoji used as the card face. */
  readonly emoji: string;
  /** The family this word belongs to — its partner shares it. */
  readonly family: RhymeFamilyId;
  /**
   * The sound the word *starts* with, as a phoneme key rather than a
   * letter: `king` and `cat` are both `k`. Used only to build the tier-3
   * alliteration trap, so it needs to be right about sound, not spelling.
   */
  readonly onset: string;
}

export interface RhymeFamily {
  readonly id: RhymeFamilyId;
  /** The shared ending, shown (never spoken) — e.g. "at" for cat/hat. */
  readonly rime: string;
  /** The two words. Either can be the target; the other is the answer. */
  readonly words: readonly [RhymeWordId, RhymeWordId];
  /** The deck's rhyming sentence, spoken after a correct tap. */
  readonly fact: string;
  /** Which `rhyming` deck card backs it, e.g. "Cat – Hat". */
  readonly deckName: string;
}

/**
 * Per-word picture and onset. The deck gives one emoji per *pair*, so
 * every one of these is authored here.
 */
const WORDS: Readonly<Record<RhymeWordId, { emoji: string; onset: string }>> = {
  cat: { emoji: '🐱', onset: 'k' },
  hat: { emoji: '🎩', onset: 'h' },
  dog: { emoji: '🐶', onset: 'd' },
  log: { emoji: '🪵', onset: 'l' },
  bee: { emoji: '🐝', onset: 'b' },
  tree: { emoji: '🌳', onset: 't' },
  mouse: { emoji: '🐭', onset: 'm' },
  house: { emoji: '🏠', onset: 'h' },
  star: { emoji: '⭐', onset: 's' },
  car: { emoji: '🚗', onset: 'k' },
  moon: { emoji: '🌙', onset: 'm' },
  spoon: { emoji: '🥄', onset: 's' },
  cake: { emoji: '🍰', onset: 'k' },
  lake: { emoji: '🏞️', onset: 'l' },
  king: { emoji: '🤴', onset: 'k' },
  ring: { emoji: '💍', onset: 'r' },
  book: { emoji: '📖', onset: 'b' },
  cook: { emoji: '👨‍🍳', onset: 'k' },
};

/** The ten kept pairs, with the deck card each one reads its fact from. */
const FAMILY_SPEC: ReadonlyArray<{
  id: RhymeFamilyId;
  rime: string;
  words: readonly [RhymeWordId, RhymeWordId];
  deckName: string;
}> = [
  { id: 'at', rime: 'at', words: ['cat', 'hat'], deckName: 'Cat – Hat' },
  { id: 'og', rime: 'og', words: ['dog', 'log'], deckName: 'Dog – Log' },
  { id: 'ee', rime: 'ee', words: ['bee', 'tree'], deckName: 'Bee – Tree' },
  { id: 'ouse', rime: 'ouse', words: ['mouse', 'house'], deckName: 'Mouse – House' },
  { id: 'ar', rime: 'ar', words: ['star', 'car'], deckName: 'Star – Car' },
  { id: 'oon', rime: 'oon', words: ['moon', 'spoon'], deckName: 'Moon – Spoon' },
  { id: 'ake', rime: 'ake', words: ['cake', 'lake'], deckName: 'Cake – Lake' },
  { id: 'ing', rime: 'ing', words: ['king', 'ring'], deckName: 'King – Ring' },
  { id: 'ook', rime: 'ook', words: ['book', 'cook'], deckName: 'Book – Cook' },
];

export const FAMILIES: readonly RhymeFamily[] = (() => {
  const deck = DECKS.find((d) => d.key === 'rhyming');
  if (!deck) {
    throw new Error(
      'rhyme-time: no "rhyming" deck in @/data/flashcards. Every pair reads ' +
        'its spoken fact from it — restore the deck.',
    );
  }

  return FAMILY_SPEC.map((spec) => {
    const card = deck.cards.find((c) => c.n === spec.deckName);
    if (!card) {
      throw new Error(
        `rhyme-time: the "rhyming" deck has no "${spec.deckName}" card. ` +
          `Restore it or drop the "${spec.id}" family.`,
      );
    }
    return {
      id: spec.id,
      rime: spec.rime,
      words: spec.words,
      fact: card.f,
      deckName: spec.deckName,
    };
  });
})();

/**
 * Guard the one property the whole game rests on: no two families may share
 * a rime, or a "distractor from another family" could rhyme with the target
 * and the round would have two right answers.
 */
(() => {
  const seen = new Set<string>();
  for (const f of FAMILIES) {
    if (seen.has(f.rime)) {
      throw new Error(
        `rhyme-time: two families share the rime "-${f.rime}". Distractors ` +
          'are drawn from other families, so rimes must be unique or a ' +
          'round can have two right answers.',
      );
    }
    seen.add(f.rime);
  }
})();

const FAMILY_BY_ID: Readonly<Record<RhymeFamilyId, RhymeFamily>> =
  Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<RhymeFamilyId, RhymeFamily>;

const WORD_BY_ID: Readonly<Record<RhymeWordId, RhymeWord>> = (() => {
  const map: Partial<Record<RhymeWordId, RhymeWord>> = {};
  for (const family of FAMILIES) {
    for (const id of family.words) {
      map[id] = {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        emoji: WORDS[id].emoji,
        family: family.id,
        onset: WORDS[id].onset,
      };
    }
  }
  return map as Record<RhymeWordId, RhymeWord>;
})();

export const ALL_WORDS: readonly RhymeWordId[] = FAMILIES.flatMap((f) => [...f.words]);

export const lookupWord = (id: RhymeWordId): RhymeWord => WORD_BY_ID[id];
export const lookupFamily = (id: RhymeFamilyId): RhymeFamily => FAMILY_BY_ID[id];

// ── Tier progression ───────────────────────────────────────────────

/** Animals and objects a 3yo names without hesitating. */
const TIER_1_FAMILIES: readonly RhymeFamilyId[] = ['at', 'og', 'ee', 'ouse'];
/** Still concrete, but a step further from the everyday. */
const TIER_2_FAMILIES: readonly RhymeFamilyId[] = ['ar', 'oon', 'ake'];
/**
 * Tier 3 is where the alliteration trap is set, so both families here have
 * at least one word that shares an onset with a word outside the family —
 * `cook`/`king` against cat, car, cake; `book` against bee. `generateSession`
 * picks the direction that makes the trap possible, which is why `ring`
 * (the one word with no onset twin anywhere) is never the tier-3 target.
 */
const TIER_3_FAMILIES: readonly RhymeFamilyId[] = ['ing', 'ook'];

/** Which pool each round draws from. 8 rounds over 9 families: 3 / 3 / 2. */
const TIER_BY_ROUND: ReadonlyArray<readonly RhymeFamilyId[]> = [
  TIER_1_FAMILIES, TIER_1_FAMILIES, TIER_1_FAMILIES,
  TIER_2_FAMILIES, TIER_2_FAMILIES, TIER_2_FAMILIES,
  TIER_3_FAMILIES, TIER_3_FAMILIES,
];

// ── Round shape ────────────────────────────────────────────────────

export interface RhymeRound {
  /** The word shown in the prompt card. */
  readonly target: RhymeWordId;
  /** Its rhyming partner — the correct card. */
  readonly answer: RhymeWordId;
  /** Words on the three cards, in display order. One is `answer`. */
  readonly tiles: readonly [RhymeWordId, RhymeWordId, RhymeWordId];
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
 * Two distractors, neither of which rhymes with the target.
 *
 * Both come from families other than the target's — which is what makes
 * them non-rhyming, given every family's rime is unique — and from
 * different families to each other, so the tray never contains a rhyming
 * pair that isn't the answer.
 *
 * At tier 3 the first distractor is drawn from the words that share the
 * target's **onset**: asked what rhymes with *cook*, the tray will hold
 * *cat* or *car* or *cake*, and the round can only be won by listening to
 * the end of the word rather than the start.
 */
/**
 * Words that start with the same sound as `target` but can't rhyme with it,
 * i.e. the candidates for the tier-3 alliteration trap. Empty for any word
 * whose onset is unique across the pool (`ring`, `dog`, `tree`).
 */
const trapWordsFor = (target: RhymeWordId): RhymeWordId[] => {
  const word = lookupWord(target);
  return ALL_WORDS.filter(
    (w) => lookupWord(w).family !== word.family && lookupWord(w).onset === word.onset,
  );
};

const pickDistractors = (
  target: RhymeWordId,
  tier: 0 | 1 | 2,
  rand: () => number,
): readonly [RhymeWordId, RhymeWordId] => {
  const targetWord = lookupWord(target);
  const eligible = ALL_WORDS.filter((w) => lookupWord(w).family !== targetWord.family);

  const trap = trapWordsFor(target);
  const first = tier === 2 && trap.length > 0 ? pick(trap, rand) : pick(eligible, rand);

  const firstFamily = lookupWord(first).family;
  const rest = eligible.filter((w) => lookupWord(w).family !== firstFamily);
  const second = pick(rest, rand);

  return [first, second];
};

// ── Session ────────────────────────────────────────────────────────

/**
 * Build one 8-round session.
 *
 * Each round picks a family, then picks which of its two words is the
 * prompt — so *cat → hat* and *hat → cat* are equally likely and the child
 * can't learn a fixed answer card. A session also prefers families it
 * hasn't used yet, so eight rounds cover eight different rimes.
 *
 * `rand` is injectable so the page can SSR a deterministic round 0
 * (`generateSession(() => 0.42)[0]`) and the specs can assert a stable
 * first paint.
 */
export const generateSession = (
  rand: () => number = Math.random,
): RhymeRound[] => {
  const rounds: RhymeRound[] = [];
  let prevTheme: PreschoolTheme | null = null;
  const used = new Set<RhymeFamilyId>();

  for (let k = 0; k < TIER_BY_ROUND.length; k++) {
    const tier = (k < 3 ? 0 : k < 6 ? 1 : 2) as 0 | 1 | 2;

    const tierPool = TIER_BY_ROUND[k]!;
    const fresh = tierPool.filter((f) => !used.has(f));
    const familyId = pick(fresh.length > 0 ? fresh : tierPool, rand);
    used.add(familyId);

    // Either word can be the prompt, so the child can't learn a fixed answer
    // card. The exception is tier 3, whose whole point is the alliteration
    // trap: there we prefer the direction whose target actually has an onset
    // twin to trap with, rather than spending a scarce late round on a
    // target like `ring` that has none.
    const family = lookupFamily(familyId);
    const [first, second] = family.words;
    const canTrap: readonly RhymeWordId[] =
      tier === 2 ? [first, second].filter((w) => trapWordsFor(w).length > 0) : [];
    const target = canTrap.length > 0 ? pick(canTrap, rand) : rand() < 0.5 ? first : second;
    const answer = target === first ? second : first;

    const [d1, d2] = pickDistractors(target, tier, rand);
    const triple: RhymeWordId[] = [answer, d1, d2];
    shuffleInPlace(triple, rand);
    const tiles: readonly [RhymeWordId, RhymeWordId, RhymeWordId] = [
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
  /** Names the target, asks the question, then reads the three options. */
  readonly intro: string;
  /** Celebrates, then delivers the deck's rhyming sentence. */
  readonly correct: string;
  /** Opens the guided correction. */
  readonly rerun: string;
  /** Names what the child tapped, neutrally, and restates the goal. */
  readonly wrongIs: (tapped: RhymeWordId) => string;
  /** Demonstrates the rhyme with the two words back to back. */
  readonly reveal: string;
}

/**
 * Build the round's script.
 *
 * The intro reads the three options aloud, which is not padding: the child
 * cannot read the labels, so an unspoken option is an option they can't
 * judge. Everything else follows the family's rules — the round is never
 * failed, no score is shown, and the correction names the tapped word
 * without scolding before demonstrating the rhyme.
 */
export const buildNarration = (round: RhymeRound): RoundNarration => {
  const target = lookupWord(round.target);
  const answer = lookupWord(round.answer);
  const family = lookupFamily(target.family);
  const t = target.name.toLowerCase();
  const a = answer.name.toLowerCase();
  const options = round.tiles.map((id) => lookupWord(id).name.toLowerCase());

  return {
    intro: `${target.name}. What rhymes with ${t}? Listen — ${options[0]}, ${options[1]}, or ${options[2]}?`,
    correct: `Yes! ${target.name} and ${answer.name} rhyme! ${family.fact}`,
    rerun: "Hmm! Let's listen again.",
    wrongIs: (tapped: RhymeWordId): string => {
      const w = lookupWord(tapped);
      return `${t} and ${w.name.toLowerCase()} end with different sounds. We want the one that rhymes with ${t}.`;
    },
    // Demonstrates with the two words rather than naming the rime — see the
    // header note on why the rime is never spoken alone. "They end the same
    // way" rather than "they sound the same at the end" so that no phrasing
    // here contains a bare rime either ("at" would have been one).
    reveal: `Listen — ${t}, ${a}. They end the same way! ${target.name} and ${answer.name} rhyme.`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

export const STATS_KEY = 'rhyme_time_stats_v1';

export interface RhymeTimeStats {
  readonly sessions: number;
  readonly rounds: number;
  readonly correctFirstTry: number;
  /** `YYYY-MM-DD`, or `''` when never played. */
  readonly lastPlayed: string;
}

const ZERO: RhymeTimeStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

/** SSR-safe read — returns the zero state on the server or if storage is off. */
export const loadRhymeTimeStats = (): RhymeTimeStats => {
  if (typeof localStorage === 'undefined') return ZERO;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO;
    const parsed = JSON.parse(raw) as Partial<RhymeTimeStats>;
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

export const saveRhymeTimeStats = (stats: RhymeTimeStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage disabled / private mode — match site convention. */
  }
};
