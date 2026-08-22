/**
 * Stats registry — single source of truth for the parent-facing
 * `/stats` page (T6, 2026-05-20).
 *
 * Why a registry, not 16 inline blocks in `stats.astro`?
 *
 * 1. **Adding a 17th game is one edit**: a new entry here automatically
 *    appears on `/stats` (the page renders one card per registry entry)
 *    and is locked into `tests/stats.spec.ts` (which asserts the card
 *    count equals `STATS_REGISTRY.length`).
 *
 * 2. **The four families of stats** ("first-try", "story-quiz", "card-set",
 *    "card-pure") collapse into a uniform `{ emoji, label, value }` shape
 *    via per-entry `read()` so the page renderer is just `forEach(card)`.
 *
 * 3. **Reset is symmetric to read**: every entry exports its own `clear()`
 *    that knows exactly which `localStorage` key(s) to delete. The page's
 *    "Reset this game" button is simply `entry.clear()` followed by a
 *    re-render of one card.
 *
 * 4. **Per-game alerts are kept**: the page is *additive*, not a
 *    replacement. Each game's existing in-page Stats button (which
 *    `alert()`s the same numbers) continues to work — Playwright tests
 *    in `addition.spec.ts` / `comparison.spec.ts` / `numberfriends.spec.ts`
 *    lock the *storage shape*, not the alert text, so refactoring the
 *    alert later remains safe; this registry just gives parents a
 *    glanceable cross-game view.
 *
 * Storage-shape recap (catalogued during T6 survey):
 *
 *   Family A — preschool-math (4 games): bespoke `<game>_stats_v1`
 *     key holding `{ sessions, rounds, correctFirstTry, lastPlayed }`.
 *     Owned by `@/data/{addition,comparison,numberfriends,patterns}.ts`.
 *
 *   Family A2 — preschool-literacy (1 game, added 2026-05-25 with
 *     T-letters): IDENTICAL stats schema to preschool-math but
 *     pedagogically scoped to letter recognition rather than
 *     numeracy. Carved as a separate family (rather than slotting
 *     under preschool-math) because the parent dashboard's whole
 *     point is "what KIND of skill is my child building?" — mixing
 *     math and literacy under one bucket would lose that signal.
 *     Owned by `@/data/letterfriends.ts`. Reuses the same
 *     `preschoolStatsEntry` factory (renamed from `preschoolMathEntry`
 *     so it's family-agnostic) since the schemas are identical.
 *
 *   Family B — story games (2 games): shared `<gameId>_quiz_v1` from
 *     `@/lib/quiz` holding `{ attempts, bestScore, lastPlayed }`. Daily
 *     Routines additionally uses `kids_progress_v1:routines` (from
 *     `@/lib/progress`) to track scenes-visited; Woodcutter is a
 *     single-scene story so it has no learned set.
 *
 *   Family C — card-set games (7 games): shared `kids_progress_v1:<gameId>`
 *     for the learned-set + shared `<gameId>_quiz_v1` for the deck quiz.
 *     Total deck size comes from each game's `ALL_CARDS.length` so the
 *     "N of M learned" denominator stays in sync as decks grow.
 *
 *   Family D — card-pure games (4 games): `<gameId>_quiz_v1` only — no
 *     learned set is recorded (Solar System / Weather / Dinosaurs page
 *     through their decks without marking visits, Flashcards is a
 *     multi-deck shell).
 */

import { ALL_CARDS as ALPHABET_CARDS } from '@/data/alphabets';
import { ALL_CARDS as NUMBER_CARDS } from '@/data/numbers';
import { ALL_CARDS as COLOR_CARDS } from '@/data/colors';
import { ALL_CARDS as SHAPE_CARDS } from '@/data/shapes';
import { ALL_CARDS as ANIMAL_CARDS } from '@/data/animals';
import { ALL_CARDS as BIRD_CARDS } from '@/data/birds';
import { ALL_CARDS as HINDI_CARDS } from '@/data/hindi';
import { ALL_CARDS as WEATHER_CARDS } from '@/data/weather';
import { ALL_CARDS as SOLAR_CARDS } from '@/data/solar-system';
import { ALL_CARDS as DINO_CARDS } from '@/data/dinosaurs';
import { DECKS as FLASHCARD_DECKS } from '@/data/flashcards';

import {
  STATS_KEY as ADDITION_KEY,
  loadAdditionStats,
} from '@/data/addition';
import {
  STATS_KEY as COMPARISON_KEY,
  loadComparisonStats,
} from '@/data/comparison';
import {
  STATS_KEY as NUMBER_FRIENDS_KEY,
  loadNumberFriendsStats,
} from '@/data/numberfriends';
import {
  STATS_KEY as PATTERNS_KEY,
  loadPatternStats,
} from '@/data/patterns';
import {
  STATS_KEY as NUMBER_BOND_KEY,
  loadNumberBondStats,
} from '@/data/number-bond';
import {
  STATS_KEY as LETTER_FRIENDS_KEY,
  loadLetterFriendsStats,
} from '@/data/letterfriends';
import {
  STATS_KEY as SOUND_FRIENDS_KEY,
  loadSoundFriendsStats,
} from '@/data/sound-friends';
import {
  STATS_KEY as SORTING_FRIENDS_KEY,
  loadSortingFriendsStats,
} from '@/data/sorting-friends';
import {
  STATS_KEY as WEEK_FRIENDS_KEY,
  loadWeekFriendsStats,
} from '@/data/week-friends';
import {
  TOTAL_TO_MEET as DAYS_PARADE_TOTAL,
  loadDaysParadeStats,
} from '@/data/days-parade';
import {
  STATS_KEY as ANIMAL_SOUNDS_KEY,
  loadAnimalSoundsStats,
} from '@/data/animal-sounds';
import {
  STATS_KEY as FEELING_FRIENDS_KEY,
  loadFeelingFriendsStats,
} from '@/data/feeling-friends';
import {
  STATS_KEY as OPPOSITES_FRIENDS_KEY,
  loadOppositesFriendsStats,
} from '@/data/opposites-friends';

import { loadQuizState } from '@/lib/quiz';
import { loadLearned } from '@/lib/progress';
import { fmtRelativeDate, getPlayHistory, lastNDays } from '@/lib/retention';

/** A single bullet on a stats card: emoji + label + formatted value. */
export interface MetricRow {
  /** Visual cue (matches the per-game in-page alert convention). */
  readonly emoji: string;
  /** Short label, e.g. `"First-try"` or `"Quiz attempts"`. */
  readonly label: string;
  /** Already-formatted display value, e.g. `"8 / 10 (80%)"` or `"never"`. */
  readonly value: string;
}

/** The seven families used to group cards on the page (and tint borders).
 *
 *  `'preschool-literacy'` was added 2026-05-25 with the Letter Friends
 *  ship. The schema is identical to `'preschool-math'` (so the
 *  factory below is shared between them via a `family` parameter),
 *  but the family is split for the parent-dashboard signal: a parent
 *  glancing at /stats should be able to tell at a glance whether
 *  their child has been doing math or literacy this week, not see
 *  them mashed together under one ambiguous "preschool" bucket.
 *
 *  `'preschool-cognitive'` was added 2026-06-06 with the Sorting
 *  Friends ship — same reasoning: sorting / categorization is a
 *  distinct pre-academic THINKING skill (not math, not literacy), so
 *  it earns its own dashboard bucket. Schema is again identical, so it
 *  reuses the shared `preschoolStatsEntry` factory.
 *
 *  `'preschool-social'` was added 2026-08-17 with the Feeling Friends
 *  ship. It's the family split with the strongest case yet: "has my
 *  child been naming feelings this week?" is the one question on this
 *  dashboard a parent might act on differently from any academic
 *  number, and it would be invisible folded into "thinking". Schema is
 *  once again identical.
 */
export type StatsFamily =
  | 'preschool-math'
  | 'preschool-literacy'
  | 'preschool-cognitive'
  | 'preschool-social'
  | 'story'
  | 'card-set'
  | 'card-pure';

export interface StatsRegistryEntry {
  /** Stable id used as a DOM hook (`data-game-id`) on the card. */
  readonly id: string;
  /** Display name shown on the card header. */
  readonly title: string;
  /** Primary emoji for the card. */
  readonly emoji: string;
  /** Path under `BASE_URL` to the game's page (no leading slash). */
  readonly hrefPath: string;
  /** Family — drives section grouping and accent colour on the page. */
  readonly family: StatsFamily;
  /** Read live metrics from `localStorage`. SSR-safe: returns zero-state on the server. */
  readonly read: () => readonly MetricRow[];
  /** Wipe this game's stats. Returns the keys that were cleared (handy for tests). */
  readonly clear: () => readonly string[];
  /** True if any meaningful state has been recorded (for the "no plays yet" badge). */
  readonly hasData: () => boolean;
}

// ─── Formatting helpers ──────────────────────────────────────────────

/** "8 / 10 (80%)" — used for first-try and learned-set ratios. */
const fmtRatio = (numer: number, denom: number): string => {
  if (denom <= 0) return `${numer} / 0`;
  const pct = Math.round((numer / denom) * 100);
  return `${numer} / ${denom} (${pct}%)`;
};

/**
 * "today" / "yesterday" / "3 days ago" / "last week" / "2 weeks ago"
 * / ISO-fallback / "never" — answers the parent question *"when did
 * my child last play this game?"* in plain English without making
 * them mentally subtract dates. Upgraded from raw ISO display
 * 2026-05-20 (T-retention) — see `@/lib/retention.fmtRelativeDate`
 * for the exact thresholds.
 */
const fmtLastPlayed = fmtRelativeDate;

/** SSR-safe `localStorage.removeItem` — never throws. */
const safeRemove = (key: string): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage disabled / private mode — match site convention. */
  }
};

// ─── Families A + A2: preschool-math (4 games) + preschool-literacy (1) ──
//
// Identical-shape stats across all five games — they share
// `{ sessions, rounds, correctFirstTry, lastPlayed }`. A single
// factory takes a `family` parameter so we don't duplicate the
// read/clear/hasData wiring per family. The factory is intentionally
// family-agnostic now (renamed from `preschoolMathEntry` 2026-05-25
// when Letter Friends shipped as the first preschool-literacy
// game) — adding a future preschool-{numeracy,vocabulary,...} game
// is a one-arg change.

const preschoolStatsEntry = (cfg: {
  id: string;
  title: string;
  emoji: string;
  hrefPath: string;
  storageKey: string;
  family:
    | 'preschool-math'
    | 'preschool-literacy'
    | 'preschool-cognitive'
    | 'preschool-social';
  load: () => {
    sessions: number;
    rounds: number;
    correctFirstTry: number;
    lastPlayed: string;
    /** Optional — only the staged triad games report this (added 2026-06-03). */
    stage?: number;
    bestStage?: number;
  };
}): StatsRegistryEntry => ({
  id: cfg.id,
  title: cfg.title,
  emoji: cfg.emoji,
  hrefPath: cfg.hrefPath,
  family: cfg.family,
  read: () => {
    const s = cfg.load();
    const rows: MetricRow[] = [
      { emoji: cfg.emoji, label: 'Sessions completed', value: String(s.sessions) },
      { emoji: '🌟', label: 'Rounds played', value: String(s.rounds) },
      { emoji: '🎯', label: 'First-try', value: fmtRatio(s.correctFirstTry, s.rounds) },
      { emoji: '📅', label: 'Last played', value: fmtLastPlayed(s.lastPlayed) },
    ];
    // Staged games (Counting / More / Number Friends) report a current
    // + best stage; the literacy + pattern games don't, so the row is
    // conditional rather than always-present.
    if (typeof s.stage === 'number') {
      rows.push({
        emoji: '⭐',
        label: 'Stage',
        value: `${s.stage} / 3 (best ${typeof s.bestStage === 'number' ? s.bestStage : s.stage})`,
      });
    }
    return rows;
  },
  clear: () => {
    safeRemove(cfg.storageKey);
    return [cfg.storageKey];
  },
  hasData: () => cfg.load().rounds > 0,
});

// ─── Family B: story games ───────────────────────────────────────────
//
// Daily Routines = scenes-visited (Set<string>) + quiz state.
// Woodcutter = quiz state only (single-scene story).

const routinesEntry: StatsRegistryEntry = {
  id: 'routines',
  title: 'Daily Routines',
  emoji: '🌅',
  hrefPath: 'games/daily-routines-game',
  family: 'story',
  read: () => {
    const learned = loadLearned('routines');
    const q = loadQuizState('routines');
    const TOTAL_SCENES = 10; // matches the routines deck (constant in src/data/routines.ts)
    return [
      { emoji: '📖', label: 'Scenes visited', value: fmtRatio(learned.size, TOTAL_SCENES) },
      { emoji: '🧠', label: 'Quiz attempts', value: String(q.attempts) },
      { emoji: '🏆', label: 'Best score', value: `${q.bestScore}%` },
      { emoji: '📅', label: 'Last played', value: fmtLastPlayed(q.lastPlayed) },
    ];
  },
  clear: () => {
    safeRemove('kids_progress_v1:routines');
    safeRemove('routines_quiz_v1');
    return ['kids_progress_v1:routines', 'routines_quiz_v1'];
  },
  hasData: () => {
    const learned = loadLearned('routines');
    const q = loadQuizState('routines');
    return learned.size > 0 || q.attempts > 0;
  },
};

const woodcutterEntry: StatsRegistryEntry = {
  id: 'woodcutter',
  title: 'Woodcutter',
  emoji: '🪓',
  hrefPath: 'games/woodcutter-story',
  family: 'story',
  read: () => {
    const q = loadQuizState('woodcutter');
    return [
      { emoji: '🧠', label: 'Quiz attempts', value: String(q.attempts) },
      { emoji: '🏆', label: 'Best score', value: `${q.bestScore}%` },
      { emoji: '📅', label: 'Last played', value: fmtLastPlayed(q.lastPlayed) },
    ];
  },
  clear: () => {
    safeRemove('woodcutter_quiz_v1');
    return ['woodcutter_quiz_v1'];
  },
  hasData: () => loadQuizState('woodcutter').attempts > 0,
};

// ─── Family C: card-set games (7 games) ──────────────────────────────
//
// Pattern: learned-set (kids_progress_v1:<gameId>) + quiz state. The
// total deck size comes from `ALL_CARDS.length` of each data file so
// the "N of M learned" denominator stays accurate when we add cards.

const cardSetEntry = (cfg: {
  id: string;
  title: string;
  emoji: string;
  hrefPath: string;
  itemEmoji: string;     // 🔤 / 🔢 / 🎨 / 🔺 / 🐾 / 🦜 / 🇮🇳 — matches each game's existing in-page alert
  itemLabel: string;     // "Letters learned" / "Animals met" / etc — also matches the alert
  total: number;         // ALL_CARDS.length at build time
}): StatsRegistryEntry => ({
  id: cfg.id,
  title: cfg.title,
  emoji: cfg.emoji,
  hrefPath: cfg.hrefPath,
  family: 'card-set',
  read: () => {
    const learned = loadLearned(cfg.id);
    const q = loadQuizState(cfg.id);
    return [
      { emoji: cfg.itemEmoji, label: cfg.itemLabel, value: fmtRatio(learned.size, cfg.total) },
      { emoji: '🧠', label: 'Quiz attempts', value: String(q.attempts) },
      { emoji: '🏆', label: 'Best score', value: `${q.bestScore}%` },
      { emoji: '📅', label: 'Last played', value: fmtLastPlayed(q.lastPlayed) },
    ];
  },
  clear: () => {
    const setKey = `kids_progress_v1:${cfg.id}`;
    const quizKey = `${cfg.id}_quiz_v1`;
    safeRemove(setKey);
    safeRemove(quizKey);
    return [setKey, quizKey];
  },
  hasData: () => {
    const learned = loadLearned(cfg.id);
    const q = loadQuizState(cfg.id);
    return learned.size > 0 || q.attempts > 0;
  },
});

// ─── Family D: card-pure games (4 games) ─────────────────────────────
//
// Pattern: quiz state only (the page exposes the deck count for context,
// but no learned-set is tracked — these games are exploration-flow,
// not collect-them-all-flow).

const cardPureEntry = (cfg: {
  id: string;
  title: string;
  emoji: string;
  hrefPath: string;
  deckEmoji: string;      // 🃏 / 🦖 / 🪐 / 🌦️
  deckLabel: string;      // "Decks" / "Dinosaurs in deck" / etc
  deckValue: string;      // already formatted (e.g. "14 decks · 280 cards" for Flashcards)
}): StatsRegistryEntry => ({
  id: cfg.id,
  title: cfg.title,
  emoji: cfg.emoji,
  hrefPath: cfg.hrefPath,
  family: 'card-pure',
  read: () => {
    const q = loadQuizState(cfg.id);
    return [
      { emoji: cfg.deckEmoji, label: cfg.deckLabel, value: cfg.deckValue },
      { emoji: '🧠', label: 'Quiz attempts', value: String(q.attempts) },
      { emoji: '🏆', label: 'Best score', value: `${q.bestScore}%` },
      { emoji: '📅', label: 'Last played', value: fmtLastPlayed(q.lastPlayed) },
    ];
  },
  clear: () => {
    const quizKey = `${cfg.id}_quiz_v1`;
    safeRemove(quizKey);
    return [quizKey];
  },
  hasData: () => loadQuizState(cfg.id).attempts > 0,
});

// ─── Flashcards card-count is multi-deck — pre-format here once. ─────
const FLASHCARDS_TOTAL = FLASHCARD_DECKS.reduce((sum, d) => sum + d.cards.length, 0);
const FLASHCARDS_DECK_VALUE = `${FLASHCARD_DECKS.length} decks · ${FLASHCARDS_TOTAL} cards`;

// ─── Days Parade — bespoke preschool-cognitive entry ─────────────────
//
// Days Parade is an *explore/learn* game (meet all 7 days), not a
// forced-choice rounds game, so it doesn't fit the `preschoolStatsEntry`
// (rounds / correctFirstTry) shape. It tracks a learned-set of met days
// via the shared progress lib (`kids_progress_v1:days-parade`, which also
// feeds the activity chart) plus a tiny bespoke key for the sing-along
// count + last-played date. Modeled on the bespoke `routinesEntry` /
// `cardSetEntry` shape — a custom `read()` of "N / 7 met" rows.
const daysParadeEntry: StatsRegistryEntry = {
  id: 'days-parade',
  title: 'Days Parade',
  emoji: '📆',
  hrefPath: 'games/days-parade-game',
  family: 'preschool-cognitive',
  read: () => {
    const learned = loadLearned('days-parade');
    const s = loadDaysParadeStats();
    return [
      { emoji: '📆', label: 'Days met', value: fmtRatio(learned.size, DAYS_PARADE_TOTAL) },
      { emoji: '🎶', label: 'Sing-alongs', value: String(s.sings) },
      { emoji: '📅', label: 'Last played', value: fmtLastPlayed(s.lastPlayed) },
    ];
  },
  clear: () => {
    const setKey = 'kids_progress_v1:days-parade';
    safeRemove(setKey);
    safeRemove('days_parade_stats_v1');
    return [setKey, 'days_parade_stats_v1'];
  },
  hasData: () => loadLearned('days-parade').size > 0 || loadDaysParadeStats().sings > 0,
};

// ─── The registry ────────────────────────────────────────────────────
//
// Order matters: this is also the on-page render order. The
// preschool-math triad is first (it's the most-played-by-the-3yo and
// has the richest signal), then story games, then the larger card-set
// + card-pure groups.

export const STATS_REGISTRY: readonly StatsRegistryEntry[] = [
  // Family A — preschool-math
  preschoolStatsEntry({
    id: 'counting-friends',
    title: 'Counting Friends',
    emoji: '🧮',
    hrefPath: 'games/counting-friends-game',
    storageKey: ADDITION_KEY,
    family: 'preschool-math',
    load: loadAdditionStats,
  }),
  preschoolStatsEntry({
    id: 'more-friends',
    title: 'More Friends',
    emoji: '🔍',
    hrefPath: 'games/magnitude-comparison-game',
    storageKey: COMPARISON_KEY,
    family: 'preschool-math',
    load: loadComparisonStats,
  }),
  preschoolStatsEntry({
    id: 'number-friends',
    title: 'Number Friends',
    emoji: '🔢',
    hrefPath: 'games/number-friends-game',
    storageKey: NUMBER_FRIENDS_KEY,
    family: 'preschool-math',
    load: loadNumberFriendsStats,
  }),
  preschoolStatsEntry({
    id: 'pattern-sequences',
    title: 'Pattern Sequences',
    emoji: '🎨',
    hrefPath: 'games/pattern-sequences-game',
    storageKey: PATTERNS_KEY,
    family: 'preschool-math',
    load: loadPatternStats,
  }),
  preschoolStatsEntry({
    id: 'number-bond-pop',
    title: 'Number Bond Pop',
    emoji: '🎈',
    hrefPath: 'games/number-bond-pop-game',
    storageKey: NUMBER_BOND_KEY,
    family: 'preschool-math',
    load: loadNumberBondStats,
  }),

  // Family A2 — preschool-literacy
  preschoolStatsEntry({
    id: 'letter-friends',
    title: 'Letter Friends',
    emoji: '🔤',
    hrefPath: 'games/letter-friends-game',
    storageKey: LETTER_FRIENDS_KEY,
    family: 'preschool-literacy',
    load: loadLetterFriendsStats,
  }),
  preschoolStatsEntry({
    id: 'sound-friends',
    title: 'Sound Friends',
    emoji: '🔊',
    hrefPath: 'games/sound-friends-game',
    storageKey: SOUND_FRIENDS_KEY,
    family: 'preschool-literacy',
    load: loadSoundFriendsStats,
  }),

  // Family A3 — preschool-cognitive
  preschoolStatsEntry({
    id: 'sorting-friends',
    title: 'Sorting Friends',
    emoji: '🧺',
    hrefPath: 'games/sorting-friends-game',
    storageKey: SORTING_FRIENDS_KEY,
    family: 'preschool-cognitive',
    load: loadSortingFriendsStats,
  }),
  daysParadeEntry,
  preschoolStatsEntry({
    id: 'week-friends',
    title: 'Week Friends',
    emoji: '📅',
    hrefPath: 'games/week-friends-game',
    storageKey: WEEK_FRIENDS_KEY,
    family: 'preschool-cognitive',
    load: loadWeekFriendsStats,
  }),
  // Animal Sounds is science/listening rather than sorting/sequencing,
  // but it shares the exact round-and-first-try shape of this family and
  // a `preschool-science` family for a single game wasn't worth the
  // /stats churn (decided 2026-08-17). Revisit if more science games
  // land. Feeling Friends, shipped the same day, DID get its own family
  // below — the difference is that "is my child naming feelings?" is a
  // question a parent acts on, while "is my child hearing animals?" is
  // just another thinking game to them.
  preschoolStatsEntry({
    id: 'animal-sounds',
    title: 'Animal Sounds',
    emoji: '🐄',
    hrefPath: 'games/animal-sounds-game',
    storageKey: ANIMAL_SOUNDS_KEY,
    family: 'preschool-cognitive',
    load: loadAnimalSoundsStats,
  }),
  preschoolStatsEntry({
    id: 'opposites-friends',
    title: 'Opposites Friends',
    emoji: '🔄',
    hrefPath: 'games/opposites-friends-game',
    storageKey: OPPOSITES_FRIENDS_KEY,
    family: 'preschool-cognitive',
    load: loadOppositesFriendsStats,
  }),

  // Family A4 — preschool-social
  preschoolStatsEntry({
    id: 'feeling-friends',
    title: 'Feeling Friends',
    emoji: '💛',
    hrefPath: 'games/feeling-friends-game',
    storageKey: FEELING_FRIENDS_KEY,
    family: 'preschool-social',
    load: loadFeelingFriendsStats,
  }),

  // Family B — story
  routinesEntry,
  woodcutterEntry,

  // Family C — card-set
  cardSetEntry({
    id: 'alphabets',
    title: 'Alphabets',
    emoji: '🔤',
    hrefPath: 'games/alphabets-game',
    itemEmoji: '🔤',
    itemLabel: 'Letters learned',
    total: ALPHABET_CARDS.length,
  }),
  cardSetEntry({
    id: 'numbers',
    title: 'Numbers',
    emoji: '🔢',
    hrefPath: 'games/numbers-game',
    itemEmoji: '🔢',
    itemLabel: 'Numbers learned',
    total: NUMBER_CARDS.length,
  }),
  cardSetEntry({
    id: 'colors',
    title: 'Colors',
    emoji: '🎨',
    hrefPath: 'games/colors-game',
    itemEmoji: '🎨',
    itemLabel: 'Colours learned',
    total: COLOR_CARDS.length,
  }),
  cardSetEntry({
    id: 'shapes',
    title: 'Shapes',
    emoji: '🟪',
    hrefPath: 'games/shapes-game',
    itemEmoji: '🔺',
    itemLabel: 'Shapes learned',
    total: SHAPE_CARDS.length,
  }),
  cardSetEntry({
    id: 'animals',
    title: 'Animals',
    emoji: '🐾',
    hrefPath: 'games/animals-game',
    itemEmoji: '🐾',
    itemLabel: 'Animals met',
    total: ANIMAL_CARDS.length,
  }),
  cardSetEntry({
    id: 'birds',
    title: 'Birds',
    emoji: '🦜',
    hrefPath: 'games/birds-game',
    itemEmoji: '🦜',
    itemLabel: 'Birds met',
    total: BIRD_CARDS.length,
  }),
  cardSetEntry({
    id: 'hindi',
    title: 'Hindi',
    emoji: '🇮🇳',
    hrefPath: 'games/hindi-game',
    itemEmoji: '🇮🇳',
    itemLabel: 'Letters learned',
    total: HINDI_CARDS.length,
  }),

  // Family D — card-pure
  cardPureEntry({
    id: 'flashcards',
    title: 'Flashcards',
    emoji: '🃏',
    hrefPath: 'games/flashcards-game',
    deckEmoji: '🃏',
    deckLabel: 'Deck',
    deckValue: FLASHCARDS_DECK_VALUE,
  }),
  cardPureEntry({
    id: 'dinosaurs',
    title: 'Dinosaurs',
    emoji: '🦖',
    hrefPath: 'games/dinosaurs-game',
    deckEmoji: '🦖',
    deckLabel: 'Dinosaurs in deck',
    deckValue: String(DINO_CARDS.length),
  }),
  cardPureEntry({
    id: 'solar-system',
    title: 'Solar System',
    emoji: '🪐',
    hrefPath: 'games/solar-system-game',
    deckEmoji: '🪐',
    deckLabel: 'Space objects in deck',
    deckValue: String(SOLAR_CARDS.length),
  }),
  cardPureEntry({
    id: 'weather',
    title: 'Weather',
    emoji: '🌦️',
    hrefPath: 'games/weather-game',
    deckEmoji: '🌦️',
    deckLabel: 'Weather cards in deck',
    deckValue: String(WEATHER_CARDS.length),
  }),
];

/** Human-readable family headers shown above each section on `/stats`. */
export const FAMILY_LABELS: Readonly<Record<StatsFamily, string>> = {
  'preschool-math': 'Preschool math (cardinality + pattern)',
  'preschool-literacy': 'Preschool literacy (letter recognition)',
  'preschool-cognitive': 'Preschool thinking (sorting + sequencing)',
  'preschool-social': 'Preschool feelings (naming + coping)',
  story: 'Story games',
  'card-set': 'Card-set games (collect what you learn)',
  'card-pure': 'Card-pure games (explore the deck)',
};

// ─── Retention / activity (T-retention, 2026-05-20) ──────────────────
//
// The sitewide `kids_play_history_v1` key (owned by `@/lib/retention`)
// maps each YYYY-MM-DD date to an array of gameIds played that day.
// Here we project that map through `STATS_REGISTRY` to answer the
// chart question: *for the last N days, which families had any
// activity each day, and how many of that family's games were
// touched?*
//
// Why expose this from the registry rather than from `retention.ts`?
// Because the family-grouping is a registry concern (the registry
// owns the gameId → family mapping). Keeping the family-aware
// projection here means `retention.ts` stays a pure-storage layer
// and the page-side rendering code is one call: `getActivityByFamily(7)`.

/** Map gameId → family, derived from STATS_REGISTRY at module load. */
const FAMILY_BY_ID: Readonly<Record<string, StatsFamily>> =
  Object.fromEntries(STATS_REGISTRY.map((e) => [e.id, e.family]));

/**
 * One day in the activity chart — a date string + a count of
 * games-touched per family that day. Counts are number-of-games
 * (deduped), not number-of-rounds, so the cap per family is the
 * size of that family in the registry (1–7).
 */
export interface DailyActivity {
  /** YYYY-MM-DD. */
  readonly date: string;
  /** How many games in each family were played that day (deduped). */
  readonly perFamily: Readonly<Record<StatsFamily, number>>;
  /** Total games played that day across all families. */
  readonly total: number;
}

/** Zero-state shape for SSR — every family at 0 plays. */
const zeroPerFamily = (): Readonly<Record<StatsFamily, number>> => ({
  'preschool-math': 0,
  'preschool-literacy': 0,
  'preschool-cognitive': 0,
  'preschool-social': 0,
  story: 0,
  'card-set': 0,
  'card-pure': 0,
});

/**
 * Project the sitewide play history into the last `daysBack`
 * calendar days. Each entry is `{ date, perFamily, total }`,
 * oldest first (so `[0]` is `daysBack - 1` days ago and the last
 * entry is today). SSR-safe: returns all-zero entries when
 * `localStorage` is unavailable.
 */
export const getActivityByFamily = (daysBack = 7): readonly DailyActivity[] => {
  const days = lastNDays(daysBack);
  const history = getPlayHistory();
  return days.map((date) => {
    const ids = history[date] ?? [];
    const perFamily: Record<StatsFamily, number> = zeroPerFamily() as Record<StatsFamily, number>;
    // Dedup the bucket defensively — `recordPlay` already guarantees
    // no duplicates per day, but parsing untrusted LocalStorage state
    // means we shouldn't bake that assumption into rendering.
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const fam = FAMILY_BY_ID[id];
      if (fam) perFamily[fam] += 1;
    }
    // Summed over the values rather than family-by-family, so a future
    // family can't be added to `StatsFamily` and silently left out of the
    // chart's total.
    const total = Object.values(perFamily).reduce((a, b) => a + b, 0);
    return { date, perFamily, total };
  });
};

/** Hex color per family — used for the activity chart's dots and legend.
 *
 *  Pink (#ef476f) for preschool-literacy intentionally matches the
 *  Letter Friends accent (`--lf-target-accent` in letterfriends.css).
 *  A parent who plays a Letter Friends round and then visits /stats
 *  should see the same pink tone on the activity dot — visual
 *  continuity from gameplay to dashboard.
 *
 *  Indigo for preschool-social sits closer to the story blue than any
 *  other pair here. Kept anyway, because it's the Feeling Friends accent
 *  and the continuity rule above outranks maximal hue separation: the
 *  dots are in a fixed order that matches the legend, and each carries a
 *  `title` naming its family.
 */
export const FAMILY_COLORS: Readonly<Record<StatsFamily, string>> = {
  'preschool-math': '#22c55e',     // green-500 — matches the shake-feedback ring
  'preschool-literacy': '#ef476f', // pink — matches Letter Friends accent
  'preschool-cognitive': '#14b8a6', // teal-500 — matches Sorting Friends accent
  'preschool-social': '#6366f1',   // indigo-500 — matches Feeling Friends accent
  story: '#3b82f6',                // blue-500 — matches the existing story theme
  'card-set': '#f59e0b',           // amber-500 — warm tint distinct from the green
  'card-pure': '#a855f7',          // purple-500 — distinct from the other four
};

/** How many games are in each family — useful for chart denominators. */
export const FAMILY_SIZES: Readonly<Record<StatsFamily, number>> = {
  'preschool-math': STATS_REGISTRY.filter((e) => e.family === 'preschool-math').length,
  'preschool-literacy': STATS_REGISTRY.filter((e) => e.family === 'preschool-literacy').length,
  'preschool-cognitive': STATS_REGISTRY.filter((e) => e.family === 'preschool-cognitive').length,
  'preschool-social': STATS_REGISTRY.filter((e) => e.family === 'preschool-social').length,
  story: STATS_REGISTRY.filter((e) => e.family === 'story').length,
  'card-set': STATS_REGISTRY.filter((e) => e.family === 'card-set').length,
  'card-pure': STATS_REGISTRY.filter((e) => e.family === 'card-pure').length,
};
