/**
 * Feeling Friends — emotion recognition for ages 3–4.
 *
 * The first **social-emotional** game in the repo; every other game is
 * math, literacy or cognitive, so this domain had zero coverage.
 *
 * Two round shapes, and a run plays every question of both (see
 * `generateRun`):
 *
 *   - **Tiers 1–2, `kind: 'label'`** — "Show me happy." Three faces, tap
 *     the match. Structurally identical to Letter Friends, so it carries no
 *     new mechanical risk.
 *   - **Tier 3, `kind: 'situation'`** — "Her ice cream fell on the ground.
 *     How does she feel?" Same three faces, but the prompt is a situation.
 *     This is the actual social-emotional skill (inferring feeling from
 *     context) rather than vocabulary matching, and it's why the game is
 *     worth building beyond a relabelled Letter Friends.
 *
 * After a correct tap the game speaks the emotion's **coping line**, which
 * already exists in the shared Flashcards deck ("When you feel angry, take a
 * deep breath and count to five!"). That turns recognition into regulation
 * for free, and is the reason identity is sourced from that deck rather than
 * re-authored here.
 *
 * ## Why 8 emotions and not the deck's 15
 *
 * The `emotions` deck holds 15, but several are too abstract to *see* at age
 * 3 (Disappointed, Confused, Worried, Bored are all "a slightly unhappy
 * face" without context), and a forced-choice game can only teach what the
 * picture actually carries. The pool is the six every preschool SEL
 * curriculum opens with — Happy, Sad, Angry, Scared, Sleepy, Excited — plus
 * Love and Caring, which are visually distinctive and give tier 2 somewhere
 * to go.
 *
 * ## Faces come from the Fluent UI 3D pack, not plain emoji
 *
 * The sibling games (Letter Friends, Animal Sounds) render plain emoji
 * tiles, and that is fine when the emoji is a *label* for a known thing —
 * a child who can't parse 🐄 still has the word "Cow" under it. Here the
 * face **is** the question, and platform emoji fonts disagree about faces
 * far more than about animals: 😊 / 😀 / 🤩 are near-identical on some
 * platforms. So tiles render the Fluent 3D PNG with the emoji as an
 * `onerror` fallback, the pattern the card-set games already use.
 *
 * Unlike those games the PNGs are **vendored** into
 * `public/images/feelings/`, not streamed from jsDelivr. See that
 * directory's `CREDITS.md` for why (short version: the image is the
 * question here, and a CDN miss answers in tens of seconds).
 *
 * The picture for each feeling is also chosen per-feeling rather than taken
 * from the deck card — `sleepy` uses 😴 rather than the deck's 😪, whose
 * blue drool blob sits exactly where the crying face's tear does.
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

/**
 * Where the vendored face PNGs are served from. The trailing slash on
 * `BASE_URL` isn't guaranteed, and concatenating without checking is exactly
 * how `/kids-learning-games-astrosounds/…` shipped in the audio layer on
 * 2026-08-17 — a silent failure, because both this and that fall back
 * gracefully when the asset 404s.
 */
const BASE = import.meta.env.BASE_URL;
export const FACE_IMG_BASE = `${BASE}${BASE.endsWith('/') ? '' : '/'}images/feelings/`;

// ── The pool ───────────────────────────────────────────────────────

export type FeelingId =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'scared'
  | 'sleepy'
  | 'excited'
  | 'love'
  | 'caring';

export interface FeelingMeta {
  readonly id: FeelingId;
  /** Display + spoken name, e.g. "Happy". */
  readonly name: string;
  /** Emoji face — the fallback if the vendored PNG fails to load. */
  readonly emoji: string;
  /** Filename under `public/images/feelings/`, e.g. `"happy.png"`. */
  readonly img: string;
  /**
   * One concrete, checkable thing about the face, e.g. "the mouth is
   * smiling wide". Spoken during the guided correction so the child is
   * pointed at *evidence* rather than just told the answer — "look at this
   * one, there are tears on the cheeks" teaches a rule they can reapply.
   */
  readonly cue: string;
  /** Coping / regulation line from the shared deck, spoken after a correct tap. */
  readonly coping: string;
}

/**
 * Which Flashcards `emotions` card backs each id. Lookups are by `n`
 * (the deck's natural key) so a rename there fails this build loudly
 * rather than silently emitting blank tiles.
 */
const DECK_NAME: Readonly<Record<FeelingId, string>> = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  scared: 'Scared',
  sleepy: 'Sleepy',
  excited: 'Excited',
  love: 'Love',
  caring: 'Caring',
};

/**
 * The visual evidence for each feeling. Authored here, not in the deck, and
 * each line describes what is *actually* in the vendored picture — these were
 * written with the eight PNGs open side by side. If a face is ever swapped,
 * re-check its cue against the new image, because the guided correction
 * literally tells the child where to look.
 */
const CUE: Readonly<Record<FeelingId, string>> = {
  happy: 'the mouth is smiling wide',
  sad: 'there is a big tear on the cheek',
  angry: 'the face is red and the eyebrows point down',
  scared: 'the eyes are wide and the mouth is a big round O',
  sleepy: "the eyes are closed and there are sleepy Z's",
  excited: 'the eyes are two shining stars',
  love: 'the eyes are two pink hearts',
  caring: 'the hands are open for a hug',
};

/**
 * The face for each feeling. `emoji` doubles as the fallback if the PNG
 * can't load; `file` lives in `public/images/feelings/`.
 *
 * `sleepy` deliberately breaks from the deck card (😪 → 😴): the sleepy
 * face's blue drool blob lands in the same place as the crying face's tear,
 * and "which blue blob is which" is not a distinction to build a
 * forced-choice round on.
 */
const FACE: Readonly<Record<FeelingId, { emoji: string; file: string }>> = {
  happy: { emoji: '😀', file: 'happy.png' },
  sad: { emoji: '😢', file: 'sad.png' },
  angry: { emoji: '😡', file: 'angry.png' },
  scared: { emoji: '😨', file: 'scared.png' },
  sleepy: { emoji: '😴', file: 'sleepy.png' },
  excited: { emoji: '🤩', file: 'excited.png' },
  love: { emoji: '😍', file: 'love.png' },
  caring: { emoji: '🤗', file: 'caring.png' },
};

export const ALL_FEELINGS: readonly FeelingId[] = [
  'happy', 'sad', 'angry', 'scared',
  'sleepy', 'excited', 'love', 'caring',
];

const META_BY_ID: Readonly<Record<FeelingId, FeelingMeta>> = (() => {
  const deck = DECKS.find((d) => d.key === 'emotions');
  if (!deck) {
    throw new Error(
      'feeling-friends: no "emotions" deck in @/data/flashcards. Feeling ' +
        'Friends sources every face from it — restore the deck.',
    );
  }

  const map: Partial<Record<FeelingId, FeelingMeta>> = {};
  for (const id of ALL_FEELINGS) {
    const name = DECK_NAME[id];
    const card = deck.cards.find((c) => c.n === name);
    if (!card) {
      throw new Error(
        `feeling-friends: the "emotions" deck has no "${name}" card. Restore ` +
          `it or drop "${id}" from ALL_FEELINGS.`,
      );
    }
    map[id] = {
      id,
      name: card.n,
      emoji: FACE[id].emoji,
      img: FACE[id].file,
      cue: CUE[id],
      coping: card.f,
    };
  }
  return map as Record<FeelingId, FeelingMeta>;
})();

export const lookupFeeling = (id: FeelingId): FeelingMeta => META_BY_ID[id];

// ── Tier progression ───────────────────────────────────────────────

/** Unmistakable faces: a smile, tears, a red scowl, shut eyes. */
const TIER_1_TARGETS: readonly FeelingId[] = ['happy', 'sad', 'angry', 'sleepy'];
/** Subtler, and two of them are about other people rather than the self. */
const TIER_2_TARGETS: readonly FeelingId[] = ['scared', 'excited', 'love', 'caring'];
/**
 * Tier 3 asks for a feeling from a *situation*, so its targets are only the
 * six core emotions — a 3-year-old can reason about "the ice cream fell"
 * long before they can reason about the difference between love and caring.
 */
const TIER_3_TARGETS: readonly FeelingId[] = [
  'happy', 'sad', 'angry', 'scared', 'sleepy', 'excited',
];

/**
 * Faces a 3-year-old could reasonably mix up. Two members of one group must
 * never share a round, otherwise a "wrong" tap would be defensible and the
 * correction would be drawing a distinction the picture can't carry.
 *
 * - happy / excited — both are broad open smiles; the only difference is
 *   star eyes.
 * - love / caring   — both are affection, and "hearts for eyes" vs "open
 *   arms" is a subtler contrast than it looks on an adult screen.
 */
const FACE_COLLISIONS: ReadonlyArray<readonly FeelingId[]> = [
  ['happy', 'excited'],
  ['love', 'caring'],
];

/** Every feeling whose face collides with `target`'s. */
const collidesWith = (target: FeelingId): ReadonlySet<FeelingId> => {
  const out = new Set<FeelingId>();
  for (const group of FACE_COLLISIONS) {
    if (!group.includes(target)) continue;
    for (const id of group) if (id !== target) out.add(id);
  }
  return out;
};

// ── Situational vignettes (tier 3) ─────────────────────────────────

/**
 * Two per core emotion. Each is one short sentence, in the third person so
 * the child reasons about someone else (perspective-taking is the point),
 * and each describes something a 3-year-old has actually lived through.
 * The emotion has to be the *only* reasonable answer — anything a child
 * could argue about belongs in a picture book, not a forced choice.
 */
const VIGNETTES: Readonly<Record<FeelingId, readonly string[]>> = {
  happy: [
    'Her best friend came over to play with her.',
    'He got a big warm hug from Grandma.',
  ],
  sad: [
    'Her ice cream fell on the ground.',
    'His balloon floated away up into the sky.',
  ],
  angry: [
    'Someone knocked over the tall tower he built.',
    'Her little brother grabbed her toy and ran away.',
  ],
  scared: [
    'The lights went out and she heard a loud bang.',
    'A very big dog barked right next to him.',
  ],
  sleepy: [
    'It is late at night and she has been yawning and yawning.',
    'He played outside all day and now his eyes keep closing.',
  ],
  excited: [
    'It is her birthday party today!',
    'He is going to the zoo in the morning!',
  ],
  love: [],
  caring: [],
};

// ── Round shape ────────────────────────────────────────────────────

/**
 * `'label'` — the prompt is the emotion word ("Show me happy").
 * `'situation'` — the prompt is a vignette ("Her ice cream fell…").
 */
export type FeelingRoundKind = 'label' | 'situation';

export interface FeelingRound {
  readonly kind: FeelingRoundKind;
  /** The feeling the child is hunting for. */
  readonly target: FeelingId;
  /** Faces on the three tiles, in display order. Exactly one is `target`. */
  readonly tiles: readonly [FeelingId, FeelingId, FeelingId];
  /** Position (0/1/2) of the matching tile, so a tap validates without rescanning. */
  readonly correctIndex: 0 | 1 | 2;
  /** The vignette, for `kind === 'situation'`; `null` for label rounds. */
  readonly situation: string | null;
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

/** Two distinct distractors that don't collide with `target`'s face. */
const pickDistractors = (
  target: FeelingId,
  rand: () => number,
): readonly [FeelingId, FeelingId] => {
  const banned = collidesWith(target);
  const pool = ALL_FEELINGS.filter((f) => f !== target && !banned.has(f));
  shuffleInPlace(pool, rand);
  // The pool is never smaller than 2: the largest collision group has two
  // members, so at worst 8 - 1 target - 1 collision = 6 remain.
  return [pool[0]!, pool[1]!];
};

// ── Run ────────────────────────────────────────────────────────────

/**
 * One question in the run, before distractors and a theme are attached.
 * A `situation` step carries the exact vignette it will ask, which is how
 * the run guarantees each authored vignette is used once rather than
 * sampled.
 */
interface RunStep {
  readonly target: FeelingId;
  readonly tier: 0 | 1 | 2;
  readonly situation: string | null;
}

/**
 * Every question this game can ask, in teaching order.
 *
 * Two things are being exhausted, and they're different kinds of content:
 * the **eight feelings** as label rounds, then the **twelve vignettes** as
 * situation rounds. Both are finite authored sets — the vignettes
 * especially, since each one is a hand-written scenario a child would
 * otherwise have maybe a 1-in-6 chance of ever seeing.
 *
 * Ordering within a tier is shuffled per run, but the tiers stay in
 * sequence: the unmistakable faces first, the subtler ones next, and only
 * then the jump from *recognising* a face to *inferring* a feeling from a
 * situation, which is the actual social skill and much the harder ask.
 */
const buildSteps = (rand: () => number): RunStep[] => {
  const labels = (tier: 0 | 1, pool: readonly FeelingId[]): RunStep[] =>
    shuffleInPlace([...pool], rand).map((target) => ({
      target,
      tier,
      situation: null,
    }));

  const situations: RunStep[] = shuffleInPlace(
    TIER_3_TARGETS.flatMap((target) =>
      VIGNETTES[target].map((situation) => ({ target, tier: 2 as const, situation })),
    ),
    rand,
  );

  return [
    ...labels(0, TIER_1_TARGETS),
    ...labels(1, TIER_2_TARGETS),
    ...situations,
  ];
};

/**
 * Rounds in one full run — 8 label rounds + 12 vignettes = 20.
 *
 * Derived from the content, so authoring a third vignette for `sad`
 * lengthens the run automatically instead of leaving it unreachable.
 */
export const TOTAL_ROUNDS =
  TIER_1_TARGETS.length +
  TIER_2_TARGETS.length +
  TIER_3_TARGETS.reduce((n, id) => n + VIGNETTES[id].length, 0);

/**
 * Build one full run: **every feeling asked by name, then every vignette**
 * (CONTEXT.md §5 rule 11, adopted here 2026-08-22).
 *
 * The 8-round session this replaces sampled a target per round, so a
 * sitting reached only two of the twelve vignettes and could ask `happy`
 * three times while never asking `scared`. For a game about naming
 * feelings that is the wrong failure: the value is in breadth of
 * vocabulary, and half the authored content was effectively unreachable in
 * any given play.
 *
 * `rand` is injectable so the page can SSR a deterministic round 0
 * (`generateRun(() => 0.42)[0]`) and the specs can assert a stable first
 * paint.
 */
export const generateRun = (
  rand: () => number = Math.random,
): FeelingRound[] => {
  const rounds: FeelingRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const step of buildSteps(rand)) {
    const { target, tier, situation } = step;
    const [d1, d2] = pickDistractors(target, rand);

    const triple: FeelingId[] = [target, d1, d2];
    shuffleInPlace(triple, rand);
    const tiles: readonly [FeelingId, FeelingId, FeelingId] = [
      triple[0]!, triple[1]!, triple[2]!,
    ];

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({
      kind: situation ? 'situation' : 'label',
      target,
      tiles,
      correctIndex: tiles.indexOf(target) as 0 | 1 | 2,
      situation,
      tier,
      theme,
    });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

export interface RoundNarration {
  /** Asks the question — either "Show me happy" or the vignette. */
  readonly intro: string;
  /** Celebrates, then delivers the coping line. */
  readonly correct: string;
  /** Opens the guided correction. */
  readonly rerun: string;
  /** Names what the child actually tapped, without judging it. */
  readonly wrongIs: (tapped: FeelingId) => string;
  /** Points at the right face and the cue that identifies it. */
  readonly reveal: string;
}

/**
 * Build both halves of the round's script.
 *
 * Wrong answers are never shamed and the round is never failed: the
 * correction names the tapped face neutrally ("that's the sleepy face"),
 * then points at the target's visual cue. Feelings are a domain where
 * "wrong" is especially loaded, so the script deliberately never says
 * "no", "wrong" or "try again".
 */
export const buildNarration = (round: FeelingRound): RoundNarration => {
  const target = lookupFeeling(round.target);
  const lower = target.name.toLowerCase();

  const intro =
    round.kind === 'situation' && round.situation
      ? `${round.situation} How do you think they feel?`
      : `Show me ${lower}. Which face looks ${lower}?`;

  const correct =
    round.kind === 'situation'
      ? `Yes! They feel ${lower}. ${target.coping}`
      : `Yes! That's the ${lower} face! ${target.coping}`;

  return {
    intro,
    correct,
    rerun: `${WRONG_LEAD} Let's look at the faces together.`,
    wrongIs: (tapped: FeelingId): string => {
      const t = lookupFeeling(tapped);
      return `That's the ${t.name.toLowerCase()} face — ${t.cue}. We're looking for ${lower}.`;
    },
    reveal: `Look at this one — ${target.cue}. That's ${lower}!`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

export const STATS_KEY = 'feeling_friends_stats_v1';

export interface FeelingFriendsStats {
  readonly sessions: number;
  readonly rounds: number;
  readonly correctFirstTry: number;
  /** `YYYY-MM-DD`, or `''` when never played. */
  readonly lastPlayed: string;
}

const ZERO: FeelingFriendsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

/** SSR-safe read — returns the zero state on the server or if storage is off. */
export const loadFeelingFriendsStats = (): FeelingFriendsStats => {
  if (typeof localStorage === 'undefined') return ZERO;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO;
    const parsed = JSON.parse(raw) as Partial<FeelingFriendsStats>;
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

export const saveFeelingFriendsStats = (stats: FeelingFriendsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage disabled / private mode — match site convention. */
  }
};
