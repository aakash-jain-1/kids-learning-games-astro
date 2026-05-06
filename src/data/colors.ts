/**
 * Data for the Colors game — third GridLayout port.
 *
 * Foundational-set pedagogy: 12 colours shown as a scannable grid of
 * filled swatches; tap a swatch to see the same colour applied across
 * a small gallery of pure-CSS shapes (circle, square, rounded-square,
 * diamond, triangle). Vanilla colors-game.html showed the same
 * "this is what this colour looks like across different shapes"
 * demonstration in its right pane (`shapesContainer` with circle,
 * square, rectangle, triangle, diamond, hexagon, fan). We keep that
 * pedagogy verbatim; the only additions are per-colour fun facts
 * (vanilla had none) and a warm / cool / neutral filter so the deck
 * feels coherent with Alphabets (vowel/consonant) and Numbers
 * (low/high) — the "every game has a meaningful filter" pattern.
 *
 * Why no Fluent UI image: the visual content of this game *is* the
 * colour itself. Fetching a Fluent emoji ("a red apple") would just
 * add HTTP cost without adding pedagogical value — children already
 * recognise "red" from the swatch. Codified as a deviation in the
 * 2026-05-06 PROGRESS.md changelog ("Colors port" entry).
 *
 * Fields:
 *   - `name`   — display name + spoken name + lookup key (e.g. "Red")
 *   - `hex`    — CSS colour value, drives the tile background and the
 *                shape gallery in the detail card
 *   - `group`  — `'warm' | 'cool' | 'neutral'`, drives the filter pill
 *   - `label`  — pill text ("Warm" / "Cool" / "Neutral")
 *   - `fact`   — kid-friendly fun fact, read aloud + shown in detail
 *   - `light`  — `true` if the swatch needs *dark* tile text + dark
 *                border (Yellow + White only). Derived once at module
 *                load to keep template code clean.
 *
 * Hex values match vanilla `colors = { 'Red': '#FF0000', ... }`
 * verbatim; no colour reinterpretation. Yellow stays #FFFF00 even
 * though it's punishingly bright on white backgrounds — the CSS
 * theme handles contrast via the per-tile dark-text rule.
 */

export type ColorGroup = 'warm' | 'cool' | 'neutral';

export interface ColorCard {
  /** Display + spoken name (e.g. "Red") */
  name: string;
  /** CSS hex (e.g. "#FF0000") — used for tile fill + shape fill */
  hex: string;
  /** Warm / cool / neutral, drives the filter pill */
  group: ColorGroup;
  /** Human-readable pill text */
  label: string;
  /** Fun fact read aloud + shown in detail */
  fact: string;
  /** True for very-light swatches needing dark tile text + dark border */
  light: boolean;
}

const labelOf = (group: ColorGroup): string =>
  group === 'warm' ? 'Warm' : group === 'cool' ? 'Cool' : 'Neutral';

// Yellow + White read black-on-light visually; everything else is
// fine with the default white-on-tile text. (Pink and Orange are
// borderline but tested OK against #fff.)
const LIGHT_NAMES = new Set(['Yellow', 'White']);

const card = (
  name: string,
  hex: string,
  group: ColorGroup,
  fact: string,
): ColorCard => ({
  name,
  hex,
  group,
  label: labelOf(group),
  fact,
  light: LIGHT_NAMES.has(name),
});

export const ALL_CARDS: readonly ColorCard[] = [
  card('Red',    '#FF0000', 'warm',
    'Red is the colour of fire trucks, stop signs, and ripe strawberries!'),
  card('Orange', '#FFA500', 'warm',
    'Orange is the colour of pumpkins, sunsets, and (of course) oranges!'),
  card('Yellow', '#FFFF00', 'warm',
    'Yellow is the colour of the sun, bananas, and bright sunflowers.'),
  card('Pink',   '#FFC0CB', 'warm',
    'Pink is the colour of bubblegum, cherry blossoms, and flamingos!'),
  card('Brown',  '#8B4513', 'warm',
    'Brown is the colour of chocolate, tree bark, and freshly baked bread.'),
  card('Blue',   '#0000FF', 'cool',
    'Blue is the colour of the sky and the deep, deep ocean.'),
  card('Green',  '#00FF00', 'cool',
    'Green is the colour of leaves, grass, and most vegetables.'),
  card('Purple', '#800080', 'cool',
    'Purple is the colour of grapes, eggplants, and royal robes!'),
  card('Violet', '#8A2BE2', 'cool',
    'Violet is the very last colour you see at the edge of a rainbow.'),
  card('Black',  '#000000', 'neutral',
    'Black is the colour of the night sky and a baby penguin\u2019s back!'),
  card('White',  '#FFFFFF', 'neutral',
    'White is the colour of fluffy clouds and freshly fallen snow.'),
  card('Gray',   '#808080', 'neutral',
    'Gray is the colour of clouds before it rains and elephants too!'),
];

export interface ColorFilter {
  key: 'all' | ColorGroup;
  label: string;
}

export const FILTERS: readonly ColorFilter[] = [
  { key: 'all',     label: '🎨 All' },
  { key: 'warm',    label: '🔥 Warm' },
  { key: 'cool',    label: '💧 Cool' },
  { key: 'neutral', label: '⚪ Neutral' },
];
