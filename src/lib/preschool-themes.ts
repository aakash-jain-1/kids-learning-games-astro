/**
 * Shared theme catalog for preschool-math games.
 *
 * Carved out 2026-05-18 when the second preschool-math game (More Friends —
 * magnitude comparison) shipped, per the project's "refactor on second
 * consumer" rule. Counting Friends (the first preschool-math game,
 * shipped 2026-05-15) had defined this catalog inline in
 * `src/data/addition.ts`; that module now re-exports from here for
 * backward compat with imports already in flight.
 *
 * Why a *shared* catalog rather than per-game definitions?
 *  - The themes are *conceptually* about preschool counting/numeracy
 *    aesthetics, not about any one game mechanic. They'd be the same
 *    set for a third or fourth preschool-math game (Number Bond Pop,
 *    "how many more to make 5?" — earmarked next).
 *  - Sharing the catalog makes the per-game scene CSS (`addition.css`,
 *    `comparison.css`, etc.) trivially consistent — every game's
 *    pond scene looks like every other game's pond scene.
 *  - The "no two themes in a row" constraint is per-game state, not
 *    catalog state, so this lib stays a pure data module with no
 *    runtime concerns.
 *
 * Why `'pond' | 'orchard' | 'sea' | 'garden'`?
 *  - **Familiarity at age 3.** Every theme has Bluey-grade recognition.
 *  - **Distinct palettes.** pond=blue/green, orchard=red/green,
 *    sea=aqua, garden=yellow — children get visual variety across
 *    rounds without theme fatigue.
 *  - **Motion-friendly verbs.** Each verb phrase pairs with an
 *    animation: "ducks come swimming in" matches a slide-in keyframe,
 *    "bees fly to flowers" matches an arc-in, etc.
 *  - **Plurals without irregular spelling.** Avoiding themes whose
 *    plural is silently challenging (mouse → mice; foot → feet) so
 *    the narration scripts read cleanly to a 3yo.
 *
 * Adding a 5th theme is a one-entry append here plus a matching
 * `data-scene='<key>'` palette block in each game's CSS file. Defer
 * until v1 retention is validated with the actual 3yo user — adding
 * themes for variety only matters if the child plays through the
 * existing 4 enough to notice repetition.
 */

export type PreschoolTheme = 'pond' | 'orchard' | 'sea' | 'garden' | 'meadow' | 'jungle';

export interface ThemeMeta {
  /** Stable theme key — drives `data-theme` on the scene container, used as the CSS hook. */
  readonly key: PreschoolTheme;
  /** Human label, shown only in the parent-facing Stats panel. */
  readonly label: string;
  /** Emoji used as the countable object. Crisp at any DPI; zero asset cost. */
  readonly emoji: string;
  /** Singular noun for narration when count === 1 (e.g. "duck"). */
  readonly singular: string;
  /** Plural noun for narration when count > 1 (e.g. "ducks"). */
  readonly plural: string;
  /** Short verb-phrase tag: "are swimming", "hang on a tree", "swim in the sea", "fly to flowers". */
  readonly verbPhrase: string;
}

export const THEMES: readonly ThemeMeta[] = [
  {
    key: 'pond',
    label: 'Pond',
    emoji: '🦆',
    singular: 'duck',
    plural: 'ducks',
    verbPhrase: 'are swimming',
  },
  {
    key: 'orchard',
    label: 'Orchard',
    emoji: '🍎',
    singular: 'apple',
    plural: 'apples',
    verbPhrase: 'hang on a tree',
  },
  {
    key: 'sea',
    label: 'Sea',
    emoji: '🐠',
    singular: 'fish',
    plural: 'fish',
    verbPhrase: 'swim in the sea',
  },
  {
    key: 'garden',
    label: 'Garden',
    emoji: '🐝',
    singular: 'bee',
    plural: 'bees',
    verbPhrase: 'fly to the flowers',
  },
  // Themes 5 + 6 — added 2026-06-03 with the staged triad. They unlock
  // at Stage 2 (via `themesForStage` in `@/lib/preschool-stages`), so
  // they MUST stay appended at the end: the starter 4 above are the
  // `THEMES.slice(0, 4)` Stage-1 pool, and the deterministic SSR seed
  // `() => 0.42` resolves against that stable prefix. Both picked for
  // clean plurals (sheep is invariant like fish; monkeys is regular)
  // and a motion-friendly verb phrase.
  {
    key: 'meadow',
    label: 'Meadow',
    emoji: '🐑',
    singular: 'sheep',
    plural: 'sheep',
    verbPhrase: 'graze in the meadow',
  },
  {
    key: 'jungle',
    label: 'Jungle',
    emoji: '🐵',
    singular: 'monkey',
    plural: 'monkeys',
    verbPhrase: 'swing in the trees',
  },
];

export const THEME_BY_KEY: Readonly<Record<PreschoolTheme, ThemeMeta>> =
  Object.fromEntries(THEMES.map((t) => [t.key, t])) as Record<PreschoolTheme, ThemeMeta>;

/** Number-word for narration. Centralised here so every preschool-math game
 *  speaks numbers identically. Caps at 10 (we don't render past sums of 8
 *  in any current game). */
export const numberWord = (n: number): string => {
  switch (n) {
    case 0: return 'zero';
    case 1: return 'one';
    case 2: return 'two';
    case 3: return 'three';
    case 4: return 'four';
    case 5: return 'five';
    case 6: return 'six';
    case 7: return 'seven';
    case 8: return 'eight';
    case 9: return 'nine';
    case 10: return 'ten';
    default: return String(n);
  }
};

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const nounFor = (count: number, theme: ThemeMeta): string =>
  count === 1 ? theme.singular : theme.plural;
