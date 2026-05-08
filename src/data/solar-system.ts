// Solar System card deck. Ported from games/solar-system-game.html lines 419-442.
//
// Each card renders as a pure-CSS planet (see `src/styles/planets.css`),
// not an emoji or image, so the `e` field is only a fallback for future
// exports / alt text, never shown in the UI.
//
// The `type` drives:
//   - pill colour under the card name (`.card-pill.<type>`)
//   - OLED screen badge (`.scrn-badge-pill.<type>`)
//   - which cards appear when a filter is active
//
// The `key` is the CSS-class suffix for `.planet-<key>` — e.g. `"saturn"`
// means we render `<div class="planet-art planet-saturn ...">` and wrap it
// in a ring.
//
// The final card count and order mirror the vanilla game exactly: Sun,
// 8 planets, Moon, Pluto = 11 cards.
//
// Quiz (post-migration polish, 2026-05-08, Track 1 batch 2): 5
// multiple-choice questions about the deck content. Second non-story
// consumer of `src/lib/quiz.ts` after Dinosaurs. Storage key:
// `solar-system_quiz_v1`.

import type { QuizQuestion } from '@/lib/quiz';

export type PlanetType =
  | 'star'
  | 'rocky'
  | 'gas-giant'
  | 'ice-giant'
  | 'satellite'
  | 'dwarf';

export interface PlanetCard {
  /** Display name, read aloud */
  n: string;
  /** CSS class suffix for `.planet-<key>` */
  key: string;
  /** Drives pill colour + filter */
  type: PlanetType;
  /** Label text for pill and screen badge */
  label: string;
  /** Fun fact read aloud on press */
  f: string;
  /** Fallback emoji — not rendered, kept for alt text / future use */
  e: string;
}

export interface PlanetFilter {
  key: 'all' | PlanetType;
  label: string;
}

export const ALL_CARDS: readonly PlanetCard[] = [
  { key: 'sun', n: 'Sun', type: 'star', label: '⭐ Star · Centre of Solar System',
    f: 'The Sun is a giant star made of super-hot gas! It gives light and warmth to all planets. About one million Earths could fit inside the Sun — it is enormous!',
    e: '☀️' },
  { key: 'mercury', n: 'Mercury', type: 'rocky', label: '🪨 Rocky · 1st Planet',
    f: 'Mercury is the smallest planet and the fastest mover — it zooms around the Sun in just 88 days! Despite being closest to the Sun, Venus is actually hotter!',
    e: '⚫' },
  { key: 'venus', n: 'Venus', type: 'rocky', label: '🔥 Rocky · 2nd Planet',
    f: 'Venus is the hottest planet at 465°C — hot enough to melt lead! It spins backwards compared to most planets and is covered in thick poisonous clouds!',
    e: '🟡' },
  { key: 'earth', n: 'Earth', type: 'rocky', label: '🌊 Rocky · 3rd Planet · Our Home',
    f: 'Earth is our home — the only planet with liquid water, air to breathe and living things! It has one moon and is about 4.5 billion years old!',
    e: '🌍' },
  { key: 'mars', n: 'Mars', type: 'rocky', label: '🏜️ Rocky · 4th Planet',
    f: 'Mars is the Red Planet because its soil is full of iron rust! It has the tallest volcano — Olympus Mons is 3 times taller than Mount Everest!',
    e: '🔴' },
  { key: 'jupiter', n: 'Jupiter', type: 'gas-giant', label: '👑 Gas Giant · 5th · Largest',
    f: 'Jupiter is the biggest planet — over 1,300 Earths can fit inside! Its Great Red Spot is a storm that has been raging for more than 350 years!',
    e: '🟤' },
  { key: 'saturn', n: 'Saturn', type: 'gas-giant', label: '💍 Gas Giant · 6th · Rings',
    f: 'Saturn has beautiful rings made of billions of ice and rock chunks! It is so light it could actually float on water — if there were an ocean big enough!',
    e: '🪐' },
  { key: 'uranus', n: 'Uranus', type: 'ice-giant', label: '❄️ Ice Giant · 7th Planet',
    f: 'Uranus spins on its side like a rolling ball! Scientists think a giant collision tipped it over billions of years ago. It has 13 rings and 27 known moons!',
    e: '🔵' },
  { key: 'neptune', n: 'Neptune', type: 'ice-giant', label: '🌬️ Ice Giant · 8th Planet',
    f: 'Neptune is the farthest planet and the windiest place in the Solar System — winds reach 2,100 km/h! One Neptune year lasts 165 Earth years!',
    e: '🌀' },
  { key: 'moon', n: 'Moon', type: 'satellite', label: '🌍 Earth\u2019s Moon',
    f: 'The Moon is Earth\u2019s only natural satellite! Neil Armstrong was the first human to walk on it in 1969. The Moon\u2019s gravity controls our ocean tides every day!',
    e: '🌕' },
  { key: 'pluto', n: 'Pluto', type: 'dwarf', label: '🧣 Dwarf Planet',
    f: 'Pluto was the 9th planet until 2006 when scientists reclassified it as a dwarf planet. It is smaller than our Moon and lives far out in the icy Kuiper Belt!',
    e: '🌗' },
];

export const FILTERS: readonly PlanetFilter[] = [
  { key: 'all', label: 'All 🪐' },
  { key: 'star', label: '⭐ Star' },
  { key: 'rocky', label: '🪨 Rocky' },
  { key: 'gas-giant', label: '👑 Gas Giant' },
  { key: 'ice-giant', label: '❄️ Ice Giant' },
  { key: 'satellite', label: '🌕 Moon' },
  { key: 'dwarf', label: '🧣 Dwarf' },
];

export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'Which is the BIGGEST planet in our Solar System?',
    opts: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
    ans: 2,
  },
  {
    q: 'Which planet has beautiful rings made of ice and rock?',
    opts: ['Mercury', 'Venus', 'Neptune', 'Saturn'],
    ans: 3,
  },
  {
    q: 'Which is the HOTTEST planet, hot enough to melt lead?',
    opts: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    ans: 1,
  },
  {
    q: 'Which planet is known as the Red Planet?',
    opts: ['Mars', 'Jupiter', 'Pluto', 'Mercury'],
    ans: 0,
  },
  {
    q: 'What is the Sun made of?',
    opts: ['Solid rock', 'Liquid water', 'Super-hot gas', 'Cold ice'],
    ans: 2,
  },
];
