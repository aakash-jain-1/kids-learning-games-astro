/**
 * Data for the Birds game — sixth GridLayout port.
 *
 * Foundational-set pedagogy: 15 birds shown as a scannable grid where
 * each tile combines a *big emoji* of the bird with the bird's name
 * underneath. Tap a tile and the detail card shows the same bird
 * rendered as a Fluent UI 3D PNG (~260px) plus its iconic call and a
 * kid-friendly fact. Reuses the `.gl-tile--emoji` namespace shipped
 * with Animals — this is the second consumer of that namespace and
 * it works as a clean copy-adapt.
 *
 * Mirrors the vanilla `birds.html` deck verbatim on count and content
 * (`birdsData = { '🦚': { name: 'Peacock', img, info }, ... }` × 15).
 * The 15 birds, in the (newly group-sorted) Astro deck order:
 *   - songbird  = Sparrow, Dove, Woodpecker        (3)
 *   - raptor    = Eagle, Owl                       (2)
 *   - waterbird = Swan, Duck, Penguin, Flamingo    (4)
 *   - tropical  = Peacock, Parrot                  (2)
 *   - ground    = Turkey, Ostrich, Chicken, Rooster (4)
 *
 * Synthesized 5-group filter (vanilla had none — explicit deviation,
 * documented here per migration principle #1). Same precedent as
 * Animals's mammal/bird/reptile/sea/insect filter — every other
 * GridLayout game ships with a meaningful filter row, so an unfiltered
 * Birds deck would be the outlier. The buckets mirror how kids' bird
 * books usually group:
 *   - songbirds for the small, perching birds (Sparrow, Dove,
 *     Woodpecker — Woodpecker is technically a Piciforme not a
 *     Passerine, but visually + behaviourally it sits in the
 *     "small bird in a tree" group);
 *   - raptors for the predators (Eagle, Owl);
 *   - waterbirds for the swimmers/waders (Swan, Duck, Penguin,
 *     Flamingo — Penguin is intentionally `waterbird`, matching the
 *     Animals port where it was `bird`: kids' biology classifies
 *     Penguin under "Antarctic / water bird", not "flightless");
 *   - tropical for the colourful exotic birds (Peacock, Parrot);
 *   - ground for the large, ground-dwelling, barely-flying birds
 *     (Turkey, Ostrich, Chicken, Rooster). Ostrich is the only
 *     truly flightless one of the four, but visually they all spend
 *     most of their time walking on the ground.
 *
 * Penguin in `waterbird` (here) ↔ `bird` (Animals): consistent. Both
 * games agree Penguin is biologically a bird; Birds further classifies
 * it among water-loving birds.
 *
 * Deck order: group-sorted (songbird → raptor → waterbird → tropical
 * → ground) rather than vanilla's flat insertion order. Same precedent
 * as Animals (mammal → bird → reptile → sea → insect), Shapes (round
 * → basic → special), and Colors (warm → cool → neutral) reflows.
 *
 * Vanilla bug fixed: vanilla `birds.html` uses `🦢` (swan emoji) as
 * the object key for *both* Swan AND Woodpecker. Since `birdsData`
 * is a plain object literal, the second key (Woodpecker) silently
 * overwrites the first (Swan), so vanilla effectively renders only
 * 14 of the intended 15 birds while the progress counter still says
 * "0 / 15 learned". Astro fixes this by using:
 *   - 🦢 → Swan (canonical swan emoji)
 *   - 🐦‍⬛ → Woodpecker (black bird emoji, Unicode 15.0 / 2022 — supported
 *     on every target browser <3 years old). Functionally distinct
 *     from Sparrow's 🐦 (generic bird), so all 15 tiles render.
 *
 * Vanilla emoji-name mismatch preserved (with a doc note): vanilla
 * uses `🦤` for "Ostrich", but `🦤` is actually the Dodo emoji per
 * Unicode 13.0 (2020). No Ostrich emoji exists in Unicode. We keep
 * the vanilla *content* ("Ostrich" + "Largest bird in the world,
 * cannot fly!") and the vanilla *emoji* (🦤), accepting the visual
 * mismatch — kids will identify the bird by the Fluent UI 3D image
 * + name + fact, not the emoji glyph.
 *
 * Image-source migration vs vanilla: vanilla used Pixabay JPGs
 * (`cdn.pixabay.com/photo/.../*.jpg`). Per the Astro repo's
 * "single runtime-cache origin" rule (Fluent UI 3D PNGs via jsDelivr,
 * runtime-cached CacheFirst by `src/sw.ts`), all 15 entries have been
 * re-sourced against `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji`.
 * Same CDN already shared with Alphabets / Flashcards / Weather /
 * Animals — the SW `CacheFirst` rule for `cdn.jsdelivr.net` means
 * a child who's used another image-driven game has many bird assets
 * pre-warmed (e.g. Eagle, Owl, Penguin, Duck, Chicken from Animals).
 *
 * Substitutions for birds not in the Fluent UI pack — applies the
 * alphabets `Q → Crown` precedent of swapping in the closest
 * kid-friendly Fluent asset:
 *   - Ostrich    → Dodo or generic Bird (no Ostrich in pack)
 *   - Sparrow    → generic Bird (no Sparrow in pack — same as
 *                  Nightingale / Quail in Animals)
 *   - Woodpecker → generic Bird (no Woodpecker in pack)
 * The per-card emoji `e` field stays as the bird's emoji (e.g.
 * Sparrow → 🐦, Woodpecker → 🐦‍⬛, Ostrich → 🦤), so the tile face
 * still reads correctly even when the detail-card image is a
 * substitute. The `<img>.onerror` fallback in `birds-game.astro`
 * swaps to a `<svg>` of the emoji on failure (same pattern as
 * Animals + Alphabets).
 *
 * Sound field added (vanilla had none — additive deviation): every
 * bird gets a kid-friendly onomatopoeia (Peacock "Aaah!", Eagle
 * "Screech!", Rooster "Cock-a-doodle-doo!", Woodpecker "Tap tap!"
 * etc.). Pedagogy: kids love hearing bird calls, this is foundational
 * preschool content. Consistency: matches the Animals data shape so
 * the same `e` / `img` / `sound` / `fact` template drives both
 * games. Speech: speechSynthesis says "Peacock. Aaah! National bird
 * of India with beautiful tail feathers." — reads cleaner than
 * "Peacock. National bird..." with no audible bird-call hint.
 *
 * Fields:
 *   - `name`   — display + spoken name (e.g. "Eagle")
 *   - `group`  — `'songbird' | 'raptor' | 'waterbird' | 'tropical'
 *                | 'ground'`, drives the filter pill
 *   - `label`  — pill text ("Songbird" / "Raptor" / etc.)
 *   - `e`      — plain emoji for the tile face + image fallback
 *   - `img`    — relative fluentui-emoji path (see FLUENT_IMG_BASE)
 *   - `sound`  — short onomatopoeia, shown in detail card + spoken
 *   - `fact`   — kid-friendly fact (vanilla `info` string, copied
 *                verbatim — no period added so vanilla terminator
 *                style is preserved)
 */

export type BirdGroup =
  | 'songbird'
  | 'raptor'
  | 'waterbird'
  | 'tropical'
  | 'ground';

export interface BirdCard {
  /** Display + spoken name (e.g. "Eagle") */
  name: string;
  /** Pedagogical group — drives filter pill */
  group: BirdGroup;
  /** Human-readable pill text */
  label: string;
  /** Plain emoji for the tile face + image fallback */
  e: string;
  /** Relative path inside fluentui-emoji to the 3D PNG */
  img: string;
  /** Short onomatopoeia shown in detail + spoken */
  sound: string;
  /** Kid-friendly fact, read aloud + shown in detail */
  fact: string;
}

const labelOf = (group: BirdGroup): string =>
  group === 'songbird'
    ? 'Songbird'
    : group === 'raptor'
      ? 'Raptor'
      : group === 'waterbird'
        ? 'Water'
        : group === 'tropical'
          ? 'Tropical'
          : 'Ground';

const card = (
  name: string,
  group: BirdGroup,
  e: string,
  img: string,
  sound: string,
  fact: string,
): BirdCard => ({
  name,
  group,
  label: labelOf(group),
  e,
  img,
  sound,
  fact,
});

export const ALL_CARDS: readonly BirdCard[] = [
  // -- songbird (3) --
  card('Sparrow',    'songbird', '\u{1F426}',                     'Bird/3D/bird_3d.png',     'Cheep!',
    'Small common bird found everywhere'),
  card('Dove',       'songbird', '\u{1F54A}\u{FE0F}',             'Dove/3D/dove_3d.png',     'Coo!',
    'Symbol of peace and love'),
  card('Woodpecker', 'songbird', '\u{1F426}\u{200D}\u{2B1B}',     'Bird/3D/bird_3d.png',     'Tap tap!',
    'Bird that pecks on trees to find insects'),

  // -- raptor (2) --
  card('Eagle', 'raptor', '\u{1F985}', 'Eagle/3D/eagle_3d.png', 'Screech!',
    'Powerful bird of prey with exceptional vision'),
  card('Owl',   'raptor', '\u{1F989}', 'Owl/3D/owl_3d.png',     'Hoot!',
    'Wise nocturnal bird that hunts at night'),

  // -- waterbird (4) --
  card('Swan',     'waterbird', '\u{1F9A2}', 'Swan/3D/swan_3d.png',         'Honk!',
    'Graceful white water bird with long neck'),
  card('Duck',     'waterbird', '\u{1F986}', 'Duck/3D/duck_3d.png',         'Quack!',
    'Water bird with webbed feet'),
  card('Penguin',  'waterbird', '\u{1F427}', 'Penguin/3D/penguin_3d.png',   'Honk!',
    'Flightless bird that loves cold weather'),
  card('Flamingo', 'waterbird', '\u{1F9A9}', 'Flamingo/3D/flamingo_3d.png', 'Honk!',
    'Pink bird that stands on one leg'),

  // -- tropical (2) --
  card('Peacock', 'tropical', '\u{1F99A}', 'Peacock/3D/peacock_3d.png', 'Aaah!',
    'National bird of India with beautiful tail feathers'),
  card('Parrot',  'tropical', '\u{1F99C}', 'Parrot/3D/parrot_3d.png',   'Squawk!',
    'Colorful bird that can mimic sounds'),

  // -- ground (4) --
  card('Turkey',  'ground', '\u{1F983}', 'Turkey/3D/turkey_3d.png',   'Gobble!',
    'Large bird with colorful feathers'),
  card('Ostrich', 'ground', '\u{1F9A4}', 'Dodo/3D/dodo_3d.png',       'Boom!',
    'Largest bird in the world, cannot fly'),
  card('Chicken', 'ground', '\u{1F414}', 'Chicken/3D/chicken_3d.png', 'Cluck!',
    'Farm bird that lays eggs'),
  card('Rooster', 'ground', '\u{1F413}', 'Rooster/3D/rooster_3d.png', 'Cock-a-doodle-doo!',
    'Male chicken that crows in morning'),
];

export interface BirdFilter {
  key: 'all' | BirdGroup;
  label: string;
}

export const FILTERS: readonly BirdFilter[] = [
  { key: 'all',       label: '\u{1FAB6} All' },
  { key: 'songbird',  label: '\u{1F426} Songbirds' },
  { key: 'raptor',    label: '\u{1F985} Raptors' },
  { key: 'waterbird', label: '\u{1F986} Water' },
  { key: 'tropical',  label: '\u{1F99C} Tropical' },
  { key: 'ground',    label: '\u{1F414} Ground' },
];

import type { QuizQuestion } from '@/lib/quiz';

/**
 * Quiz questions for the Birds modal. Mix of:
 *   - cultural / national identity (Peacock → India — straight from
 *     the Peacock card's fact line),
 *   - bird → group classification (matches the deck's 5-group filter),
 *   - body-feature trivia (which bird stands on one leg — Flamingo,
 *     from the Flamingo card's fact),
 *   - sound recognition (which bird crows in the morning → Rooster,
 *     "Cock-a-doodle-doo!" from its sound + fact),
 *   - flightless-bird trivia (Penguin / Ostrich), reinforces the
 *     Penguin-as-bird classification.
 *
 * Every option is the name of a real card in the 15-card deck.
 */
export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'Which bird is the national bird of India?',
    opts: ['Eagle', 'Owl', 'Parrot', 'Peacock'],
    ans: 3,
  },
  {
    q: 'Which of these is a RAPTOR (a bird of prey)?',
    opts: ['Duck', 'Eagle', 'Sparrow', 'Swan'],
    ans: 1,
  },
  {
    q: 'Which pink bird stands on just ONE leg?',
    opts: ['Dove', 'Flamingo', 'Penguin', 'Turkey'],
    ans: 1,
  },
  {
    q: 'Which bird crows "Cock-a-doodle-doo!" in the morning?',
    opts: ['Chicken', 'Owl', 'Rooster', 'Sparrow'],
    ans: 2,
  },
  {
    q: 'Which bird CANNOT fly but loves cold weather?',
    opts: ['Eagle', 'Parrot', 'Penguin', 'Sparrow'],
    ans: 2,
  },
];
