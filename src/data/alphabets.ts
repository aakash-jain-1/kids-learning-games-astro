/**
 * Data for the Alphabets game — the first GridLayout port.
 *
 * Foundational-set pedagogy: 26 letters shown as a scannable A–Z grid,
 * tap a tile to see its word, picture, and fact. We deliberately kept the
 * card-machine field names (`n`, `f`, `e`, `img`) so the same ALL_CARDS
 * dataset could power a unified Deck layout later (see the "Option C"
 * roadmap item in PROGRESS.md).
 *
 * Fields:
 *   - `letter`  — uppercase letter A–Z, rendered on the grid tile + big in detail
 *   - `n`       — word name, shown in the detail card (e.g. "Apple")
 *   - `f`       — fun fact read aloud + shown in the detail card
 *   - `e`       — plain emoji fallback if the PNG fails
 *   - `img`     — relative fluentui-emoji path (see FLUENT_IMG_BASE)
 *   - `type`    — `'vowel' | 'consonant'`, drives the filter pill + label
 *   - `label`   — human-readable pill text ("Vowel" / "Consonant")
 *
 * Image source note: the vanilla game used Iconify Noto SVGs. Per the
 * Astro-repo migration principle (Fluent UI 3D PNGs as the single image
 * CDN, already runtime-cached CacheFirst in `src/sw.ts`), all 26 entries
 * have been re-sourced against
 * `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji`. All URLs were verified
 * 200 OK at port time.
 *
 * Q maps to a Crown instead of Princess — `Princess/3D/princess_3d.png`
 * is intentionally missing from the Fluent UI pack (403), and the Queen's
 * crown is the closest kid-friendly stand-in.
 */

export { FLUENT_IMG_BASE } from './fluent';

export type LetterType = 'vowel' | 'consonant';

export interface AlphabetCard {
  /** Uppercase letter, A–Z — rendered big on the card face */
  letter: string;
  /** Name shown as the card + screen title (e.g. "Apple") */
  n: string;
  /** Fun fact read aloud on press + shown on the OLED screen */
  f: string;
  /** Plain emoji fallback, used if the PNG fails in the browser */
  e: string;
  /** Relative path inside fluentui-emoji to the 3D PNG for `n` */
  img: string;
  /** Vowel vs consonant — drives filter + pill colour */
  type: LetterType;
  /** Human-readable pill text ("Vowel" / "Consonant") */
  label: string;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const typeOf = (letter: string): LetterType =>
  VOWELS.has(letter) ? 'vowel' : 'consonant';

const labelOf = (letter: string): string =>
  VOWELS.has(letter) ? 'Vowel' : 'Consonant';

// Helper to declare a card without re-typing `type` + `label`.
const card = (
  letter: string,
  n: string,
  img: string,
  e: string,
  f: string,
): AlphabetCard => ({
  letter,
  n,
  f,
  e,
  img,
  type: typeOf(letter),
  label: labelOf(letter),
});

export const ALL_CARDS: readonly AlphabetCard[] = [
  card('A', 'Apple', 'Red%20apple/3D/red_apple_3d.png', '🍎',
    'Apples come in red, green, and yellow. They grow on trees!'),
  card('B', 'Ball', 'Soccer%20ball/3D/soccer_ball_3d.png', '⚽',
    'Balls can bounce, roll, and be kicked. So much fun!'),
  card('C', 'Cat', 'Cat%20face/3D/cat_face_3d.png', '🐱',
    'Cats are fluffy pets. They love to purr and play!'),
  card('D', 'Dog', 'Dog%20face/3D/dog_face_3d.png', '🐶',
    'Dogs are loyal friends. They wag their tails when happy!'),
  card('E', 'Elephant', 'Elephant/3D/elephant_3d.png', '🐘',
    'Elephants are the biggest land animals and love water!'),
  card('F', 'Fish', 'Fish/3D/fish_3d.png', '🐟',
    'Fish swim in rivers, lakes, and the big blue ocean.'),
  card('G', 'Giraffe', 'Giraffe/3D/giraffe_3d.png', '🦒',
    'Giraffes have the longest necks of any animal!'),
  card('H', 'House', 'House/3D/house_3d.png', '🏠',
    'A house is where we live with our family.'),
  card('I', 'Ice Cream', 'Ice%20cream/3D/ice_cream_3d.png', '🍨',
    'Ice cream is a cold, sweet treat — perfect on a sunny day!'),
  card('J', 'Juice', 'Beverage%20box/3D/beverage_box_3d.png', '🧃',
    'Juice is a yummy drink made from fruits.'),
  card('K', 'Kite', 'Kite/3D/kite_3d.png', '🪁',
    'Kites fly high in the sky when the wind is strong!'),
  card('L', 'Lion', 'Lion/3D/lion_3d.png', '🦁',
    'Lions are called the King of the Jungle. They have a big roar!'),
  card('M', 'Monkey', 'Monkey%20face/3D/monkey_face_3d.png', '🐵',
    'Monkeys love to climb trees and munch on bananas!'),
  card('N', 'Notebook', 'Notebook/3D/notebook_3d.png', '📓',
    'Notebooks are where we write and draw our favourite ideas.'),
  card('O', 'Orange', 'Tangerine/3D/tangerine_3d.png', '🍊',
    'Oranges are juicy fruits full of vitamin C!'),
  card('P', 'Pizza', 'Pizza/3D/pizza_3d.png', '🍕',
    'Pizza is a round, cheesy favourite with lots of toppings.'),
  card('Q', 'Queen', 'Crown/3D/crown_3d.png', '👑',
    'A queen wears a crown and rules her kingdom with kindness!'),
  card('R', 'Rabbit', 'Rabbit%20face/3D/rabbit_face_3d.png', '🐰',
    'Rabbits are soft and fluffy, with long floppy ears!'),
  card('S', 'Sun', 'Sun%20with%20face/3D/sun_with_face_3d.png', '🌞',
    'The Sun gives us warmth and light every single day.'),
  card('T', 'Train', 'Locomotive/3D/locomotive_3d.png', '🚂',
    'Trains run on tracks and can carry lots of people and cargo!'),
  card('U', 'Umbrella', 'Umbrella%20with%20rain%20drops/3D/umbrella_with_rain_drops_3d.png', '☔',
    'An umbrella keeps us dry when it rains.'),
  card('V', 'Van', 'Delivery%20truck/3D/delivery_truck_3d.png', '🚚',
    'Vans and trucks carry things from one place to another.'),
  card('W', 'Watermelon', 'Watermelon/3D/watermelon_3d.png', '🍉',
    'Watermelon is a big, sweet fruit full of water. Yum!'),
  card('X', 'Xylophone', 'Musical%20keyboard/3D/musical_keyboard_3d.png', '🎹',
    'A xylophone makes music when you tap its bars.'),
  card('Y', 'Yacht', 'Sailboat/3D/sailboat_3d.png', '⛵',
    'A yacht is a boat that sails on the sea.'),
  card('Z', 'Zebra', 'Zebra/3D/zebra_3d.png', '🦓',
    'Zebras have black-and-white stripes — no two are the same!'),
];

export interface AlphabetFilter {
  key: 'all' | LetterType;
  label: string;
}

export const FILTERS: readonly AlphabetFilter[] = [
  { key: 'all',        label: '🔤 All' },
  { key: 'vowel',      label: '🎵 Vowels' },
  { key: 'consonant',  label: '🎸 Consonants' },
];
