/**
 * Data for the Numbers game — second GridLayout port.
 *
 * Foundational-set pedagogy: 1–10 digits shown as a scannable grid, tap
 * a tile to see the digit large, the English word, N concrete count
 * objects (CSS circles with star glyphs — *no* Fluent UI image fetch),
 * and a fun fact. Matches the vanilla `numbers-game.html` deck exactly
 * (`numbers = { 1: 'One', … 10: 'Ten' }`); deliberately not extending to
 * 1–20 so the port stays faithful to vanilla content.
 *
 * Why no Fluent UI image: vanilla represents quantity with N abstract
 * `.count-object` divs (star inside a coloured circle, cycling through
 * 5 colours). That's the *concrete-quantity representation* pedagogy
 * — children count by tapping each object. Fetching N copies of a
 * Fluent emoji would (a) cost N HTTP requests on first paint and
 * (b) not improve the pedagogy. Codified as a deliberate deviation
 * in PROGRESS.md → "2026-05-06" changelog entry.
 *
 * Fields:
 *   - `n`        — digit value 1–10, used as both the tile label and detail title
 *   - `word`     — English word ("One", "Two", …) shown under the digit
 *   - `fact`     — kid-friendly fun fact, read aloud + shown in detail
 *   - `group`    — `'low' | 'high'`, drives the filter pill (1–5 vs 6–10)
 *   - `label`    — pill text ("1–5" / "6–10")
 */

export type NumberGroup = 'low' | 'high';

export interface NumberCard {
  /** Digit value 1–10 */
  n: number;
  /** English word for `n` (e.g. "One") */
  word: string;
  /** Fun fact read aloud + shown in detail */
  fact: string;
  /** 1–5 vs 6–10, drives filter + pill */
  group: NumberGroup;
  /** Human-readable pill text */
  label: string;
}

const labelOf = (group: NumberGroup): string =>
  group === 'low' ? '1–5' : '6–10';

const card = (n: number, word: string, fact: string): NumberCard => {
  const group: NumberGroup = n <= 5 ? 'low' : 'high';
  return { n, word, fact, group, label: labelOf(group) };
};

export const ALL_CARDS: readonly NumberCard[] = [
  card(1, 'One', 'There is only one of you in the whole world!'),
  card(2, 'Two', 'You have two eyes to see and two ears to hear.'),
  card(3, 'Three', 'Three little pigs and three blind mice — many stories love three!'),
  card(4, 'Four', 'A car has four wheels. So do most chairs!'),
  card(5, 'Five', 'You have five fingers on each hand. Give a high five!'),
  card(6, 'Six', 'An insect always has six legs. Count an ant\u2019s legs and see!'),
  card(7, 'Seven', 'A rainbow has seven beautiful colours.'),
  card(8, 'Eight', 'An octopus has eight wiggly arms.'),
  card(9, 'Nine', 'A baseball game has nine innings.'),
  card(10, 'Ten', 'You have ten fingers and ten toes — perfect for counting!'),
];

export interface NumberFilter {
  key: 'all' | NumberGroup;
  label: string;
}

export const FILTERS: readonly NumberFilter[] = [
  { key: 'all',  label: '🔢 All' },
  { key: 'low',  label: '🌱 1–5' },
  { key: 'high', label: '🌟 6–10' },
];

import type { QuizQuestion } from '@/lib/quiz';

/**
 * Quiz questions for the Numbers modal. Mix of:
 *   - digit → word recognition,
 *   - word → digit recognition,
 *   - body-counting application (fingers, eyes — recall the facts!),
 *   - low vs high group identification (matches the deck filter),
 *   - rainbow trivia from the "Seven" card's fact line — tests that
 *     children noticed the fact when they tapped the tile.
 *
 * Every option is a number or word that appears on a real tile in
 * the 1–10 deck so the quiz feels native to the deck's content.
 */
export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'What number comes after 4?',
    opts: ['3', '5', '6', '7'],
    ans: 1,
  },
  {
    q: 'How do you write the word "Three" as a number?',
    opts: ['2', '3', '4', '5'],
    ans: 1,
  },
  {
    q: 'How many fingers do you have on TWO hands?',
    opts: ['Five', 'Eight', 'Ten', 'Twelve'],
    ans: 2,
  },
  {
    q: 'Which of these numbers is in the 1–5 group?',
    opts: ['Eight', 'Nine', 'Ten', 'Two'],
    ans: 3,
  },
  {
    q: 'How many colours does a rainbow have?',
    opts: ['Five', 'Six', 'Seven', 'Eight'],
    ans: 2,
  },
];
