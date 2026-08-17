/**
 * Data for the Animals game — fifth GridLayout port.
 *
 * Foundational-set pedagogy: 39 animals shown as a scannable grid where
 * each tile combines a *big emoji* of the animal with the animal's name
 * underneath. Tap a tile and the detail card shows the same animal
 * rendered as a Fluent UI 3D PNG (~260px) plus its iconic sound and a
 * kid-friendly fact. Mirrors the vanilla `animals-game.html` deck
 * verbatim (`animals = { Alligator: { img, sound, info }, ... }` × 37) —
 * no animal added, none removed, every `info` and `sound` string copied
 * across as-is.
 *
 * Synthesized 6-group filter (vanilla had none — deviation):
 *   - mammal    = Bear, Cat, Cow, Dog, Elephant, Fox, Giraffe, Horse,
 *                 Koala, Lion, Monkey, Panda, Pig, Rabbit, Sheep, Tiger,
 *                 Unicorn, Wolf, Yak, Zebra        (20)
 *   - bird      = Chicken, Duck, Nightingale, Owl, Penguin, Quail,
 *                 Vulture                          (7)
 *   - reptile   = Alligator, Iguana, Snake, Turtle (4)
 *   - amphibian = Frog                             (1)
 *   - sea       = Fish, Jellyfish, Octopus, Whale  (4)
 *   - insect    = Ant, Bee, Butterfly              (3)
 *
 * Bee + Frog added 2026-08-17 (additive deviation from vanilla). Both are
 * conspicuous omissions from a preschool animal deck — "Buzz" and
 * "Ribbit" are two of the first animal sounds a 3yo learns — and both
 * were already drawn in the Flashcards decks (Bee in `insects`, Frog in
 * `animals`) without a `sound` field. Frog is an amphibian, not a
 * reptile, so filing it honestly required the 6th group rather than
 * bending it into `reptile`; `amphibian` sorts after `reptile` to keep
 * the deck's biological ordering. Added for the Animal Sounds game,
 * which needs iconic unambiguous calls, but the Animals grid gains them
 * too.
 *
 * Why synthesize groups? Same reason as Shapes (round/basic/special) and
 * Colors (warm/cool/neutral) — every other GridLayout game ships with a
 * meaningful filter row, so an unfiltered Animals deck would be the
 * outlier. Mammal/bird/reptile/sea/insect mirrors how foundational
 * biology is taught at preschool age (Starfall + Khan Kids both group
 * their animal screens this way) — pedagogy is real, not just for
 * filter symmetry.
 *
 * Penguin is intentionally bird (not sea) — biological classification
 * trumps the "swims in water" intuition, matches every standard kids'
 * curriculum, and avoids the inconsistency of also putting Duck (which
 * also swims) in the bird bucket.
 *
 * Unicorn is intentionally mammal — vanilla included it; calling it
 * mammal-like (a horse-with-horn) is the closest fit for the 4-and-up
 * audience without inventing a "mythical" 6th group for one entry.
 *
 * Deck order: group-sorted (mammal → bird → reptile → sea → insect)
 * rather than vanilla's flat A-Z order. Same precedent as Shapes
 * (round → basic → special) and Colors (warm → cool → neutral). Animal
 * *content* is unchanged; only the order shifts.
 *
 * Image-source migration vs vanilla: vanilla used Iconify Noto SVGs
 * (`api.iconify.design/noto/<slug>.svg`). Per the Astro repo's "single
 * runtime-cache origin" rule (Fluent UI 3D PNGs via jsDelivr,
 * runtime-cached CacheFirst by `src/sw.ts`), all 37 entries have been
 * re-sourced against `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji`.
 *
 * Substitutions for animals not in the Fluent UI pack — applies the
 * alphabets `Q → Crown` precedent of swapping in the closest
 * kid-friendly Fluent asset:
 *   - Iguana      → Lizard         (no Iguana in pack — closest reptile)
 *   - Nightingale → Bird           (no Nightingale — generic small bird)
 *   - Quail       → Bird           (no Quail — generic small bird)
 *   - Vulture     → Eagle          (no Vulture — closest large raptor)
 *   - Yak         → Ox             (no Yak — closest hooved bovine)
 *
 * The per-card emoji `e` field stays as the original animal's emoji
 * (e.g. Quail → 🐦), so the tile face still reads correctly even when
 * the detail-card image is a substitute. The `<img>.onerror` fallback
 * in `animals-game.astro` swaps to a `<svg>` of the emoji on failure,
 * so unverified paths (or any future Fluent pack reorg) degrade
 * gracefully — same pattern alphabets uses.
 *
 * Sound field: vanilla shipped `sound: '🐊 Snap!'` style strings
 * combining the animal emoji with the onomatopoeia. Astro splits these
 * cleanly: `e` holds the emoji (used as tile face + image fallback),
 * `sound` holds the textual onomatopoeia only (used on the detail card
 * + spoken aloud after the name). Splitting helps speechSynthesis —
 * "Snap!" reads cleaner than "🐊 Snap!".
 *
 * Fields:
 *   - `name`   — display + spoken name (e.g. "Cat")
 *   - `group`  — `'mammal' | 'bird' | 'reptile' | 'sea' | 'insect'`,
 *                drives the filter pill
 *   - `label`  — pill text ("Mammal" / "Bird" / etc.)
 *   - `e`      — plain emoji for the tile face + image fallback
 *   - `img`    — relative fluentui-emoji path (see FLUENT_IMG_BASE)
 *   - `sound`  — short onomatopoeia, shown in detail card + spoken
 *   - `fact`   — kid-friendly fun fact, read aloud + shown in detail
 */

export type AnimalGroup =
  | 'mammal'
  | 'bird'
  | 'reptile'
  | 'amphibian'
  | 'sea'
  | 'insect';

export interface AnimalCard {
  /** Display + spoken name (e.g. "Cat") */
  name: string;
  /** Pedagogical group — drives filter pill */
  group: AnimalGroup;
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

const labelOf = (group: AnimalGroup): string =>
  group === 'mammal'
    ? 'Mammal'
    : group === 'bird'
      ? 'Bird'
      : group === 'reptile'
        ? 'Reptile'
        : group === 'amphibian'
          ? 'Amphibian'
          : group === 'sea'
            ? 'Sea'
            : 'Insect';

const card = (
  name: string,
  group: AnimalGroup,
  e: string,
  img: string,
  sound: string,
  fact: string,
): AnimalCard => ({
  name,
  group,
  label: labelOf(group),
  e,
  img,
  sound,
  fact,
});

export const ALL_CARDS: readonly AnimalCard[] = [
  // -- mammal (20) --
  card('Bear',     'mammal', '\u{1F43B}', 'Bear/3D/bear_3d.png',                'Growl!',
    'Bears are big and love honey!'),
  card('Cat',      'mammal', '\u{1F431}', 'Cat%20face/3D/cat_face_3d.png',      'Meow!',
    'Cats are cute and furry pets!'),
  card('Cow',      'mammal', '\u{1F42E}', 'Cow%20face/3D/cow_face_3d.png',      'Moo!',
    'Cows give us milk!'),
  card('Dog',      'mammal', '\u{1F436}', 'Dog%20face/3D/dog_face_3d.png',      'Woof Woof!',
    'Dogs are loyal and friendly friends!'),
  card('Elephant', 'mammal', '\u{1F418}', 'Elephant/3D/elephant_3d.png',        'Trumpet!',
    'Elephants are the largest land animals!'),
  card('Fox',      'mammal', '\u{1F98A}', 'Fox/3D/fox_3d.png',                  'Yip!',
    'Foxes are clever and have bushy tails!'),
  card('Giraffe',  'mammal', '\u{1F992}', 'Giraffe/3D/giraffe_3d.png',          'Hum!',
    'Giraffes have the longest necks!'),
  card('Horse',    'mammal', '\u{1F434}', 'Horse%20face/3D/horse_face_3d.png',  'Neigh!',
    'Horses love to run and gallop!'),
  card('Koala',    'mammal', '\u{1F428}', 'Koala/3D/koala_3d.png',              'Grunt!',
    'Koalas sleep most of the day!'),
  card('Lion',     'mammal', '\u{1F981}', 'Lion/3D/lion_3d.png',                'Roar!',
    'The Lion is the king of the jungle!'),
  card('Monkey',   'mammal', '\u{1F435}', 'Monkey%20face/3D/monkey_face_3d.png','Ooh Ooh Ah Ah!',
    'Monkeys love to swing from trees!'),
  card('Panda',    'mammal', '\u{1F43C}', 'Panda/3D/panda_3d.png',              'Chirp!',
    'Pandas love to eat bamboo!'),
  card('Pig',      'mammal', '\u{1F437}', 'Pig%20face/3D/pig_face_3d.png',      'Oink Oink!',
    'Pigs love to roll in mud!'),
  card('Rabbit',   'mammal', '\u{1F430}', 'Rabbit%20face/3D/rabbit_face_3d.png','Squeak!',
    'Rabbits hop and have long ears!'),
  card('Sheep',    'mammal', '\u{1F411}', 'Ewe/3D/ewe_3d.png',                  'Baa!',
    'Sheep have soft woolly coats!'),
  card('Tiger',    'mammal', '\u{1F42F}', 'Tiger/3D/tiger_3d.png',              'Growl!',
    'Tigers have beautiful orange and black stripes!'),
  card('Unicorn',  'mammal', '\u{1F984}', 'Unicorn/3D/unicorn_3d.png',          'Whinny!',
    'Unicorns are magical horses with a horn!'),
  card('Wolf',     'mammal', '\u{1F43A}', 'Wolf/3D/wolf_3d.png',                'Howl!',
    'Wolves howl at the moon!'),
  card('Yak',      'mammal', '\u{1F9AC}', 'Ox/3D/ox_3d.png',                    'Grunt!',
    'Yaks have thick fur and live in mountains!'),
  card('Zebra',    'mammal', '\u{1F993}', 'Zebra/3D/zebra_3d.png',              'Bray!',
    'Zebras have black and white stripes!'),

  // -- bird (7) --
  card('Chicken',     'bird', '\u{1F414}', 'Chicken/3D/chicken_3d.png',  'Cluck Cluck!',
    'Chickens lay eggs for us!'),
  card('Duck',        'bird', '\u{1F986}', 'Duck/3D/duck_3d.png',        'Quack Quack!',
    'Ducks swim in ponds and lakes!'),
  card('Nightingale', 'bird', '\u{1F426}', 'Bird/3D/bird_3d.png',        'Sing!',
    'Nightingales have beautiful songs!'),
  card('Owl',         'bird', '\u{1F989}', 'Owl/3D/owl_3d.png',          'Hoot Hoot!',
    'Owls are wise night birds!'),
  card('Penguin',     'bird', '\u{1F427}', 'Penguin/3D/penguin_3d.png',  'Honk!',
    'Penguins waddle on ice and swim!'),
  card('Quail',       'bird', '\u{1F426}', 'Bird/3D/bird_3d.png',        'Bob-white!',
    'Quails are small ground birds!'),
  card('Vulture',     'bird', '\u{1F985}', 'Eagle/3D/eagle_3d.png',      'Screech!',
    'Vultures soar high in the sky!'),

  // -- reptile (4) --
  card('Alligator', 'reptile', '\u{1F40A}', 'Crocodile/3D/crocodile_3d.png', 'Snap!',
    'Alligators are big reptiles with strong jaws!'),
  card('Iguana',    'reptile', '\u{1F98E}', 'Lizard/3D/lizard_3d.png',       'Hiss!',
    'Iguanas are colorful lizards!'),
  card('Snake',     'reptile', '\u{1F40D}', 'Snake/3D/snake_3d.png',         'Hiss!',
    'Snakes slither on the ground!'),
  card('Turtle',    'reptile', '\u{1F422}', 'Turtle/3D/turtle_3d.png',       'Snap!',
    'Turtles carry their house on their back!'),

  // -- amphibian (1) --
  card('Frog', 'amphibian', '\u{1F438}', 'Frog/3D/frog_3d.png', 'Ribbit!',
    'Frogs hop high and swim in ponds!'),

  // -- sea (4) --
  card('Fish',      'sea', '\u{1F420}', 'Tropical%20fish/3D/tropical_fish_3d.png', 'Blub Blub!',
    'Fish swim underwater with fins!'),
  card('Jellyfish', 'sea', '\u{1FABC}', 'Jellyfish/3D/jellyfish_3d.png',           'Float!',
    'Jellyfish swim gracefully in the ocean!'),
  card('Octopus',   'sea', '\u{1F419}', 'Octopus/3D/octopus_3d.png',               'Squirt!',
    'Octopuses have eight arms!'),
  card('Whale',     'sea', '\u{1F40B}', 'Whale/3D/whale_3d.png',                   'Whooosh!',
    'Whales are the biggest animals in the ocean!'),

  // -- insect (3) --
  card('Ant',       'insect', '\u{1F41C}', 'Ant/3D/ant_3d.png',             'Busy!',
    'Ants are tiny but very strong!'),
  card('Bee',       'insect', '\u{1F41D}', 'Honeybee/3D/honeybee_3d.png',   'Buzz Buzz!',
    'Bees make sweet honey from flowers!'),
  card('Butterfly', 'insect', '\u{1F98B}', 'Butterfly/3D/butterfly_3d.png', 'Flutter!',
    'Butterflies have colorful wings!'),
];

export interface AnimalFilter {
  key: 'all' | AnimalGroup;
  label: string;
}

export const FILTERS: readonly AnimalFilter[] = [
  { key: 'all',       label: '\u{1F43E} All' },
  { key: 'mammal',    label: '\u{1F981} Mammals' },
  { key: 'bird',      label: '\u{1F985} Birds' },
  { key: 'reptile',   label: '\u{1F40D} Reptiles' },
  { key: 'amphibian', label: '\u{1F438} Amphibians' },
  { key: 'sea',       label: '\u{1F41F} Sea' },
  { key: 'insect',    label: '\u{1F41B} Insects' },
];

import type { QuizQuestion } from '@/lib/quiz';

/**
 * Quiz questions for the Animals modal. Mix of:
 *   - sound → animal recognition (Roar! → Lion — "the King of the
 *     jungle" detail-card fact),
 *   - animal → group classification (matches the deck's 5-group filter),
 *   - body-feature trivia (longest neck → Giraffe; eight arms →
 *     Octopus — both lifted from the cards' own fact lines).
 *
 * Every option is the name of a real card in the 37-card deck.
 */
export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'Which animal is called the "King of the Jungle"?',
    opts: ['Bear', 'Elephant', 'Lion', 'Tiger'],
    ans: 2,
  },
  {
    q: 'Which of these is a REPTILE?',
    opts: ['Cat', 'Duck', 'Fish', 'Snake'],
    ans: 3,
  },
  {
    q: 'Which animal has the longest neck?',
    opts: ['Elephant', 'Giraffe', 'Horse', 'Zebra'],
    ans: 1,
  },
  {
    q: 'How many arms does an Octopus have?',
    opts: ['4', '6', '8', '10'],
    ans: 2,
  },
  {
    q: 'Which one is an INSECT?',
    opts: ['Bear', 'Butterfly', 'Penguin', 'Whale'],
    ans: 1,
  },
];
