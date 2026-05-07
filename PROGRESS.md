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
- **Games ported (9 of 13), split across two shared layouts:**
  - *CardMachineLayout — 4 games (reference-catalogue pedagogy):*
    - Dinosaurs (default green theme, 15 cards, diet filter)
    - Flashcards (cyan/orange theme, 14 decks, 4 card-face variants)
    - Solar System (purple/gold theme, 11 cards, pure-CSS planet art, type filter)
    - Weather (deep-navy/ice-blue theme, 20 cards, season filter, full Fluent UI image deck)
  - *GridLayout — 5 games (foundational-set pedagogy):*
    - Alphabets (purple/green theme, 26 letter tiles, vowel/consonant filter, inline detail card with Fluent UI 3D image, completion overlay with confetti). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Numbers (sky-blue/orange theme, 10 digit tiles, 1–5 / 6–10 filter, inline detail card with N CSS count-objects matching vanilla pedagogy, digit-key + arrow-key shortcuts, completion overlay with confetti). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Colors (pastel pink/lavender theme, 12 colour-swatch tiles with the swatch *as* the tile face, warm/cool/neutral filter, inline detail card with a 5-shape pure-CSS gallery painted in the active colour, first-letter-key shortcut, full-spectrum confetti on completion). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Shapes (pink/coral theme, 14 shape tiles where the tile face is a *miniature pure-CSS rendering of the shape itself* + name label, round/basic/special filter, inline detail card with the *same shape rendered ~180px* + name + group pill + fact, group-coloured confetti on completion). Each pedagogical group gets its own tile-fill colour (round = pink/red, basic = blue, special = orange/gold) so the deck is visually scannable by category. Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Animals (sea-green/deep-blue theme, 37 animal tiles where the tile face is a *big emoji + name label*, mammal/bird/reptile/sea/insect filter, inline detail card with a Fluent UI 3D PNG (~260px) + sound onomatopoeia + fact, group-coloured confetti on completion). Image source migrated from vanilla Iconify Noto SVGs to Fluent UI 3D PNGs (jsDelivr, runtime-cached). Five animals get the alphabets `Q → Crown` substitution treatment (Iguana → Lizard, Nightingale → Bird, Quail → Bird, Vulture → Eagle, Yak → Ox). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
- **Vanilla games still to port (4):**
  `birds-game`, `hindi-game`, `woodcutter-story`, `daily-routines-story`.
  The 2 remaining foundational-set games land on `GridLayout`; the two story games get their own layout only if neither shared shell stretches to cover them. Per-game decisions and gotchas tracked in [Per-game layout decisions](#per-game-layout-decisions-for-the-5-pending-ports) below.
- **Shared infra in place:**
  - `CardMachineLayout.astro` shell — used by 4 ported games. Proven against three card-face strategies (pure-CSS art, image-with-fallback, big-digit/letter text).
  - `GridLayout.astro` shell — used by 5 ported games (Alphabets, Numbers, Colors, Shapes, Animals). Single-column vertical flow (header → filters → tile grid → inline detail). Five deck variants in `grid.css`: `--capped` (auto-fill 64–96px, alphabets), `--numbers` (fixed `repeat(5, …)` for the small 10-tile deck), `--colors` (auto-fill 96px+ for swatch tiles), `--shapes` (auto-fill 96px+ for shape-tile + name label), `--animals` (auto-fill 96px+ for emoji-tile + name label). Five reusable detail-payload patterns: Fluent UI image (alphabets, animals), CSS count-objects (numbers), CSS shape-gallery (colors), **CSS shape-figure-hero** (shapes — the same `.gl-shape-figure--<shape>` primitive used at ~36px on every tile is rerendered at ~180px in the detail card). Completion overlay + restart button included.
  - `card-machine.css` with ~25 `--cm-*` theming tokens per theme.
  - `grid.css` with ~25 `--gl-*` theming tokens per theme, 5 `--gl-count-bg-*` tokens for the count-objects palette (used by numbers), `--gl-shape-color` / `--gl-shape-border` for the colour shape gallery (used by colors), and `--gl-shape-fill` for the shape-figure namespace (used by shapes — driven by `[data-group=…]` rule on `.gl-tile--shape` so each pedagogical group gets a distinct fill colour). Each detail-payload type is opt-in: a game uses `.gl-detail-image` *or* `.gl-count-grid` *or* `.gl-shape-grid` *or* `.gl-shape-figure`, never two at once.
  - Shared chrome primitives in `global.css` (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, nav, modal, progress bar, toast) — both layouts share these.
  - `src/lib/`: singleton AudioContext, speech wrapper, unified settings, achievement toasts + confetti, **`progress.ts`** (consumed by **all 5 grid games** — alphabets, numbers, colors, shapes, animals — via the shared `kids_progress_v1:<gameId>` LocalStorage key).
  - `src/data/fluent.ts` — shared `FLUENT_IMG_BASE` constant. **Now imported directly by every consumer** (flashcards, weather, alphabets, animals); the legacy `export { FLUENT_IMG_BASE } from './fluent'` re-exports were dropped from `src/data/{flashcards,alphabets,weather}.ts` during the Animals port (refactor trigger satisfied — Animals was the second new consumer importing from `@/data/fluent` directly). Build now ships a single 0.09 KB `fluent.rTHKURu4.js` shared chunk.
  - Workbox SW (`src/sw.ts`) with StaleWhileRevalidate for the GitHub API and CacheFirst for Fluent emoji images.
- **Per-game learning state:** `kids_progress_v1:<gameId>` LocalStorage key is the canonical pattern. Alphabets writes to `kids_progress_v1:alphabets`, Numbers writes to `kids_progress_v1:numbers`, Colors writes to `kids_progress_v1:colors`, Shapes writes to `kids_progress_v1:shapes`, Animals writes to `kids_progress_v1:animals`. Read/write/clear is `src/lib/progress.ts` — all five games share the implementation.
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
  - `/games/numbers-game` — 200 ✅ (verified 2026-05-06, `<body class="grid" data-theme="numbers">` reaches production, all 10 `.gl-tile` tiles SSR-rendered with `data-num` 1–10 + correct `data-group="low"`/`"high"`, 3 filter pills (`all` / `low` / `high`), progress counter initialises at `0 / 10`, `.gl-count-grid` placeholder + `.gl-deck--numbers` deck variant present, zero `card-machine` / `cm-tile` / `press-btn` / `machine-screen` / `top-card` cross-contamination. **Shared progress chunk verified:** both `alphabets-game.…js` and `numbers-game.…js` reference `/_astro/progress.Czz_LiQd.js` (331 bytes raw) — first browser visit caches it, second game loads it from cache.)
  - `/games/colors-game` — 200 ✅ (verified 2026-05-06, `<body class="grid" data-theme="colors">` reaches production, all 12 `.gl-tile.gl-tile--swatch` tiles SSR-rendered with inline `style="--swatch: #...;"` matching vanilla hex values verbatim (`#FF0000` Red, `#FFA500` Orange, `#FFFF00` Yellow, `#FFC0CB` Pink, etc.), 2 tiles flagged `gl-tile--light` (Yellow + White), 4 filter pills (`all` / `warm` / `cool` / `neutral`), progress counter `0 / 12`, `.gl-shape-grid` with all 5 SSR-rendered shape divs (circle, square, rounded, diamond, triangle), zero `card-machine` / `cm-tile` / `press-btn` / `machine-screen` / `top-card` cross-contamination, zero swatch-styling leakage into alphabets / numbers HTML. **All 3 grid games verified to share `progress.Czz_LiQd.js` + `achievements.CySDez3r.js` + `settings.zS6XEbod.js` shared chunks** — colors-game.…js imports the same set as alphabets-game.…js and numbers-game.…js.)
  - `/games/shapes-game` — 200 ✅ (verified 2026-05-07, `<body class="grid" data-theme="shapes">` reaches production, all 14 `.gl-tile.gl-tile--shape` tiles SSR-rendered with `data-class` + `data-group` + child `<span class="gl-shape-figure gl-shape-figure--mini gl-shape-figure--<class>">` mini-figure + `<span class="gl-tile-shape-name">` name label, all 14 unique shape modifier classes present (circle, oval, heart, crescent, square, rectangle, triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, octagon, star), data-group counts: round 4 / basic 6 / special 4, 4 filter pills (`all` / `round` / `basic` / `special`), progress counter `0 / 14`, single big `.gl-shape-figure--big` placeholder + `.gl-deck--shapes` deck variant present in detail card, zero `card-machine` / `cm-*` / `top-card` / `press-btn` / `machine-screen` / `cm-cell` cross-contamination, zero shape-figure markup in alphabets / numbers / colors HTML. **4-way shared-chunk dedup verified at the chunk level:** alphabets, numbers, colors, **and shapes** page-chunks all import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js` — three shared modules served once and cached for every grid game.)
  - `/games/animals-game` — 200 ✅ (verified 2026-05-07, `<body class="grid" data-theme="animals">` reaches production, all 37 `.gl-tile.gl-tile--emoji` tiles SSR-rendered with `data-name` + `data-group` + child `<span class="gl-tile-emoji">` big-emoji + `<span class="gl-tile-emoji-name">` name label, data-group counts: mammal 20 / bird 7 / reptile 4 / sea 4 / insect 2 = 37, **6 filter pills** (`all` / `mammal` / `bird` / `reptile` / `sea` / `insect` — first GridLayout game with a 6-pill filter), progress counter `0 / 37`, `<img id="detailImage">` placeholder + `.gl-deck--animals` deck variant present in detail card, zero `card-machine` / `cm-*` / `top-card` / `press-btn` / `machine-screen` / `cm-cell` cross-contamination, zero `gl-tile--emoji` markup in alphabets / numbers / colors / shapes HTML. **5-way shared-chunk dedup verified at the chunk level:** alphabets, numbers, colors, shapes, **and animals** page-chunks all import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js`. Animals additionally imports `/_astro/fluent.rTHKURu4.js` — same hash as alphabets's import (the only two image-driven grid games), confirming the FLUENT_IMG_BASE re-export cleanup deduped to a single shared chunk; numbers / colors / shapes correctly do *not* import it (they use CSS art instead). All four cross-game checks pass: alphabets still 26 grid tiles + `data-theme="alphabets"`, numbers still 10 tiles + `data-theme="numbers"`, colors still 12 tiles + `data-theme="colors"`, shapes still 14 tiles + `data-theme="shapes"` — no regressions.)
  - `/manifest.webmanifest`, `/sw.js`, `/.nojekyll` — all 200
- **Production build sizes (client JS, gzipped):** flashcards **11.28 KB**, weather **3.34 KB**, **animals 3.30 KB**, dinosaurs **3.02 KB**, alphabets **2.96 KB**, solar-system **2.66 KB**, colors **2.25 KB**, shapes **2.11 KB**, numbers **2.08 KB**. Shared `progress.ts` chunk: **0.24 KB**, loaded once per session and cached by the SW for **all five grid games** (alphabets, numbers, colors, shapes, animals — all reference `/_astro/progress.Czz_LiQd.js` verbatim). Newly extracted **shared `fluent.ts` chunk: 0.09 KB**, imported by alphabets + animals (and re-used by flashcards + weather inside their card-machine bundles). Total PWA precache: **42 entries, ~289 KB** (was 40 / 255 KB).
- **Production build sizes (CSS, per page):** card-machine games share `dinosaurs-game.*.css` (17.8 KB, unchanged from the Shapes build — the Animals port added zero card-machine selectors, and bidirectional grep confirms zero leakage), grid games share `alphabets-game.*.css` (**23.6 KB**, was 21.6 KB pre-animals — delta is ~60 lines of `.gl-tile--emoji` namespace + `.gl-deck--animals` deck variant + `--animals` theme block + animals dark-mode override + FOUC pre-dark rule). Isolation verified bidirectionally: zero `gl-tile--emoji` / `gl-deck--animals` / `data-theme="animals"` selectors in the card-machine bundle, zero `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` / `.cm-cell` in the grid bundle, zero emoji-tile markup in alphabets / numbers / colors / shapes HTML.

---

## What still needs doing

> **▶ Resume here next session:** start on item **1.b (Birds on GridLayout)** below. The `GridLayout` shell now hosts **5 games** (Alphabets, Numbers, Colors, Shapes, Animals) and **4 detail-payload patterns** (Fluent UI image — used by alphabets *and* animals — count-objects, shape-gallery, shape-figure-hero). The Animals port shipped the `.gl-tile--emoji` tile-face strategy (big emoji + name label, Fluent UI 3D image inside the detail card) which Birds will reuse verbatim. Expected scope for Birds: new `src/data/birds.ts` (~15 entries, songbird / raptor / waterbird / tropical filter) + new `src/pages/games/birds-game.astro` (copy-adapt from `animals-game.astro`) + ~35-line `--gl-*` theme block in `grid.css` (or reuse animals's palette unchanged — decide at port time) + home tile + GameNav link. No new infra needed.

### Per-game layout decisions for the 5 pending ports

Audited every remaining vanilla file and decided which shared layout each
should land on. The principle from rule #3 — *"use the vanilla layout as
the hint for which pedagogy the original designer had in mind"* — drove
every call. Bundle size estimates assume the same per-game JS footprint
as Alphabets (`~3.0 KB gzip`) plus the per-game CSS theme block
(`~35 lines`).

| # | Game | Vanilla shape | Deck size | Layout | Open questions |
|---|---|---|---|---|---|
| 1 | **Animals** ✅ | `left-pane + animals-grid` (two-pane) | **37** (vanilla parity) | **`GridLayout`** *(shipped 2026-05-07)* | Tile face = big emoji + name, detail = Fluent UI 3D image + sound + fact. Filter: `mammal` / `bird` / `reptile` / `sea` / `insect` (synthesized; vanilla had none). Five animals not in the Fluent pack got the alphabets `Q → Crown` substitution treatment (Iguana → Lizard, Nightingale → Bird, Quail → Bird, Vulture → Eagle, Yak → Ox); per-card emoji `e` field stays as the original animal so the tile face still reads correctly. All 36 unique image paths verified 200 OK pre-commit. |
| 2 | **Birds** | `left-pane + birds-grid` (two-pane) | **~15** | **`GridLayout`** | Same shape as Animals (emoji tile + Fluent image detail). Filter: `songbird` / `raptor` / `waterbird` / `tropical`. Could share the animals theme palette unchanged — decide at port time. Animals port now provides a clean copy-adapt source. |
| 3 | **Hindi** | `left-pane` with **two separate grids** (vowels + consonants) | **~46** (13 vowels + ~33 consonants) | **`GridLayout`** | Vanilla shows two visually-distinct grids stacked. **Open**: do we (a) collapse into one filter-able deck (current Alphabets pattern), or (b) extend `GridLayout` with a sectioned-grid variant that renders `<h3>` group headings + grouped `.gl-deck` blocks? Lean (a) for symmetry; (b) only if the visual flatness genuinely confuses learners. ~46 tiles is a stretch for `--capped` (96px max) — may need an uncapped variant or a smaller tile size. Decide at port time. |
| 4 | **Woodcutter** | `story-container + scene` (linear narrative) | n/a (linear pages) | **`StoryLayout` (TBD)** | Fundamentally different pedagogy — *ordered, paginated, prev/next-only*, no "explore freely". Neither `GridLayout` (no chart) nor `CardMachineLayout` (no shuffle / random / filter) fits without distortion. First attempt remains "model each story page as a card", but expect to carve out `StoryLayout` for real. |
| 5 | **Daily Routines** | `scene-box + slide` (paginated) | n/a (linear pages) | **`StoryLayout` (TBD)** | Same shape as Woodcutter — would share the same shell once it exists. |

**Net layout split for the 13 vanilla games:**

- `CardMachineLayout` — 4 games (Dinosaurs, Flashcards, Solar System, Weather) — *shipped*.
- `GridLayout` — 7 games (Alphabets ✅, Numbers ✅, Colors ✅, Shapes ✅, Animals ✅; Birds, Hindi pending).
- `StoryLayout` (TBD) — 2 games (Woodcutter, Daily Routines pending).

**Per-port "is GridLayout still the right call?" checklist** — run this
mentally before starting each remaining port. If any answer is *no*,
flag it in the commit / PR and we re-evaluate before merging.

1. Is the vanilla content a **bounded set the child should recognise
   every member of** (alphabet, digits, colours, shapes, animals,
   birds, Devanagari)? → grid.
2. Does each tile fit a **single small face** (letter / digit / swatch
   / shape / emoji), with the full fact / image / fact going in the
   inline detail card? → grid.
3. Is the deck size **≤50** so an auto-fill grid on phone (≥6 tiles
   per row) stays kid-scannable? → grid. (Hindi at 46 is the upper
   edge — tile size may need a per-game override.)
4. Would a **shuffle / random next** interaction feel natural? → if
   *yes*, that's a card-machine signal; if *no*, that's a grid
   signal. (Children master closed sets in order, not at random.)

If all four answer *yes*, port to `GridLayout` confidently. If any
answer is *no*, write up the deviation in the commit message and ask
before deciding.

### Rough order of payoff

1. **Port the remaining 2 foundational-set games onto `GridLayout`.** In suggested order (simplest first):
   1. ~~**Animals** — big emoji on tile, Fluent UI 3D image + fact in detail. Filter: `mammal` / `bird` / `reptile` / `sea` / `insect`.~~ **Shipped 2026-05-07** ✅
   2. **Birds** — big emoji on tile, Fluent UI 3D image + fact in detail. Filter: `songbird` / `raptor` / `waterbird` / `tropical`. ← **pick up here next session** (clean copy-adapt of `animals-game.astro` — the new `.gl-tile--emoji` namespace is the precedent)
   3. **Hindi** — same shape as Alphabets but with the Devanagari script + Hindi word + English gloss; filter: `vowel` (स्वर) / `consonant` (व्यंजन). May need a sectioned-grid variant of `GridLayout` (decision deferred to port time).

   Each port is now ~35–50 lines of new `--gl-*` theme tokens + ~200–300 lines of page + typed data — effectively a copy-adapt of `colors-game.astro` / `shapes-game.astro` (for shape-gallery / shape-figure games), `numbers-game.astro` (for count-objects games), or `alphabets-game.astro` / `animals-game.astro` (for image-based games — alphabets uses image+letter, animals uses image+emoji-tile) with a new data file and a new theme block.
2. **Decide whether `StoryLayout.astro` is needed** — Woodcutter and Daily Routines have linear-story flows. First attempt: model each story *page* as a card in the card machine, with press-to-read and Prev/Next. Only carve out a separate layout if that collapses.
3. **Wire the real Stats + Quiz modals.** Currently both are `alert(…)` stubs in the 6 ported games. The progress helper is now in `src/lib/progress.ts` (extracted with the Numbers port); the Stats modal can read from it directly — next consumer that lands probably wants to wire that up properly so we get real "12 / 26 letters learned" / "5 / 10 numbers learned" rather than stub alerts.
4. **Add tests.** Playwright smoke test per layout (one for card-machine, one for grid): filter → navigate → completion overlay + confetti. Parameterise over themes inside each test so one suite covers every game.
5. **Option C — unified Deck layout with a grid/card view toggle.** Deferred until all 11 non-story games have shipped. Once we see both shells in production, decide whether to (a) keep them separate (if they've drifted in unavoidable ways) or (b) consolidate into a single `DeckLayout` with a per-user "Grid | Card" toggle so parents can pick the teaching mode. See the codified decision block at the top of the file for motivation.
6. **Cut-over plan (only after all 13 games land).** Migrate `kids-learning-games` (the live repo) to serve the Astro build, with a SW handoff strategy so existing PWA installs upgrade cleanly.

### One-off tech-debt items

- ~~`FLUENT_IMG_BASE` is now consumed by 3 data files (`flashcards`, `weather`,
  `alphabets`) — `src/data/fluent.ts` is the source of truth. `flashcards.ts`
  and `alphabets.ts` still re-export it for backward compatibility. Once
  another 1–2 games land (which will all use Fluent imagery), do a bulk
  cleanup: make every data file import from `@/data/fluent` directly and
  drop the re-exports.~~ **Done 2026-05-07** as part of the Animals port —
  Animals was the second new consumer importing from `@/data/fluent`
  directly, satisfying the refactor trigger. All three re-exports
  (`flashcards.ts`, `alphabets.ts`, `weather.ts`) dropped; consumer pages
  (`alphabets-game.astro`, `flashcards-game.astro`, `weather-game.astro`)
  updated to import the constant from `@/data/fluent`. Build now ships a
  single 0.09 KB `fluent.rTHKURu4.js` chunk.

---

## Changelog

### 2026-05-07 — Animals game ported (9/13) ✅ + `FLUENT_IMG_BASE` re-exports cleaned up

Fifth `GridLayout` port. With Animals landing, the grid shell has been
proven against five different tile-face strategies (text letter for
alphabets, text digit for numbers, fully-coloured swatch for colors,
miniature pure-CSS shape figure + name label for shapes, **big emoji +
name label** for animals) and is now reusing four detail-card payload
patterns *with a 2-way reuse of the Fluent UI image payload* —
alphabets and animals both render an `<img>` inside `.gl-detail-image-
wrap`, sharing the same `installImageFallback(img, emoji)` SVG-fallback
pattern. The new `.gl-tile--emoji` namespace is the lightweight cousin
of the existing `.gl-tile--shape` namespace — same flex-column
structure (figure/emoji on top, uppercase name below) but the visual
hero is a unicode emoji rather than CSS art (no per-card data
attribute drives the rendering, the emoji is just text content
typed into the data file).

- **Added:**
  - `src/data/animals.ts` — 37 typed `AnimalCard` entries (`name`,
    `group`, `label`, `e`, `img`, `sound`, `fact`). Vanilla parity on
    animal set (every animal copied across), every `info` and `sound`
    string preserved verbatim. **Synthesized 5-group filter** (vanilla
    had none — codified as a deliberate deviation in the data file's
    header comment): `mammal` (20 — Bear, Cat, Cow, Dog, Elephant,
    Fox, Giraffe, Horse, Koala, Lion, Monkey, Panda, Pig, Rabbit,
    Sheep, Tiger, Unicorn, Wolf, Yak, Zebra), `bird` (7 — Chicken,
    Duck, Nightingale, Owl, Penguin, Quail, Vulture), `reptile` (4 —
    Alligator, Iguana, Snake, Turtle), `sea` (4 — Fish, Jellyfish,
    Octopus, Whale), `insect` (2 — Ant, Butterfly). Penguin is
    intentionally `bird` (not `sea`) — biological classification
    trumps "swims in water" intuition and matches every standard
    kids' curriculum. Unicorn is intentionally `mammal` — calling it
    mammal-like is the closest fit for the 4-and-up audience without
    inventing a "mythical" 6th group for one entry. Deck order is
    group-sorted (mammal → bird → reptile → sea → insect) — same
    precedent as Colors (warm → cool → neutral) and Shapes (round
    → basic → special) reflows of vanilla's flat lists. Animal
    *content* unchanged.
  - `src/pages/games/animals-game.astro` — **~395 lines**. Copy-adapt
    of `alphabets-game.astro` (closest precedent: image-driven detail
    card with emoji fallback). Deck uses the new `.gl-tile--emoji`
    flex-column layout: `<button class="gl-tile gl-tile--emoji"
    data-name="Cat" data-group="mammal"><span class="gl-tile-emoji">
    🐱</span><span class="gl-tile-emoji-name">Cat</span></button>`.
    Detail card holds a Fluent UI 3D PNG (`<img id="detailImage">`
    with `installImageFallback`-installed inline SVG fallback per
    render — same pattern alphabets uses). First-letter keyboard
    shortcut + arrow keys; group-coloured confetti on completion
    (5 colours, one per pedagogical group: sea-green / deep-blue /
    earthy-brown / aqua / butterfly-yellow).
  - **Page-local override** — `body.grid[data-theme='animals']
    .gl-detail-letter { font-size: clamp(1.4em, 4vw, 2.2em); text-
    transform: capitalize; letter-spacing: 0.3px; }` so long animal
    names ("Nightingale", "Butterfly") don't crowd the detail-card
    head at the default clamp ceiling of 3.6em — same treatment
    Shapes ships for "Parallelogram" / "Trapezoid".
- **Reorganised CSS:**
  - `src/styles/grid.css` — added the `.gl-tile--emoji` namespace
    (~25 lines: emoji-span sizing with subtle drop-shadow, name-
    label rule, deck variant), the `.gl-deck.gl-deck--animals` deck
    variant (auto-fill 96px+, gap 12px — same density as
    `.gl-deck--shapes`), the `--gl-*` animals theme block (~32
    lines, sea-green-to-deep-blue gradient lifted from vanilla
    `animals-game.html` `#43cea2 → #185a9d`; tile face stays
    neutral cream so the per-card emoji + name reads cleanly;
    action / filter pills lean on the deep-navy accent for
    contrast against both warm tile interior and cool background),
    and the dark-mode override (deep-ocean navy background, mint-
    green tile colour).
  - `src/layouts/GridLayout.astro` — extra FOUC pre-dark rule for
    `[data-theme='animals']` (deep navy `#052a3d` background,
    mint-green `#b2f5ea` text).
- **Wired:**
  - `src/components/GameNav.astro` — added Animals link.
  - `src/pages/index.astro` — Animals home tile flipped to `ready:
    true`, pointing at the real game; description summarises the
    37-animal emoji-tile + Fluent UI 3D portrait + 5-group filter
    pedagogy.
- **Bonus cleanup (refactor trigger satisfied — Animals was the
  second new consumer importing from `@/data/fluent` directly):**
  - Dropped `export { FLUENT_IMG_BASE } from './fluent'` re-exports
    from `src/data/{flashcards,alphabets,weather}.ts`. Three consumer
    pages updated to import the constant from `@/data/fluent`:
    `src/pages/games/alphabets-game.astro` (split the combined
    `import { ALL_CARDS, FLUENT_IMG_BASE }` into two imports),
    `src/pages/games/flashcards-game.astro` (split out from the
    `DECKS / getDeck / FlashCard / Deck` import group),
    `src/pages/games/weather-game.astro` (split out from the
    `ALL_CARDS / seasonLabel / Season / WeatherCard` import group).
    Build now ships a single 0.09 KB `fluent.rTHKURu4.js` chunk
    shared across all 4 image-driven games (alphabets, flashcards,
    weather, animals — confirmed at the chunk level via grep on the
    page-chunks served from production), replacing the previous
    inlined-per-data-file duplication.
- **Deviations from vanilla (per migration principle #1):**
  - **Synthesized 5-group filter** (mammal / bird / reptile / sea /
    insect) added to give the deck a meaningful filter row consistent
    with the other GridLayout games. Vanilla had no grouping.
  - **Deck order** reflowed from vanilla's flat A-Z to group-sorted.
    Same precedent as Colors and Shapes. Animal *content* unchanged.
  - **Image source** migrated from vanilla Iconify Noto SVGs (`api
    .iconify.design/noto/<slug>.svg`) to Fluent UI 3D PNGs (`cdn
    .jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/<path>`).
    Same CDN origin already used by alphabets / flashcards / weather,
    so the SW `CacheFirst` rule for `cdn.jsdelivr.net` covers
    everything and a child who's used another image-driven game has
    most assets pre-warmed.
  - **Image substitutions** for animals not in the Fluent pack
    (alphabets `Q → Crown` precedent applied): Iguana → Lizard,
    Nightingale → Bird, Quail → Bird, Vulture → Eagle, Yak → Ox.
    Per-card emoji `e` field stays as the original animal's emoji
    (e.g. Quail → 🐦) so the tile face still reads correctly even
    when the detail-card image is a substitute, and the inline-SVG
    `onerror` fallback gracefully degrades to that emoji on any
    future CDN issue. **All 36 unique image paths verified 200 OK
    pre-commit** via curl smoke test.
  - **Sound field split** — vanilla shipped sounds as `'🐊 Snap!'`
    combining animal emoji with onomatopoeia. Astro splits these
    cleanly: `e` field holds the emoji (tile face + image fallback
    only), `sound` field holds just the textual onomatopoeia (shown
    in detail card and read aloud after the name). speechSynthesis
    says "Cat. Meow! Cats are cute and furry pets!" which reads
    cleaner than including the emoji glyph.
  - Particle canvas dropped (vanilla had ~80 lines of `requestAnimation
    Frame` painting drifting dots). The CSS sparkle overlay shipped
    in `global.css` is enough background ambience.
  - Single unified `kids_settings_v1` (vanilla used `animals_*`
    LocalStorage keys).
  - Singleton `AudioContext` (vanilla built its own).
- **Bundle isolation verified:**
  - All 5 grid pages share the grid CSS chunk (**23.6 KB**, was
    21.6 KB pre-animals). Delta is ~60 lines: `.gl-tile--emoji`
    namespace + `.gl-deck--animals` + `--animals` theme block + dark
    mode + FOUC pre-dark rule. Card-machine pages still link only
    `dinosaurs-game.D1g7kimY.css` (17.8 KB, unchanged — verified
    zero new selectors via grep).
  - 0 `gl-tile--emoji` / `gl-deck--animals` / `data-theme="animals"`
    in card-machine CSS chunk.
  - 0 `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` /
    `.cm-cell` in grid CSS chunk.
  - 0 emoji-tile markup in alphabets / numbers / colors / shapes
    HTML pages.
  - Animals HTML grep confirms `<body class="grid"
    data-theme="animals">`, all 37 `.gl-tile.gl-tile--emoji` tiles
    SSR-rendered with `data-name` + `data-group` + child emoji span
    + name label, data-group counts: mammal 20 / bird 7 / reptile 4
    / sea 4 / insect 2 = 37, **6 filter pills** (`all` / `mammal` /
    `bird` / `reptile` / `sea` / `insect` — first GridLayout game
    with a 6-pill filter row), `0 / 37` initial progress, single
    `<img id="detailImage">` placeholder + `.gl-deck--animals` deck
    variant present.
  - **5-way shared-chunk dedup** at the chunk level: `alphabets-
    game.…js`, `numbers-game.…js`, `colors-game.…js`, `shapes-
    game.…js`, and `animals-game.…js` all import the *exact same*
    `progress.Czz_LiQd.js`, `achievements.CySDez3r.js`, and
    `settings.zS6XEbod.js` — three shared modules served once and
    cached for every grid game. **`fluent.rTHKURu4.js` is a clean
    2-way dedup** between `alphabets-game.…js` and `animals-game.…js`
    (the only two image-driven grid games); `numbers / colors /
    shapes` correctly do *not* import it (they use CSS art instead).
- **Bundle sizes (client JS, gzipped):** animals **3.30 KB** —
  marginally larger than alphabets (2.96 KB) due to the 37-card
  inline metadata × 5-group filter type and the per-render
  image-fallback installer. Precache: 40 → **42 entries** (~255 →
  ~289 KB) — delta is the new HTML page + larger grid CSS chunk +
  shared `fluent` chunk extracted from inlined re-exports + SW
  revision.
- Build result: `astro check` → 0 errors / 0 warnings / 0 hints
  across 33 files.
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/animals-game — verified 2026-05-07 (commit `2b2c2a9`). Production HTTP 200, 23,987 bytes. Markup confirms `<body class="grid" data-theme="animals">`, all 37 `.gl-tile.gl-tile--emoji` tiles SSR-rendered with the per-card child `<span class="gl-tile-emoji">` (big emoji) + `<span class="gl-tile-emoji-name">` (uppercase label), data-group counts of mammal 20 / bird 7 / reptile 4 / sea 4 / insect 2 = 37, 6 filter pills, `0 / 37` initial progress, `<img id="detailImage">` placeholder + `.gl-deck--animals` deck variant present. Cross-checks: alphabets still 26 grid tiles + `data-theme="alphabets"`, numbers still 10 tiles + `data-theme="numbers"`, colors still 12 tiles + `data-theme="colors"`, shapes still 14 tiles + `data-theme="shapes"`, dinosaurs still `<body class="card-machine">` — no regressions across the 8 prior games. **5-way shared-chunk dedup verified at the chunk level:** all 5 grid pages' page-chunks (`alphabets-game.…js`, `numbers-game.…js`, `colors-game.…js`, `shapes-game.…js`, `animals-game.…js`) import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js`. The new shared `fluent.rTHKURu4.js` chunk (89 bytes raw) is imported by **alphabets + animals only** — confirming the FLUENT_IMG_BASE re-export cleanup deduped to a single chunk (numbers / colors / shapes correctly do *not* import it).

### 2026-05-07 — Shapes game ported (8/13) ✅

Fourth `GridLayout` port. With Shapes landing, the grid shell has been
proven against four different tile-face strategies (text letter for
alphabets, text digit for numbers, fully-coloured swatch for colors,
**miniature pure-CSS shape figure + name label** for shapes) and four
different detail-card payloads (Fluent UI image for alphabets,
runtime-rendered CSS count-objects for numbers, runtime-rendered CSS
shape-gallery for colors, **runtime-rendered single big CSS shape**
for shapes). The `.gl-shape-figure` namespace shipped here is *the*
reusable visual primitive — same per-shape modifier classes drive
both the ~36px tile miniature and the ~180px detail hero, switched
purely via a `--mini` / `--big` variant class.

- **Added:**
  - `src/data/shapes.ts` — 14 typed `ShapeCard` entries (`name`,
    `cssClass`, `group`, `label`, `fact`). Vanilla parity on shape set
    (Circle, Oval, Heart, Crescent, Square, Rectangle, Triangle,
    Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon,
    Star) and on `info` strings (treated as the `fact` field
    verbatim, just trimmed of trailing emoji where present so
    speechSynthesis sounds clean). **Synthesized 3-group filter**
    (vanilla had none — codified as a deliberate deviation in the data
    file's header comment): `round` (Circle, Oval, Heart, Crescent —
    4), `basic` (Square, Rectangle, Triangle, Diamond, Parallelogram,
    Trapezoid — 6), `special` (Pentagon, Hexagon, Octagon, Star — 4).
    Deck order is group-sorted (round → basic → special) — same
    precedent as Colors's warm → cool → neutral reflow of the vanilla
    flat list.
  - `src/pages/games/shapes-game.astro` — **~370 lines**. Same shape
    as the alphabets / numbers / colors ports but the deck uses the
    new `.gl-tile--shape` flex-column layout: `<button class="gl-tile
    gl-tile--shape" data-class="circle" data-group="round"><span
    class="gl-shape-figure gl-shape-figure--mini gl-shape-figure
    --circle"></span><span class="gl-tile-shape-name">Circle</span>
    </button>`. Detail card holds a single `.gl-shape-figure
    --big.gl-shape-figure--<class>` element rerendered (className
    rebuild) on every selection so the `.pop` keyframe restarts —
    same trick Colors uses to repaint the shape gallery. First-letter
    keyboard shortcut + arrow keys; group-coloured confetti on
    completion (one colour per group: pink/red/blue/blue/orange/
    orange).
  - **Page-local override** — `body.grid[data-theme='shapes']
    .gl-detail-letter { font-size: clamp(1.4em, 4vw, 2.2em); text-
    transform: capitalize; }` so long shape names ("Parallelogram",
    "Trapezoid") don't crowd the detail-card head at the default
    clamp ceiling of 3.6em.
- **Reorganised CSS:**
  - `src/styles/grid.css` — added the `.gl-shape-figure` namespace
    (~165 lines): one size-agnostic shape primitive driving BOTH the
    ~36px tile miniatures AND the ~180px detail-card hero. Variant
    classes (`--mini` / `--big`) flip the size; per-shape modifiers
    (`--circle`, `--square`, `--rectangle`, `--oval`, `--diamond`,
    `--triangle`, `--pentagon`, `--hexagon`, `--octagon`, `--star`,
    `--heart`, `--parallelogram`, `--trapezoid`, `--crescent`) use
    `clip-path` (polygon coords in viewport %) / `border-radius` (%)
    / `mask-image` (radial-gradient) so a single rule scales to both
    sizes. Heart polygon is normalised to viewport % coords (vanilla
    used a 200x200 absolute path that broke at smaller sizes);
    crescent uses radial-gradient mask (vanilla used a hardcoded
    60px box-shadow inset that didn't scale). Pop animation on the
    big detail figure with a separate keyframe for diamond (preserves
    the 45° final rotate). Also added the `.gl-deck.gl-deck--shapes`
    deck variant (auto-fill 96px+, gap 12px), `.gl-tile.gl-tile
    --shape` flex-column rule for the tile, `[data-group=…]` rules
    that push `--gl-shape-fill` onto each tile so each pedagogical
    group gets a distinct fill colour (round = pink/red gradient,
    basic = blue gradient, special = orange/gold gradient), the
    `--gl-*` shapes theme block (~32 lines, pink/coral background +
    purple action buttons), and the dark-mode override (deep
    aubergine background). Distinct from `.gl-shape--*` (the Colors
    gallery primitives) which are size-locked and live inside `.gl-
    shape-grid` only — those are intentionally left untouched.
  - `src/layouts/GridLayout.astro` — extra FOUC pre-dark rule for
    `[data-theme='shapes']` (deep aubergine background + light
    pink-rose text).
- **Wired:**
  - `src/components/GameNav.astro` — added Shapes link.
  - `src/pages/index.astro` — Shapes home tile flipped to `ready:
    true`, pointing at the real game; description summarises the
    14-tile pure-CSS deck + 3-group filter pedagogy.
- **Deviations from vanilla (per migration principle #1):**
  - **Synthesized 3-group filter** (round / basic / special) added
    to give the deck a meaningful filter row consistent with the
    other GridLayout games (alphabets vowel/consonant, numbers
    low/high, colors warm/cool/neutral). Vanilla had no grouping.
  - **Deck order** reflowed from vanilla's flat list to group-sorted
    (round → basic → special). Same precedent as Colors (warm →
    cool → neutral). Shape *content* unchanged.
  - **Per-tile group fill colour** (round=pink, basic=blue,
    special=orange) so the deck is visually scannable by category.
    Vanilla cycled through 14 random colours per click; Astro pins
    each shape to its group colour and uses the same colour at the
    detail card for visual continuity.
  - Heart clip-path normalised to viewport % coords (vanilla used a
    200x200 absolute path); crescent uses mask-image instead of
    box-shadow inset. Both rewrites are pure visual fidelity wins
    (now scales correctly at both 36px and 180px).
  - Particle canvas dropped (vanilla had ~80 lines of `request
    AnimationFrame` painting).
  - Single unified `kids_settings_v1` (vanilla used `shapes_*` keys).
  - Singleton `AudioContext` (vanilla built its own).
- **Bundle isolation verified:**
  - All 4 grid pages share `alphabets-game.HFiiPH-v.css` (21.6 KB,
    was 16.6 KB pre-shapes). Delta is ~165 lines of `.gl-shape-
    figure` namespace + 14 per-shape modifiers + `--shapes` theme +
    `.gl-deck--shapes` deck variant + shapes dark mode. Card-machine
    pages still link only `dinosaurs-game.D1g7kimY.css` (17.8 KB —
    +0.8 KB rebuild churn, *not* added selectors; verified via
    grep).
  - 0 `gl-shape-figure` / `gl-tile--shape` / `gl-deck--shapes` /
    `data-theme="shapes"` in card-machine CSS chunk.
  - 0 `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` /
    `.cm-cell` in grid CSS chunk.
  - 0 shape-figure markup in alphabets / numbers / colors HTML
    pages.
  - Shapes HTML grep confirms `<body class="grid"
    data-theme="shapes">`, all 14 `.gl-tile.gl-tile--shape` tiles
    SSR-rendered with all 14 unique shape modifier classes,
    data-group counts: round 4 / basic 6 / special 4 = 14, 4 filter
    pills (`all` / `round` / `basic` / `special`), `0 / 14` initial
    progress, single big `.gl-shape-figure--big` placeholder in the
    detail card.
  - **4-way shared-chunk dedup** at the chunk level: `alphabets-
    game.…js`, `numbers-game.…js`, `colors-game.…js`, and `shapes-
    game.…js` all import the *exact same* `progress.Czz_LiQd.js`,
    `achievements.CySDez3r.js`, and `settings.zS6XEbod.js` —
    confirmed by grepping import statements in each page-chunk.
- **Bundle sizes (client JS, gzipped):** shapes **2.11 KB** — sits
  between numbers (2.08 KB) and colors (2.25 KB), thanks to the
  small `renderFigure()` helper and first-letter-key shortcut.
  Precache: 38 → **40 entries** (~227 → ~255 KB) — delta is the new
  HTML page + larger grid CSS chunk + SW revision.
- Build result: `astro check` → 0 errors / 0 warnings / 0 hints.
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/shapes-game — verified 2026-05-07 (commit `db11e4c`). Production HTTP 200, 17,336 bytes. Markup confirms `<body class="grid" data-theme="shapes">`, all 14 `.gl-tile.gl-tile--shape` tiles SSR-rendered with `data-class` (circle, oval, heart, crescent, square, rectangle, triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, octagon, star — all 14 unique modifier classes present), `data-group` counts of round 4 / basic 6 / special 4, and the per-tile mini-figure markup (`<span class="gl-shape-figure gl-shape-figure--mini gl-shape-figure--<class>">`). 4 filter pills (`all` / `round` / `basic` / `special`). `0 / 14` initial progress. Single big `.gl-shape-figure--big` placeholder + `.gl-deck--shapes` deck variant present. Cross-checks: alphabets still 26 tiles + `data-theme="alphabets"`, numbers still 10 tiles + `data-theme="numbers"`, colors still 12 tiles + `data-theme="colors"`, dinosaurs still `<body class="card-machine">` — no regressions. **4-way shared-chunk dedup verified at the chunk level:** all 4 grid pages' page-chunks (`alphabets-game.…js`, `numbers-game.…js`, `colors-game.…js`, `shapes-game.…js`) import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js` — three shared modules served once and cached for every grid game.

### 2026-05-06 — Colors game ported (7/13) ✅

Third `GridLayout` port. With Colors landing, the grid shell has been
proven against three different tile-face strategies (text letter for
alphabets, text digit for numbers, **fully-coloured swatch** for
colors) and three different detail-card payloads (Fluent UI image for
alphabets, runtime-rendered CSS count-objects for numbers,
runtime-rendered CSS shape-gallery for colors). The reusable
`.gl-shape--*` primitives shipped here (circle / square / rounded /
diamond / triangle) will be reused by the upcoming Shapes port.

- **Added:**
  - `src/data/colors.ts` — 12 typed `ColorCard` entries (`name`, `hex`,
    `group`, `label`, `fact`, `light`). Hex values match vanilla
    `colors-game.html` verbatim (including the punishingly bright
    `#FFFF00` Yellow and `#00FF00` Green — vanilla is source of truth
    on content). Filter group is `warm` (Red, Orange, Yellow, Pink,
    Brown), `cool` (Blue, Green, Purple, Violet), `neutral` (Black,
    White, Gray) — 5/4/3 = 12. `light: true` on Yellow + White only,
    drives the dark-text + dark-border per-tile override.
  - `src/pages/games/colors-game.astro` — **~370 lines**. Same shape
    as the alphabets / numbers ports but the deck uses the swatch
    *as* the tile face: `<button class="gl-tile gl-tile--swatch"
    style="--swatch: #FF0000;">RED</button>`. Detail card paints the
    same colour across 5 pure-CSS shapes (circle, square, rounded,
    diamond, triangle) — matches the vanilla `shapesContainer`
    "see-this-colour-in-different-shapes" pedagogy. First-letter-key
    keyboard shortcut (`R` → Red, `B` → Blue, `G` → Green, etc.)
    plus arrow keys. Completion overlay launches confetti in **all
    12 learned colours** — extra-thematic for this game.
  - **Per-colour fun facts** added (vanilla had none) to keep parity
    with alphabets / numbers and give the speech synthesizer
    something to say beyond the bare colour name.
- **Reorganised CSS:**
  - `src/styles/grid.css` — added the `--gl-*` colors theme block
    (soft pink/lavender gradient, ~35 lines), the `.gl-tile--swatch`
    swatch tile rules + `.gl-tile--light` dark-text override for
    Yellow + White (~30 lines), the `.gl-shape-grid` + 5 `.gl-shape--*`
    shape primitives + animation keyframes (~95 lines), a new
    `.gl-deck.gl-deck--colors` 96px-min auto-fill grid variant. Also
    threaded `--gl-shape-color` / `--gl-shape-border` tokens into
    the per-theme palette so every grid theme can drive the shape
    gallery without per-game CSS. Dark-mode override included
    (deep aubergine background, full-saturation tile fills preserved
    — colour identity must not shift across modes).
  - `src/layouts/GridLayout.astro` — extra FOUC pre-dark rule for
    `[data-theme='colors']`.
- **Wired:**
  - `src/components/GameNav.astro` — added Colors link.
  - `src/pages/index.astro` — Colors home tile now `ready: true`,
    pointing at the real game; description updated. Other "coming
    soon" descriptions adjusted in the doc-update pass.
- **Deviations from vanilla (per migration principle #1):**
  - Shape gallery compressed from vanilla's 7 shapes (circle, square,
    rectangle, triangle, diamond, hexagon, fan-with-rotating-blades)
    to **5 representative pure-CSS shapes**. The fan-with-rotating-
    blades was a one-off vanilla flourish that didn't earn its
    complexity in shared CSS; we drop it. Hexagon dropped because
    pure-CSS hexagon needs ~12 lines of pseudo-element trickery and
    isn't worth it for a five-second-per-tap gallery.
  - Per-colour facts added (vanilla had none).
  - Particle canvas dropped (vanilla had ~95 lines of `requestAnimation
    Frame` painting).
  - Single unified `kids_settings_v1` (vanilla used `colors_*` keys).
  - Singleton `AudioContext` (vanilla built its own).
- **Bundle isolation verified:**
  - All 3 grid pages share `alphabets-game.CSJa59jO.css` (16.6 KB,
    was 12.7 KB pre-colors). Delta is ~150 lines of colors theme +
    swatch tiles + shape gallery + colors dark mode. Card-machine
    pages still link only `dinosaurs-game.D1g7kimY.css` (17 KB,
    unchanged).
  - 0 `gl-shape-*` / `gl-tile--swatch` / `gl-deck--colors` in
    card-machine CSS chunk.
  - 0 `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` in
    grid CSS chunk.
  - 0 swatch-styling leakage into alphabets / numbers HTML pages.
  - Colors HTML grep confirms `<body class="grid"
    data-theme="colors">`, all 12 `.gl-tile.gl-tile--swatch` tiles
    SSR-rendered with inline `style="--swatch: #...;"` matching
    vanilla hex values, 2 tiles flagged `gl-tile--light` (Yellow +
    White), 4 filter pills (`all` / `warm` / `cool` / `neutral`),
    data-group counts 5 / 4 / 3 = 12, `0 / 12` initial progress, all
    5 SSR-rendered shape divs in the placeholder `.gl-shape-grid`.
- **Bundle sizes (client JS, gzipped):** colors **2.25 KB** — a
  hair more than numbers (2.08 KB) thanks to the `renderShapes()`
  function and first-letter-key shortcut handler; less than alphabets
  (2.96 KB) because no image preloading and no Fluent UI fallback
  logic. Precache: 36 → **38 entries** (~203 → ~227 KB) — delta is
  the new HTML page + larger grid CSS chunk + SW revision.
- Build result: `astro check` → 0 errors / 0 warnings / 0 hints.
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/colors-game — verified 2026-05-06 (commit `99f22fe`). Production markup shows `<body class="grid" data-theme="colors">`, 12 `.gl-tile.gl-tile--swatch` tiles SSR-rendered with `style="--swatch: #FF0000;"` (Red), `#FFA500` (Orange), `#FFFF00` (Yellow), `#FFC0CB` (Pink), and so on — all matching vanilla `colors-game.html` hex values verbatim. 2 tiles flagged `gl-tile--light` (Yellow + White only). 4 filter pills (`all` / `warm` / `cool` / `neutral`). `0 / 12` initial progress. `.gl-shape-grid` with all 5 SSR-rendered shape divs ready for runtime colour application. Cross-checks: alphabets still 26 tiles + `data-theme="alphabets"`, numbers still 10 tiles + `data-theme="numbers"`, dinosaurs still `<body class="card-machine">` — no regressions. **Shared-chunk dedup verified at the chunk level:** all 3 grid pages' page-chunks (`alphabets-game.…js`, `numbers-game.…js`, `colors-game.…js`) import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js` — three shared modules served once and cached for every grid game.

### 2026-05-06 — Numbers game ported (6/13) ✅ + `kids_progress_v1` extracted

Second `GridLayout` port. With Numbers landing, the grid shell has been
proven against two different card-face strategies (image-with-fallback
for alphabets, pure-text digit for numbers) and two different detail-
card payloads (Fluent UI 3D image for alphabets, dynamically-rendered
CSS count-objects for numbers). Code shape is now a clean
copy-adapt-theme job; the remaining 5 grid games should each be a
sub-day port.

- **Added:**
  - `src/data/numbers.ts` — 10 typed `NumberCard` entries (`n`, `word`,
    `fact`, `group`, `label`). Vanilla content faithfully ported (1–10,
    not 1–20 — the previous spec was wrong; corrected in the doc-only
    commit that preceded this one). Filter group is `low` (1–5) /
    `high` (6–10).
  - `src/pages/games/numbers-game.astro` — **~300 lines**. Same shape
    as `alphabets-game.astro` but the detail card renders N CSS
    `.gl-count-object` divs instead of a Fluent UI image. Keyboard
    shortcuts mirror the vanilla *"Press 1-9, 0 for 10"* tip:
    digit keys `1`-`9` + `0` directly select the matching tile, plus
    `←` / `→` for filter-aware navigation.
  - **`src/lib/progress.ts`** — extracted the inline `loadLearned` /
    `saveLearned` from `alphabets-game.astro` now that Numbers is the
    second consumer. Two-consumer refactor trigger satisfied (per the
    rule already documented in the principles section). Adds
    `clearLearned()` for "Start Over" overlays. Fault-tolerant on
    storage quota / private mode.
- **Reorganised CSS:**
  - `src/styles/grid.css` — added the `--gl-*` numbers theme block
    (sky-blue + warm orange, distinct from alphabets' purple at a
    glance), the count-object styles + 5-element nth-child colour
    cycle (matches vanilla's green/orange/pink/blue/purple cycle),
    and a new `.gl-deck.gl-deck--numbers` variant: `repeat(5, …)`
    fixed 5-column grid for the small 10-tile deck so it doesn't go
    sparse on desktop. Dark-mode override included. Phone breakpoint
    (≤420px) simplifies the 5-column to `minmax(0, 1fr)` and tightens
    the gap for tile fit.
  - `src/layouts/GridLayout.astro` — extra FOUC pre-dark rule for
    `[data-theme='numbers']` (deep-navy background, cream text).
- **Refactored:**
  - `src/pages/games/alphabets-game.astro` — replaced the inline
    progress-persistence block with imports from `@/lib/progress`.
    Behaviour unchanged. Bundle dropped from 3.07 KB → 2.96 KB
    gzipped (the now-shared 0.24 KB `progress.ts` chunk is loaded
    once and cached for both games).
- **Wired:**
  - `src/components/GameNav.astro` — added Numbers link.
  - `src/pages/index.astro` — Numbers home tile now `ready: true`,
    pointing at the real game; description updated. Colors tile
    description updated to indicate it's next.
- **Deviations from vanilla (called out per migration principle #1):**
  - Concrete-quantity rendering uses **N CSS divs** rather than N
    Fluent UI images. Saves N HTTP requests on every tile tap; the
    pedagogy (count along by tapping each circle) is preserved 1:1.
  - Particle canvas removed (vanilla had ~90 lines of `requestAnimation
    Frame` painting drifting dots). The CSS sparkle overlay shipped
    in `global.css` is enough background ambience.
  - Single unified `kids_settings_v1` (vanilla used `numbers_*` keys).
  - Singleton `AudioContext` (vanilla built its own).
- **Bundle isolation verified:**
  - Pages using `GridLayout` now share `alphabets-game.CsgNRoU-.css`
    (12.7 KB, was 9.2 KB). Delta is ~35 lines `--gl-*` numbers tokens +
    ~60 lines count-object styles + ~10 lines `--numbers` deck variant.
    Pages using `CardMachineLayout` still link only `dinosaurs-game.
    D1g7kimY.css` (17 KB, unchanged).
  - Zero `gl-count-*` / `gl-deck--numbers` tokens in card-machine bundle.
  - Zero `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` in
    grid bundle.
  - Numbers page HTML grep confirms `<body class="grid"
    data-theme="numbers">`, all 10 `.gl-tile` tiles SSR-rendered with
    `data-num` 1–10 + correct `data-group` low/high, 3 filter pills
    (`all` / `low` / `high`), `0 / 10` initial progress, `.gl-count-
    grid` placeholder for runtime-rendered count objects.
- **Bundle sizes (client JS, gzipped):** numbers **2.08 KB** — cheapest
  game so far (no image preloading + no filter regex like alphabets'
  vowel test). Alphabets dropped from 3.07 → **2.96 KB** (the inline
  progress helper became the now-shared 0.24 KB `progress.ts` chunk).
  Precache rose from 33 → 36 entries (~182 KB → ~203 KB) — delta is
  the new HTML page + larger grid CSS chunk + new shared progress JS
  chunk + SW revision.
- Build result: `astro check` → 0 errors / 0 warnings / 0 hints.
- Live: https://aakash-jain-1.github.io/kids-learning-games-astro/games/numbers-game — verified 2026-05-06 (commit `8b5fe96`). Production markup shows `<body class="grid" data-theme="numbers">`, 10 `.gl-tile` tiles SSR-rendered with `data-num` 1–10 and matching `data-group` (`low` for 1–5, `high` for 6–10), 3 filter pills (`all` / `low` / `high`), `0 / 10` initial progress, `.gl-count-grid` placeholder. Cross-check: alphabets still 26 tiles + `data-theme="alphabets"`, dinosaurs still `<body class="card-machine">` + correct title — no regressions from the `progress.ts` extract or the CSS chunk merge. Both alphabets and numbers JS chunks verified to import the same shared `/_astro/progress.Czz_LiQd.js` (331 bytes raw, 0.24 KB gzip) — second-game visit hits the cache.

### 2026-05-06 — Per-game layout decisions logged + Numbers spec corrected

Resumed the migration after the Alphabets-on-`GridLayout` ship by
auditing every remaining vanilla game (`numbers-game.html`,
`colors-game.html`, `shapes-game.html`, `animals-game.html`, `birds.html`,
`hindi-alphabets.html`, `woodcutter-story.html`, `daily-routines.html`)
and recording a layout decision per game. No code changes — pure
documentation pass before resuming ports.

- Added a **"Per-game layout decisions for the 8 pending ports"** table
  to `What still needs doing`, capturing for each game: vanilla shape
  (left-pane / story / etc.), deck size, target layout, and the
  open questions / per-game gotchas surfaced during the audit.
- Added a **"Per-port checklist"** of four yes/no questions to run
  through before each port — formalises the rule-of-thumb the
  Alphabets course-correction taught us.
- **Spec correction:** the previous bullet for Numbers said *"1–20
  tiles, … filter: `single-digit` / `teens`"*. The vanilla deck is
  **1–10 only** (verified against `numbers-game.html` line 640's
  `numbers = { 1: 'One', … 10: 'Ten' }` literal). Updated to match,
  with the filter now `1–5` / `6–10`.
- Codified a deviation that will land with the Numbers port: vanilla
  numbers shows N abstract `.count-object` divs (CSS circles with
  star glyphs) in the right pane to *concretely represent quantity*.
  The Astro port will keep that pedagogy with N CSS divs (no Fluent
  UI image fetch required) — a deliberate deviation from the
  "Fluent UI 3D PNGs as the canonical image source" norm, justified
  by the pedagogical fit.
- Codified that the **Numbers port is the trigger for extracting
  `kids_progress_v1:<gameId>` into `src/lib/progress.ts`** (alphabets
  was the first consumer; numbers will be the second; per the
  "two consumers is the refactor trigger" rule already noted).
- Tagged Hindi's two-grid vanilla layout as the first place where
  `GridLayout` may need a sectioned-grid variant; deferred the
  decision until Hindi is the next port.

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
