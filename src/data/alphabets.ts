/**
 * Data for the Alphabets game — the first "classic two-pane" port.
 *
 * Each card is a single letter A–Z paired with a representative word and
 * a Fluent UI 3D PNG. `e` is the plain-emoji fallback used when the image
 * fails to load (handled in the page script).
 *
 * Image source note: the vanilla game used Iconify Noto SVGs. Per the
 * Astro-repo migration principle (Fluent UI 3D PNGs as the single image
 * CDN), all 26 entries have been re-sourced against
 * `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji`. All 26 URLs were
 * verified 200 OK at port time.
 *
 * Q maps to a Crown instead of Princess — the Princess/3D asset is
 * intentionally missing from the Fluent UI pack (403), and Crown is the
 * closest kid-friendly stand-in for "Queen".
 */

export { FLUENT_IMG_BASE } from './fluent';

export interface AlphabetCard {
  /** Uppercase letter, A–Z */
  letter: string;
  /** Word shown with the letter, e.g. "Apple" */
  word: string;
  /** Relative path inside fluentui-emoji for the 3D PNG */
  img: string;
  /** Plain emoji fallback, used if the PNG 404s in the browser */
  e: string;
  /** Fun fact read aloud / shown in the right pane tip area */
  fact: string;
}

export const ALPHABET_CARDS: readonly AlphabetCard[] = [
  {
    letter: 'A',
    word: 'Apple',
    img: 'Red%20apple/3D/red_apple_3d.png',
    e: '🍎',
    fact: 'Apples come in red, green, and yellow. They grow on trees!',
  },
  {
    letter: 'B',
    word: 'Ball',
    img: 'Soccer%20ball/3D/soccer_ball_3d.png',
    e: '⚽',
    fact: 'Balls can bounce, roll, and be kicked. So much fun!',
  },
  {
    letter: 'C',
    word: 'Cat',
    img: 'Cat%20face/3D/cat_face_3d.png',
    e: '🐱',
    fact: 'Cats are fluffy pets. They love to purr and play!',
  },
  {
    letter: 'D',
    word: 'Dog',
    img: 'Dog%20face/3D/dog_face_3d.png',
    e: '🐶',
    fact: 'Dogs are loyal friends. They wag their tails when happy!',
  },
  {
    letter: 'E',
    word: 'Elephant',
    img: 'Elephant/3D/elephant_3d.png',
    e: '🐘',
    fact: 'Elephants are the biggest land animals and love water!',
  },
  {
    letter: 'F',
    word: 'Fish',
    img: 'Fish/3D/fish_3d.png',
    e: '🐟',
    fact: 'Fish swim in rivers, lakes, and the big blue ocean.',
  },
  {
    letter: 'G',
    word: 'Giraffe',
    img: 'Giraffe/3D/giraffe_3d.png',
    e: '🦒',
    fact: 'Giraffes have the longest necks of any animal!',
  },
  {
    letter: 'H',
    word: 'House',
    img: 'House/3D/house_3d.png',
    e: '🏠',
    fact: 'A house is where we live with our family.',
  },
  {
    letter: 'I',
    word: 'Ice Cream',
    img: 'Ice%20cream/3D/ice_cream_3d.png',
    e: '🍨',
    fact: 'Ice cream is a cold, sweet treat — perfect on a sunny day!',
  },
  {
    letter: 'J',
    word: 'Juice',
    img: 'Beverage%20box/3D/beverage_box_3d.png',
    e: '🧃',
    fact: 'Juice is a yummy drink made from fruits.',
  },
  {
    letter: 'K',
    word: 'Kite',
    img: 'Kite/3D/kite_3d.png',
    e: '🪁',
    fact: 'Kites fly high in the sky when the wind is strong!',
  },
  {
    letter: 'L',
    word: 'Lion',
    img: 'Lion/3D/lion_3d.png',
    e: '🦁',
    fact: 'Lions are called the King of the Jungle. They have a big roar!',
  },
  {
    letter: 'M',
    word: 'Monkey',
    img: 'Monkey%20face/3D/monkey_face_3d.png',
    e: '🐵',
    fact: 'Monkeys love to climb trees and munch on bananas!',
  },
  {
    letter: 'N',
    word: 'Notebook',
    img: 'Notebook/3D/notebook_3d.png',
    e: '📓',
    fact: 'Notebooks are where we write and draw our favourite ideas.',
  },
  {
    letter: 'O',
    word: 'Orange',
    img: 'Tangerine/3D/tangerine_3d.png',
    e: '🍊',
    fact: 'Oranges are juicy fruits full of vitamin C!',
  },
  {
    letter: 'P',
    word: 'Pizza',
    img: 'Pizza/3D/pizza_3d.png',
    e: '🍕',
    fact: 'Pizza is a round, cheesy favourite with lots of toppings.',
  },
  {
    letter: 'Q',
    word: 'Queen',
    img: 'Crown/3D/crown_3d.png',
    e: '👑',
    fact: 'A queen wears a crown and rules her kingdom with kindness!',
  },
  {
    letter: 'R',
    word: 'Rabbit',
    img: 'Rabbit%20face/3D/rabbit_face_3d.png',
    e: '🐰',
    fact: 'Rabbits are soft and fluffy, with long floppy ears!',
  },
  {
    letter: 'S',
    word: 'Sun',
    img: 'Sun%20with%20face/3D/sun_with_face_3d.png',
    e: '🌞',
    fact: 'The Sun gives us warmth and light every single day.',
  },
  {
    letter: 'T',
    word: 'Train',
    img: 'Locomotive/3D/locomotive_3d.png',
    e: '🚂',
    fact: 'Trains run on tracks and can carry lots of people and cargo!',
  },
  {
    letter: 'U',
    word: 'Umbrella',
    img: 'Umbrella%20with%20rain%20drops/3D/umbrella_with_rain_drops_3d.png',
    e: '☔',
    fact: 'An umbrella keeps us dry when it rains.',
  },
  {
    letter: 'V',
    word: 'Van',
    img: 'Delivery%20truck/3D/delivery_truck_3d.png',
    e: '🚚',
    fact: 'Vans and trucks carry things from one place to another.',
  },
  {
    letter: 'W',
    word: 'Watermelon',
    img: 'Watermelon/3D/watermelon_3d.png',
    e: '🍉',
    fact: 'Watermelon is a big, sweet fruit full of water. Yum!',
  },
  {
    letter: 'X',
    word: 'Xylophone',
    img: 'Musical%20keyboard/3D/musical_keyboard_3d.png',
    e: '🎹',
    fact: 'A xylophone makes music when you tap its bars.',
  },
  {
    letter: 'Y',
    word: 'Yacht',
    img: 'Sailboat/3D/sailboat_3d.png',
    e: '⛵',
    fact: 'A yacht is a boat that sails on the sea.',
  },
  {
    letter: 'Z',
    word: 'Zebra',
    img: 'Zebra/3D/zebra_3d.png',
    e: '🦓',
    fact: 'Zebras have black-and-white stripes — no two are the same!',
  },
];

/** Total number of letters; used for progress counter sizing. */
export const ALPHABET_COUNT = ALPHABET_CARDS.length;

/** Quick-lookup map — `ALPHABET_BY_LETTER.get('A')` → the Apple card. */
export const ALPHABET_BY_LETTER: ReadonlyMap<string, AlphabetCard> = new Map(
  ALPHABET_CARDS.map((c) => [c.letter, c] as const),
);
