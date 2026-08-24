/**
 * Data for the Animal Sounds game — first preschool game in the
 * SCIENCE / listening domain (added 2026-08-17), targeting age 3-4.
 *
 * Sibling of Sound Friends: where Sound Friends teaches the *letter* a
 * pictured word starts with, Animal Sounds teaches **auditory
 * recognition of animal calls** ("who says moo?") — the canonical
 * listening-and-world-knowledge activity in the early-learning
 * standards (Illinois / Ohio / SC ELS: "identifies familiar sounds in
 * the environment"). It is also the first game to turn the project's
 * five browse-only science decks into something with a game loop.
 *
 * ── Pedagogy primitives ────────────────────────────────────────────
 *
 * - **Sound -> animal, never animal -> sound.** The prompt is the call
 *   ("Moo!") and the three options are animal pictures. The reverse
 *   direction would put three *written* onomatopoeia strings on the
 *   tiles, which tests reading rather than listening — wrong skill for
 *   a pre-reader.
 *
 * - **Farm-first tiering.** Round tiers walk outward from the sounds a
 *   3yo already owns (barnyard: cow / dog / cat / pig / sheep / duck)
 *   to wild animals, and only then to same-family confusions. Mirrors
 *   the SATPIN-tier idea in Sound Friends: high-utility content first.
 *
 * - **The call is spoken twice.** Narration says the sound, asks the
 *   question, then repeats the sound ("Moo! Who says moo? Moo!"). A 3yo
 *   loses the target while scanning three pictures, so the repeat is a
 *   working-memory scaffold, not padding.
 *
 * - **3-tile forced choice, no score, no timer, no failure.** A run plays
 *   every clip-backed animal once (see `generateRun`); the per-round
 *   grammar is identical to Sound Friends / Letter Friends.
 *
 * ── Why a curated pool instead of consuming the decks wholesale ─────
 *
 * `@/data/animals` (39 cards) and `@/data/birds` (15 cards) both carry a
 * `sound` field already, but those fields are NOT safe as game prompts:
 *
 *   - **Collisions.** A prompt must identify exactly one animal, and
 *     several sounds are shared: `Growl!` (Bear + Tiger), `Grunt!`
 *     (Koala + Yak), `Snap!` (Alligator + Turtle), `Hiss!` (Iguana +
 *     Snake), `Honk!` (Penguin + Swan + Flamingo).
 *   - **Cross-deck near-duplicates.** The same animal appears in both
 *     decks with different strings: Duck (`Quack Quack!` / `Quack!`),
 *     Chicken (`Cluck Cluck!` / `Cluck!`), Owl (`Hoot Hoot!` / `Hoot!`).
 *   - **Descriptions, not onomatopoeia.** `Float!` (Jellyfish),
 *     `Busy!` (Ant), `Hum!` (Giraffe), `Chirp!` (Panda), `Bray!`
 *     (Zebra), `Whooosh!` (Whale) are unusable as "who says X?" cues.
 *
 * So this module pins its own canonical sound per animal and imports
 * only the *identity* (name / emoji / Fluent image / fact) from the
 * shipped decks. Both grid games keep their own `sound` strings and are
 * untouched. The single source of truth for animal identity stays in
 * `@/data/animals` + `@/data/birds`.
 *
 * The `SOUND_COLLISIONS` groups below additionally guarantee that two
 * animals which *could* be confused by call never appear in the same
 * round.
 *
 * Stats schema is bespoke (`animal_sounds_stats_v1`), identical in shape
 * to Sound Friends (`{ sessions, rounds, correctFirstTry, lastPlayed }`)
 * — no stages (the auto-advancing stage system is math-specific). See
 * `src/data/stats-registry.ts` for the registry plumbing; the game is
 * filed under the `preschool-cognitive` family.
 */

import { ALL_CARDS as ANIMAL_CARDS } from '@/data/animals';
import { WRONG_LEAD, rightLead } from '@/data/preschool-narration';
import { ALL_CARDS as BIRD_CARDS } from '@/data/birds';
import {
  THEMES,
  THEME_BY_KEY,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';

export type { PreschoolTheme, ThemeMeta };
export { THEMES, THEME_BY_KEY };

// ── Animal pool ────────────────────────────────────────────────────

/** Stable ids for the curated pool. Used as DOM/test hooks. */
export type AnimalId =
  | 'cow' | 'dog' | 'cat' | 'pig' | 'sheep' | 'duck' | 'goat'
  | 'horse' | 'chicken' | 'rooster' | 'frog' | 'bee' | 'turkey'
  | 'donkey' | 'goose' | 'crow' | 'cricket' | 'dove'
  | 'lion' | 'elephant' | 'monkey' | 'wolf' | 'owl' | 'bear'
  | 'tiger' | 'peacock' | 'seagull'
  | 'snake';

/**
 * One animal's play payload. `name` / `emoji` / `img` / `fact` are
 * sourced from the shipped decks; `sound` is pinned here (see the
 * header note on why the decks' own `sound` fields can't be used).
 */
export interface AnimalSoundMeta {
  readonly id: AnimalId;
  /** Display + spoken name, e.g. "Cow". */
  readonly name: string;
  /** Big emoji used as the tile face. */
  readonly emoji: string;
  /** Relative fluentui-emoji path (see FLUENT_IMG_BASE). */
  readonly img: string;
  /** The canonical call — the round prompt, e.g. "Moo". */
  readonly sound: string;
  /** Kid-friendly fact, spoken after a correct tap. */
  readonly fact: string;
  /**
   * Path to the real recording under `public/sounds/`, or `null` when we
   * don't have one. Only clip-backed animals are used as round *prompts*
   * (see `CLIP_BACKED_IDS`); the rest still appear as picture options.
   */
  readonly clip: string | null;
}

/**
 * The slice of a deck card this module actually reads. `AnimalCard` and
 * `BirdCard` are structurally identical apart from their `group` unions,
 * so narrowing to this shape lets both decks share one lookup path.
 */
interface DeckIdentity {
  readonly name: string;
  readonly e: string;
  readonly img: string;
  readonly fact: string;
}

const DECKS: Readonly<Record<'animals' | 'birds', readonly DeckIdentity[]>> = {
  animals: ANIMAL_CARDS,
  birds: BIRD_CARDS,
};

/**
 * Which deck each curated animal's identity comes from. Bird-deck
 * entries (Rooster, Turkey) aren't in the animals deck; everything else
 * is. Lookups are by `name` because that's the decks' natural key.
 * Duck / Chicken / Owl exist in *both* decks, so pinning the deck here
 * keeps the choice explicit rather than order-dependent.
 */
const IDENTITY_SOURCE: Readonly<Record<AnimalId, { deck: 'animals' | 'birds'; name: string }>> = {
  cow: { deck: 'animals', name: 'Cow' },
  dog: { deck: 'animals', name: 'Dog' },
  cat: { deck: 'animals', name: 'Cat' },
  pig: { deck: 'animals', name: 'Pig' },
  sheep: { deck: 'animals', name: 'Sheep' },
  duck: { deck: 'animals', name: 'Duck' },
  goat: { deck: 'animals', name: 'Goat' },
  horse: { deck: 'animals', name: 'Horse' },
  chicken: { deck: 'animals', name: 'Chicken' },
  rooster: { deck: 'birds', name: 'Rooster' },
  frog: { deck: 'animals', name: 'Frog' },
  bee: { deck: 'animals', name: 'Bee' },
  turkey: { deck: 'birds', name: 'Turkey' },
  donkey: { deck: 'animals', name: 'Donkey' },
  goose: { deck: 'birds', name: 'Goose' },
  crow: { deck: 'birds', name: 'Crow' },
  cricket: { deck: 'animals', name: 'Cricket' },
  dove: { deck: 'birds', name: 'Dove' },
  lion: { deck: 'animals', name: 'Lion' },
  elephant: { deck: 'animals', name: 'Elephant' },
  monkey: { deck: 'animals', name: 'Monkey' },
  wolf: { deck: 'animals', name: 'Wolf' },
  owl: { deck: 'animals', name: 'Owl' },
  bear: { deck: 'animals', name: 'Bear' },
  tiger: { deck: 'animals', name: 'Tiger' },
  peacock: { deck: 'birds', name: 'Peacock' },
  seagull: { deck: 'birds', name: 'Seagull' },
  snake: { deck: 'animals', name: 'Snake' },
};

/**
 * The pinned call per animal, written WITHOUT a trailing "!" so
 * narration can punctuate it per phrase ("Moo! Who says moo?").
 */
const CANONICAL_SOUND: Readonly<Record<AnimalId, string>> = {
  cow: 'Moo',
  dog: 'Woof woof',
  cat: 'Meow',
  pig: 'Oink oink',
  sheep: 'Baa',
  duck: 'Quack quack',
  goat: 'Maa maa',
  horse: 'Neigh',
  chicken: 'Cluck cluck',
  rooster: 'Cock-a-doodle-doo',
  frog: 'Ribbit',
  bee: 'Buzz buzz',
  turkey: 'Gobble',
  donkey: 'Hee-haw',
  goose: 'Honk honk',
  crow: 'Caw caw',
  cricket: 'Chirp chirp',
  dove: 'Coo coo',
  lion: 'Roar',
  elephant: 'Trumpet',
  monkey: 'Ooh ooh ah ah',
  wolf: 'Howl',
  owl: 'Hoot hoot',
  bear: 'Growl',
  tiger: 'Grrr',
  peacock: 'May-yaw',
  seagull: 'Kee-yah',
  snake: 'Hisss',
};

const ALL_IDS: readonly AnimalId[] = [
  'cow', 'dog', 'cat', 'pig', 'sheep', 'duck', 'goat',
  'horse', 'chicken', 'rooster', 'frog', 'bee', 'turkey',
  'donkey', 'goose', 'crow', 'cricket', 'dove',
  'lion', 'elephant', 'monkey', 'wolf', 'owl', 'bear',
  'tiger', 'peacock', 'seagull',
  'snake',
];

/**
 * Animals we have a real recording for, in `public/sounds/animals/`.
 *
 * The prompt in this game *is* the sound, so a target without a recording
 * would have to fall back to a synthesised voice pronouncing the
 * onomatopoeia — "a robot saying *roar*" — which is precisely the auditory
 * discrimination task the game is meant to teach. So targets are drawn only
 * from this set, while every animal remains available as a picture option:
 * a distractor is only ever seen, never heard, and the guided correction
 * still teaches the missing call by voice ("that's the lion, the lion says
 * roar").
 *
 * Only `snake` is absent: a genuine hiss doesn't exist on Wikimedia Commons,
 * and a rattlesnake rattle can't stand in for one (it isn't the call the game
 * teaches, and it would be a buzz inside the bee/snake collision group). See
 * `public/sounds/animals/CREDITS.md` for the search, and for how to add one.
 */
const CLIP_BACKED_IDS: readonly AnimalId[] = [
  'cow', 'dog', 'cat', 'pig', 'sheep', 'duck', 'goat',
  'horse', 'chicken', 'rooster', 'frog', 'bee', 'turkey',
  'donkey', 'goose', 'crow', 'cricket', 'dove',
  'lion', 'elephant', 'monkey', 'wolf', 'owl', 'bear',
  'tiger', 'peacock', 'seagull',
];

const CLIP_SET: ReadonlySet<AnimalId> = new Set(CLIP_BACKED_IDS);

/** Does this animal have a real recording to use as a prompt? */
export const hasClip = (id: AnimalId): boolean => CLIP_SET.has(id);

/**
 * Build the pool by joining pinned sounds to deck identities. Throws at
 * module load (i.e. at build time) if a deck entry has gone missing, so
 * a rename in `animals.ts` / `birds.ts` fails the build loudly instead
 * of emitting `undefined` tiles at runtime.
 */
const META_BY_ID: Readonly<Record<AnimalId, AnimalSoundMeta>> = (() => {
  const map: Partial<Record<AnimalId, AnimalSoundMeta>> = {};

  for (const id of ALL_IDS) {
    const src = IDENTITY_SOURCE[id];
    const found = DECKS[src.deck].find((c) => c.name === src.name);
    if (!found) {
      throw new Error(
        `animal-sounds: no "${src.name}" card in @/data/${src.deck}. ` +
          `Animal Sounds needs it for the "${id}" entry — restore the card ` +
          `or drop "${id}" from ALL_IDS.`,
      );
    }
    map[id] = {
      id,
      name: found.name,
      emoji: found.e,
      img: found.img,
      sound: CANONICAL_SOUND[id],
      fact: found.fact,
      clip: CLIP_SET.has(id) ? `animals/${id}.mp3` : null,
    };
  }

  return map as Record<AnimalId, AnimalSoundMeta>;
})();

export const ANIMAL_POOL: readonly AnimalSoundMeta[] =
  ALL_IDS.map((id) => META_BY_ID[id]);

export const lookupAnimal = (id: AnimalId): AnimalSoundMeta => META_BY_ID[id];

// ── Tier progression ───────────────────────────────────────────────

/**
 * Each tier declares the animals it *wants* on pedagogical grounds, then
 * filters to the ones we have a recording for. Keeping the full intent in
 * the source (rather than hand-trimming the lists) means dropping a new clip
 * into `CLIP_BACKED_IDS` restores that animal to its intended tier with no
 * other edit — and it documents what's missing and where it belongs.
 */
const promptable = (wanted: readonly AnimalId[], tier: string): readonly AnimalId[] => {
  const out = wanted.filter(hasClip);
  if (out.length === 0) {
    throw new Error(
      `animal-sounds: ${tier} has no clip-backed target (wanted ` +
        `[${wanted.join(', ')}]). Add a recording to public/sounds/animals/ ` +
        `and list it in CLIP_BACKED_IDS.`,
    );
  }
  return out;
};

/** Barnyard sounds a 3yo very likely already owns. */
const TIER_1_TARGETS = promptable(
  ['cow', 'dog', 'cat', 'pig', 'sheep', 'duck', 'goat'],
  'tier 1',
);
/** Familiar-but-less-drilled: farm extras + the classic garden/yard calls. */
const TIER_2_TARGETS = promptable(
  [
    'horse', 'chicken', 'rooster', 'frog', 'bee', 'turkey',
    'donkey', 'goose', 'crow', 'cricket', 'dove',
  ],
  'tier 2',
);
/** Wild animals — still iconic, but usually learned from books not life. */
const TIER_3_TARGETS = promptable(
  [
    'lion', 'elephant', 'monkey', 'wolf', 'owl', 'bear',
    'tiger', 'peacock', 'seagull', 'snake',
  ],
  'tier 3',
);

/**
 * The run, in order: every clip-backed animal exactly once, easiest tier
 * first. `generateRun` shuffles *within* each tier, so the difficulty ramp
 * is fixed but the order inside a tier is not.
 */
const TIERS: ReadonlyArray<readonly AnimalId[]> = [
  TIER_1_TARGETS,
  TIER_2_TARGETS,
  TIER_3_TARGETS,
];

/**
 * Groups of animals whose calls a 3yo could reasonably confuse. Two
 * members of the same group must never share a round, otherwise a
 * "wrong" tap would be defensible and the guided correction would be
 * teaching a distinction the audio can't actually carry.
 *
 * - dog / wolf     — both bark-ish; "woof" vs "howl" is subtle.
 * - chicken / rooster / turkey — the poultry cluster.
 * - cow / sheep / goat — the long lowing/bleating vowels. Goat's "maa" and
 *   sheep's "baa" are the closest pair in the whole pool; a child tapping
 *   either for the other is not making a mistake worth correcting.
 * - horse / donkey — both equine, and a bray ends in a wheeze that is
 *   audibly horse-adjacent.
 * - duck / goose   — both waterfowl honks; "quack" vs "honk" is a distinction
 *   the recordings themselves barely carry.
 * - lion / bear / tiger — a roar and a growl are the same gesture at
 *   different pitches, and no 3yo separates the two big cats by ear.
 * - crow / rooster / seagull / peacock — the harsh, repeated, mid-pitch
 *   shrieks. Peacock's call in particular reads as "some bird yelling",
 *   which is also what the other three sound like.
 * - bee / snake / cricket — the sustained buzz/hiss/trill band.
 * - owl / dove    — two soft, low, two-note coos. This is the pair adults
 *   mix up too.
 */
const SOUND_COLLISIONS: ReadonlyArray<readonly AnimalId[]> = [
  ['dog', 'wolf'],
  ['chicken', 'rooster', 'turkey'],
  ['cow', 'sheep', 'goat'],
  ['horse', 'donkey'],
  ['duck', 'goose'],
  ['lion', 'bear', 'tiger'],
  ['crow', 'rooster', 'seagull', 'peacock'],
  ['bee', 'snake', 'cricket'],
  ['owl', 'dove'],
];

/** Every animal whose call collides with `target`'s. */
const collidesWith = (target: AnimalId): ReadonlySet<AnimalId> => {
  const out = new Set<AnimalId>();
  for (const group of SOUND_COLLISIONS) {
    if (!group.includes(target)) continue;
    for (const id of group) if (id !== target) out.add(id);
  }
  return out;
};

// ── Round shape ────────────────────────────────────────────────────

/**
 * One round of play: the prompt is `target`'s call; three animal
 * `tiles`, exactly one of which is `target`. `correctIndex` is its
 * position so the controller can validate a tap without re-scanning.
 */
export interface AnimalSoundRound {
  /** The animal whose call is the prompt. */
  readonly target: AnimalId;
  /** Animals on the three tiles, in display order. Exactly one === target. */
  readonly tiles: readonly [AnimalId, AnimalId, AnimalId];
  /** Position (0/1/2) of the correct tile. */
  readonly correctIndex: 0 | 1 | 2;
  /** Tier this round was drawn from (0-2). Parent stats / debug only. */
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
    const tmp = xs[i]!;
    xs[i] = xs[j]!;
    xs[j] = tmp;
  }
  return xs;
};

/**
 * Pick 2 distinct distractors that are neither the target nor any
 * animal whose call collides with it. Drawn from the whole pool so the
 * options stay varied round to round.
 */
const pickDistractors = (
  target: AnimalId,
  rand: () => number,
): readonly [AnimalId, AnimalId] => {
  const banned = collidesWith(target);
  const pool: AnimalId[] = ALL_IDS.filter(
    (id) => id !== target && !banned.has(id),
  );
  shuffleInPlace(pool, rand);
  if (pool.length < 2) {
    throw new Error(
      `animal-sounds: distractor pool too small for target "${target}". ` +
        `Pool=[${pool.join(',')}]. Check ALL_IDS / SOUND_COLLISIONS.`,
    );
  }
  return [pool[0]!, pool[1]!];
};

// ── Run generation ────────────────────────────────────────────────

/**
 * Length of a full run — i.e. how many animals have a recording.
 *
 * Derived, not declared: adding a clip to `CLIP_BACKED_IDS` lengthens the
 * run by one with no other edit, and there is no second number to keep in
 * sync. The page reads this for its progress display.
 */
export const TOTAL_ROUNDS = TIERS.reduce((n, tier) => n + tier.length, 0);

/**
 * Generate a full run: **every clip-backed animal, exactly once.**
 *
 * ── Why there are no sessions any more (changed 2026-08-22) ─────────
 *
 * This game used to deal a fixed 8 rounds sampled with replacement from the
 * tiers, which is the session grammar the rest of the preschool games share.
 * With 22 animals in the pool that had two bad consequences: a child met at
 * most 8 of them per play and could meet the *same* animal twice in one
 * sitting, and there was no point at which the content was finished. A pool
 * that is three times the session length is a browsing deck being rationed,
 * not a curriculum.
 *
 * So the session is gone. One run covers the whole pool, ordered easiest
 * tier first, and it ends when every animal has been heard once. It is
 * longer than 8 rounds by design — stats are written per round, so stopping
 * early costs nothing and is expected.
 *
 * This is intended as the project-wide direction rather than a quirk of this
 * game; see the note in CONTEXT.md §5.
 *
 * Within a run:
 * - Order is shuffled *inside* each tier, so the easy-to-hard ramp is stable
 *   but the sequence isn't memorised.
 * - Distractors come from the full pool (including animals with no
 *   recording, which can be seen but never heard) minus the target and its
 *   call-collision group.
 * - The `[target, d1, d2]` triple is shuffled so `correctIndex` rotates
 *   evenly instead of parking in one column.
 * - Themes rotate with a "no two in a row" rule.
 *
 * `rand` is injectable so tests and the SSR seed can pin a deterministic
 * sequence; defaults to `Math.random`.
 */
export const generateRun = (
  rand: () => number = Math.random,
): AnimalSoundRound[] => {
  const rounds: AnimalSoundRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  TIERS.forEach((tierPool, tierIndex) => {
    const tier = tierIndex as 0 | 1 | 2;
    const order = shuffleInPlace([...tierPool], rand);

    for (const target of order) {
      const [d1, d2] = pickDistractors(target, rand);

      const triple: AnimalId[] = [target, d1, d2];
      shuffleInPlace(triple, rand);
      const tiles: readonly [AnimalId, AnimalId, AnimalId] = [
        triple[0]!,
        triple[1]!,
        triple[2]!,
      ];
      const correctIndex = tiles.indexOf(target) as 0 | 1 | 2;

      const themeChoices: readonly ThemeMeta[] =
        prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
      const theme = pick(themeChoices, rand).key;
      prevTheme = theme;

      rounds.push({ target, tiles, correctIndex, tier, theme });
    }
  });

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

/**
 * Narration script for one round.
 *
 * Phases:
 *   - `intro`    — asks the question ("Who says that?")
 *   - `correct`  — "Yes! The cow says moo! Cows give us milk!"
 *   - `rerun`    — "Not that one. Let's listen again."
 *   - `wrongIs`  — "That's the cat. The cat says meow."
 *   - `reveal`   — "The cow says moo."
 */
export interface RoundNarration {
  readonly intro: string;
  readonly correct: string;
  readonly rerun: string;
  readonly wrongIs: (tapped: AnimalId) => string;
  readonly reveal: string;
}

/** Lowercase a pinned sound for mid-sentence use ("who says moo?"). */
const lc = (s: string): string => s.toLowerCase();

/**
 * Ways of asking "who was that?" when a recording is doing the asking.
 *
 * A full run is 27 rounds — the longest sit in the app at ~2.9 minutes — and
 * until 2026-08-23 every one of them opened with the identical sentence,
 * "Listen! Who makes that sound?". Playing the whole thing through and reading
 * the transcript back is what made it obvious: 27 rounds, *one* distinct
 * prompt, where Where's Teddy has 25 across 25 rounds and Sound Friends never
 * repeats a line at all.
 *
 * The sameness had a real cause, which is why these are all so plain. When a
 * clip is playing, the prompt cannot name the animal *or* pronounce its call
 * without handing over the answer — the one thing a listening game must not
 * do. So the variation available is in phrasing only, and every line here has
 * to survive being attached to any of the 27 animals.
 *
 * Rotated by round index rather than shuffled, so the server-rendered first
 * round matches the client, and so a child hears the same order each time
 * rather than a fresh scramble.
 */
const CLIP_INTROS: readonly string[] = [
  'Listen! Who makes that sound?',
  "Who's that? Have a listen!",
  'Listen carefully. Which animal is that?',
  'Ooh, who could that be?',
  'That sound — who is making it?',
  'Have a listen. Who is it?',
];

/**
 * Ways of saying "have another go" after the lead.
 *
 * `WRONG_LEAD` stays first and unchanged: §5 rule 8 requires a wrong tap to be
 * *named* as wrong before anything else, and `tests/wrong-answer.spec.ts`
 * asserts the correction opens with it. Only the invitation after it varies.
 */
const CLIP_RERUNS: readonly string[] = [
  "Let's listen again.",
  'Have another listen.',
  "Let's hear it once more.",
];

/**
 * Build the narration for a round.
 *
 * `withClip` selects between two phrasings of the same script:
 *
 * - **`true`** — a real recording carries the prompt, so the voice must not
 *   also pronounce the call. Saying "moo" over a recording of a cow both
 *   steps on the audio and hands the child the answer, which is the one
 *   thing a listening game must not do.
 * - **`false`** — no recording is playing (sound is off, or the clip failed
 *   to load), so the voice has to be the prompt and speaks the onomatopoeia
 *   itself, repeated as a working-memory scaffold for a 3yo scanning three
 *   pictures.
 *
 * The game builds both and picks per round at playback time, because a clip
 * can fail at runtime.
 */
export const buildNarration = (
  round: AnimalSoundRound,
  opts: { readonly withClip?: boolean; readonly index?: number } = {},
): RoundNarration => {
  const withClip = opts.withClip ?? false;
  const target = lookupAnimal(round.target);
  const call = target.sound;
  // Only the clip phrasings rotate. The spoken-prompt branch already varies
  // per round, because there the call itself is the question.
  const i = Math.max(0, opts.index ?? 0);

  return {
    intro: withClip
      ? CLIP_INTROS[i % CLIP_INTROS.length]!
      : `${call}! Who says ${lc(call)}? Listen again — ${lc(call)}!`,
    correct: `${rightLead(target.name)} The ${lc(target.name)} says ${lc(call)}! ${target.fact}`,
    rerun: withClip
      ? `${WRONG_LEAD} ${CLIP_RERUNS[i % CLIP_RERUNS.length]!}`
      : `${WRONG_LEAD} ${CLIP_RERUNS[i % CLIP_RERUNS.length]!} ${call}!`,
    wrongIs: (tapped: AnimalId): string => {
      const other = lookupAnimal(tapped);
      return `That's the ${lc(other.name)}. The ${lc(other.name)} says ${lc(other.sound)}.`;
    },
    reveal: withClip
      ? `The ${lc(target.name)} says ${lc(call)}.`
      : `The ${lc(target.name)} says ${lc(call)}. ${call}!`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

/** Storage key for parent-facing session/round counts. */
export const STATS_KEY = 'animal_sounds_stats_v1';

export interface AnimalSoundsStats {
  /**
   * Completed runs through every clip-backed animal. Named `sessions`
   * because the on-disk shape is shared across every preschool game; it
   * counted 8-round sessions before 2026-08-22.
   */
  readonly sessions: number;
  /** Total individual rounds completed (correct OR corrected). */
  readonly rounds: number;
  /** Rounds where the child tapped the right animal first try. */
  readonly correctFirstTry: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: AnimalSoundsStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

export const loadAnimalSoundsStats = (): AnimalSoundsStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<AnimalSoundsStats>;
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

export const saveAnimalSoundsStats = (s: AnimalSoundsStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
