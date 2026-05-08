// Weather card deck. Ported from games/weather-game.html lines 256-277.
//
// Each card renders as a Fluent UI 3D emoji PNG (via `FLUENT_IMG_BASE +
// card.img`) with a plain emoji fallback if the image fails to load. This
// is the same pattern used by the Flashcards "image" variant — the only
// difference here is that *every* weather card is an image card.
//
// The `season` drives:
//   - pill colour under the card name (`.card-pill.<season>`)
//   - OLED screen badge (`.scrn-badge-pill.<season>`)
//   - which cards appear when a filter is active
//
// The vanilla game used Iconify's Noto SVG sprites. We deliberately switched
// to Fluent UI 3D PNGs for consistency with Flashcards (same CDN origin is
// already SW-cached) — see principle #9 in PROGRESS.md's "Migration
// principles" section.
//
// Consumers compose the full image URL as `${FLUENT_IMG_BASE}${card.img}`.
// `FLUENT_IMG_BASE` lives in `@/data/fluent` — import it from there directly.
//
// Quiz (post-migration polish, 2026-05-08, Track 1 batch 2): 5
// multiple-choice questions about the deck content. Third non-story
// consumer of `src/lib/quiz.ts` after Dinosaurs and Solar System.
// Storage key: `weather_quiz_v1`.

import type { QuizQuestion } from '@/lib/quiz';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'any';

export interface WeatherCard {
  /** Display name shown under the card and read aloud */
  n: string;
  /** Drives pill colour + filter membership */
  season: Season;
  /** Fun fact read aloud on press */
  f: string;
  /**
   * Path inside the Fluent UI emoji pack, relative to `FLUENT_IMG_BASE`.
   * Paths contain spaces — the browser URL-encodes on `<img>.src` assignment.
   */
  img: string;
  /** Plain emoji fallback, shown if the image 404s or the network is offline */
  e: string;
}

export interface WeatherFilter {
  key: 'all' | Season;
  label: string;
}

// Emoji glyph rendered next to the season name on the season pill and
// OLED badge. Matches the vanilla SEASON_EMOJI map exactly.
export const SEASON_EMOJI: Readonly<Record<Season, string>> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
  any: '🎴',
};

export const ALL_CARDS: readonly WeatherCard[] = [
  { n: 'Sunny', season: 'summer',
    img: 'Sun/3D/sun_3d.png', e: '☀️',
    f: 'On a sunny day the sky is clear and blue. The Sun shines brightly keeping us warm. Great day for playing outside!' },
  { n: 'Cloudy', season: 'any',
    img: 'Cloud/3D/cloud_3d.png', e: '☁️',
    f: 'Clouds are made of millions of tiny water droplets floating in the sky. They come in many shapes — fluffy, flat, wispy and more!' },
  { n: 'Rainy', season: 'any',
    img: 'Cloud with rain/3D/cloud_with_rain_3d.png', e: '🌧️',
    f: 'Rain falls when water droplets in clouds become too heavy. Rain fills our rivers and helps plants and flowers grow!' },
  { n: 'Thunderstorm', season: 'summer',
    img: 'Cloud with lightning and rain/3D/cloud_with_lightning_and_rain_3d.png', e: '⛈️',
    f: 'During a thunderstorm lightning flashes and thunder booms! Lightning is a giant spark of electricity. Always stay indoors when there is lightning!' },
  { n: 'Snowy', season: 'winter',
    img: 'Cloud with snow/3D/cloud_with_snow_3d.png', e: '❄️',
    f: 'Snowflakes form when water freezes high in the clouds. Every single snowflake has a unique six-sided shape — no two are ever exactly alike!' },
  { n: 'Windy', season: 'any',
    img: 'Wind face/3D/wind_face_3d.png', e: '💨',
    f: 'Wind is moving air! Warm air rises and cool air rushes in to take its place. It can be a gentle breeze or a powerful storm!' },
  { n: 'Rainbow', season: 'spring',
    img: 'Rainbow/3D/rainbow_3d.png', e: '🌈',
    f: 'A rainbow appears when sunlight shines through raindrops. It always has the same 7 colours: Red, Orange, Yellow, Green, Blue, Indigo, Violet!' },
  { n: 'Foggy', season: 'autumn',
    img: 'Fog/3D/fog_3d.png', e: '🌫️',
    f: 'Fog is like a cloud that sits right on the ground! It makes it hard to see far away. Fog usually disappears after the Sun warms the air in the morning.' },
  { n: 'Hailstorm', season: 'spring',
    img: 'Cloud with snow/3D/cloud_with_snow_3d.png', e: '🌨️',
    f: 'Hail is balls of ice that fall from thunderclouds! They form when raindrops get carried high up in the cold part of a storm cloud and freeze.' },
  { n: 'Hot', season: 'summer',
    img: 'Thermometer/3D/thermometer_3d.png', e: '🌡️',
    f: 'Very hot weather happens in summer — the hottest season. People cool off by drinking water, swimming and eating ice cream!' },
  { n: 'Cold', season: 'winter',
    img: 'Cold face/3D/cold_face_3d.png', e: '🥶',
    f: 'Cold weather comes in winter. We wear coats, scarves and gloves to stay warm. Water turns to ice and puddles can freeze solid overnight!' },
  { n: 'Spring', season: 'spring',
    img: 'Cherry blossom/3D/cherry_blossom_3d.png', e: '🌸',
    f: 'Spring is warm and fresh! Flowers bloom, trees grow new leaves and baby animals are born. After cold winter, spring feels wonderful!' },
  { n: 'Summer', season: 'summer',
    img: 'Sun with face/3D/sun_with_face_3d.png', e: '🌞',
    f: 'Summer is the hottest season with the longest days. The Sun stays up late! Perfect for beaches, ice cream and outdoor adventures!' },
  { n: 'Autumn', season: 'autumn',
    img: 'Fallen leaf/3D/fallen_leaf_3d.png', e: '🍂',
    f: 'In autumn leaves turn beautiful shades of red, orange and yellow before falling. Animals like squirrels collect food for winter!' },
  { n: 'Winter', season: 'winter',
    img: 'Snowflake/3D/snowflake_3d.png', e: '⛄',
    f: 'Winter is the coldest season with the shortest days. It can snow, making the world look white and magical. Time for hot chocolate and cosy blankets!' },
  { n: 'Hurricane', season: 'summer',
    img: 'Cyclone/3D/cyclone_3d.png', e: '🌀',
    f: 'A hurricane is a massive spinning storm with very strong winds over warm ocean water. It can bring heavy rain and flooding. Always stay safe!' },
  { n: 'Drought', season: 'summer',
    img: 'Desert/3D/desert_3d.png', e: '🏜️',
    f: 'A drought happens when a place gets very little or no rain for a long time. The ground dries up, rivers shrink and water becomes precious!' },
  { n: 'Tornado', season: 'spring',
    img: 'Tornado/3D/tornado_3d.png', e: '🌪️',
    f: 'A tornado is a fast-spinning funnel of wind that touches the ground. It can pick up cars and trees! Tornado Alley in the USA sees hundreds every year!' },
  { n: 'Partly Cloudy', season: 'any',
    img: 'Sun behind cloud/3D/sun_behind_cloud_3d.png', e: '⛅',
    f: 'Partly cloudy means some clouds in the sky but also sunshine! One of the most common types of weather — not too hot, not too gloomy!' },
  { n: 'Blizzard', season: 'winter',
    img: 'Cloud with snow/3D/cloud_with_snow_3d.png', e: '🌨️',
    f: 'A blizzard is a very heavy snowstorm with strong winds that blow snow everywhere. It can be hard to see even a few steps ahead — called a whiteout!' },
];

export const FILTERS: readonly WeatherFilter[] = [
  { key: 'all', label: 'All 🌤️' },
  { key: 'spring', label: '🌸 Spring' },
  { key: 'summer', label: '☀️ Summer' },
  { key: 'autumn', label: '🍂 Autumn' },
  { key: 'winter', label: '❄️ Winter' },
  { key: 'any', label: '🎴 Any Season' },
];

/** Human-friendly label ("spring" → "Spring") — used for pill + screen badge. */
export function seasonLabel(season: Season): string {
  const emoji = SEASON_EMOJI[season];
  const word = season.charAt(0).toUpperCase() + season.slice(1);
  return `${emoji} ${word}`;
}

export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'How many colours does a rainbow always have?',
    opts: ['Five', 'Six', 'Seven', 'Ten'],
    ans: 2,
  },
  {
    q: 'In which season does it usually SNOW?',
    opts: ['Spring', 'Summer', 'Autumn', 'Winter'],
    ans: 3,
  },
  {
    q: 'What should you do during a thunderstorm?',
    opts: [
      'Play outside in the rain',
      'Stand under a tall tree',
      'Stay safely indoors',
      'Fly a kite',
    ],
    ans: 2,
  },
  {
    q: 'In which season do leaves turn red, orange and yellow?',
    opts: ['Spring', 'Summer', 'Autumn', 'Winter'],
    ans: 2,
  },
  {
    q: 'Are any two snowflakes ever exactly alike?',
    opts: [
      'Yes, all snowflakes are identical',
      'No, every snowflake is unique',
      'Only in winter',
      'Only the big ones match',
    ],
    ans: 1,
  },
];
