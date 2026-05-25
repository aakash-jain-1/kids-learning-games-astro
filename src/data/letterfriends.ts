/**
 * Data for the Letter Friends game — first preschool-LITERACY game in
 * the Astro project (added 2026-05-25, T-letters), targeting age 3–4.
 *
 * This file's design rationale is unusually long because the game's
 * pedagogy was researched from first principles before code was
 * written; the next reader (or future agent) deserves the full
 * rationale rather than having to re-derive it. See `PROGRESS.md`
 * T-letters ADR for the public-facing summary; this header is the
 * "why" record for the data layer specifically.
 *
 * ── Pedagogy primitives ────────────────────────────────────────────
 *
 * - **Numeral-recognition is to math what letter-recognition is to
 *   literacy.** Number Friends asks "show me 3" — translate a numeral
 *   to a quantity. Letter Friends asks "show me A" — translate a
 *   letter prompt to its visual identity. The 3-tile forced-choice
 *   shape is identical; only the prompt and the tile content change.
 *   We deliberately reuse Number Friends's UI grammar so a child who
 *   has played the cardinality triad finds Letter Friends's mechanic
 *   familiar from the first round.
 *
 * - **Uppercase only for v1.** Research consensus (Stay At Home
 *   Educator 2026; Springer 2025 "uppercase facilitation effect"):
 *   age-3 children recognize 5–10 letters, almost all uppercase;
 *   lowercase recognition emerges age 4–5. Uppercase letters are
 *   visually simpler and more distinct. Only Montessori starts with
 *   lowercase, and they're the outlier. Lowercase is deferred to v2
 *   pending v1 retention data.
 *
 * - **Letter NAME + letter SOUND combined narration.** Piasta 2010
 *   RCT (n=58, ages 3–4, PMC2885812): combined name+sound
 *   instruction outperforms sound-only OR name-only for preschoolers.
 *   Children at age 3 know more letter NAMES than sounds, so
 *   name-first leverages existing knowledge. Sound is included as
 *   part of the picture mnemonic ("A is for Apple") rather than as
 *   a discrete phoneme target — phonemic awareness is age 4+.
 *
 * - **Picture mnemonics embedded on every tile.** Dual Coding Theory
 *   (Paivio 1971) + Cognitive Load Theory (Sweller 1988); 18-week
 *   first-grade RCT (Frontiers 2026, fpsyg.2026.1726843) showed
 *   embedded picture mnemonics significantly improved letter
 *   recognition. Every Jolly Phonics, Letterland, Khan Academy Kids,
 *   ABCmouse, and Reading Eggs game does this. We already have the
 *   asset content in `src/data/alphabets.ts` (A-Apple, B-Ball,
 *   C-Cat, ...) — we re-use it directly here so there's a single
 *   source of letter→word mapping across the project.
 *
 * - **Letter introduction order: NOT alphabetical.** Research
 *   consensus (Jolly Phonics, Teach Starter, How Wee Learn,
 *   Montessori): alphabetical order makes children revert to letter
 *   names instead of attending to letter shapes/sounds. Use a
 *   tiered SATPIN-inspired progression. Across an 8-round session
 *   the child encounters ALL 26 letters spread across 4 tiers — but
 *   any single round's TARGET comes from a tier weighted by
 *   round position so easy/distinct letters appear first and rare
 *   letters (J, V, X, Y, Z, Q) appear only in rounds 7-8.
 *
 *   Tier 1 (rounds 1-2): {S, A, T, P, I, N} — Jolly Phonics Set 1
 *   Tier 2 (rounds 3-4): {M, D, G, O, C, K} — Jolly Phonics Set 2-3
 *   Tier 3 (rounds 5-6): {E, U, R, H, B, F, L} — Jolly Phonics Set 3-4
 *   Tier 4 (rounds 7-8): {J, V, W, X, Y, Z, Q} — Jolly Phonics Set 5-7
 *
 *   The targets in each tier are sampled randomly from the tier's
 *   pool, so a child who replays sees different rounds; across many
 *   sessions every letter appears as a target with frequency
 *   proportional to its tier weight (Tier 1's 6 letters appear more
 *   often than Tier 4's 7, because Tier 1 has 2 round slots and
 *   only 6 candidates competing for them — proportional exposure
 *   matches the curricular emphasis on early-set letters).
 *
 * - **Confusable-pair denylist.** Letter reversals at age 3-5 are
 *   developmentally normal (Phonics.org; All About Learning;
 *   Davidson 1935). b/d, p/q (mirror pairs), M/W (rotation pair),
 *   E/F (subtractive pair), I/L (similar verticals), U/V, V/W
 *   (similar shapes), M/N (similar shapes) — a confusable pair
 *   shouldn't appear together as target + distractor in the same
 *   round, because the goal of the round is recognition not
 *   discrimination-under-confusion. The DENYLIST below filters
 *   distractor candidates per round.
 *
 * - **3-tile forced-choice (1 target + 2 distractors).** Same shape
 *   as Number Friends. 2 tiles is too easy for age-3 (50% guess
 *   rate). 4 tiles crowds the visual space and pushes tap targets
 *   below the 88px floor on small phones. 3 is the established
 *   sweet spot across the preschool family.
 *
 * - **8 rounds per session.** Matches the cardinality triad. Age-3
 *   attention span research (NAEYC; Khan Academy Kids product
 *   guidelines) suggests 5-10 minute sessions; 8 rounds × ~30s each
 *   = ~4 minutes core gameplay, fitting comfortably.
 *
 * - **Errorless wrong-tap flow** matches the established preschool
 *   pattern. On a wrong tap: cancel speech, kinesthetic shake on
 *   the tapped tile (250ms, no color shift, no negative tone),
 *   narrate "Hmm! Let's look together." then "This is {tapped}.
 *   {Tapped} is for {tappedWord}.", then "We're looking for
 *   {target}. {Target} is for {targetWord}.", then reveal the
 *   correct tile with a pulsing ring. No score penalty, no red X.
 *
 * Stats schema is bespoke (`letter_friends_stats_v1`) — same shape
 * as Number Friends (`{ sessions, rounds, correctFirstTry,
 * lastPlayed }`) so the parent stats page can use the same
 * `preschoolMathEntry`-style factory after we widen it (or carve a
 * sister `preschoolLiteracyEntry`). See `src/data/stats-registry.ts`
 * for the registry plumbing.
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

/**
 * The 26 uppercase letters A–Z. Typed as a literal union so consumers
 * (round generation, narration, tests) get exhaustive checks. Lowercase
 * intentionally not included in v1 — see header rationale.
 */
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
 * One letter's display payload — what the tile renders + the
 * mnemonic word for narration. Sourced from `@/data/alphabets`
 * `ALL_CARDS` so there's a single project-wide letter→word map and
 * the existing alphabets game stays the canonical content owner.
 *
 * `word` is the picture-mnemonic noun ("Apple" for A). `emoji` is
 * the visual mnemonic glyph ("🍎"). The Q card in alphabets.ts is
 * "Queen / 👑" (Crown asset) — a deliberate substitute for the
 * standard "Q for Quail" because the Fluent UI 3D Princess asset
 * was unavailable; "Queen" is age-3-friendly and the crown emoji
 * provides the visual mnemonic.
 */
export interface LetterMeta {
  readonly letter: LetterId;
  readonly word: string;
  readonly emoji: string;
}

/** Build LETTER_META by indexing into the existing alphabets dataset. */
const LETTER_META_BY_ID: Readonly<Record<LetterId, LetterMeta>> = (() => {
  const map: Partial<Record<LetterId, LetterMeta>> = {};
  for (const card of ALPHABET_CARDS) {
    const id = card.letter as LetterId;
    map[id] = { letter: id, word: card.n, emoji: card.e };
  }
  // Defensive: every letter A-Z must be populated. If alphabets.ts
  // ever loses a card the build will fail loudly here rather than
  // silently emitting `undefined` rounds at runtime.
  for (const id of ALL_LETTERS) {
    if (!map[id]) {
      throw new Error(
        `letterfriends: missing alphabets.ts entry for letter "${id}". ` +
          `Letter Friends requires complete A–Z coverage in @/data/alphabets ALL_CARDS.`,
      );
    }
  }
  return map as Record<LetterId, LetterMeta>;
})();

export const LETTER_META: readonly LetterMeta[] =
  ALL_LETTERS.map((id) => LETTER_META_BY_ID[id]);

export const lookupLetter = (id: LetterId): LetterMeta => LETTER_META_BY_ID[id];

// ── Tier progression ───────────────────────────────────────────────
//
// 4 tiers × 2 rounds each = 8 rounds. Each tier's pool is the set of
// letters from which that round's TARGET is drawn. The target is
// random within the tier so replays show different letters; across
// many sessions every letter from every tier appears as a target
// with frequency ≈ (tier slots / tier size).
//
// Distractor pool stays full A–Z for variety, filtered by the
// confusable-pair denylist below.

const TIER_1_TARGETS: readonly LetterId[] = ['S', 'A', 'T', 'P', 'I', 'N'];
const TIER_2_TARGETS: readonly LetterId[] = ['M', 'D', 'G', 'O', 'C', 'K'];
const TIER_3_TARGETS: readonly LetterId[] = ['E', 'U', 'R', 'H', 'B', 'F', 'L'];
const TIER_4_TARGETS: readonly LetterId[] = ['J', 'V', 'W', 'X', 'Y', 'Z', 'Q'];

/** Tier index per round (0-indexed). 8 rounds × 1 tier each. */
const TIER_BY_ROUND: ReadonlyArray<readonly LetterId[]> = [
  TIER_1_TARGETS, TIER_1_TARGETS,
  TIER_2_TARGETS, TIER_2_TARGETS,
  TIER_3_TARGETS, TIER_3_TARGETS,
  TIER_4_TARGETS, TIER_4_TARGETS,
];

/**
 * Confusable-pair denylist. If `target` is X then any letter listed
 * under X here cannot appear as a distractor in that round (and
 * vice-versa — the relation is symmetric and we expand it that way
 * at lookup time).
 *
 * Source: research review summarised in the header. The deny-list
 * is intentionally CONSERVATIVE for a 3yo — we'd rather under-pair
 * a borderline case than push a confusable into a recognition round.
 *
 *   B/D    — mirror pair (the canonical b/d reversal)
 *   P/Q    — mirror pair (less common but documented)
 *   M/W    — rotation pair (180° flip looks identical)
 *   M/N    — minor shape similarity (both have vertical strokes;
 *            children at this age sometimes count strokes wrong)
 *   E/F    — subtractive pair (F is E minus a stroke)
 *   I/L    — similar verticals (depending on font)
 *   U/V    — similar shape (curve vs angle, easily confused)
 *   V/W    — similar shape (W is two Vs joined)
 *   O/Q    — Q is O with a tail; the tail is the only differentiator
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
 * One round of play: a `target` letter shown at the top of the
 * stage, three letter tiles below with the letters given by `tiles`.
 * Exactly one of `tiles[i] === target`. `correctIndex` is the
 * position (0/1/2) of that tile so the page controller can validate
 * taps without re-scanning.
 */
export interface LetterRound {
  /** The letter the child is hunting for. Uppercase A–Z. */
  readonly target: LetterId;
  /** Letters on the three tiles, in display order. Exactly one equals `target`. */
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
 * Pick 2 distinct distractor letters that are not the target and
 * not on the target's confusable list. Distractors are drawn from
 * the FULL A–Z pool (not just the same tier as the target) so a
 * round mixes a Tier-2 distractor with a Tier-1 target — visual
 * variety at the round level without compromising the target's
 * tier weighting.
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
  // Pool is always huge (A-Z minus target minus a few bans = ~22-25
  // letters) so two-distinct-pulls always succeeds. The defensive
  // checks below are belt-and-suspenders for the future case where
  // the deny-list grows or we shrink the pool.
  if (pool.length < 2) {
    throw new Error(
      `letterfriends: distractor pool too small for target ${target}. ` +
        `Pool=[${pool.join(',')}]. Check ALL_LETTERS / CONFUSABLE_PAIRS.`,
    );
  }
  return [pool[0]!, pool[1]!];
};

// ── Session generation ────────────────────────────────────────────

/**
 * Generate a fresh 8-round session.
 *
 * - Round k draws its target uniformly from `TIER_BY_ROUND[k]`.
 *   Round 0+1 → Tier 1 (SATPIN starters), 2+3 → Tier 2, 4+5 →
 *   Tier 3, 6+7 → Tier 4 (rare letters).
 * - Distractors pulled from full A-Z minus target minus
 *   confusables.
 * - The `[target, d1, d2]` triple is shuffled into a random
 *   display order so `correctIndex` rotates evenly across rounds.
 * - Themes rotate with a "no two in a row" rule (matches the
 *   cardinality triad's session pattern).
 *
 * `rand` is injectable so tests can pin to a deterministic
 * sequence; default uses `Math.random`.
 */
export const generateSession = (
  rand: () => number = Math.random,
): LetterRound[] => {
  const rounds: LetterRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (let k = 0; k < TIER_BY_ROUND.length; k++) {
    const tierPool = TIER_BY_ROUND[k]!;
    const target = pick(tierPool, rand);

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

    rounds.push({ target, tiles, correctIndex, tier, theme });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

/**
 * Build the narration script for one round.
 *
 * Phases:
 *   - `intro` — "Find A! Show me the letter A. A is for Apple."
 *   - `correct` — Right-tap celebration: "Yes! A! A is for Apple!"
 *   - `rerun` — Wrong-tap intro: "Hmm! Let's look together."
 *   - `rerunDoneWrong(tappedLetter)` — narrate the wrong tap:
 *     "This is B. B is for Ball. We're looking for A."
 *   - `rerunDoneRight` — narrate the target with the picture
 *     mnemonic, paired with the visual reveal: "Look! This is A.
 *     A is for Apple."
 *
 * Why this exact phrasing? Combined-name-and-sound narration with
 * embedded picture mnemonic on every speech act, per Piasta 2010
 * (combined > sound-only) and Frontiers 2026 (embedded mnemonics
 * accelerate recognition). Repeating the picture mnemonic in every
 * phase reinforces the dual-coding bond.
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly rerunDoneWrong: (tappedLetter: LetterId) => string;
  readonly rerunDoneRight: string;
}

export const buildNarration = (round: LetterRound): RoundNarration => {
  const targetMeta = lookupLetter(round.target);

  return {
    intro: `Find ${targetMeta.letter}! Show me the letter ${targetMeta.letter}. ${targetMeta.letter} is for ${targetMeta.word}.`,
    correct: `Yes! ${targetMeta.letter}! ${targetMeta.letter} is for ${targetMeta.word}!`,
    rerun: `Hmm! Let's look together.`,
    rerunDoneWrong: (tappedLetter: LetterId): string => {
      const tapped = lookupLetter(tappedLetter);
      return `This is ${tapped.letter}. ${tapped.letter} is for ${tapped.word}. We're looking for ${targetMeta.letter}.`;
    },
    rerunDoneRight: `Look! This is ${targetMeta.letter}. ${targetMeta.letter} is for ${targetMeta.word}.`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'letter_friends_stats_v1';

export interface LetterFriendsStats {
  /** Total sessions completed (full 8 rounds). */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR errorless). */
  readonly rounds: number;
  /** Rounds where the child picked the right tile first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: LetterFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadLetterFriendsStats = (): LetterFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<LetterFriendsStats>;
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

export const saveLetterFriendsStats = (s: LetterFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
