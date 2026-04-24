# Migration progress

Living log of the Astro + TypeScript + Workbox rewrite of
[kids-learning-games](https://github.com/aakash-jain-1/kids-learning-games).

> Append-only at the top of each section. Don't rewrite history — future
> "what did we actually ship?" questions depend on it.

---

## Migration principles (the "north star")

**Rule of thumb: this Astro repo is the source of truth.** When the vanilla
game and the ported version differ in behaviour or design, the Astro version
wins — the vanilla code is treated as a *specification of intent* (what
content to show, what interactions to support), not a template to copy
line-for-line. The vanilla patterns that drove the original audit (per-game
settings keys, per-game AudioContext, inline ~450-line CSS copies, hand-rolled
SW, `onclick=` globals) are bugs, not features; we do not carry them forward.

Every port MUST follow these patterns:

1. **Data and view are separate files.** Card / deck / question content lives
   in `src/data/<game>.ts` as typed, `readonly` arrays (e.g. `ALL_CARDS`,
   `DECKS`, `FILTERS`). No large inline JS literals in the `.astro` page.
2. **Reuse the shared primitives in `src/lib/`.** Never re-implement:
   - Settings → `lib/settings.ts` (single `kids_settings_v1` key, applied
     via `initSettings()`). **No per-game settings keys.**
   - Audio → `lib/audio.ts` (singleton `AudioContext`, `playTap()` helpers).
   - Speech → `lib/speech.ts` (`speak(text, { onEnd })`, auto-cancels
     overlapping utterances).
   - Confetti / toasts → `lib/achievements.ts`.
3. **Reuse the shared layouts.** Every game picks exactly one of:
   - `CardMachineLayout.astro` — **reference-catalogue games** where
     the pedagogy is "browse a deck of rich fact cards." The content
     is an open-ended set the child explores depth-first (one card at
     a time, fact + picture + sound). Covers Dinosaurs, Flashcards,
     Solar System, Weather.
   - `GridLayout.astro` — **foundational-set games** where the pedagogy
     is "recognise every member of a bounded chart." The content is a
     closed set (26 letters, 10 digits, 8 colours, etc.) the child
     scans breadth-first, tapping tiles as they go. Covers Alphabets,
     Numbers, Colors, Shapes, Animals, Birds, Hindi. Single-column flow
     (header → filters → tile grid → inline detail); deliberately *not*
     a two-pane split (the earlier `ClassicLayout` attempt with
     side-by-side panes caused overlap bugs at mid-widths, and the
     single-column re-do fixes that class of issue by construction).
   - `StoryLayout.astro` *(TBD)* — story games (Woodcutter, Daily
     Routines). Only carved out if the linear-story flow can't fold
     into either of the above.
   Never build a bespoke HTML shell per game. **Choosing between
   card-machine and grid: use the vanilla layout as the hint for which
   pedagogy the original designer had in mind — if the vanilla game
   already presents a fixed chart (e.g. A–Z tiles, 1–10 digits), port
   to GridLayout; if it presents a shuffling deck or slideshow, port
   to CardMachineLayout.** This mirrors how popular learning apps
   (Starfall, Khan Kids, DotIAM, Endless Alphabet) split their
   alphabet / number / colour screens (grid) from their story / video
   / flashcard screens (single-focus card).
4. **Theme via CSS custom properties.** Palette changes go through
   layout-specific `body.<layout>[data-theme='<game>']` blocks:
   `card-machine.css` exposes ~25 `--cm-*` tokens, `grid.css` exposes
   ~25 `--gl-*` tokens. Never hardcode game-specific colours in layout
   CSS. Shared chrome primitives used by both layouts (`.ctrl-pill`,
   `.cat-bar`, `.cat-btn` base styles, etc.) live in `global.css` so
   they don't duplicate across layout bundles; each layout defines its
   own `.cat-btn.active` override using its own theme tokens.
5. **Game-specific CSS is game-scoped.** Anything truly unique to one game
   (e.g. the ~320-line CSS planet art for Solar System) lives in its own
   file (`src/styles/planets.css`) and is imported only from that game's
   page — Astro emits it as a per-page CSS bundle, so it never leaks into
   other games.
6. **Strict TypeScript for data.** Every `src/data/<game>.ts` exports a
   named interface + `readonly` typed array. TypeScript catches typos in
   type enums (e.g. `PlanetType`, `Diet`) at build time.
7. **Base-path aware.** Internal links go through
   `import.meta.env.BASE_URL`, never a hardcoded `/games/…`. Keeps the
   site relocatable (matters for our `/kids-learning-games-astro/` prefix).
8. **Event wiring is TypeScript, not inline HTML.** Use `addEventListener`
   with a typed `$()` helper. No `onclick="foo()"` globals.
9. **Meta / OG / icons / SW go through the layout.** Game pages pass only
   `title`, `description`, `themeColor`, `theme` props. The shared layout
   handles PWA registration, auto-update, head tags.
10. **Accessibility defaults come for free from the layout.** Game pages
    just add game-specific ARIA (e.g. `aria-label` on the top card). Focus
    handling, `prefers-reduced-motion`, FOUC prevention are the layout's job.

**Pragmatic deviations from vanilla that are already the new norm:**

- Single unified `kids_settings_v1` LocalStorage key (was
  `flashcards_settings`, `solar_system_settings`, `darkMode`, etc. per game).
- Singleton `AudioContext` + speech-cancel wrapper (was a fresh context
  per game page).
- Workbox-via-`@vite-pwa/astro` service worker with auto-revisioning (was
  hand-rolled `service-worker.js` + manual cache-name bumps).
- Cached `BuildInfo` GitHub-API fetch, 1-hour SWR (was N unauthenticated
  calls per session, hitting the 60/h rate limit).
- Fluent UI 3D emoji via CDN with per-image CacheFirst (was per-game
  `<img>` tags with no caching strategy).

**Codified during the Alphabets port (first real `kids_progress_v1` consumer):**

- Per-game **learning state** key: `kids_progress_v1:<gameId>`, value is
  a sorted JSON array of strings identifying the learned items (e.g.
  `["A","B","C"]` for alphabets). Reads are fault-tolerant — any parse
  error or missing key resets to an empty set. Writes happen on the
  first tile tap per item; once an item is learned it stays learned
  until the "Start Over" overlay is dismissed. For now the persistence
  is a handful of lines inline in the alphabets page; it graduates to
  `src/lib/progress.ts` once a second game needs it.

**Not yet codified (decisions deferred to the Stats / Quiz pass):**

- Canonical structure for the Stats + Quiz modals (likely two more shared
  components under `src/components/`).
- **Option C — unified Deck layout with a grid/card view toggle.** Worth
  considering once both GridLayout and CardMachineLayout have been
  proven in production for all 11 non-story games. A single `Deck`
  layout would render each game in either "grid" or "card" mode via a
  user-chosen toggle, consolidating the two shells into one and
  letting parents pick the teaching mode. Deferred because we'd be
  abstracting over two implementations we're still iterating on —
  premature. Revisit when all 11 games have landed.

If a vanilla file contains something these rules don't cover (e.g. an
interaction that's genuinely unique to that one game), call it out in the
commit / PR description so we can decide whether to (a) extend the rules
or (b) document a one-off exception.

---

## Current status (snapshot)

- **Stack landed:** Astro `5.18.1` + strict TypeScript + `@vite-pwa/astro` `1.2.0` with `injectManifest` + Workbox 7.
- **Games ported (5 of 13), split across two shared layouts:**
  - *CardMachineLayout — 4 games (reference-catalogue pedagogy):*
    - Dinosaurs (default green theme, 15 cards, diet filter)
    - Flashcards (cyan/orange theme, 14 decks, 4 card-face variants)
    - Solar System (purple/gold theme, 11 cards, pure-CSS planet art, type filter)
    - Weather (deep-navy/ice-blue theme, 20 cards, season filter, full Fluent UI image deck)
  - *GridLayout — 1 game (foundational-set pedagogy):*
    - Alphabets (purple/green theme, 26 letter tiles, vowel/consonant filter, inline detail card, `kids_progress_v1:alphabets` learned-set tracking, completion overlay with confetti).
- **Vanilla games still to port (8):**
  `numbers-game`, `colors-game`, `shapes-game`, `animals-game`, `birds-game`, `hindi-game`, `woodcutter-story`, `daily-routines-story`.
  The 6 remaining foundational-set games land on `GridLayout`; the two story games get their own layout only if neither shared shell stretches to cover them.
- **Shared infra in place:**
  - `CardMachineLayout.astro` shell — used by 4 ported games. Proven against three card-face strategies (pure-CSS art, image-with-fallback, big-digit/letter text).
  - `GridLayout.astro` shell — used by 1 ported game (Alphabets). Single-column vertical flow (header → filters → tile grid → inline detail). The tile grid uses `grid-template-columns: repeat(auto-fill, minmax(64px, 96px))` for `--capped` small decks, so tiles stay kid-sized on any viewport. Completion overlay + restart button included.
  - `card-machine.css` with ~25 `--cm-*` theming tokens per theme.
  - `grid.css` with ~25 `--gl-*` theming tokens per theme.
  - Shared chrome primitives in `global.css` (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, nav, modal, progress bar, toast) — both layouts share these.
  - `src/lib/`: singleton AudioContext, speech wrapper, unified settings, achievement toasts + confetti.
  - `src/data/fluent.ts` — shared `FLUENT_IMG_BASE` constant (consumers: flashcards, weather, alphabets; more to come).
  - Workbox SW (`src/sw.ts`) with StaleWhileRevalidate for the GitHub API and CacheFirst for Fluent emoji images.
- **Per-game learning state:** `kids_progress_v1:<gameId>` LocalStorage key is now a real, shipping pattern. Alphabets is the first consumer. Shape: JSON array of learned-item ids (e.g. `["A","B","C"]`). No shared helper yet; inlined in the alphabets page until a second game needs it.
- **Dev ergonomics:**
  - `npm run dev:fresh` — kills any stale dev/preview servers scoped to this project, then starts a clean one on `:4321`.
  - `npm run stop` — standalone kill script.
- **Deploy: LIVE** at https://aakash-jain-1.github.io/kids-learning-games-astro/ via GitHub Actions (`.github/workflows/deploy.yml`). Auto-deploys on every push to `main`.
  - `/` (home) — 200
  - `/games/flashcards-game` — 200
  - `/games/dinosaurs-game` — 200
  - `/games/solar-system-game` — 200 ✅ (verified 2026-04-24, both extensionless + `.html`)
  - `/games/weather-game` — 200 ✅ (verified 2026-04-24, both extensionless + `.html`; `data-theme="weather"` reaches `<body>` in production, first card SSR renders "Sunny" with `card-pill summer`)
  - `/games/alphabets-game` — 200 ✅ (verified 2026-04-24, `<body class="grid" data-theme="alphabets">` reaches production, all 26 `.gl-tile` tiles SSR-rendered, 3 filter pills present, progress counter initialises at `0 / 26`, done overlay markup present, zero `cm-*` / `.top-card` / `.press-btn` contamination)
  - `/manifest.webmanifest`, `/sw.js`, `/.nojekyll` — all 200
- **Production build sizes (client JS, gzipped):** flashcards **11.28 KB**, weather **3.34 KB**, alphabets **3.07 KB** (+0.23 KB vs the removed card-machine version — extra cost is the progress-tracking + filter-aware navigation), dinosaurs **3.02 KB**, solar-system **2.66 KB**. Total PWA precache: 33 entries, ~182 KB.
- **Production build sizes (CSS, per page):** card-machine games share `dinosaurs-game.*.css` (17 KB), grid games load `alphabets-game.*.css` (9.2 KB) — isolation verified: zero `gl-*` tokens in the card-machine bundle and zero `cm-*` / `.top-card` / `.press-btn` in the grid bundle.

---

## What still needs doing

> **▶ Resume here next session:** start on item **1.a (Numbers on GridLayout)** below. `GridLayout` + `grid.css` + the `kids_progress_v1:<gameId>` pattern are all proven by Alphabets, so Numbers is a copy-adapt-theme job. Expected scope: new `src/data/numbers.ts` + new `src/pages/games/numbers-game.astro` + ~35-line `--gl-*` theme block in `grid.css` + home tile + GameNav link. No new infra needed.

Rough order of payoff:

1. **Port the remaining 6 foundational-set games onto `GridLayout`.** In suggested order (simplest first):
   1. **Numbers** — 1–20 tiles, big digit on tile, digit + quantity image (Fluent UI apple/star groupings) in detail. Natural filter: `single-digit` / `teens`. ← **pick up here tomorrow**
   2. **Colors** — ~10 colour-filled tiles, colour-word label, everyday-object image (Fluent UI) in detail. No obvious filter; could group by warm / cool / neutral if we want symmetry.
   3. **Shapes** — ~10 CSS-drawn shape tiles (circle, square, triangle, star, heart, diamond, etc.), same shape larger + real-world example image in detail. Filter by sides count could be cute (`2d` / `3d` / `curved`).
   4. **Animals** — big emoji on tile, Fluent UI 3D image + fact in detail. Filter: `mammal` / `bird` / `reptile` / `sea` / `insect`.
   5. **Birds** — big emoji on tile, Fluent UI 3D image + fact in detail. Filter: `songbird` / `raptor` / `waterbird` / `tropical`.
   6. **Hindi** — same shape as Alphabets but with the Devanagari script + Hindi word + English gloss; filter: `vowel` (स्वर) / `consonant` (व्यंजन).

   Each port is now ~35–50 lines of new `--gl-*` theme tokens + ~200–300 lines of page + typed data — effectively a copy-adapt of `alphabets-game.astro` with a new data file and a new theme block.
2. **Decide whether `StoryLayout.astro` is needed** — Woodcutter and Daily Routines have linear-story flows. First attempt: model each story *page* as a card in the card machine, with press-to-read and Prev/Next. Only carve out a separate layout if that collapses.
3. **Wire the real Stats + Quiz modals.** Currently both are `alert(…)` stubs in the 5 ported games. Extract the `kids_progress_v1:<gameId>` LocalStorage logic from `alphabets-game.astro` into `src/lib/progress.ts` the moment a second game needs it — two consumers is the refactor trigger.
4. **Add tests.** Playwright smoke test per layout (one for card-machine, one for grid): filter → navigate → completion overlay + confetti. Parameterise over themes inside each test so one suite covers every game.
5. **Option C — unified Deck layout with a grid/card view toggle.** Deferred until all 11 non-story games have shipped. Once we see both shells in production, decide whether to (a) keep them separate (if they've drifted in unavoidable ways) or (b) consolidate into a single `DeckLayout` with a per-user "Grid | Card" toggle so parents can pick the teaching mode. See the codified decision block at the top of the file for motivation.
6. **Cut-over plan (only after all 13 games land).** Migrate `kids-learning-games` (the live repo) to serve the Astro build, with a SW handoff strategy so existing PWA installs upgrade cleanly.

### One-off tech-debt items

- `FLUENT_IMG_BASE` is now consumed by 3 data files (`flashcards`, `weather`,
  `alphabets`) — `src/data/fluent.ts` is the source of truth. `flashcards.ts`
  and `alphabets.ts` still re-export it for backward compatibility. Once
  another 1–2 games land (which will all use Fluent imagery), do a bulk
  cleanup: make every data file import from `@/data/fluent` directly and
  drop the re-exports.

---

## Changelog

### 2026-04-24 — Course correction #2: Alphabets reverted to a new `GridLayout`

After re-evaluating the previous course-correction, we concluded that
forcing every foundational-set game into `CardMachineLayout` optimises
for code uniformity at the expense of pedagogical fit. Industry
references (Starfall, Khan Academy Kids, DotIAM, Endless Alphabet) all
split their alphabet / number / colour screens into a **grid** (fixed
chart, tap-to-hear) and keep the **card machine** for
reference-catalogue content (dinosaurs, planets, weather). The vanilla
repo was already doing the same — `alphabet-game.html`,
`animals-game.html`, `birds.html`, `hindi-alphabets.html`,
`numbers-game.html`, etc. all use grid markup. So this commit
reintroduces a grid shell, **but built fresh** (not a revival of the
deleted `ClassicLayout`): single-column flow rather than a two-pane
split, because the user called out that the earlier two-pane attempt
had left/right overlap at mid-widths. Building the redesign
single-column eliminates that whole class of bug by construction.

Layout responsibilities are now:

- `CardMachineLayout` → reference-catalogue games (Dinosaurs,
  Flashcards, Solar System, Weather) — unchanged.
- `GridLayout` **(new)** → foundational-set games (Alphabets now;
  Numbers, Colors, Shapes, Animals, Birds, Hindi coming).
- `StoryLayout` (TBD) → Woodcutter, Daily Routines.

- **Added:**
  - `src/layouts/GridLayout.astro` (~135 lines) — head / PWA / nav /
    settings-modal / build-info wrapper. `theme` prop accepts the 7
    foundational-set themes. Body class `grid`, `data-theme` attr.
    Pre-dark FOUC rule for the default (purple) palette.
  - `src/styles/grid.css` (~380 lines) — ~25 `--gl-*` CSS custom
    properties. Responsive single-column shell. Key classes: `.gl-shell`
    (max-width 860px, centered), `.gl-header`, `.gl-title`,
    `.gl-progress-pill` (with inline progress bar fill), `.gl-deck`
    (auto-fill grid, plus `--capped` variant that caps tile width at
    96px so small decks don't stretch), `.gl-tile` (default / `.learned` /
    `.active` / `.just-tapped` states + a small corner check badge for
    learned tiles), `.gl-detail` (inline detail card with big letter,
    word, Fluent UI image, fact text, prev/next arrows + "Tap to hear"
    button, plus `--empty` placeholder state before the first tile
    tap), `.gl-done-overlay` (fixed completion modal + confetti).
    Dark-mode tokens included.
  - `src/pages/games/alphabets-game.astro` (~285 lines, rewrite on
    `GridLayout`). Inline `kids_progress_v1:alphabets` read/write
    wrapping a `Set<string>` of learned letters. Tile tap flow: play
    `playTap()` → apply `just-tapped` animation → update detail card
    → mark learned → persist → smooth-scroll detail into view → speak
    `"A. A for Apple. Apples come in..."` via `lib/speech`. Filter bar
    is All / Vowels / Consonants; navigation is filter-aware (prev /
    next walk only visible tiles); arrow keys also work. Completion
    overlay fires when all 26 letters are learned.
- **Reorganised CSS:**
  - `global.css` — picked up the shared primitives `.ctrl-row`,
    `.ctrl-pill`, `.cat-bar`, `.cat-btn` (moved out of
    `card-machine.css`). Each layout now defines only its own
    `.cat-btn.active` override, using its own theme tokens.
  - `card-machine.css` — cleaned of duplicated primitives; the
    `alphabets` theme block and vowel/consonant pill rules introduced
    in the previous course-correction are gone (they live on in the
    new grid shell instead).
  - `CardMachineLayout.astro` — `theme` prop union narrowed back to
    `flashcards | dinosaurs | solar-system | weather`; the
    `alphabets` pre-dark FOUC rule removed. Header comment updated
    to say "reference-catalogue games" and point at `GridLayout` for
    foundational-set games.
- **Data stayed stable:** `src/data/alphabets.ts` was *already* shaped
  for dual consumption (`letter`, `n`, `f`, `e`, `img`, `type`,
  `label`), so the grid rewrite used the same dataset verbatim. Only
  the header doc-comment was updated to call out the new consumer
  pattern and reference the `Option C` roadmap item.
- **Option C roadmap item added.** Codified as a "deferred decision"
  right next to the `kids_progress_v1` decision block: unified `Deck`
  layout with a user-facing grid/card view toggle. Not implementing
  yet; revisit once all 11 non-story games have shipped in their
  respective current layouts.
- **Bundle isolation verified:**
  - Pages using `GridLayout` link only `alphabets-game.FbyUhjJ7.css`
    (9.2 KB). Pages using `CardMachineLayout` link only
    `dinosaurs-game.D1g7kimY.css` (17 KB). Zero cross-contamination
    confirmed by grep — no `gl-*` tokens in the card-machine bundle,
    no `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` in the
    grid bundle.
  - Precache grew from 30 → 33 entries (~182 KB). Delta is the new
    HTML page + grid CSS chunk + SW revision.
- **Bundle sizes (client JS, gzipped):** alphabets **3.07 KB**
  (vs 2.84 KB on the card-machine version — extra 0.23 KB covers the
  progress-tracking + filter-aware prev/next helpers).
- **Principles updated** in this file: rule #3 now documents the
  two-layout split with the pedagogical rationale, and includes the
  "use the vanilla layout as a hint for which pedagogy the original
  designer had in mind" heuristic. Rule #4 now mentions `global.css`
  as the home for shared chrome primitives across layouts.
- Build result: `astro check` → 0 errors / 0 warnings / 0 hints.
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/alphabets-game — verified 2026-04-24 (commits `27583da` + `29af73d`). Production markup shows `<body class="grid" data-theme="alphabets">`, 26 `.gl-tile` tiles SSR-rendered, 3 filter pills (`all` / `vowel` / `consonant`), progress counter initialises at `0 / 26`, `.gl-done-overlay` markup present. Grep confirms zero `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` classes on the page. Cross-check: the four card-machine games (`dinosaurs`, `flashcards`, `solar-system`, `weather`) still render with `<body class="card-machine">` + their original `data-theme`s — no regressions from the CSS reshuffle.

### 2026-04-24 — Course correction: Alphabets re-ported on CardMachineLayout

> **Note:** This course correction was **superseded the same day** —
> see the "Course correction #2" entry above. The narrower reading
> of "Astro repo is the source of truth" this entry acted on
> (everything must be a card-machine) was wrong. Correct reading: the
> Astro repo is the source of truth about *patterns* (settings,
> audio, speech, SW, event wiring, TS data files, theming), but
> **not** about pedagogy. Each game's pedagogical fit (grid vs card
> machine vs story) is still inherited from the vanilla design. The
> Alphabets game itself is still shipped, but now on `GridLayout`.
> This entry is retained for historical context so future
> contributors can trace the reasoning.

Undid the previous commit: the tile-grid `ClassicLayout.astro` design was
**wrong**. Per the "Astro repo is the source of truth" principle, every
game should follow the card-machine pattern already established by
Flashcards / Dinosaurs / Solar System / Weather. Reshaping the vanilla
two-pane tile grid into a fresh "tile design" violated that by
introducing a *second* fundamental design pattern instead of reusing the
one we already standardised on. It's now removed.

Net effect: Alphabets is the 5th game on `CardMachineLayout`, and the
remaining 6 non-story ports land on the same shell — no new shared
layout is needed for them.

- **Removed:**
  - `src/layouts/ClassicLayout.astro` — deleted.
  - `src/styles/classic.css` — deleted (~400 lines of shared CSS custom
    properties for the abandoned tile shell).
  - The tile-design `src/pages/games/alphabets-game.astro` — deleted
    and rewritten against `CardMachineLayout`.
- **Re-ported on `CardMachineLayout`:**
  - `src/data/alphabets.ts` — reshaped to card-machine conventions
    (`n`, `f`, `e`, `img` plus game-specific `letter`, `type`, `label`).
    `type: 'vowel' | 'consonant'` drives the filter + pill colour.
    Still uses Fluent UI 3D PNGs; Q still maps to Crown.
  - `src/styles/card-machine.css` — added `[data-theme='alphabets']`
    palette (deep-magenta left pane, lime-green OLED screen, hot-pink
    press button) + 2 new pills (`vowel`, `consonant`) on both
    `.card-pill` and `.scrn-badge-pill`.
  - `src/layouts/CardMachineLayout.astro` — `theme` prop union now
    accepts `'alphabets'`; pre-dark FOUC rule added for the magenta
    palette.
  - `src/pages/games/alphabets-game.astro` — **~290 lines**, card-
    machine pattern: big letter on the card face (`.card-num-text`
    treatment, same as Flashcards' numbers deck), Fluent UI 3D PNG of
    the word on the OLED screen, `A. A for Apple! Apples come in...`
    speech script. Filter bar exposes All / Vowels / Consonants. All
    interactions go through shared `lib/` helpers.
- **Principle update (added to Migration principles #3):** when a
  vanilla game's structure doesn't map naturally to cards, **reshape
  the concept into cards** (e.g. 26-tile alphabet grid → 26-card
  deck). Don't build a second shared layout to match the vanilla
  layout. The card machine is the canonical design.
- **Not persisted to main:** the earlier tile-design commit reached
  the remote but the production site was still the "4 card-machine
  games" state when the course correction happened; no PWA install
  saw the tile design. We're shipping straight through from "4 games"
  → "5 games (all card-machine)" with no intermediate tile-design
  state visible to users.
- **Bundle impact:**
  - Alphabets client JS: **6.49 KB raw / 2.84 KB gzip** (vs the tile
    version's 6.98 KB / 2.94 KB — very close, as expected; the
    savings come from dropping the particle / progress / random /
    reset code paths that had no parallel in card-machine games).
  - PWA precache: 30 entries / ~165 KB (down from 33 entries / ~174 KB
    on the tile version — the saved HTML page + CSS chunk + SW
    revision for `classic.css`).
- **Bundle isolation:** grep confirms no `cl-*`, `classic.css`, or
  `ClassicLayout` references anywhere in `dist/`. The revert is clean.
- Build result: `astro check` 0 errors / 0 warnings / 0 hints.
- Live: verification pending — push triggers the GitHub Actions deploy;
  URL is `/games/alphabets-game` on the Pages origin (now rendering
  `<body class="card-machine" data-theme="alphabets">`).

### 2026-04-24 — ClassicLayout.astro landed + Alphabets game ported (5/13)

> **Note:** This commit was superseded on the same day — see the
> "Course correction" entry above. The `ClassicLayout.astro` shell,
> `classic.css`, and the tile-design `alphabets-game.astro` were all
> removed. The Alphabets game itself is still shipped, but on
> `CardMachineLayout`. This entry is retained for historical context.


Second shared layout cluster opens. `ClassicLayout.astro` is now the
shell for all 7 two-pane classic games (alphabets, numbers, colors,
shapes, animals, birds, hindi), mirroring the shape of
`CardMachineLayout`: same props, same theming pattern, same FOUC/PWA
wiring, same shared components. Alphabets is the first game on the
new layout; the other 6 are unblocked.

- `src/layouts/ClassicLayout.astro` — ~110 lines. Wraps head meta, PWA
  registration, `GameNav`, `SettingsModal`, `BuildInfo`, service-worker
  auto-update, FOUC pre-dark handling. Accepts a 7-way `theme` prop
  (`alphabets | numbers | colors | shapes | animals | birds | hindi`)
  that sets `data-theme` on `<body>`.
- `src/styles/classic.css` — ~400 lines driven by ~30 CSS custom
  properties: `--cl-bg*`, `--cl-pane-*`, `--cl-tile-*`, `--cl-grid-*`,
  `--cl-ctrl-*`, `--cl-display-*`, `--cl-done-*`. Shared primitives
  exposed to game pages: `.cl-title`, `.cl-controls`, `.cl-btn[.primary]`,
  `.cl-progress`, `.cl-main`, `.cl-pane[.right]`, `.cl-grid`, `.cl-tile`,
  `.cl-display*`, `.cl-done*`. Default palette = alphabets (purple
  backdrop + green tiles); additional games override via
  `body.classic[data-theme='<game>']` blocks.
- `src/data/alphabets.ts` — 26 typed `AlphabetCard` entries
  (`{ letter, word, img, e, fact }`) + an `ALPHABET_BY_LETTER` lookup
  map. Re-exports `FLUENT_IMG_BASE`.
- **Image-source deviation vs vanilla:** vanilla Alphabets pulled
  Iconify Noto SVGs (26 separate `api.iconify.design/...` URLs).
  Astro version uses Fluent UI 3D PNGs via `cdn.jsdelivr.net` — the
  same origin as Flashcards + Weather, already runtime-cached
  CacheFirst in `src/sw.ts`. All 25 mappable icons verified 200 OK
  pre-commit. Only `Princess/3D/princess_3d.png` is 403 in the Fluent
  pack, so **Q → Crown** (the Queen's crown) instead of a princess icon.
- **Deviation vs vanilla particle-canvas:** each vanilla classic game
  ships ~90 lines of in-page JS to paint ~50 floating dots per frame
  on a canvas behind the content. Astro version drops the canvas and
  keeps only the pre-existing CSS sparkle overlay (`body.classic::before`) —
  zero JS, zero CPU cost. If we ever need true particles they go in a
  shared `ParticleBackground.astro`, never inline per game.
- `src/pages/games/alphabets-game.astro` — **~320 lines** vs 1527 in
  the vanilla (-79%). Tile click / keyboard (A–Z keys, arrow
  navigation, `R` for random, `Space` for speak) / random / speak /
  reset / confetti-on-complete all wired through the shared `lib/`
  helpers (audio, speech, achievements, settings). Quiz + Stats
  remain `alert(…)` stubs, matching the other 4 ported games.
- **First real consumer of `kids_progress_v1:<gameId>`.** Alphabets
  writes to `kids_progress_v1:alphabets` — a JSON array of learned
  letters. This locks in the key format previously deferred in the
  "Not yet codified" section of the Migration principles. The wrapper
  helper (probably `lib/progress.ts`) will land with the real Stats
  modal; until then it's a few lines of inline `localStorage.*`.
- `src/components/GameNav.astro` — new "Alphabets" link alongside the
  4 card-machine games.
- `src/pages/index.astro` — alphabets home tile is now a real link,
  not `#`. Added two "coming soon" tiles (Numbers, Colors) to promote
  the next ports.
- **Correction:** the earlier PROGRESS.md listed 9 classic games
  including `vehicles-game` and `transport-game`, neither of which
  exists in the vanilla repo. The actual classic cluster is 7 games.
  Updated the principles section, the status snapshot, and the pending
  list to match reality.
- Build result: `astro check` 0 errors / 0 warnings / 0 hints; client
  bundle **6.98 KB raw / 2.94 KB gzip**. Precache grew from 28 → 33
  entries (~174 KB) — one new HTML page + its CSS chunk + SW revision.
- Bundle isolation verified: `classic.css` is linked only from pages
  using `ClassicLayout`, not from card-machine games. `.cl-*` classes
  appear only in the alphabets bundle.
- Live: verification pending — push triggers the GitHub Actions
  deploy; URL is `/games/alphabets-game` on the Pages origin.

### 2026-04-24 — Weather game ported ✅ (card-machine cluster complete)

Fourth and final card-machine game ported. With Weather landing, every
card-machine game in the vanilla codebase now runs on the shared
`CardMachineLayout` shell — the shell has been proven against four
visually-distinct themes and three different card-face strategies
(emoji, pure-CSS art, image-with-fallback).

- `src/data/fluent.ts` — **new shared module**: `FLUENT_IMG_BASE`
  constant for the Fluent UI emoji CDN. `flashcards.ts` still
  re-exports it so its existing importers are unaffected (see
  the tech-debt note below for the eventual cleanup).
- `src/data/weather.ts` — 20 typed `WeatherCard` entries + 6
  `WeatherFilter`s + a `seasonLabel()` helper. `Season` enum is a
  strict union of `spring | summer | autumn | winter | any`.
- **Image-source change vs vanilla:** vanilla Weather pulled its
  visuals from `api.iconify.design/noto/*.svg`, but no other game
  in the Astro port uses Iconify. To keep a single runtime-cache
  origin (already configured as CacheFirst in `src/sw.ts`), we
  mapped every vanilla card to the closest Fluent UI 3D PNG. All 17
  distinct asset paths were pre-verified against `cdn.jsdelivr.net`
  returning 200 OK before committing.
- `src/styles/card-machine.css` — new `[data-theme='weather']`
  palette (deep-navy sky left pane, ice-blue OLED screen + glow,
  cornflower-blue press button) and 5 new season pills for both
  `.card-pill` and `.scrn-badge-pill` (spring/summer/autumn/winter/
  any).
- `src/layouts/CardMachineLayout.astro` — accepts `weather` as a
  `theme` option; pre-dark FOUC rule added for the deep-navy palette.
- `src/pages/games/weather-game.astro` — **~280 lines** vs 551 in
  the vanilla (-49%). Reuses `buildCardFace` / `buildScreenFace`
  image-variant pattern from flashcards: every card renders as an
  `<img>` with an emoji fallback on `error`, so the page still
  works offline before the SW warms up, and on mobile devices that
  blacklist the CDN.
- `src/components/GameNav.astro` + `src/pages/index.astro` — expose
  the new game (home tile now links to the real page, not `#`).
- Deviations from vanilla (all match the migration principles by
  design):
  - Fluent UI 3D PNGs via jsDelivr (vanilla: Iconify Noto SVGs).
  - Unified `kids_settings_v1` (vanilla had `weather_*` keys).
  - Singleton `AudioContext` (vanilla built its own in-page).
  - Shared `launchConfetti()` (vanilla had a local copy).
  - Event wiring via `addEventListener` (vanilla used `onclick="…"`).
  - Theme via CSS vars (vanilla had ~120 lines of hardcoded colours).
  - `FLUENT_IMG_BASE` extracted to `src/data/fluent.ts` so future
    image-based games (classic `alphabets`, `birds`, `animals`, etc.)
    can import the same constant without coupling to flashcards.
- Build result: `astro check` 0 errors / 0 warnings / 0 hints;
  client bundle **8.17 KB raw / 3.34 KB gzip** (vs vanilla's ~33 KB
  inline). CSS isolation verified — weather links only the shared
  card-machine CSS chunk, no `planets.css`.
- Precache rose from 25 → 28 entries (~125 → ~146 KB) — the delta is
  the new weather page HTML plus the Fluent image manifest entries.
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/weather-game — verified 200 OK, `data-theme="weather"` reaches `<body>` in production, home tile links to the real page (no longer `#`), 5 season filters rendered with correct `data-key`s, first card SSR renders "Sunny" with `card-pill summer`. Both `sun_3d.png` and `rainbow_3d.png` spot-checked on jsDelivr → 200.

### 2026-04-24 — Migration principles codified

- Added the **Migration principles ("north star")** section at the top of
  this file. One-line version: *when vanilla and Astro disagree, Astro
  wins.*
- Motivated by the realisation (during the Solar System port) that we were
  silently making the same "use the new pattern" decision over and over
  — settings key, AudioContext, speech, confetti, `onclick=`, inline
  styles, hand-rolled SW. Writing it down means future ports (and future
  me) don't have to re-derive it each time.
- Also enumerated the *pragmatic deviations* that are already the new
  norm, and the two open questions we're deliberately deferring to the
  Stats / Quiz pass.

### 2026-04-24 — Solar System game ported ✅

Third game ported end-to-end using the shared `CardMachineLayout` — first
confirmation that adding a new card-machine game is a ~600-line change
(data + page + theme + CSS art), **not** a 740-line inline rewrite.

- `src/data/solar-system.ts` — 11 typed cards (Sun, 8 planets, Moon,
  Pluto), 7 filters. `PlanetType` enum drives pill colour + filter.
- `src/styles/planets.css` — pure-CSS planet art extracted from the
  vanilla file (~320 lines: Sun corona pulse, Earth continents, Jupiter
  bands + Great Red Spot, Saturn rings, etc.). Imported only from
  `solar-system-game.astro`, so it stays out of every other game's
  bundle. Verified in `dist/_astro/`: `planet-*` classes appear **only**
  in `solar-system-game.<hash>.css`, zero hits in dinosaurs' or
  flashcards' CSS.
- `src/styles/card-machine.css` — new `[data-theme='solar-system']`
  palette (deep purple left pane, golden OLED screen) + 6 new type
  pills (`star`, `rocky`, `gas-giant`, `ice-giant`, `satellite`, `dwarf`)
  for both `.card-pill` and `.scrn-badge-pill`.
- `src/layouts/CardMachineLayout.astro` — accepts `solar-system` as a
  `theme` option; pre-dark FOUC rule added for the purple palette.
- `src/pages/games/solar-system-game.astro` — **~280 lines** vs 739 in
  the vanilla (-62%). Uses shared layout, `lib/audio`, `lib/speech`,
  `lib/achievements`, TS-typed event handlers with a typed `$()` helper.
- `src/components/GameNav.astro` + `src/pages/index.astro` exposed the
  new game (home card now points to the real page, not `#`).
- Deviations from vanilla (all match the principles — by design, not
  accident):
  - Unified `kids_settings_v1` (vanilla had `solar_system_*` keys).
  - Singleton `AudioContext` (vanilla built its own in-page).
  - Shared `launchConfetti()` (vanilla had a local copy).
  - Event wiring via `addEventListener` (vanilla used `onclick="…"`).
  - Theme via CSS vars (vanilla had ~100 lines of hardcoded colours).
- Build result: `astro check` 0 errors / 0 warnings / 0 hints; client
  bundle **6.20 KB raw / 2.66 KB gzip** (vs vanilla's ~32 KB inline).
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/solar-system-game — verified 200 OK, `data-theme="solar-system"` reaches `<body>` in production, home tile links to the real page (no longer `#`).

### 2026-04-24 — first live deploy ✅

- Repo created: [aakash-jain-1/kids-learning-games-astro](https://github.com/aakash-jain-1/kids-learning-games-astro) (public).
- First commit pushed (`4328ec2`): `feat: initial Astro + TypeScript + Workbox POC` — 30 files.
- Pages source set to **GitHub Actions** before first push, so deploy succeeded in one shot.
- Live at **https://aakash-jain-1.github.io/kids-learning-games-astro/**.
- Verified end-to-end:
  - Home, Flashcards, Dinosaurs all 200 OK.
  - `manifest.webmanifest` served as `application/manifest+json` with correct `scope` / `start_url` / `/kids-learning-games-astro/` paths.
  - `sw.js` served as `application/javascript`.
  - `.nojekyll` present (so `_astro/` hashed assets aren't Jekyll-hidden).
  - Built HTML links to `/kids-learning-games-astro/_astro/…` — `base` path is correctly rewritten everywhere.

### 2026-04-24 — initial public deploy setup

- Renamed deploy target from `/kids-learning-games` → `/kids-learning-games-astro` so the POC runs at its own Pages URL without colliding with the live vanilla site.
  - `astro.config.mjs`: `base` + PWA `manifest.scope` + `manifest.start_url` updated.
- Added `.github/workflows/deploy.yml` using the modern `actions/upload-pages-artifact` + `actions/deploy-pages@v4` flow.
  - Job chain: `checkout → setup-node (npm cache) → npm ci → astro check → astro build → touch .nojekyll → upload → deploy`.
  - `.nojekyll` added at deploy time so GH Pages serves the `_astro/` folder (Jekyll hides leading-underscore dirs).
- Added `.gitignore` entries for `node_modules/`, `dist/`, `.astro/`, logs, `.DS_Store`.
- `git init`, initial commit.

### 2026-04-24 — Flashcards game ported

- Created `src/data/flashcards.ts` — 14 decks, ~280 cards, strongly typed (`FlashCard`, `Deck`). Four card-face variants: image (Fluent UI 3D emoji CDN), plain emoji, CSS-drawn shape, big numeral.
- Refactored `src/styles/card-machine.css` to expose ~25 CSS custom properties (`--cm-screen-color`, `--cm-left-bg`, `--cm-press-bg`, etc.) so each game can override its palette via `body.card-machine[data-theme="flashcards"]` without duplicating the full stylesheet.
  - Defaults = dinosaur green palette.
  - `[data-theme="flashcards"]` override = cyan screen + orange accents.
- `CardMachineLayout.astro` now accepts a `theme` prop and sets `data-theme` on `<body>`; the inline pre-dark script also reads the theme so dark mode doesn't flash the wrong colour.
- Created `src/pages/games/flashcards-game.astro` (~295 lines) — uses the shared layout, renders the initial card server-side, hydrates with the client script for deck switching, navigation, press-to-hear, and animations.
- Updated `GameNav.astro` and `src/pages/index.astro` to expose the Flashcards route.
- Kill-scripts added to make dev-server restarts painless:
  - `scripts/stop-dev.sh` — scoped by project path, kills the whole process tree of any `astro dev|preview` / `npm exec astro` / `esbuild` child running from this folder. Sandbox-safe.
  - `scripts/dev.sh` — calls `stop-dev.sh`, then starts `astro dev --host 127.0.0.1 --port 4321` with telemetry disabled.
  - `package.json` scripts: `dev:fresh`, `stop`.

### 2026-04-24 — Dinosaurs game ported (first POC game)

- Scaffolded `kids-learning-games-astro/` as an Astro project sibling to the vanilla repo.
- Pinned `astro@^5.18.0` (required for `@vite-pwa/astro@1.2.0` peer-dep compatibility; Astro 6 is not yet supported by vite-pwa).
- Shared utilities extracted into `src/lib/`:
  - `audio.ts` — singleton `AudioContext` reused across games (fixes audit M2).
  - `speech.ts` — Web Speech API wrapper.
  - `settings.ts` — unified `kids_settings_v1` LocalStorage key for dark / sound / auto-speak / font size (fixes audit H1).
  - `achievements.ts` — toast + confetti helpers.
- Shared UI components:
  - `components/GameNav.astro` — top nav (fixes audit M5 inconsistent classes).
  - `components/SettingsModal.astro` — single settings modal for all games.
  - `components/BuildInfo.astro` — cached GitHub commit SHA lookup, 1-hour `localStorage` cache (fixes audit H3 API rate-limiting).
- `layouts/CardMachineLayout.astro` — full HTML shell with PWA wiring, auto-update handling, theme-aware pre-dark script.
- Custom service worker at `src/sw.ts` using `injectManifest` strategy: precaches build assets, falls back to `offline.html` on navigation failure, runtime caches the GitHub API (SWR, 1h) and Fluent emoji images (CacheFirst, 30d). Fixes audit H3, H4, S7.
  - Switched from `generateSW` → `injectManifest` after `generateSW` failed during build with a Workbox-internal Terser crash on Node 24.
- First game ported: `src/pages/games/dinosaurs-game.astro` — `dinosaurs-game.html` went from **544 → ~120 lines**.
- Verified: `astro check` passes (0 errors / 0 warnings), `astro build` produces 3 static pages + SW in 1.24s.

### 2026-04-24 — Tech stack evaluation + audit addendum

- Added "Tech stack options (for a larger rewrite)" section to `kids-learning-games/dev/AUDIT_2026_04.md`, ranking Astro / Vite+TS / SvelteKit / Lit for this project.
- Concrete recommendation: **Astro + TypeScript + `@vite-pwa/astro` + Playwright + GitHub Actions.**
- Reasoning: the site is 95% static content with ~5% interactive islands; Astro's "ship zero JS by default" model matches the existing GitHub Pages deploy target 1:1, avoids a runtime framework, and makes the duplicated layouts DRY via components.

### 2026-04-24 — Full audit written

- `kids-learning-games/dev/AUDIT_2026_04.md`: end-to-end review of the vanilla codebase.
- Findings grouped by severity (H = high, M = medium, S = small).
- Top issues identified: H1 fragmented settings keys, H2 per-game AudioContext, H3 GitHub API rate-limiting, H4 hand-rolled SW, M2 audio wiring duplication, M4 ~450-line inline CSS duplicated across 4 card-machine games, M5 inconsistent nav classes, S5 stale Comic Sans font stack, S7 missing asset versioning.
- "Deferred items" list for things intentionally not done (full test suite, nav overhaul, etc.).

---

## How to keep this file up to date

- Add new entries to the top of the **Changelog** section, dated (YYYY-MM-DD), most recent first.
- Update the **Current status** snapshot only when something material changes — keep it honest (line counts, port count, bundle size).
- Update the **What still needs doing** list as items land; don't delete completed ones — move them to the changelog with a one-line outcome.
