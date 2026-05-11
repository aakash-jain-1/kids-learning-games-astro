/**
 * Data for the Shapes game — fourth GridLayout port.
 *
 * Foundational-set pedagogy: 14 shapes shown as a scannable grid where
 * each tile combines a *miniature pure-CSS rendering of the shape itself*
 * with the shape's name underneath. Tap a tile and the detail card shows
 * the same shape rendered large (~180px) plus a kid-friendly description.
 * Mirrors the vanilla `shapes-game.html` deck verbatim
 * (`shapes = { Circle: { class, info }, ... }` × 14) — no shape added,
 * none removed, every `info` string copied across as the `fact` field.
 *
 * Synthesized grouping (vanilla had none — deviation):
 *   - round   = Circle, Oval, Heart, Crescent       (4)
 *   - basic   = Square, Rectangle, Triangle, Diamond, Parallelogram, Trapezoid (6)
 *   - special = Pentagon, Hexagon, Octagon, Star    (4)
 *
 * Why synthesize groups? The Astro `GridLayout` shell expects a 3-or-4
 * pill filter row (matches the alphabets vowel/consonant, numbers
 * low/high, colors warm/cool/neutral pattern). A 14-shape deck without
 * grouping would be the *only* GridLayout game with no meaningful
 * filter — visual + pedagogical inconsistency. Grouping by visual
 * complexity (round → basic → special) mirrors how teachers introduce
 * shapes (curves first, then straight-edged, then polygons), so the
 * pedagogy is real, not just for filter symmetry.
 *
 * Deck order: group-sorted (round, basic, special) rather than vanilla's
 * flat insertion order. Documented as a deviation in PROGRESS.md →
 * "2026-05-07" changelog entry. Same precedent as Colors (warm → cool →
 * neutral) where vanilla's flat list was reflowed into the warm/cool/
 * neutral grouping. Shape *content* is unchanged; only the order shifts.
 *
 * Why no Fluent UI image: the visual content of this game *is* the
 * shape itself, drawn as pure CSS (border-radius / clip-path / mask-
 * image). Fetching an emoji ("a red triangle") would (a) cost N HTTP
 * requests on first paint and (b) not improve the pedagogy — children
 * already see the geometry directly. Codified as a deviation parallel
 * to the Numbers / Colors decisions.
 *
 * Fields:
 *   - `name`     — display + spoken name (e.g. "Circle")
 *   - `cssClass` — modifier slug used for both
 *                  `.gl-shape-figure--<cssClass>` (tile + detail card)
 *                  rendering. Stable kebab-case.
 *   - `group`    — `'round' | 'basic' | 'special'`, drives the filter
 *                  pill *and* the per-tile shape colour (round = pink,
 *                  basic = blue, special = orange — set via
 *                  `[data-group=…]` rule in `grid.css`).
 *   - `label`    — pill text for the detail card
 *   - `fact`     — kid-friendly description (vanilla `info` string,
 *                  trimmed of trailing emoji where present so
 *                  speechSynthesis sounds clean).
 */

export type ShapeGroup = 'round' | 'basic' | 'special';

export interface ShapeCard {
  /** Display + spoken name (e.g. "Circle") */
  name: string;
  /** Modifier slug for `.gl-shape-figure--<class>` (kebab-case) */
  cssClass: string;
  /** Pedagogical group — drives filter pill + tile fill colour */
  group: ShapeGroup;
  /** Human-readable pill text ("Round" / "Basic" / "Special") */
  label: string;
  /** Kid-friendly description, read aloud + shown in detail */
  fact: string;
}

const labelOf = (group: ShapeGroup): string =>
  group === 'round' ? 'Round' : group === 'basic' ? 'Basic' : 'Special';

const card = (
  name: string,
  cssClass: string,
  group: ShapeGroup,
  fact: string,
): ShapeCard => ({
  name,
  cssClass,
  group,
  label: labelOf(group),
  fact,
});

export const ALL_CARDS: readonly ShapeCard[] = [
  // -- round (4) --
  card('Circle',   'circle',   'round',
    'A Circle is round and has no corners!'),
  card('Oval',     'oval',     'round',
    'An Oval is like a stretched circle!'),
  card('Heart',    'heart',    'round',
    'A Heart shape shows love.'),
  card('Crescent', 'crescent', 'round',
    'A Crescent looks like the moon.'),

  // -- basic (6) --
  card('Square',        'square',        'basic',
    'A Square has 4 equal sides and 4 corners!'),
  card('Rectangle',     'rectangle',     'basic',
    'A Rectangle has 4 sides and 4 corners!'),
  card('Triangle',      'triangle',      'basic',
    'A Triangle has 3 sides and 3 corners!'),
  card('Diamond',       'diamond',       'basic',
    'A Diamond is a square turned on its side!'),
  card('Parallelogram', 'parallelogram', 'basic',
    'A Parallelogram has 4 slanted sides!'),
  card('Trapezoid',     'trapezoid',     'basic',
    'A Trapezoid has 4 sides, 2 are parallel!'),

  // -- special (4) --
  card('Pentagon', 'pentagon', 'special',
    'A Pentagon has 5 sides and 5 corners!'),
  card('Hexagon',  'hexagon',  'special',
    'A Hexagon has 6 sides and 6 corners!'),
  card('Octagon',  'octagon',  'special',
    'An Octagon has 8 sides and 8 corners!'),
  card('Star',     'star',     'special',
    'A Star shines bright with 5 points!'),
];

export interface ShapeFilter {
  key: 'all' | ShapeGroup;
  label: string;
}

export const FILTERS: readonly ShapeFilter[] = [
  { key: 'all',     label: '\u{1F31F} All' },
  { key: 'round',   label: '\u2B55 Round' },
  { key: 'basic',   label: '\u{1F4D0} Basic' },
  { key: 'special', label: '\u2728 Special' },
];

import type { QuizQuestion } from '@/lib/quiz';

/**
 * Quiz questions for the Shapes modal. Mix of:
 *   - sides-counting (Triangle = 3, Pentagon = 5, Hexagon = 6,
 *     Octagon = 8 — straight from each card's fact line),
 *   - shape → concept association (heart, star — round vs special
 *     groups),
 *   - cross-shape comparison (which shape has NO corners — Circle).
 *
 * Every option is a shape name from the 14-card deck.
 */
export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'How many sides does a Triangle have?',
    opts: ['2', '3', '4', '5'],
    ans: 1,
  },
  {
    q: 'Which shape has 6 sides?',
    opts: ['Hexagon', 'Pentagon', 'Square', 'Triangle'],
    ans: 0,
  },
  {
    q: 'Which shape is round and has NO corners at all?',
    opts: ['Circle', 'Diamond', 'Square', 'Star'],
    ans: 0,
  },
  {
    q: 'How many points does a Star have?',
    opts: ['3', '4', '5', '6'],
    ans: 2,
  },
  {
    q: 'Which shape shows love?',
    opts: ['Diamond', 'Heart', 'Octagon', 'Trapezoid'],
    ans: 1,
  },
];
