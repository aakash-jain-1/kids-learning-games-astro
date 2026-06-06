/**
 * Data for the Sound Friends game — second preschool-LITERACY game in
 * the Astro project (added 2026-06-06), targeting age 3-4. Sister to
 * Letter Friends: where Letter Friends teaches letter *recognition*
 * ("show me A"), Sound Friends teaches the **beginning sound /
 * letter-sound correspondence** ("what does Apple start with?") — the
 * top pre-reading predictor in the early-learning standards
 * (Illinois / Ohio / SC ELS: "develops awareness of initial sounds").
 *
 * ── Pedagogy primitives ────────────────────────────────────────────
 *
 * - **Picture-anchored beginning-sound isolation.** Each round shows a
 *   familiar PICTURE (emoji + word, e.g. apple) as the prompt and asks
 *   the child to tap the LETTER the word starts with. Keeping the
 *   picture on screen as a concrete anchor is the developmentally
 *   appropriate form of the make-N / sound-isolation activity for age
 *   3 (the standards' canonical "what sound does X start with?" with
 *   the object present), rather than holding an abstract phoneme in
 *   working memory.
 *
 * - **Plain letter tiles (no mnemonic on the tile).** The three answer
 *   tiles are bare uppercase glyphs — deliberately NOT the rich
 *   letter+word+emoji tiles Letter Friends uses. If a tile carried its
 *   own picture mnemonic, the child could shortcut by matching the
 *   target's emoji to a tile's emoji; bare glyphs keep attention on the
 *   sound -> letter mapping.
 *
 * - **Combined name + sound + mnemonic narration.** Piasta 2010 RCT
 *   (combined name+sound > either alone for preschoolers): every speech
 *   act pairs the picture word, the letter NAME, and a spoken sound cue
 *   ("Apple starts with A. A says ah."). The `LETTER_SOUNDS` map below
 *   holds short grapheme-sound spellings; they are an APPROXIMATION for
 *   the Web Speech engine (which can't emit clean phonemes), reinforced
 *   by the always-visible caption.
 *
 * - **SATPIN-tiered targets, reused verbatim from Letter Friends.** The
 *   target letter for each round is drawn from the same 4-tier
 *   progression so the early rounds use the high-utility Jolly Phonics
 *   Set-1 letters (S, A, T, P, I, N) and the rare letters (J, V, X, Y,
 *   Z, Q) only appear in rounds 7-8. Letter -> word -> emoji content is
 *   reused from `@/data/alphabets` so the project keeps a single
 *   letter->word map.
 *
 * - **Confusable-pair denylist.** Because the tiles are letter glyphs,
 *   the same shape-reversal confusables that matter in Letter Friends
 *   matter here (b/d, p/q, M/W, ...). A confusable shouldn't appear as
 *   target + distractor in the same round.
 *
 * - **3-tile forced choice, 8 rounds, errorless wrong-tap flow** — all
 *   identical to Letter Friends (and the cardinality triad). No score,
 *   no timer, no failure state.
 *
 * Stats schema is bespoke (`sound_friends_stats_v1`) and identical in
 * shape to Letter Friends (`{ sessions, rounds, correctFirstTry,
 * lastPlayed }`) — no stages (the auto-advancing stage system is
 * math-specific). See `src/data/stats-registry.ts` for the registry
 * plumbing (preschool-literacy family).
 */

import { ALL_CARDS as ALPHABET_CARDS } from '@/data/alphabets';
import {
  THEMES,
  THEME_BY_KEY,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';

export type { PreschoolTheme, ThemeMeta };
export { THEMES, THEME_BY_KEY };

// ── Letter pool ────────────────────────────────────────────────────

/** The 26 uppercase letters A-Z (uppercase only, matching Letter Friends v1). */
export type LetterId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R'
  | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

const ALL_LETTERS: readonly LetterId[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
  'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
  'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

/**
 * One letter's display payload — the picture word + emoji used as the
 * round prompt, plus a spoken sound cue. `word`/`emoji` are sourced
 * from `@/data/alphabets` `ALL_CARDS` so there's a single project-wide
 * letter->word map.
 */
export interface LetterMeta {
  readonly letter: LetterId;
  readonly word: string;
  readonly emoji: string;
  /** Short spoken sound cue for the letter's initial phoneme (approximation for TTS). */
  readonly sound: string;
}

/**
 * Spoken sound cue per letter — a short grapheme-sound spelling the Web
 * Speech engine can approximate (e.g. A -> "ah", B -> "buh"). These are
 * deliberately the COMMON initial sound of each letter's mnemonic word
 * in `@/data/alphabets` (all chosen with regular initial sounds), not a
 * full phonetics treatment. The always-visible caption reinforces them.
 */
const LETTER_SOUNDS: Readonly<Record<LetterId, string>> = {
  A: 'ah', B: 'buh', C: 'kuh', D: 'duh', E: 'eh', F: 'fff', G: 'guh',
  H: 'huh', I: 'ih', J: 'juh', K: 'kuh', L: 'lll', M: 'mmm', N: 'nnn',
  O: 'oh', P: 'puh', Q: 'kwuh', R: 'rrr', S: 'sss', T: 'tuh', U: 'uh',
  V: 'vvv', W: 'wuh', X: 'kss', Y: 'yuh', Z: 'zzz',
};

/** Build LETTER_META by indexing into the existing alphabets dataset. */
const LETTER_META_BY_ID: Readonly<Record<LetterId, LetterMeta>> = (() => {
  const map: Partial<Record<LetterId, LetterMeta>> = {};
  for (const card of ALPHABET_CARDS) {
    const id = card.letter as LetterId;
    map[id] = { letter: id, word: card.n, emoji: card.e, sound: LETTER_SOUNDS[id] };
  }
  // Defensive: every letter A-Z must be populated. If alphabets.ts ever
  // loses a card the build fails loudly here rather than emitting
  // `undefined` rounds at runtime.
  for (const id of ALL_LETTERS) {
    if (!map[id]) {
      throw new Error(
        `sound-friends: missing alphabets.ts entry for letter "${id}". ` +
          `Sound Friends requires complete A-Z coverage in @/data/alphabets ALL_CARDS.`,
      );
    }
  }
  return map as Record<LetterId, LetterMeta>;
})();

export const LETTER_META: readonly LetterMeta[] =
  ALL_LETTERS.map((id) => LETTER_META_BY_ID[id]);

export const lookupLetter = (id: LetterId): LetterMeta => LETTER_META_BY_ID[id];

// ── Tier progression (reused from Letter Friends) ──────────────────

const TIER_1_TARGETS: readonly LetterId[] = ['S', 'A', 'T', 'P', 'I', 'N'];
const TIER_2_TARGETS: readonly LetterId[] = ['M', 'D', 'G', 'O', 'C', 'K'];
const TIER_3_TARGETS: readonly LetterId[] = ['E', 'U', 'R', 'H', 'B', 'F', 'L'];
const TIER_4_TARGETS: readonly LetterId[] = ['J', 'V', 'W', 'X', 'Y', 'Z', 'Q'];

/** Tier pool per round (0-indexed). 8 rounds, 2 per tier. */
const TIER_BY_ROUND: ReadonlyArray<readonly LetterId[]> = [
  TIER_1_TARGETS, TIER_1_TARGETS,
  TIER_2_TARGETS, TIER_2_TARGETS,
  TIER_3_TARGETS, TIER_3_TARGETS,
  TIER_4_TARGETS, TIER_4_TARGETS,
];

/**
 * Confusable-pair denylist (shape reversals). Tiles are bare letter
 * glyphs so the b/d, p/q, M/W class of reversals still applies — a
 * confusable shouldn't be a distractor when it's the target.
 */
const CONFUSABLE_PAIRS: ReadonlyArray<readonly [LetterId, LetterId]> = [
  ['B', 'D'],
  ['P', 'Q'],
  ['M', 'W'],
  ['M', 'N'],
  ['E', 'F'],
  ['I', 'L'],
  ['U', 'V'],
  ['V', 'W'],
  ['O', 'Q'],
];

/** Build a set of letters that are confusable with `target`. */
const confusableWith = (target: LetterId): ReadonlySet<LetterId> => {
  const out = new Set<LetterId>();
  for (const [a, b] of CONFUSABLE_PAIRS) {
    if (a === target) out.add(b);
    if (b === target) out.add(a);
  }
  return out;
};

// ── Round shape ────────────────────────────────────────────────────

/**
 * One round of play: a pictured `item` is shown at the top (its emoji +
 * word); three letter `tiles` below, exactly one equal to `item.letter`
 * (the letter the pictured word starts with). `correctIndex` is its
 * position so the page controller can validate taps without re-scanning.
 */
export interface SoundRound {
  /** The pictured prompt — the child must find its starting letter (`item.letter`). */
  readonly item: LetterMeta;
  /** Letters on the three tiles, in display order. Exactly one equals `item.letter`. */
  readonly tiles: readonly [LetterId, LetterId, LetterId];
  /** Position (0/1/2) of the matching tile in `tiles`. */
  readonly correctIndex: 0 | 1 | 2;
  /** Which tier this round was drawn from (0-3). Used by parent stats / debug. */
  readonly tier: 0 | 1 | 2 | 3;
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
    const tmp = xs[i]!;
    xs[i] = xs[j]!;
    xs[j] = tmp;
  }
  return xs;
};

/**
 * Pick 2 distinct distractor letters that are not the target and not on
 * the target's confusable list. Drawn from the full A-Z pool for
 * variety.
 */
const pickDistractors = (
  target: LetterId,
  rand: () => number,
): readonly [LetterId, LetterId] => {
  const banned = confusableWith(target);
  const pool: LetterId[] = ALL_LETTERS.filter(
    (l) => l !== target && !banned.has(l),
  );
  shuffleInPlace(pool, rand);
  if (pool.length < 2) {
    throw new Error(
      `sound-friends: distractor pool too small for target ${target}. ` +
        `Pool=[${pool.join(',')}]. Check ALL_LETTERS / CONFUSABLE_PAIRS.`,
    );
  }
  return [pool[0]!, pool[1]!];
};

// ── Session generation ────────────────────────────────────────────

/**
 * Generate a fresh 8-round session.
 *
 * - Round k draws its target letter uniformly from `TIER_BY_ROUND[k]`;
 *   the pictured prompt is that letter's mnemonic (word + emoji).
 * - Distractors pulled from full A-Z minus target minus confusables.
 * - The `[target, d1, d2]` triple is shuffled into a random display
 *   order so `correctIndex` rotates evenly across rounds.
 * - Themes rotate with a "no two in a row" rule.
 *
 * `rand` is injectable so tests + the SSR seed can pin a deterministic
 * sequence; default uses `Math.random`.
 */
export const generateSession = (
  rand: () => number = Math.random,
): SoundRound[] => {
  const rounds: SoundRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (let k = 0; k < TIER_BY_ROUND.length; k++) {
    const tierPool = TIER_BY_ROUND[k]!;
    const target = pick(tierPool, rand);
    const item = lookupLetter(target);

    const [d1, d2] = pickDistractors(target, rand);

    const triple: LetterId[] = [target, d1, d2];
    shuffleInPlace(triple, rand);
    const tiles: readonly [LetterId, LetterId, LetterId] = [
      triple[0]!,
      triple[1]!,
      triple[2]!,
    ];
    const correctIndex = tiles.indexOf(target) as 0 | 1 | 2;

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    const tier = (k < 2 ? 0 : k < 4 ? 1 : k < 6 ? 2 : 3) as 0 | 1 | 2 | 3;

    rounds.push({ item, tiles, correctIndex, tier, theme });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

/**
 * Build the narration script for one round.
 *
 * Phases:
 *   - `intro` — "Apple! Apple starts with A. A says ah. Find the letter A!"
 *   - `correct` — "Yes! Apple starts with A! Ah, ah, Apple!"
 *   - `rerun` — "Hmm! Let's listen. Apple starts with ah."
 *   - `rerunDoneWrong(tapped)` — "This is B. B says buh. We need A."
 *   - `rerunDoneRight` — "Look! Apple starts with A. Ah, Apple."
 *
 * Combined name + sound + picture-mnemonic on every speech act
 * (Piasta 2010: combined > either alone).
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly rerunDoneWrong: (tappedLetter: LetterId) => string;
  readonly rerunDoneRight: string;
}

export const buildNarration = (round: SoundRound): RoundNarration => {
  const { letter, word, sound } = round.item;

  return {
    intro: `${word}! ${word} starts with ${letter}. ${letter} says ${sound}. Find the letter ${letter}!`,
    correct: `Yes! ${word} starts with ${letter}! ${sound}, ${sound}, ${word}!`,
    rerun: `Hmm! Let's listen. ${word} starts with ${sound}.`,
    rerunDoneWrong: (tappedLetter: LetterId): string => {
      const tapped = lookupLetter(tappedLetter);
      return `This is ${tapped.letter}. ${tapped.letter} says ${tapped.sound}. We need ${letter}.`;
    },
    rerunDoneRight: `Look! ${word} starts with ${letter}. ${sound}, ${word}.`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'sound_friends_stats_v1';

export interface SoundFriendsStats {
  /** Total sessions completed (full 8 rounds). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right tile first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: SoundFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadSoundFriendsStats = (): SoundFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<SoundFriendsStats>;
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

export const saveSoundFriendsStats = (s: SoundFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
