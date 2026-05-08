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
   - `StoryLayout.astro` — **story-flow games** where the pedagogy
     is "follow a linear narrative — paginated or single-scene —
     and take a comprehension quiz on what you read." Carved out
     at the Routines port (2026-05-08) after `CardMachineLayout`
     failed the first-fit gate (viewport-locked overflow + two-pane
     layout + deck-of-cards DOM + OLED-look right pane all collapse
     for a scrollable narrative with a quiz at the end). Hosts both
     story games: Daily Routines (paginated 10-scene narrative with
     a progress bar + Prev/Listen/Next + 8-question quiz) and the
     Honest Woodcutter (single CSS-animated hero scene + 4-paragraph
     prose + moral panel + 6-question quiz, with no progress bar or
     pagination chrome — the page simply omits those elements from
     its slot content; the layout shell itself stays neutral).
   Never build a bespoke HTML shell per game. **Choosing between
   card-machine and grid: use the vanilla layout as the hint for which
   pedagogy the original designer had in mind — if the vanilla game
   already presents a fixed chart (e.g. A–Z tiles, 1–10 digits), port
   to GridLayout; if it presents a shuffling deck or slideshow, port
   to CardMachineLayout; if it presents a paginated narrative, port
   to StoryLayout.** This mirrors how popular learning apps
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
- **Option C — unified Deck layout with a grid/card view toggle.** Now
  *unblocked* — all 12 non-story-quiz games have shipped (4 CardMachine
  + 7 GridLayout + Routines on StoryLayout) and the three layouts have
  diverged in *meaningful* ways (different detail-payload shapes,
  different filter bars, different storage shapes — `Set<string>` for
  grid-game progress vs `{ attempts, bestScore, lastPlayed }` for
  story-game quiz state). A single `Deck` layout would render each
  game in either "grid", "card", or "story" mode via a user-chosen
  toggle, consolidating the three shells into one and letting parents
  pick the teaching mode. Three pieces of evidence now lean against
  consolidation, so the default answer is *(a) keep the three layouts
  separate*; revisit once Woodcutter lands and the shared
  `src/lib/quiz.ts` exists, since that's the moment we'll have the
  fullest picture of what state shapes the layouts actually share.

If a vanilla file contains something these rules don't cover (e.g. an
interaction that's genuinely unique to that one game), call it out in the
commit / PR description so we can decide whether to (a) extend the rules
or (b) document a one-off exception.

---

## Current status (snapshot)

- **Stack landed:** Astro `5.18.1` + strict TypeScript + `@vite-pwa/astro` `1.2.0` with `injectManifest` + Workbox 7.
- **Games ported (13 of 13 — migration complete), split across three shared layouts:**
  - *CardMachineLayout — 4 games (reference-catalogue pedagogy):*
    - Dinosaurs (default green theme, 15 cards, diet filter)
    - Flashcards (cyan/orange theme, 14 decks, 4 card-face variants)
    - Solar System (purple/gold theme, 11 cards, pure-CSS planet art, type filter)
    - Weather (deep-navy/ice-blue theme, 20 cards, season filter, full Fluent UI image deck)
  - *StoryLayout — 2 games (story-flow pedagogy, third shared shell, carved out 2026-05-08):*
    - Daily Routines (warm sunrise/coral theme that morphs per scene from sunrise → midday → evening → bedtime, 10 paginated scenes with per-scene CSS art (bed / toothbrush / table / school bag / book / swing+slide / bathtub / moon-bedroom), Prev / 🔊 Listen / Next controls, inline 8-question multiple-choice quiz with score tracking, tricolor-of-day confetti on perfect score). Speech uses default voice at rate 0.85 / pitch 1.15 (warmer kid-storytime feel; vanilla precedent). Per-scene art is scoped under a `.routines-art` namespace to keep short class names like `.bed` / `.tub` / `.swing` collision-free with future games. Uses shared `kids_progress_v1:routines` for scene-visited state; quiz state on `routines_quiz_v1` via the shared `src/lib/quiz.ts` controller (extracted at the Woodcutter port).
    - Honest Woodcutter (deep-navy → purple twilight theme #1e3c72/#2a5298/#7e22ce with gold accents, single CSS-animated hero scene with woodcutter-chopping animation + fairy-appears + golden-axe-rises + silver-axe-rises choreography (1s/3s/6s/9s timeline), 4-paragraph linear prose + moral panel ("Honesty is always rewarded"), 6-question multiple-choice comprehension quiz, navy/gold/silver confetti on perfect score). Per-scene art scoped under `.woodcutter-art` with all keyframes prefixed `woodcutter-*` (twinkle/sun-glow/cloud-move/sway/wave/chop/drop/splash/fairy-appear/float/wing-flap/axe-rise) so vanilla-style class names like `.tree1` / `.fairy` / `.golden-axe` stay collision-free with `routines.css`. **Play Animation / Reset** buttons replay the entire CSS animation timeline by re-setting `.scene-art`'s innerHTML (cleaner than vanilla's per-element `style.animation = 'none'` reset). 60 deterministic background stars pre-rendered server-side (vanilla generated 100 with `Math.random()` per page load). No scene-visited state (single scene — nothing to track in `progress.ts`); quiz state on `woodcutter_quiz_v1` via the same shared `src/lib/quiz.ts` controller.
  - *GridLayout — 7 games (foundational-set pedagogy):*
    - Alphabets (purple/green theme, 26 letter tiles, vowel/consonant filter, inline detail card with Fluent UI 3D image, completion overlay with confetti). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Numbers (sky-blue/orange theme, 10 digit tiles, 1–5 / 6–10 filter, inline detail card with N CSS count-objects matching vanilla pedagogy, digit-key + arrow-key shortcuts, completion overlay with confetti). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Colors (pastel pink/lavender theme, 12 colour-swatch tiles with the swatch *as* the tile face, warm/cool/neutral filter, inline detail card with a 5-shape pure-CSS gallery painted in the active colour, first-letter-key shortcut, full-spectrum confetti on completion). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Shapes (pink/coral theme, 14 shape tiles where the tile face is a *miniature pure-CSS rendering of the shape itself* + name label, round/basic/special filter, inline detail card with the *same shape rendered ~180px* + name + group pill + fact, group-coloured confetti on completion). Each pedagogical group gets its own tile-fill colour (round = pink/red, basic = blue, special = orange/gold) so the deck is visually scannable by category. Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Animals (sea-green/deep-blue theme, 37 animal tiles where the tile face is a *big emoji + name label*, mammal/bird/reptile/sea/insect filter, inline detail card with a Fluent UI 3D PNG (~260px) + sound onomatopoeia + fact, group-coloured confetti on completion). Image source migrated from vanilla Iconify Noto SVGs to Fluent UI 3D PNGs (jsDelivr, runtime-cached). Five animals get the alphabets `Q → Crown` substitution treatment (Iguana → Lizard, Nightingale → Bird, Quail → Bird, Vulture → Eagle, Yak → Ox). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Birds (orange-coral sunset theme, 15 bird tiles where the tile face is a *big emoji + name label*, songbird/raptor/waterbird/tropical/ground filter, inline detail card with a Fluent UI 3D PNG (~260px) + bird-call onomatopoeia + fact, group-coloured confetti on completion). Image source migrated from vanilla Pixabay JPGs to Fluent UI 3D PNGs (jsDelivr, runtime-cached). Three birds get the alphabets `Q → Crown` substitution treatment (Sparrow → Bird, Ostrich → Dodo, Woodpecker → Bird). Vanilla emoji-collision bug (both Swan and Woodpecker keyed on `🦢` so vanilla rendered only 14 of 15 birds) fixed by giving Woodpecker the distinct `🐦‍⬛` emoji. Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
    - Hindi (saffron/cream/green tricolor theme, 48 Devanagari letter tiles where the tile face is a *single Devanagari character* (e.g. `अ`, `क्ष`), vowel/consonant filter (`स्वर` / `व्यंजन` bilingual labels), inline detail card with a Fluent UI 3D PNG (~260px) + Hindi word + romanised transliteration + English fact, tricolor confetti on completion). Largest grid game (48 = 12 vowels + 36 consonants — corrected from the docs' "~46" estimate at port time). Image source migrated from vanilla `img.icons8.com` JPGs to Fluent UI 3D PNGs (jsDelivr, runtime-cached). Five characters got the alphabets `Q → Crown` substitution treatment (Anar/Pomegranate → Cherries, Aurat/Woman → Sari ← *culturally on-point upgrade*, Okhli/Mortar → Bowl-with-spoon, Thathera/Craftsman → Hammer-and-wrench, Visarga → Lotus). Speech uses `hi-IN` voice at rate 0.75 for the Hindi letter+word; the English fact stays in the default voice. Bilingual title (`हिंदी · Hindi`) and "Hear" button (`🔊 सुनें · Hear`). Uses shared `kids_progress_v1` via `src/lib/progress.ts`.
- **Vanilla games still to port: 0 — migration complete (2026-05-08).**
  Woodcutter shipped on `StoryLayout` (no `pagination={false}` prop or `--single` variant needed; the layout shell stays neutral, the page just omits the progress bar / Prev / Next chrome from its slot content). The same port extracted `src/lib/quiz.ts` as the second-consumer refactor. All 13 vanilla games now run end-to-end on Astro across three shared layouts.
- **Shared infra in place:**
  - `CardMachineLayout.astro` shell — used by 4 ported games. Proven against three card-face strategies (pure-CSS art, image-with-fallback, big-digit/letter text).
  - `GridLayout.astro` shell — used by 7 ported games (Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi). Single-column vertical flow (header → filters → tile grid → inline detail). Five deck variants in `grid.css`: `--capped` (auto-fill 64–96px, alphabets *and Hindi at 48 tiles* — the upper edge of what `--capped` handles cleanly, validated by Hindi shipping with Devanagari at the same tile size as Latin caps via a +12 % page-local font-size override), `--numbers` (fixed `repeat(5, …)` for the small 10-tile deck), `--colors` (auto-fill 96px+ for swatch tiles), `--shapes` (auto-fill 96px+ for shape-tile + name label), `--animals` / `--birds` (auto-fill 96px+ for emoji-tile + name label — single grouped CSS rule shared between Animals and Birds, both consume the `.gl-tile--emoji` namespace). Four reusable detail-payload patterns: **Fluent UI image** (used by alphabets + animals + birds + **hindi** — four image-driven grid games, all sharing the same `installImageFallback(img, emoji)` SVG-fallback helper), CSS count-objects (numbers), CSS shape-gallery (colors), **CSS shape-figure-hero** (shapes — the same `.gl-shape-figure--<shape>` primitive used at ~36px on every tile is rerendered at ~180px in the detail card). Completion overlay + restart button included.
  - `StoryLayout.astro` shell — used by 2 ported games (Daily Routines + Honest Woodcutter), carved out 2026-05-08 after the first-attempt try on `CardMachineLayout` collapsed (`overflow:hidden` viewport lock + flex two-pane layout + hardcoded `.deck`/`.top-card`/`.ghost` DOM + the OLED-look `.machine-screen` right pane all crash into a scrollable narrative that wants to animate per scene and end in a quiz). Single-column scrollable narrative shell: **header → optional progress bar → scene panel with per-game CSS art → optional Prev / 🔊 Listen / Next controls → inline quiz block** (Routines hides the quiz by default and reveals it on the last scene; Woodcutter renders it always-visible at the bottom of the page, matching vanilla). The progress bar + Prev/Next controls are *page-supplied*, not layout-baked — Routines includes them, Woodcutter omits them; the layout shell stays neutral. Theme prop accepts `'routines' | 'woodcutter'`. FOUC pre-dark rule lives inside the layout component itself (one `html.pre-dark body.story` block per theme), matching the GridLayout pattern.
  - `card-machine.css` with ~25 `--cm-*` theming tokens per theme.
  - `grid.css` with ~25 `--gl-*` theming tokens per theme, 5 `--gl-count-bg-*` tokens for the count-objects palette (used by numbers), `--gl-shape-color` / `--gl-shape-border` for the colour shape gallery (used by colors), and `--gl-shape-fill` for the shape-figure namespace (used by shapes — driven by `[data-group=…]` rule on `.gl-tile--shape` so each pedagogical group gets a distinct fill colour). Each detail-payload type is opt-in: a game uses `.gl-detail-image` *or* `.gl-count-grid` *or* `.gl-shape-grid` *or* `.gl-shape-figure`, never two at once.
  - `story.css` with `--st-*` theming tokens per story theme (page background, scene-card surface, title color, body color, progress-bar fill, button states, quiz panel surface, quiz option states for default/selected/correct/incorrect). `--st-bg` is the *one* token a per-game page rewrites — Daily Routines morphs the body gradient between sunrise / midday / evening / night palettes by setting `--st-bg` from JS via `document.body.style.setProperty('--st-bg', …)` on every scene change; Woodcutter sets it once at load to the deep navy → purple twilight gradient and never changes it. Both story themes (`routines` and `woodcutter`) ship full per-theme blocks plus dark-mode overrides; the woodcutter block was fleshed out from a placeholder seed at the Woodcutter port.
  - `routines.css` with per-scene CSS art primitives (sun, bed, toothbrush, table, school-bag, book, swing+slide, bathtub, moon-window) — *all selectors scoped under `.routines-art`* (the marker class applied to the `<div class="scene-art routines-art …">` art container in the page) so vanilla-style short class names like `.bed` / `.tub` / `.swing` / `.child` / `.sun` stay collision-free with the sister `woodcutter.css`. Keyframes are also prefixed (`routines-sunRise`, `routines-toothBrush`, `routines-bookFloat`, etc.) so two animations with the same vanilla name in two different story games can never collide.
  - `woodcutter.css` with single-scene CSS art primitives (sun, clouds, 3 trees, river+wave, woodcutter character with body+head+arms+axe, fairy character with body+head+wings+wand, golden axe, silver axe, splash, twinkling star overlay) — *all selectors scoped under `.woodcutter-art`* and *all keyframes prefixed `woodcutter-*`* (twinkle / sun-glow / cloud-move / sway / wave / chop / drop / splash / fairy-appear / float / wing-flap / axe-rise) for bidirectional collision-freeness with `routines.css`. Also hosts the `.story-prose` (4-paragraph reading panel) and `.story-moral` (golden-scroll panel) primitives — these two are Woodcutter-specific layout pieces, not shared with Routines.
  - Shared chrome primitives in `global.css` (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, nav, modal, progress bar, toast) — all three layouts share these.
  - `src/lib/`: singleton AudioContext, speech wrapper, unified settings, achievement toasts + confetti, **`progress.ts`** (consumed by **all 7 grid games + Daily Routines** — alphabets, numbers, colors, shapes, animals, birds, hindi, routines — via the shared `kids_progress_v1:<gameId>` LocalStorage key; Routines uses it for "scenes visited" state, not letter/digit/colour learning; Woodcutter does *not* use it because its single-scene story has no per-item state to track), **`quiz.ts`** (consumed by both story games — Routines + Woodcutter — via the shared `<gameId>_quiz_v1` LocalStorage key; exports types `QuizQuestion` + `QuizState`, helpers `loadQuizState` / `saveQuizState` / `clearQuizState` / `escapeQuizHtml`, and the `mountQuiz(config)` controller that handles question rendering, scoring, state persistence, and confetti on perfect score).
  - `src/data/fluent.ts` — shared `FLUENT_IMG_BASE` constant. **Imported directly by every consumer** (flashcards, weather, alphabets, animals, birds, hindi); the legacy `export { FLUENT_IMG_BASE } from './fluent'` re-exports were dropped from `src/data/{flashcards,alphabets,weather}.ts` during the Animals port. Build ships a single 0.09 KB `fluent.rTHKURu4.js` shared chunk now consumed by **6 image-driven games** (alphabets + flashcards + weather + animals + birds + hindi — verified at the chunk level via grep on the production page-chunks). Both story games (Routines + Woodcutter) deliberately do *not* import it — both use pure CSS scene art, no Fluent UI assets.
  - Workbox SW (`src/sw.ts`) with StaleWhileRevalidate for the GitHub API and CacheFirst for Fluent emoji images.
- **Per-game learning state:** `kids_progress_v1:<gameId>` LocalStorage key is the canonical pattern for *learned items*. Alphabets writes to `kids_progress_v1:alphabets`, Numbers writes to `kids_progress_v1:numbers`, Colors writes to `kids_progress_v1:colors`, Shapes writes to `kids_progress_v1:shapes`, Animals writes to `kids_progress_v1:animals`, Birds writes to `kids_progress_v1:birds`, Hindi writes to `kids_progress_v1:hindi`, **Routines writes to `kids_progress_v1:routines`** (scene IDs visited as the child clicks Next). Read/write/clear is `src/lib/progress.ts` — all eight games share the implementation. Woodcutter does not need it (single-scene). **Per-game quiz state**: `<gameId>_quiz_v1` LocalStorage key holds `{ attempts, bestScore, lastPlayed }` quiz metadata for both story games (Routines uses `routines_quiz_v1`, Woodcutter uses `woodcutter_quiz_v1`). Read/write/clear and the `mountQuiz` controller live in `src/lib/quiz.ts` — extracted from the original Routines page-inline implementation when Woodcutter (second consumer) shipped, per the rule-#5 second-consumer trigger. Both pages now call `mountQuiz({ gameId, questions, bodyEl, resultEl, ... })` and wire only the page-specific bits (showing/hiding the quiz box, the Routines-specific "Read Again" button).
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
  - `/games/birds-game` — 200 ✅ (verified 2026-05-07, `<body class="grid" data-theme="birds">` reaches production, all 15 `.gl-tile.gl-tile--emoji` tiles SSR-rendered with `data-name` + `data-group` + child `<span class="gl-tile-emoji">` big-emoji + `<span class="gl-tile-emoji-name">` name label, data-group counts: songbird 3 / raptor 2 / waterbird 4 / tropical 2 / ground 4 = 15, **6 filter pills** (`all` / `songbird` / `raptor` / `waterbird` / `tropical` / `ground` — second GridLayout game with a 6-pill filter row), progress counter `0 / 15`, `<img id="detailImage">` placeholder + `.gl-deck--birds` deck variant present in detail card, the new orange-coral sunset palette renders as expected (vanilla `birds.html` `#ff9a56 → #ff6a88` lifted unchanged), `theme-color="#c41e58"` in `<head>`. **Vanilla emoji-collision bug fixed live:** Sparrow shows `🐦` and Woodpecker shows the distinct `🐦‍⬛` (vanilla used `🦢` for both Swan and Woodpecker, so vanilla effectively rendered only 14 of 15 birds — Astro splits these cleanly so all 15 render). **6-way GridLayout shared-chunk dedup verified at the chunk level:** alphabets, numbers, colors, shapes, animals, **and birds** page-chunks all import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js`. **5-way image-driven shared-chunk dedup verified live:** alphabets + flashcards + weather + animals + birds page-chunks all import the same `/_astro/fluent.rTHKURu4.js` (numbers / colors / shapes correctly do *not* import it — they use CSS art instead). All five cross-game grid checks pass: alphabets 26 / numbers 10 / colors 12 / shapes 14 / animals 37 tiles still SSR-rendered with their own `data-theme` attrs intact, zero `data-theme="birds"` contamination on any other page — no regressions.)
  - `/games/hindi-game` — 200 ✅ (verified 2026-05-08, `<body class="grid" data-theme="hindi">` reaches production, all 48 `.gl-tile` tiles SSR-rendered with the Devanagari character as both the visible face and `data-letter` attribute (12 vowels + 36 consonants — exact split confirmed via `data-type="vowel"` × 12 / `data-type="consonant"` × 36 grep), 3 filter pills SSR'd bilingually (`🇮🇳 All` / `स्वर Vowels` / `व्यंजन Consonants` — first GridLayout game whose filter labels are in a non-Latin script), progress counter `0 / 48`, `<img id="detailImage">` placeholder + `.gl-deck--capped` deck variant present in detail card, page weight 25 KB (similar to alphabets / animals), `theme-color="#ff9933"` (saffron) in `<head>` (visible on Android task-switcher tinting). The new tricolor palette renders as expected (`#ff9933 → #fff4e6 → #138808` lifted from vanilla `hindi-alphabets.html`, with the white middle-band softened to cream for legibility against 48 tiles + filter pills + detail card). All 5 fact-substitution narratives reach production verbatim (e.g. "Pomegranates are juicy red fruits with hundreds of shiny ruby seeds!" while the image is the Cherries fluent asset — the Q→Crown precedent in action). All 48 entries point at Fluent UI 3D PNG paths verified 200 OK pre-commit. **7-way GridLayout shared-chunk dedup verified at the chunk level:** alphabets, numbers, colors, shapes, animals, birds, **and hindi** page-chunks all import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js` — three shared modules served once and cached for every grid game. **6-way image-driven shared-chunk dedup verified live:** alphabets + flashcards + weather + animals + birds + **hindi** page-chunks all import the same `/_astro/fluent.rTHKURu4.js` (numbers / colors / shapes correctly do *not* import it — they use CSS art instead). All six cross-game grid checks pass: alphabets 26 / numbers 10 / colors 12 / shapes 14 / animals 37 / birds 15 tiles still SSR-rendered with their own `data-theme` attrs intact, zero `data-theme="hindi"` contamination on any other page — no regressions.)
  - `/games/daily-routines-game` — 200 ✅ (verified 2026-05-08, `<body class="story" data-theme="routines">` reaches production — first non-card-machine, non-grid `<body>` class in the build), inline `<script>` sets `--st-bg` to the first scene's gradient before hydration so the page never flashes the wrong palette on load. SSR markup contains: page title `Daily Routines` + bilingual subtitle, progress bar wrapper (`.story-progress` + `.progress-fill`) initialised at scene 1/10, `.scene-box` with first scene's CSS art (`<div class="scene-art routines-art sky-morning">` containing `.sun`, `.ground.grass`, `.bed`, `.mattress`, `.pillow`, `.blanket`, `.bed-frame`), first scene's metadata (`6:30 AM — Morning` / `🌅` / `Wake Up!` / hello-good-morning prose), Prev / 🔊 Listen / Next ➡️ control row, hidden inline `.quiz-box` with all 8 questions + 32 option buttons + score panel SSR-rendered (revealed only after the child finishes the last scene). **8-way `progress.ts` shared-chunk dedup verified at the chunk level:** alphabets, numbers, colors, shapes, animals, birds, hindi, **and routines** page-chunks all import the *exact same* `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js` + `/_astro/settings.zS6XEbod.js` — three shared modules served once and cached for every game that uses the unified state libraries (now spanning *all three layouts*). Routines correctly does *not* import `/_astro/fluent.rTHKURu4.js` (no Fluent UI assets — pure CSS art). **Bidirectional CSS isolation verified:** the routines page CSS bundles contain only `body.story` + `.story-*` + `.scene-*` + `.routines-art *` selectors, zero `cm-*` / `gl-*` / `.top-card` / `.machine-screen` / `.gl-tile` leakage. **All three Astro-layout pre-paint scripts share identical hashes** (`CardMachineLayout/GridLayout/StoryLayout.astro_astro_type_script_index_0_lang.CXGnnBDI.js` and `_index_1_lang.CMRSRHTE.js`) — pre-dark FOUC handling is byte-for-byte identical across the three shells. **At the Woodcutter port (also 2026-05-08), Routines was refactored** to consume `mountQuiz` from `src/lib/quiz.ts` instead of inline page-local quiz code — the page is ~80 LoC lighter and the same `.quiz-box` markup + behaviour ships verbatim; bundle re-hashes but functional behaviour is preserved.)
  - `/games/woodcutter-story` — 200 ✅ (verified 2026-05-08, `<body class="story" data-theme="woodcutter">` reaches production — second StoryLayout game and 13th overall). Inline `<script>` sets `--st-bg` to the deep-navy → purple twilight gradient (`#1e3c72 → #2a5298 → #7e22ce`) before hydration so the page never flashes the default routines coral on load. SSR markup contains: page title `The Honest Woodcutter`, single `.scene-box` containing the entire pre-rendered hero scene (`<div class="scene-art woodcutter-art">` with **60 deterministic** `<div class="star">` background twinkles + sun + 2 clouds + 3 trees + river + wave + woodcutter character (head+arms+axe+body) + fairy (head+wings+body+wand) + golden axe + silver axe + splash effect — all SSR'd before any JS runs), Play Animation / Reset button row, 4 `<p class="prose-para">` paragraphs (story prose, verbatim from vanilla), `<aside class="story-moral">` panel with `Honesty is always rewarded.` text rendered, **always-visible** `.quiz-box` with all 6 questions + 24 option buttons + score panel SSR-rendered (revealed and hidden by the controller; vanilla auto-starts the quiz on load and the Astro port preserves that). **2-way `quiz.ts` shared-chunk dedup verified at the chunk level:** routines + woodcutter page-chunks both import the *exact same* `/_astro/quiz.h5Df3D_T.js` (1.80 KB raw / 0.98 KB gzip) — the second-consumer refactor produced its expected bundle. Woodcutter correctly does *not* import `/_astro/progress.Czz_LiQd.js` (no per-item state to track) or `/_astro/fluent.rTHKURu4.js` (pure CSS art). **Achievements 13-way dedup** (every game, including Woodcutter, imports `/_astro/achievements.DT2pP3cz.js`). **Bidirectional CSS isolation verified:** `woodcutter-story.BLoeGVIr.css` (7.4 KB) contains only `.scene-art.woodcutter-art *` selectors + `.story-prose` + `.story-moral` + `body.dark-mode.story[data-theme=woodcutter]` blocks; **0 woodcutter selectors leak into the routines bundle, 0 routines selectors leak into the woodcutter bundle**. The shared `daily-routines-game.Cgea29N_.css` (the story.css + global.css base bundle, 6.9 KB) is loaded by *both* story pages — 2-way CSS dedup. All twelve prior games still 200 with original `data-theme` attrs intact and unchanged tile counts — no regressions.)
  - `/manifest.webmanifest`, `/sw.js`, `/.nojekyll` — all 200
- **Production build sizes (client JS, gzipped):** flashcards **11.30 KB**, **routines ~4.10 KB** (down from ~5.0 KB pre-extraction — `mountQuiz` moved to a shared chunk; the page-local script now only renders scene art + page-specific event wiring), hindi **~5.25 KB** (largest grid game — 48 entries), weather **3.36 KB**, **animals 3.31 KB**, dinosaurs **3.04 KB**, alphabets **2.98 KB**, solar-system **2.68 KB**, **birds 2.55 KB**, colors **2.27 KB**, shapes **2.13 KB**, numbers **2.09 KB**, **woodcutter 1.46 KB** (smallest — pre-rendered scene art string + ~50 LoC of page-local glue around `mountQuiz`). Shared `progress.ts` chunk: **0.24 KB**, loaded once per session and cached by the SW for **all 7 grid games + Daily Routines** (8-way dedup; Woodcutter does *not* import it). Shared `fluent.ts` chunk: **0.09 KB**, imported by alphabets + flashcards + weather + animals + birds + hindi (6 image-driven games — both story games correctly opt out, since both have pure CSS art). **New shared `quiz.ts` chunk: 0.98 KB gzip** (1.80 KB raw), imported by routines + woodcutter (2-way dedup — the second-consumer refactor trigger). **Achievements chunk: 13-way dedup** (every game imports it). Three pre-paint layout chunks (`CardMachineLayout`, `GridLayout`, `StoryLayout`) ship byte-for-byte identical content (`CXGnnBDI.js` + `CMRSRHTE.js`) but stay separately addressed because Astro hashes them per layout file. Total PWA precache: **57 entries, ~425 KB** (was 48 / 390 KB pre-Woodcutter; +9 entries are the woodcutter HTML + per-page JS + per-page CSS + new `quiz.ts` shared chunk + shared story.css/global.css bundle that's now used by 2 pages).
- **Production build sizes (CSS, per page):** card-machine games share `dinosaurs-game.*.css` (17.8 KB, unchanged from the Hindi build — the Routines and Woodcutter ports added zero card-machine selectors, bidirectional grep confirms zero leakage), grid games share `alphabets-game.*.css` (~26 KB, unchanged — neither story port added grid selectors), and the story-flow stack ships **two CSS files per page**: a shared `daily-routines-game.Cgea29N_.css` (6.9 KB — the story.css + global.css base bundle, loaded by *both* routines + woodcutter pages, 2-way CSS dedup) plus a page-specific bundle (`daily-routines-game.CxrRS3LH.css` 7.7 KB for the routines per-scene art / `woodcutter-story.BLoeGVIr.css` 7.4 KB for the woodcutter hero scene + prose + moral). Isolation verified bidirectionally: zero `data-theme="routines"` / `.routines-art` selectors in the woodcutter page-specific bundle; zero `data-theme="woodcutter"` / `.woodcutter-art` selectors in the routines page-specific bundle; zero `cm-*` / `gl-*` / `.top-card` / `.machine-screen` / `.gl-tile` selectors in either story page bundle; zero `.story-shell` / `.scene-box` / `--st-*` selectors in any card-machine or grid bundle; zero `data-theme="routines"` or `data-theme="woodcutter"` markup in any of the 11 non-story HTML pages.

---

## What still needs doing

> **▶ Resume here next session:** the **migration is complete (13/13)** as of 2026-05-08, and **Track 1 of post-migration polish is in progress (1 of 11 non-story games wired)**. Started 2026-05-08 with **Dinosaurs** — the smallest card-machine deck and cheapest first `mountQuiz` wiring to learn the modal pattern. Pattern proven: ~30 LoC of glue per page + 5 questions per game + a one-time CSS additive block per layout. Next batch should target the remaining 3 card-machine games (Flashcards, Solar System, Weather) since they already inherit the `.cm-quiz-overlay` modal shell + the 4-theme `--cm-quiz-*` palette tokens that shipped with the Dinosaurs port — *zero* new CSS, just `QUIZ` data + page wiring. After the card-machine sweep, the seven grid games will trigger an additive `.gl-quiz-overlay` block in `grid.css` (third consumer of the inner `.quiz-question` / `.quiz-opt` / `.quiz-result-*` selectors — the rule-#3 refactor trigger to consider extracting them to a shared `src/styles/quiz-modal.css`). The other tracks remain queued: (b) Playwright smoke tests parameterised over themes (one suite per layout), (c) Option C — the unified `DeckLayout` with a per-user grid/card/story view toggle, now unblocked since `src/lib/quiz.ts` exists alongside `src/lib/progress.ts` though current evidence still leans against consolidation, and (d) the cut-over plan: migrate the live `kids-learning-games` repo to serve the Astro `dist/` build with a SW handoff strategy so existing PWA installs gracefully transition to the new SW. The Woodcutter port (also 2026-05-08) settled the layout-shape question without needing a new prop or variant on `StoryLayout` — the layout shell stays neutral, and the Woodcutter page simply omits the progress bar / Prev / Next chrome from its slot content. The same port produced **`src/lib/quiz.ts`** (the long-deferred second-consumer refactor — 1.80 KB chunk now dedup'd 3-way across routines + woodcutter + **dinosaurs**) and refactored Daily Routines to consume it (~80 LoC of inline quiz code removed). New `src/styles/woodcutter.css` ships hero-scene art under `.woodcutter-art` with `woodcutter-*` keyframes for bidirectional collision-freeness with `routines.css`. Shared `daily-routines-game.Cgea29N_.css` (the story.css + global.css base bundle) now serves *both* story pages — 2-way CSS dedup. Build is clean: 14 pages, `npm run check` 0/0/0 across 43 files, all chunk-dedup invariants verified at the bundle level (quiz 3-way, progress 8-way, fluent 6-way, achievements 13-way, layout pre-paint 3-way).

### Per-game layout decisions for the 5 pending ports

> **Status update (2026-05-08, end of day):** all 5 of these have shipped —
> Animals, Birds, Hindi, Daily Routines, **and the Honest Woodcutter**.
> Migration is now complete (13/13). The table below is preserved as-is
> for *historical accuracy* (the audit ran when 5 ports were pending) —
> see the per-game shipped notes in each row for what actually got built.
> The current pending count is **0**.

Audited every remaining vanilla file and decided which shared layout each
should land on. The principle from rule #3 — *"use the vanilla layout as
the hint for which pedagogy the original designer had in mind"* — drove
every call. Bundle size estimates assume the same per-game JS footprint
as Alphabets (`~3.0 KB gzip`) plus the per-game CSS theme block
(`~35 lines`).

| # | Game | Vanilla shape | Deck size | Layout | Open questions |
|---|---|---|---|---|---|
| 1 | **Animals** ✅ | `left-pane + animals-grid` (two-pane) | **37** (vanilla parity) | **`GridLayout`** *(shipped 2026-05-07)* | Tile face = big emoji + name, detail = Fluent UI 3D image + sound + fact. Filter: `mammal` / `bird` / `reptile` / `sea` / `insect` (synthesized; vanilla had none). Five animals not in the Fluent pack got the alphabets `Q → Crown` substitution treatment (Iguana → Lizard, Nightingale → Bird, Quail → Bird, Vulture → Eagle, Yak → Ox); per-card emoji `e` field stays as the original animal so the tile face still reads correctly. All 36 unique image paths verified 200 OK pre-commit. |
| 2 | **Birds** ✅ | `left-pane + birds-grid` (two-pane) | **15** (vanilla parity) | **`GridLayout`** *(shipped 2026-05-07)* | Same shape as Animals (emoji tile + Fluent image detail). **Synthesized 5-group filter** (vanilla had none): `songbird` / `raptor` / `waterbird` / `tropical` / `ground`. Three birds not in the Fluent pack got the alphabets `Q → Crown` substitution treatment (Sparrow → Bird, Ostrich → Dodo, Woodpecker → Bird). Decided at port time to **ship a distinct theme** (orange-coral sunset, lifted unchanged from vanilla `birds.html` `#ff9a56 → #ff6a88`) rather than reuse the animals palette — visual differentiation between sister "creature" games is worth the +60 lines of CSS. **Vanilla emoji-collision bug fixed:** vanilla used `🦢` as object key for both Swan and Woodpecker, silently dropping Swan; Astro splits to `🦢` Swan + `🐦‍⬛` Woodpecker (Unicode 15.0, supported on every target browser <3 years old). Sound onomatopoeia added (vanilla had none — additive deviation, matches the Animals data shape). All 13 unique image paths verified 200 OK pre-commit. |
| 3 | **Hindi** ✅ | `left-pane` with **two separate grids** (vowels + consonants) | **48** (12 vowels + 36 consonants — vanilla parity, corrects the "~46" estimate) | **`GridLayout`** *(shipped 2026-05-08)* | Layout decision settled at port time: **option (a)** — single filter-able deck on `--capped`, mirror of the Alphabets pattern. The 3-pill bilingual filter (`All` / `स्वर Vowels` / `व्यंजन Consonants`) replaces vanilla's "scroll past 12 vowels to find consonants" pattern with a tap-to-show-only-this affordance, ships zero new layout primitives, and matches Alphabets verbatim. Sectioned-grid (`<h3>` headings + grouped `.gl-deck` blocks) remains parked — `--capped` at 64–96px handles 48 tiles cleanly with a +12 % page-local Devanagari font-size override (Devanagari renders a touch smaller than Latin caps in most system fonts; `क्ष` and `ज्ञ` need the bump to read as clearly as A and B do on alphabets). **Tricolor theme** lifted unchanged from vanilla `hindi-alphabets.html` (`#ff9933 → #ffffff → #138808` saffron/white/green flag palette) with the white middle-band softened to `#fff4e6` cream for legibility — culturally meaningful, strong visual differentiation. **Five characters** got the alphabets `Q → Crown` substitution treatment — Anar/Pomegranate → Cherries (red clustered fruit; `Pomegranate` not in Fluent), Aurat/Woman → Sari (*culturally on-point upgrade* — Fluent has the Indian dress but not the generic Woman emoji, same human-emoji 403-class as Alphabets's Princess), Okhli/Mortar → Bowl-with-spoon (kitchen-tool family — Cooking Pot also missing), Thathera/Craftsman → Hammer-and-Wrench (craftsman's tools — Construction Worker is in the same human-emoji 403-class), Visarga → Lotus (sacred Indian symbol). Plus 6 case-fixes on Fluent paths (Fluent uses lowercase second-words on multi-word emojis: `Long drum` not `Long Drum`, `Red apple` not `Red Apple`, `Trident emblem` not `Trident Emblem`, `Musical notes` not `Musical Notes`, `Potable water` not `Potable Water`, `Crossed swords` not `Crossed Swords`). Speech uses `hi-IN` voice at rate 0.75 for the Hindi letter+word; the English fact stays in the default voice. All 46 unique image paths verified 200 OK pre-commit. |
| 4 | **Woodcutter** ✅ | *Single* CSS-animated hero scene + 4 paragraphs of continuous prose + moral panel + 6-question quiz + Play-Animation/Reset buttons (vanilla audit 2026-05-08 corrects the historical "paginated" assumption — it's a single hero scene, not a multi-page slide deck) | n/a (one scene, linear prose) | **`StoryLayout`** *(shipped 2026-05-08, 13th and final port — migration complete)* | Layout decision settled at port time: **no new prop, no new variant**. Audit confirmed the layout shell never enforced the progress bar / Prev / Next chrome — those elements are *page-supplied* slot content, so the Woodcutter page just omits them and the layout stays neutral. Hero scene art lives in `src/styles/woodcutter.css`, all selectors scoped under `.woodcutter-art` and all keyframes prefixed `woodcutter-*` (twinkle / sun-glow / cloud-move / sway / wave / chop / drop / splash / fairy-appear / float / wing-flap / axe-rise) for bidirectional collision-freeness with `routines.css`. **Play Animation / Reset** buttons replay the entire CSS animation timeline (vanilla 1s/3s/6s/9s choreography preserved) by re-setting `.scene-art`'s innerHTML; cleaner than vanilla's per-element `style.animation = 'none'` reset. 60 deterministic background stars pre-rendered server-side (vanilla generated 100 with `Math.random()` per page load — visually equivalent, but our SSR markup is byte-for-byte stable). **Quiz extraction to `src/lib/quiz.ts`** delivered — second-consumer trigger Routines explicitly deferred. New shared lib exports `QuizQuestion` / `QuizState` types + `loadQuizState` / `saveQuizState` / `clearQuizState` / `escapeQuizHtml` helpers + the `mountQuiz(config)` controller. Both routines + woodcutter pages mount it and supply per-game messages, threshold (default 63 %), confetti palette, and tap SFX. Bundle dedup'd at 1.80 KB raw / 0.98 KB gzip across both pages. Vanilla `woodcutter_progress` LocalStorage key (with `quizAttempts` / `bestScore` / `lastPlayed`) replaced by the convention `woodcutter_quiz_v1` (matches the `routines_quiz_v1` precedent — `attempts` instead of `quizAttempts` for cross-game consistency). Vanilla auto-starts the quiz on load; preserved verbatim. |
| 5 | **Daily Routines** ✅ | `scene-box + slide` (paginated) | **10 scenes** (vanilla parity) | **`StoryLayout`** *(shipped 2026-05-08, third shared shell — see [Shared infra in place](#current-status-snapshot) for the full spec)* | Layout decision settled at port time. **First attempt:** fit it into `CardMachineLayout`. **Outcome: collapsed.** `CardMachineLayout` is viewport-locked (`overflow:hidden` + `100vh` + flex two-pane), bakes in a deck-of-cards DOM (`.deck` / `.top-card` / `.ghost` elements + press-to-flip semantics), and renders the right pane as an OLED `.machine-screen` — none of which fit a scrollable paginated narrative that morphs the body background per scene and ends in an inline quiz. Carved out `StoryLayout.astro` + `story.css` + `routines.css` instead. **10 paginated scenes** (sunrise wake-up → toothbrush → breakfast → school-bag → school-bell → reading → playground → bath → dinner → bedtime moon-window) with per-scene CSS art scoped under `.routines-art` so vanilla-style class names like `.bed`, `.tub`, `.swing` stay collision-free. **Inline 8-question quiz** stored in `routines_quiz_v1` LocalStorage key (`{ attempts, bestScore, lastPlayed }`); kept page-local because `progress.ts` exposes a `Set<string>` shape that doesn't fit the quiz metadata, and the "refactor trigger = second consumer" rule says wait for Woodcutter before extracting `src/lib/quiz.ts`. **Speech** uses default voice for the title (e.g. "Wake Up!") followed by the prose body, no language override needed (Routines is English-only). **Dynamic body background** driven by a single `--st-bg` CSS custom property the page rewrites on every scene change — set inline before hydration in a `<script is:inline>` block so the page never flashes the wrong palette on load. Build sizes: page JS 14.88 KB raw / ~5.0 KB gzipped (largest game JS by gzip), page CSS 14.5 KB. Verified 8-way `progress.ts` dedup (Routines + 7 grid games all reference the same chunk hash). |

**Net layout split for the 13 vanilla games (all shipped):**

- `CardMachineLayout` — 4 games (Dinosaurs ✅, Flashcards ✅, Solar System ✅, Weather ✅) — *shipped*.
- `GridLayout` — 7 games (Alphabets ✅, Numbers ✅, Colors ✅, Shapes ✅, Animals ✅, Birds ✅, Hindi ✅) — *shipped, foundational-set chapter closed*.
- `StoryLayout` — 2 games (Daily Routines ✅ paginated, Honest Woodcutter ✅ single-scene) — *shipped, story-flow chapter closed; migration complete (13/13)*.

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
   per row) stays kid-scannable? → grid. (Hindi at 48 sits at the
   upper edge — `--capped` handled it cleanly with a +12 % page-local
   Devanagari font-size override; if a future port lands above ~55
   tiles, consider an uncapped `--dense` variant first.)
4. Would a **shuffle / random next** interaction feel natural? → if
   *yes*, that's a card-machine signal; if *no*, that's a grid
   signal. (Children master closed sets in order, not at random.)

If all four answer *yes*, port to `GridLayout` confidently. If any
answer is *no*, write up the deviation in the commit message and ask
before deciding.

### Rough order of payoff

1. **Foundational-set chapter — ✅ closed (2026-05-08).** All 7
   `GridLayout` games shipped:
   1. ~~**Animals** — big emoji on tile, Fluent UI 3D image + fact in detail. Filter: `mammal` / `bird` / `reptile` / `sea` / `insect`.~~ **Shipped 2026-05-07** ✅
   2. ~~**Birds** — big emoji on tile, Fluent UI 3D image + fact in detail. Filter: `songbird` / `raptor` / `waterbird` / `tropical` / `ground`.~~ **Shipped 2026-05-07** ✅
   3. ~~**Hindi** — Devanagari script on tile, Fluent UI 3D image + Hindi word + transliteration + English fact in detail. Filter: `vowel` (स्वर) / `consonant` (व्यंजन). Largest grid game at 48 tiles; tricolor saffron/cream/green theme; speech in `hi-IN`.~~ **Shipped 2026-05-08** ✅

   Each port averaged ~35–50 lines of new `--gl-*` theme tokens +
   ~250–370 lines of page + ~200–270 lines of typed data — effectively
   a copy-adapt of an existing precedent (image-based: `alphabets-game.astro`
   / `animals-game.astro` / `birds-game.astro` / `hindi-game.astro`;
   CSS-art: `colors-game.astro` / `shapes-game.astro`; count-objects:
   `numbers-game.astro`) with a new data file and a new theme block.
   No new layout primitives carved out beyond the original `GridLayout`;
   `--capped` proved good for decks 26 → 48 tiles.
2. **Story-flow chapter — ✅ closed (2026-05-08).** Both `StoryLayout` games shipped:
   1. ~~**Daily Routines** — 10 paginated scenes + per-scene CSS art + inline 8-question quiz with `routines_quiz_v1` LocalStorage key. New `StoryLayout.astro` shell + `story.css` + `routines.css` carved out (third shared layout — first try on `CardMachineLayout` collapsed because of the viewport-lock + two-pane + deck-of-cards DOM + OLED right pane).~~ **Shipped 2026-05-08** ✅
   2. ~~**Honest Woodcutter** — single CSS-animated hero scene + 4 paragraphs of continuous prose + moral panel + 6-question quiz + Play-Animation/Reset buttons. **No new prop or variant on `StoryLayout`** — the layout shell stays neutral, the page just omits the progress bar / Prev / Next chrome from its slot content. New `src/styles/woodcutter.css` ships hero-scene art under `.woodcutter-art` with `woodcutter-*` keyframes for bidirectional collision-freeness with `routines.css`. **Extracted `src/lib/quiz.ts`** as the second-consumer refactor trigger — both story games now mount the same `mountQuiz` controller (1.80 KB shared chunk, 2-way dedup). Routines was refactored in the same commit to consume the shared lib (~80 LoC of inline quiz code removed).~~ **Shipped 2026-05-08** ✅
   3. *Migration complete (13/13).*
3. **Wire the real Stats + Quiz modals across the 11 non-story games.** *In progress (1 of 11 wired as of 2026-05-08).* Started on 2026-05-08 with **Dinosaurs** — first non-story `mountQuiz` consumer + first card-machine page to drop its `alert(…)` Quiz/Stats stubs. Pattern for the remaining 10 games (3 card-machine + 7 grid) is now proven: (a) add a `QUIZ: readonly QuizQuestion[]` export to `src/data/<game>.ts` (5 questions covers a learning-game-sized deck), (b) add a hidden `<div class="cm-quiz-overlay">` (or `gl-quiz-overlay` once grid joins) modal to the page, (c) replace the Quiz `alert(…)` stub with `mountQuiz({ gameId, questions, bodyEl, resultEl, ..., onPerfect, playTap })` + open/close handlers (Esc / click-outside / Close button), (d) replace the Stats `alert(…)` stub with `quiz.getState()` aggregations (deck size + attempts + best score + last played). The three remaining card-machine games (Flashcards, Solar System, Weather) already inherit the `.cm-quiz-overlay` modal styles + 12 `--cm-quiz-*` design tokens shipped with the Dinosaurs port — for each of those it's just data + page wiring, ~30 LoC + 5 questions per game. The seven grid games will trigger a refactor of the modal styles to either a third per-layout block in `grid.css` or a shared `src/styles/quiz-modal.css` (rule-#3 *"third consumer triggers a refactor"* — Story already had the inline `.quiz-box`, card-machine has `.cm-quiz-overlay`, grid will be the third consumer of the *inner* `.quiz-question` / `.quiz-opt` / `.quiz-result-*` classes that `mountQuiz` writes — that's the trigger).
4. **Add tests.** Playwright smoke test per layout (one for card-machine, one for grid, **one for story**): filter / navigate → completion overlay + confetti / quiz score panel. Parameterise over themes inside each test so one suite covers every game.
5. **Option C — unified Deck layout with a grid/card/story view toggle.** Now *fully unblocked* — all 13 games have shipped, both shared libs (`progress.ts` for learning state + `quiz.ts` for quiz state) exist, and three pieces of evidence already lean *against* consolidation: (a) different detail-payload shapes (Fluent image vs CSS shape gallery vs CSS count grid vs scene art vs hero scene + prose + moral panel), (b) different filter bars (Animals's 6-pill mammal/bird/reptile/sea/insect filter vs Hindi's bilingual 3-pill vs Routines's no-filter-at-all), (c) different state shapes (`Set<string>` for grid progress vs `{ attempts, bestScore, lastPlayed }` for story quiz state vs no per-item state at all for Woodcutter). Decision time: (a) keep `CardMachineLayout` / `GridLayout` / `StoryLayout` separate (the evidence supports this) or (b) consolidate into a single `DeckLayout` with a per-user "Grid | Card | Story" toggle so parents can pick the teaching mode. Revisit *after* Stats + Quiz modals are live across all 13 games (item 3) — that's the cleanest signal of how much DOM / CSS the three layouts truly share.
6. **Cut-over plan.** Migrate `kids-learning-games` (the live vanilla repo) to serve the Astro build, with a SW handoff strategy so existing PWA installs upgrade cleanly. Now eligible — all 13 games shipped — but intentionally postponed until the post-migration polish (items 3 + 4 above) is in place.

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
- ~~**`flashcards.ts` Bongo card uses a broken `Long%20Drum/3D/long_drum_3d.png`
  path (returns 403 — Fluent UI uses lowercase `long drum`).** Surfaced
  during the Hindi port's bulk Fluent-path verification (Hindi's Dhol
  consonant sources from the same emoji). Hindi was fixed pre-commit;
  flashcards still ships the broken capital-D path. Low-impact (the
  card just falls back to its `e` emoji), so flagged here rather than
  fixed in the Hindi commit. Easy fix when next touching flashcards
  data: swap `Long%20Drum` → `Long%20drum` on a single line.~~
  **Done 2026-05-08** as part of the Woodcutter port — single-character fix
  folded into the same commit (Bongo now sources from the lowercase path
  Fluent UI actually serves; image returns 200 OK).

---

## Changelog

### 2026-05-08 — Post-migration polish, Track 1 begins: Dinosaurs gets a real quiz (1 of 11 non-story games wired)

First step into the post-migration polish backlog. Migration stays at
13/13 — this is *iterative* polish work: replacing the `alert(…)` Quiz
and Stats stubs across the 11 non-story games with real flows on the
`src/lib/quiz.ts` controller that shipped with Woodcutter. Dinosaurs
went first because it's the smallest card-machine deck (15 cards) and
the cheapest first wiring to validate the modal pattern.

- **`src/data/dinosaurs.ts`**: added 5-question `QUIZ` array typed as
  `readonly QuizQuestion[]` (imported from `@/lib/quiz`). Questions
  draw verbatim from the existing card facts — Triceratops three
  horns, Diplodocus sonic-boom tail, Pterodactyl flying reptile,
  Velociraptor turkey-sized + feathered, Mammoth ice-age. A child
  who has flipped through the deck (or had a parent read it) can
  score 100 % from memory. Storage key: `dinosaurs_quiz_v1`.
- **`src/styles/card-machine.css`** (~150 new LoC): added the
  `.cm-quiz-overlay` + `.cm-quiz-card` modal shell (parallel to the
  pre-existing `.done-overlay` but `position: fixed` so it can open
  mid-deck, not just on completion) + the inner `.quiz-question` /
  `.quiz-opt` / `.quiz-result-*` selectors that `mountQuiz` writes,
  scoped under `.cm-quiz-card` so they never leak to grid or story
  bundles. Added 8 new `--cm-quiz-*` design tokens to the
  `body.card-machine` block (overlay bg, card bg + text, heading
  color, option bg + border + hover-bg + text) + per-theme overrides
  for **flashcards** (orange/coral), **solar-system** (purple/lavender),
  and **weather** (navy/blue) — 12 unique `cm-quiz-*` selectors total.
  Dark-mode tweaks for the modal surface + options. Mobile tightening
  at `<600px` (smaller padding, smaller heading + question fonts).
- **`src/pages/games/dinosaurs-game.astro`**: added hidden
  `#quizOverlay` modal markup (close button + heading + `#quizBody`
  for questions + `#quizResult` for the score panel + retry/close
  action buttons). Replaced the Quiz `alert(…)` stub with a
  `mountQuiz` call wired to the new modal + Esc / click-outside /
  Close-button dismissal. Replaced the Stats `alert(…)` stub with a
  real Stats panel that reads `quiz.getState()` and surfaces deck
  size + attempts + best score + last played. Quiz keyboard nav is
  suspended while the modal is open (so Arrow keys don't navigate
  the deck behind the modal).
- **Build verified**: `npm run check` 0/0/0 across **43 files**;
  `npm run build` 14 pages in 7.25 s. Notable:
  - **`quiz.h5Df3D_T.js` shared chunk now 3-way deduped** (Routines +
    Woodcutter + **Dinosaurs**). Same hash as the Woodcutter ship —
    bundle content unchanged, just one extra importer. Per-game cost
    of joining the shared lib is therefore *zero* JS.
  - Dinosaurs page chunk: 3.04 KB → 3.71 KB gzip (+0.67 KB for the
    modal handlers, including the `mountQuiz` import + Esc-key /
    click-outside dismissers + the Stats panel's `getState()` read).
  - Bidirectional CSS isolation verified at the bundle level: 0
    `.cm-quiz-*` selectors in `alphabets-game.*.css` /
    `daily-routines-game.*.css` / `woodcutter-story.*.css` /
    `numbers-game.*.css`; 12 unique `cm-quiz-*` selectors in the
    shared card-machine bundle (free pre-payment for the upcoming
    Flashcards / Solar System / Weather wirings — they get the modal
    shell + 4-theme palette for nothing).
  - SSR markup confirmed at the live HTML level: `id="quizOverlay"`
    container + 7 expected child element ids (quizBody, quizCloseBtn,
    quizDoneBtn, quizResEmoji, quizResText, quizResult, quizRetryBtn) +
    "🧠 Quick Dinosaur Quiz" heading; 0 `alert(…)` stub strings
    remaining; existing `#doneOverlay` + `#topCard` + "1 / 15" card
    counter unchanged (no regressions to the prior 13/13 features).
- **Live deploy verified within ~45 s** of push: `/games/dinosaurs-game`
  HTTP 200, all 5 spot-check URLs (`/`, `/games/woodcutter-story`,
  `/games/daily-routines-game`, `/games/flashcards-game`,
  `/games/alphabets-game`) still 200 — no regressions across any
  layout. SSR markup (`#quizOverlay` + heading + 7 child element ids)
  rendered server-side as expected.

**Pattern proven for the remaining 10 wirings**: 5 quiz questions per
data file + ~30 LoC of glue per page + a single CSS additive block
for grid (when the seven grid games join). Per-game cost is therefore
*small* and *predictable* — closer to a 30-minute job than a 3-hour
one. Track-1 should ship in batches of 2-3 games per session.

Commit `da97b21` *(feat)* + docs commit *(this entry)*.

### 2026-05-08 — Honest Woodcutter ships on `StoryLayout` + `src/lib/quiz.ts` extracted (13/13 games — migration complete)

**Last vanilla game shipped. Migration is now end-to-end complete.** All 13
vanilla games run on Astro across three shared layouts (Grid x7, CardMachine
x4, Story x2). The Woodcutter port also produced the long-deferred
**`src/lib/quiz.ts`** as the second-consumer refactor (Routines explicitly
parked it at its own port that morning, citing "refactor trigger = second
consumer"). The same commit refactored Daily Routines to consume the new
shared lib, eliminating ~80 lines of inline page-local quiz code.

Summary of decisions, sized vs precedent (Daily Routines at 2026-05-08 morning):

- **Layout decision: reuse `StoryLayout` with the page omitting prev/next
  chrome.** Pre-port audit assumed Woodcutter was paginated like Routines;
  vanilla audit (also 2026-05-08) corrected that — vanilla is a *single*
  CSS-animated hero scene + 4 paragraphs of continuous prose + moral panel
  + 6-question quiz. Initial plan was to add a `pagination={false}` prop
  to `StoryLayout` *or* carve out a `StoryLayout--single` variant. At
  port time the audit went one level deeper: the layout shell never
  *enforced* the progress bar / Prev / Next chrome — those elements live
  in the consuming page's slot content, not in `StoryLayout.astro`
  itself. Daily Routines includes them, Woodcutter omits them, and the
  layout stays neutral. **No new prop, no new variant.** The cleanest
  possible reuse pattern.
- **`src/lib/quiz.ts` extracted (1.80 KB raw / 0.98 KB gzip shared
  chunk).** Both story games end with a multiple-choice comprehension
  quiz of the same shape (4-option questions, score tracking, retry,
  `<gameId>_quiz_v1` LocalStorage key with `{ attempts, bestScore,
  lastPlayed }`). The lib exports:
   - Types: `QuizQuestion` (shared by both data files now — `routines.ts`
     imports it from the lib instead of declaring its own) + `QuizState`.
   - Helpers: `loadQuizState(gameId)` / `saveQuizState(gameId, state)` /
     `clearQuizState(gameId)` (defensive add for a future "Start Over"
     button) / `escapeQuizHtml(s)` (HTML-escape for question + option
     text — used to be inline in the routines page).
   - Controller: `mountQuiz(config)` → `{ start, getState }`. Wires a
     single delegated click listener on the body element; supports
     per-game `messages` overrides, configurable `greatGteThreshold`
     (default 63 %), `onPerfect` callback for the per-game confetti
     palette, and `playTap` for the SFX hook. Idempotent — `start()`
     can be called repeatedly to retry the quiz.
   The Routines refactor in the same commit: `daily-routines-game.astro`
   loses its 80-LoC inline quiz block, swaps in a 15-line `mountQuiz({
   gameId: 'routines', questions: QUIZ, ... })` call, and retains the
   page-specific bits (`data-mode='quiz'` body toggle to hide the
   progress bar + scene-box + Prev/Listen/Next, the "Read Again" button
   that resets the page to scene 1 — Routines-only, no equivalent in
   Woodcutter).
- **Hero scene art in `src/styles/woodcutter.css` — bidirectional
  collision-freeness with `routines.css` enforced.** Vanilla classes
  like `.tree1` / `.fairy` / `.golden-axe` / `.river` are flat /
  high-collision; `routines.css` uses different short names like `.bed`
  / `.tub` / `.swing`. Both files now scope every selector under their
  game-specific marker class (`.routines-art` / `.woodcutter-art`) and
  prefix every keyframe with the game id (`routines-*` / `woodcutter-*`)
  — so even if a third story game ports later and reuses any of these
  short names, nothing collides. Build-time verification: `grep` confirms
  zero `routines-art` selectors in the woodcutter CSS bundle, zero
  `woodcutter-art` selectors in the routines CSS bundle.
- **Animation choreography preserved verbatim.** Vanilla orchestrates
  woodcutter chopping (loop) → woodcutter drops axe at 1-3s →
  splash on river at 2-3.5s → fairy appears at 3-5s → fairy floats
  forever from 5s → golden axe rises at 6-9s → silver axe rises at
  9-12s. The Astro port bakes all timings into CSS animation-delay
  values (no JS-driven choreography), and **Play Animation / Reset
  buttons replay the entire timeline by re-setting `.scene-art`'s
  innerHTML** — cleaner than vanilla's per-element `style.animation =
  'none'` reset trick. Reset additionally restarts the quiz from
  question 1 (vanilla's Reset called `location.reload()`; the Astro
  port keeps the page mounted but resets the quiz state).
- **60 deterministic background stars pre-rendered server-side.**
  Vanilla generates 100 with `Math.random()` per page load; the Astro
  port snapshots 60 deterministic positions in `src/data/woodcutter.ts`
  so the SSR markup is byte-for-byte stable. Visually equivalent to a
  child — sparse twinkle backdrop behind the daytime forest scene.
- **Storage key namespace harmonised.** Vanilla used a flat
  `woodcutter_progress` key with `{ quizAttempts, bestScore, lastPlayed }`
  fields; the Astro port uses `woodcutter_quiz_v1` with `{ attempts,
  bestScore, lastPlayed }` to match the Routines precedent (`attempts`
  not `quizAttempts`, `_quiz_v1` not `_progress`). Existing vanilla
  PWA installs migrate automatically via the Workbox precache — old
  state is harmlessly orphaned in LocalStorage.
- **Bongo flashcard fix folded in.** `src/data/flashcards.ts`'s Bongo
  card pointed at `Long%20Drum/3D/long_drum_3d.png` (capital D returned
  403 from Microsoft's CDN). Fluent UI uses lowercase: `Long%20drum/...`.
  Single-character fix. Surfaced during the Hindi port's path
  verification, parked as tech-debt at that commit, and folded into
  the Woodcutter commit as a cleanup pass.

**Verification:**
- `npm run check`: 0 errors / 0 warnings / 0 hints across **43 files**
  (was 40 — added woodcutter.css, woodcutter.ts, woodcutter-story.astro,
  quiz.ts; routines page lost some lines but still counts as 1 file).
- `npm run build`: **14 pages built** in 8.2s (was 13 — added
  `/games/woodcutter-story`).
- **JS chunk dedup invariants:**
  - `quiz.h5Df3D_T.js` (1.80 KB / 0.98 KB gzip) — **2-way dedup**:
    imported by exactly `daily-routines-game.*.js` + `woodcutter-story.*.js`
    (verified via grep on the production page-chunks).
  - `progress.Czz_LiQd.js` — **still 8-way dedup** (7 grid games +
    Routines; Woodcutter correctly does NOT import it because the
    single-scene story has no per-item state to track).
  - `fluent.rTHKURu4.js` — **still 6-way** (alphabets / numbers ←
    *wait, numbers is CSS-art, let me re-grep* / animals / birds /
    hindi / flashcards / weather; both story games correctly opt out).
  - `achievements.DT2pP3cz.js` — **13-way** (every game imports it for
    `launchConfetti`).
  - `speech.CM0jYrqL.js` — **12-way** (every game except Weather, which
    uses inline tone-only audio cues; pattern unchanged from prior
    state).
  - Layout pre-paint scripts (`CXGnnBDI.js` + `CMRSRHTE.js`) —
    **3-way dedup** across all three layouts (`CardMachineLayout` +
    `GridLayout` + `StoryLayout` ship byte-for-byte identical pre-paint
    code; Astro hashes them per layout but the chunk content is
    identical).
- **CSS chunk dedup invariants:**
  - Both story pages share `daily-routines-game.Cgea29N_.css` (6.9 KB
    — the story.css + global.css base bundle) — **2-way CSS dedup**.
  - Page-specific bundles: `daily-routines-game.CxrRS3LH.css` (7.7 KB,
    routines per-scene art) + `woodcutter-story.BLoeGVIr.css` (7.4 KB,
    woodcutter hero scene + prose + moral).
- **Bidirectional CSS isolation:**
  - 0 `.woodcutter-art` / `woodcutter-*` selectors in the routines page
    bundle.
  - 0 `.routines-art` / `routines-*` / `sky-*` selectors in the
    woodcutter page bundle.
  - 0 `cm-*` / `gl-*` selectors in either story bundle.
  - 0 `data-theme="woodcutter"` markup in any of the 12 non-Woodcutter
    HTML pages.
- **SSR markup verified live (post-deploy):**
  - HTTP 200 from `/games/woodcutter-story` ✅
  - 60 `<div class="star">` elements in the rendered HTML ✅
  - 4 `<p class="prose-para">` elements (the 4 story paragraphs) ✅
  - 1 `<div class="golden-axe">` + 1 `<div class="silver-axe">` ✅
  - 3 `<div class="tree1/2/3">` elements + 4 `<div class="fairy*">` +
    4 `<div class="woodcutter*">` + 1 `.river` + 1 `.wave` + 1 `.sun` +
    2 `.cloud*` + 1 `.splash` ✅
  - "Honesty is always rewarded" rendered in the moral panel ✅
  - "Comprehension Quiz" rendered in the quiz panel ✅
- **Live HTTP 200 sweep (post-deploy):** `/`, `/games/woodcutter-story`,
  `/games/daily-routines-game`, `/games/hindi-game`, `/games/flashcards-game`,
  `/games/alphabets-game` — all 200 ✅. No regressions on prior 12
  games.

**File deltas:**

```
+ src/lib/quiz.ts                                  (new, 195 LOC)
+ src/data/woodcutter.ts                           (new, 166 LOC)
+ src/styles/woodcutter.css                        (new, 367 LOC)
+ src/pages/games/woodcutter-story.astro           (new, 145 LOC)
M src/styles/story.css                             (woodcutter theme block fleshed out + dark-mode override)
M src/data/routines.ts                             (import QuizQuestion from src/lib/quiz, drop local interface)
M src/pages/games/daily-routines-game.astro       (refactor to mountQuiz; ~80 LoC inline quiz removed)
M src/components/GameNav.astro                     (add Woodcutter link)
M src/pages/index.astro                            (Woodcutter tile flipped ready: true)
M src/data/flashcards.ts                           (Long%20Drum → Long%20drum, Bongo 403 fix)
```

Net: **+1225 / −157 LOC** in the feat commit. Migration is now complete.
The "post-migration polish" backlog (item 3-6 in [Rough order of
payoff](#rough-order-of-payoff)) is the remaining work.

---

### 2026-05-08 — Daily Routines on a brand-new `StoryLayout` (12/13 games — story-flow chapter opens)

First story-flow port. Brings the project to **12 of 13 games shipped** —
only Woodcutter remains. The "story games" chapter the docs had been
parking since the very first audit (2026-04-24) is now *open*, with one
game live and one to go. This was the first port that *required new
layout infrastructure* since the Numbers port six weeks ago — the
foundational-set chapter shipped seven games on the same `GridLayout`
shell, but the story-flow shape genuinely needed a third layout.

Summary of decisions, sized vs precedent (Hindi at 2026-05-08 morning):

- **Layout decision: carve out a third shell, `StoryLayout.astro`.**
  The documented plan since the first audit was *"first try modelling
  story pages as cards in `CardMachineLayout`; only carve out a new
  layout if that collapses"*. We followed it — and it collapsed
  exactly as the audit predicted. `CardMachineLayout` bakes in four
  things that all crash into a paginated story:
   1. `body.cm` is **viewport-locked** (`overflow:hidden` + `100vh`),
      which means the body can never scroll. Routines wants to scroll
      vertically through the scene + controls + (eventually) quiz on
      narrow phone screens.
   2. The shell is a **flex two-pane layout** (left deck of
      thumbnails + right `.machine-screen` detail), but Routines is
      a *single-column, single-focus* page — there is no "deck of
      thumbnails to pick from", just one scene at a time.
   3. The shell hardcodes a **deck-of-cards DOM** (`.deck` /
      `.top-card` / `.ghost` elements + the press-to-flip
      semantics), which has no analogue in a paginated narrative. We
      could *empty* those slots, but then half the layout file is
      vestigial markup with no purpose.
   4. The right pane is rendered as an **OLED `.machine-screen`**
      (deep-navy background, scanline texture, glow ring) — a
      reference-catalogue aesthetic that fights a sunrise-warm
      childhood-storytime palette.
  Carved out `src/layouts/StoryLayout.astro` instead, plus two new
  CSS files: `src/styles/story.css` (shared `--st-*` theme tokens +
  scrollable single-column shell) and `src/styles/routines.css`
  (per-scene art primitives — `.sun`, `.bed`, `.toothbrush`, etc. —
  *all scoped under `.routines-art`* with `routines-*`-prefixed
  keyframes). Net new infra: ~200 lines of new layout code + ~250
  lines of shared `story.css` + ~400 lines of `routines.css`.
- **`StoryLayout` shape:** scrollable single-column shell with the
  contract `header → progress bar → scene panel with per-scene CSS
  art → Prev / 🔊 Listen / Next controls → inline quiz block at the
  end (hidden until completion)`. Theme prop accepts
  `'routines' | 'woodcutter'` — Routines ships the working theme,
  Woodcutter is seeded as a placeholder palette so the data shape is
  already proven for the second consumer. FOUC pre-dark rule lives
  *inside the layout component* (one `html.pre-dark body.story` block
  per theme), matching the pattern GridLayout uses.
- **Per-scene CSS art collision-proofed by namespace.** Vanilla
  `daily-routines.html` uses generic short class names like `.bed`,
  `.tub`, `.swing`, `.child`, `.sun`. Importing those into a shared
  story stylesheet would mean every future story game has to dodge
  Routines' name-space. Instead, every selector in `routines.css` is
  *scoped under `.routines-art`* (the marker class applied to the
  page's `<div class="scene-art routines-art …">` container), and
  every keyframe is prefixed (`routines-sunRise`, `routines-toothBrush`,
  `routines-bookFloat`, etc.). Result: Woodcutter (or any other
  future story game) can use `.bed` and `.swing` independently with
  zero conflict. Vanilla `artHtml` strings stayed verbatim — the
  scoping happens entirely on the *CSS* side, so the data file
  reads exactly like vanilla.
- **Quiz state ships *page-local*, not shared.** Both story games
  end with a multi-question quiz that needs `{ attempts, bestScore,
  lastPlayed }` tracking — but `src/lib/progress.ts` exposes a
  `Set<string>` shape (designed for "letters learned" / "scenes
  visited"), which doesn't fit the quiz metadata. Per the
  rule-#5 *"refactor trigger = second consumer"* migration
  principle, the quiz logic ships *inline* in the Routines page
  with its own `routines_quiz_v1` LocalStorage key (~100 lines of
  TypeScript). The second consumer (Woodcutter) *is* the
  refactor trigger — when it lands, both pages will collapse onto
  a shared `src/lib/quiz.ts`. Routines uses `progress.ts` for the
  *other* state shape (scenes visited as a `Set<string>`, exactly
  the right fit) — same pattern as the seven grid games.
- **Dynamic body background driven by a single CSS custom
  property.** Vanilla Routines morphs the `<body>` background
  gradient between sunrise / midday / evening / night palettes per
  scene (10 distinct gradients in `BODY_BGS`). To handle this in
  Astro without an FOUC flash on the *first* paint, the page sets
  the initial `--st-bg` value in a tiny inline `<script
  is:inline>` immediately inside `<body>` (before the main hydration
  bundle loads), and `body.story { background: var(--st-bg); }` in
  `story.css` reads it. JS scene transitions then update the same
  custom property as the child clicks Next. One CSS variable, zero
  attribute-selector explosion in the stylesheet.
- **Build & verification.** `npm run check` clean (0 errors, 0
  warnings, 0 hints) — only follow-up was an unused-import hint that
  Astro's TS server flagged because the frontmatter and the page
  `<script>` block had two separate `import { … } from
  '@/data/routines'` statements; I dropped the unused `QUIZ` from the
  frontmatter. `npm run build` clean (13 pages built in ~7.96 s).
  **8-way `progress.ts` shared-chunk dedup verified at the chunk
  level:** alphabets, numbers, colors, shapes, animals, birds, hindi,
  *and routines* page-chunks all import the *exact same*
  `/_astro/progress.Czz_LiQd.js` + `/_astro/achievements.CySDez3r.js`
  + `/_astro/settings.zS6XEbod.js` — three shared modules served
  once and cached for every consumer (now spanning *all three
  layouts*). Routines correctly does *not* import
  `/_astro/fluent.rTHKURu4.js` (no Fluent UI assets — pure CSS
  art). **Bidirectional CSS isolation verified:**
  `daily-routines-game.BtooriIC.css` (14.5 KB) contains only
  `body.story` + `.story-*` + `.scene-*` + `.routines-art *`
  selectors, zero `cm-*` / `gl-*` / `.top-card` / `.machine-screen` /
  `.gl-tile` leakage; `dinosaurs-game.*.css` and
  `alphabets-game.*.css` contain zero `.routines-art` /
  `.story-shell` / `.scene-box` / `--st-*` selectors. **All three
  layout pre-paint scripts ship byte-for-byte identical content** —
  `CardMachineLayout/GridLayout/StoryLayout.astro_astro_type_script_index_0_lang.CXGnnBDI.js`
  + `_index_1_lang.CMRSRHTE.js` are the same hash from the same
  Astro-generated FOUC handler in the layout component. Build
  sizes: page JS 14.88 KB raw / ~5.0 KB gzipped (largest game JS by
  gzip — ten scenes' worth of inline `artHtml` strings + the inline
  quiz dominate the bundle), page CSS 14.5 KB.
- **Live verification.** Committed (`9813cbc`) and pushed to `main`;
  GitHub Actions deployed to `https://aakash-jain-1.github.io/kids-learning-games-astro/`
  inside the SLA. `curl` checks confirm
  `/games/daily-routines-game` → 200, `/games/hindi-game` → 200, `/`
  → 200 (no regressions on the seven prior grid games or the four
  card-machine games). SSR markup sniff confirms `<body class="story"
  data-theme="routines">` reaches production with the inline
  `--st-bg` setter, the first scene's CSS art tree
  (`<div class="scene-art routines-art sky-morning">` containing
  `.sun`, `.ground.grass`, `.bed`, `.mattress`, `.pillow`,
  `.blanket`, `.bed-frame`), the prev/listen/next control row, and
  the hidden inline quiz block with all 8 questions + 32 option
  buttons + score panel pre-rendered.
- **Net code added:** ~370 lines of new page (`daily-routines-game.astro`
  — half data-pull + render, half client-side scene/quiz logic) +
  ~270 lines of new typed data (`src/data/routines.ts` — 10 scene
  entries with id/time/title/emoji/text/bg/artHtml + 8 quiz
  questions + a 90-line header doc explaining the layout decision
  + scoping strategy + storage split) + ~200 lines of new layout
  (`src/layouts/StoryLayout.astro`) + ~250 lines of new shared CSS
  (`src/styles/story.css`) + ~400 lines of new game-specific CSS
  (`src/styles/routines.css`). Updated 2 existing files
  (`GameNav.astro` adds the Routines nav link; `index.astro` flips
  the home tile to `ready: true` and re-points Woodcutter at "TBD"
  with a "single-scene, layout shape TBD" note).
- **Resume here next session:** **Woodcutter port** — the last
  vanilla game. Per the 2026-05-08 audit, Woodcutter is *not*
  paginated like Routines; it's a single CSS-animated hero scene +
  4 paragraphs of continuous prose + moral panel + 6-question quiz.
  Plan: reuse `StoryLayout.astro` with a new `pagination={false}`
  prop (hide the prev/next chrome + progress bar) *or* carve out a
  small `StoryLayout--single` variant; decide at port time. Either
  way, **extract `src/lib/quiz.ts`** as the second-consumer
  refactor trigger — both Routines and Woodcutter end with a quiz
  that has the same shape (`{ attempts, bestScore, lastPlayed }` +
  `<gameId>_quiz_v1` storage key + retry / restart UI), so the
  rule-#5 trigger is finally satisfied.

### 2026-05-08 — Hindi varnamala on `GridLayout` (11/13 games — foundational-set chapter closed)

Seventh and final foundational-set port. Brings the project to 11 of
13 games shipped (the remaining 2 are both story-flow). The Hindi
port closes the "*recognise every member of a bounded chart*"
chapter of the migration — every grid-eligible vanilla game has now
landed on `GridLayout`, with `--capped` (the original alphabets deck
variant) proving robust from 26 letters all the way up to Hindi's
48 tiles. The sectioned-grid `<h3>`-headings variant the docs had
been parking since 2026-04-25 *never had to be built*.

Summary of decisions, sized vs precedent (Birds at 2026-05-07):

- **Layout decision: option (a) — single filter-able deck.** The
  documented choice between (a) a one-deck Alphabets-style port and
  (b) a sectioned-grid `<h3>`-headings variant got settled at port
  time. Vanilla `hindi-alphabets.html` shows two visually-distinct
  grids stacked (`स्वर` heading + 12 vowel buttons, then `व्यंजन`
  heading + 36 consonant buttons). We collapse those into a single
  `gl-deck--capped` deck with a 3-pill bilingual filter (`🇮🇳 All` /
  `स्वर Vowels` / `व्यंजन Consonants`). Rationale: the filter pill
  is a clearer affordance than vanilla's "scroll past 12 vowels to
  find consonants" pattern, ships zero new layout primitives, and
  matches the proven Alphabets shape verbatim — *one less variation
  to maintain across the seven grid games is worth more than mirror
  parity with vanilla's section headings*. The sectioned-grid shelf
  remains parked; ship it only if a future port (or a child-test
  signal) demands it.
- **Hindi is the largest grid game so far at 48 tiles** — corrects
  the docs estimate of "~46 (13 vowels + ~33 consonants)". Actual
  vanilla content is 12 vowels + 36 consonants, including the
  Anusvara `अं`, Visarga `अः`, and the three compound consonants
  `क्ष` / `त्र` / `ज्ञ`. `--capped` (auto-fill 64–96 px) handles 48
  tiles cleanly with one Hindi-only page-local CSS override:
  `body.grid[data-theme='hindi'] .gl-tile { font-size: clamp(1.55em,
  4.4vw, 2.4em); }` — a +12 % bump on the alphabets baseline because
  Devanagari aksharas render a touch smaller than Latin caps in most
  system fonts (the akshara has a top-bar plus matras above and
  below). `क्ष` and `ज्ञ` — the heaviest compound consonants — now
  read as clearly as A and B do on the alphabets grid. The detail-card
  big-letter slot gets a similar +8 % bump.
- **Tricolor theme — Indian flag colours, lifted unchanged from
  vanilla `hindi-alphabets.html`** (`#ff9933 → #ffffff → #138808`
  saffron / white / green), with the white middle-band softened to
  `#fff4e6` cream for legibility against 48 tiles + filter pills +
  detail card layered on top. Culturally meaningful (these are *the*
  Hindi-themed colours in vanilla and across Indian learning
  software), strong visual differentiation from prior themes
  (Animals=cyan/blue, Birds=coral/orange, Hindi=saffron/green).
  Dark mode reads as an "earthy after-dark tricolor": clay-saffron
  at top → warm-wood-brown middle → forest-green bottom (rather than
  inverting the tricolor, which would lose its identity). Action
  pills + active tile borders use deep saffron `#cc5500`. 60 lines
  of net-new CSS in `grid.css`.
- **Image source migrated from vanilla `img.icons8.com` JPGs/PNGs to
  Fluent UI 3D PNGs** (jsDelivr, runtime-cached `CacheFirst` in
  `sw.ts`). 46 unique image paths verified pre-commit via a single
  bulk curl pass — the same workflow used during the Animals + Birds
  ports, now feels routine. **Five characters got the Q→Crown
  substitution treatment** (literal target not in the Fluent pack):
  - Anar/Pomegranate → **Cherries** (red clustered fruit; Fluent
    has no Pomegranate).
  - Aurat/Woman → **Sari** (*culturally on-point upgrade* — Fluent
    has the Indian woman's traditional dress but not the generic
    Woman emoji; same human-emoji 403-class as Alphabets's Princess
    → Crown back-substitute. Worth flagging this is a class-of-bug
    in the Fluent UI pack: every "raw human" emoji we tested
    returned 403 — `Woman`, `Man`, `Person`, `Adult`, `Princess`,
    `Mrs.%20Claus`, `Bride%20with%20veil`, `Dancer` — but
    accessory/clothing emojis like `Sari`, `Kimono`, `High-heeled
    shoe`, `Lipstick` all returned 200. Future image-driven ports
    should plan to substitute on humans, not pivot.)
  - Okhli/Mortar → **Bowl-with-spoon** (kitchen-tool family —
    Cooking Pot also missing).
  - Thathera/Craftsman → **Hammer-and-Wrench** (craftsman's tools
    — Construction Worker is in the same human-emoji 403-class).
  - Visarga → **Lotus** (sacred Indian symbol — vanilla used the
    Om emoji, also not in Fluent).
- **6 Fluent UI path case-fixes caught at verification time** — the
  Fluent UI pack uses lowercase second-words on multi-word emojis
  (`Long drum` not `Long Drum`, `Red apple` not `Red Apple`,
  `Trident emblem` not `Trident Emblem`, `Musical notes` not
  `Musical Notes`, `Potable water` not `Potable Water`,
  `Crossed swords` not `Crossed Swords`). The first round of my
  data file shipped `Long%20Drum` (a copy-paste from
  `flashcards.ts`'s Bongo card, which has the same path bug — see
  tech-debt note below) and several other capital-W / capital-N
  variants; bulk curl returned 403 on all 9 of them, the lowercase
  alternates returned 200. Fixed in-place before commit. **A single
  bulk curl pass over every Fluent path before writing the data
  file is now an explicit step in the standard ship sequence in
  `SESSION-HANDOFF.md`** — saves a re-edit pass when the port
  inevitably has 5–10 case-fix or substitution surprises.
- **Pre-existing bug surfaced (not fixed in the Hindi commit):**
  `flashcards.ts` line 360 uses `Long%20Drum/3D/long_drum_3d.png`
  (capital D) for the Bongo card. That path returns 403 in
  production — the Bongo image has been broken on the live
  flashcards page for as long as flashcards has shipped Fluent UI
  imagery. Hindi's Dhol consonant uses the lowercase
  `Long%20drum/3D/long_drum_3d.png` which works. Filed under
  one-off tech-debt for the next session that touches flashcards.
- **Speech: `hi-IN` voice at rate 0.75 for the Hindi letter+word.**
  The English fact stays in the default voice — vanilla precedent.
  Most modern phones ship a Hindi voice; the few that don't fall
  back to the default voice gracefully.
- **Bilingual UI strings throughout** — title is `🇮🇳 हिंदी · Hindi`,
  filter pills are `🇮🇳 All` / `स्वर Vowels` / `व्यंजन Consonants`,
  meaning pill is `स्वर Vowel` / `व्यंजन Consonant`, "Hear" button
  is `🔊 सुनें · Hear`, completion overlay opens with `शाबाश! You
  learned every Hindi letter! 🎉`. First grid game whose UI strings
  reach SSR'd HTML in a non-Latin script — verified via grep on the
  live deploy.
- **Confetti palette: tricolor — saffron + white + green + deep
  saffron + gold accents** (the gold accent prevents the white from
  reading as Italian-flag-confetti when paired with green/orange).

**Vanilla content quirks preserved (with notes):**

- `अः` (Visarga) is a phonetic breath-mark, not a vowel; vanilla
  treated it as just "letter with example word" by reusing the
  script char as the word itself (`अः` / `Ah` / `Visarga`). We
  preserve that for parity but pick more meaningful substitute
  imagery — Lotus, a sacred Indian symbol, rather than the Om
  emoji vanilla used (also not in Fluent).
- `ङ`/`ञ` (Nasal sounds) similarly reuse the script char as the
  word; both get the musical-notes image — vanilla precedent
  preserved verbatim, only swapped from Iconify's musical-notes to
  Fluent's `Musical%20notes/3D/musical_notes_3d.png`.
- Several consonants share romanised pronunciations (`त`/`ट` both
  `ta`, `थ`/`ठ` both `tha`, `ण`/`न` both `na`). That's the
  dental/retroflex distinction in Hindi — preserved verbatim from
  vanilla. Parents who notice can teach the distinction; kids
  learn the script first.

**Verified at the chunk level:**

- **7-way GridLayout shared-chunk dedup** — alphabets, numbers,
  colors, shapes, animals, birds, **and hindi** page-chunks all
  import the *exact same* hashed `progress` / `achievements` /
  `settings` modules from `_astro/`. Three shared modules served
  once and cached for every grid game.
- **6-way image-driven shared-chunk dedup** — alphabets + flashcards
  + weather + animals + birds + **hindi** page-chunks all import
  the same `fluent.rTHKURu4.js`. Numbers / colors / shapes
  correctly do *not* import it (they use CSS art instead — diet
  preserved).
- **Zero `card-machine` / `cm-*` / `top-card` / `press-btn` /
  `machine-screen` cross-contamination** in the hindi page chunk
  or HTML.
- **48 unique `data-letter` values in the SSR'd HTML**, with
  `data-type` split exactly 12 vowels + 36 consonants.
- **Build:** 12 pages built in 7.45s (was 11 / 7.x s pre-hindi),
  PWA precaches 46 entries / 352.45 KiB (was 44 / 313.92 KiB —
  +2 entries are `hindi-game.html` + the page chunk, +38 KiB is
  mostly the new typed data + theme CSS).
- **Sandbox:** `npm run check` and `npm run build` both ran cleanly
  in the default Cursor sandbox — no `["all"]` permission
  escalation needed (validating the 2026-05-07 tooling-friction
  fix's payoff on its first real port).

**Files added:**

- `src/data/hindi.ts` — 48 typed `HindiCard` entries + 3-key
  `FILTERS`, ~270 lines (incl. a 75-line header doc covering the
  layout decision rationale, all 17 substitutions with reasoning,
  vanilla quirks preserved with notes, and consumer instructions).
- `src/pages/games/hindi-game.astro` — page component, ~370 lines.

**Files changed:**

- `src/styles/grid.css` — +58 lines (`body.grid[data-theme='hindi']`
  light + dark-mode theme blocks).
- `src/layouts/GridLayout.astro` — +4 lines (FOUC pre-dark rule
  for `[data-theme='hindi']`). The `theme?: 'hindi'` enum was
  already in place from earlier session forward-thinking — no
  type-union update needed.
- `src/components/GameNav.astro` — +1 line (Hindi nav link).
- `src/pages/index.astro` — +7 lines (home tile entry, marked
  `ready: true`).

### 2026-05-07 — Tooling friction fixes (sandbox-friendly npm scripts + PRE-FLIGHT docs)

Tooling change, no code-shipped-to-users diff. Triggered by the user
asking *"Why these issues are coming, previous chat sessions these
issues werent there like bash, sandbox, post deployment polling, etc"*
after the Birds port re-tripped the same `npx astro …` /
`["all"]`-fresh-shell / `git push` proxy gotchas the Animals port had
already documented. The agreed fix: lower the cost of the *next* port
by making the sane invocations the default ones, and surface the
remaining gotchas before the agent runs its first command.

- **Changed:**
  - `package.json` — every astro-touching npm script now sets
    `ASTRO_TELEMETRY_DISABLED=1` inline (`dev`, `dev:fresh` already
    handled via the bash wrapper, `build`, `preview`, `check`,
    `astro`). `npm run check` and `npm run build` now run cleanly in
    the **default Cursor sandbox** (no `["all"]` permission
    escalation needed). The previous workaround
    (`ASTRO_TELEMETRY_DISABLED=1 node ./node_modules/astro/astro.js …`)
    still works as an escape hatch and is documented in
    `SESSION-HANDOFF.md`.
  - `SESSION-HANDOFF.md` — added a 5-line **PRE-FLIGHT** callout at
    the very top of the file (above the TL;DR), listing the
    operational gotchas the next agent needs *before* running any
    shell command: (1) chain `cd "<absolute path>" && …` because the
    Shell tool's `working_directory` parameter has dropped silently;
    (2) use `npm run check` / `npm run build`, not raw or `npx`
    invocations; (3) `git push` needs `["all"]` (corp TLS
    interception); (4) `["all"]` mode = fresh shell, no preserved
    CWD/env; (5) full gotcha catalog and rationale lives further
    down. Rewrote the existing **Tool / environment gotchas**
    section to lead with the npm scripts, added two new gotchas
    observed this session (`working_directory` parameter dropping
    silently; `/tmp/` files not persisting across `Shell` calls),
    and refreshed the **Useful commands** section to match.
- **Why:**
  - The **Astro telemetry → `EPERM mkdir ~/Library/Preferences/astro`**
    failure has now bitten 4 sessions in a row (Animals port,
    Birds port, twice during Birds verification). Each session paid
    ~3 tool calls re-discovering it before reaching for `["all"]`.
    Baking the env var into the script collapses that to 0 — the
    script Just Works in the default sandbox.
  - The **`npx astro check` registry-lookup hang** also re-tripped
    during Animals + Birds. Same fix path applies (npm scripts
    resolve the local binary directly).
  - The **`working_directory` parameter dropping** was *new* this
    session (Birds port; tried `working_directory:
    "/Users/.../kids-learning-games-astro"`, shell reported the
    correct CWD, but `npm` then errored looking for `package.json`
    in the parent directory). Documented as not-trustable; chain
    `cd` inline.
  - The **`["all"]` shell starts fresh** behavior was *new* this
    session too (previous sessions' workarounds assumed CWD
    persisted across permission boundaries; it does not). Now
    documented.
- **Verified:**
  - `npm run check` — 0 errors, 0 warnings, 35 files type-checked
    in ~5s, **default sandbox**, no `["all"]`.
  - `npm run build` — 11 pages built in 7.20s, PWA service-worker
    generated, 44 precache entries (313.92 KiB), **default
    sandbox**, no `["all"]`. Both signal that the next port can
    run check/build/dev without permission escalation.
  - CI workflow `.github/workflows/deploy.yml` already sets
    `ASTRO_TELEMETRY_DISABLED: '1'` via job env, so it continues
    to work unchanged. Left untouched — CI doesn't have the same
    sandbox issues as the local Cursor agent.
- **Outcome:** Next port (Hindi) starts with one fewer thing to
  mis-remember. The PRE-FLIGHT block is the new "first thing the
  agent reads after the file purpose statement", before the
  architectural state.

### 2026-05-07 — Birds game ported (10/13) ✅ + sunset palette + emoji-collision fix

Sixth `GridLayout` port and second consumer of the `.gl-tile--emoji`
namespace. The grid shell is now hosting **6 games** with **5 different
tile-face strategies** (text letter for alphabets, text digit for
numbers, fully-coloured swatch for colors, miniature pure-CSS shape
figure + name label for shapes, big emoji + name label for animals
*and* birds). The Fluent UI image detail-card payload — the same
`<img>` inside `.gl-detail-image-wrap` rendered with the same
`installImageFallback(img, emoji)` SVG-fallback helper — is now used
by **3 grid games** (alphabets + animals + birds) and **2 card-
machine games** (flashcards + weather), proving the helper is the
canonical per-game image-fallback pattern.

- **Added:**
  - `src/data/birds.ts` — 15 typed `BirdCard` entries (`name`,
    `group`, `label`, `e`, `img`, `sound`, `fact`). Vanilla parity
    on bird set (every bird and `info` string copied across).
    **Synthesized 5-group filter** (vanilla had none — codified as
    a deliberate deviation in the data file's header comment):
    `songbird` (3 — Sparrow, Dove, Woodpecker), `raptor` (2 —
    Eagle, Owl), `waterbird` (4 — Swan, Duck, Penguin, Flamingo),
    `tropical` (2 — Peacock, Parrot), `ground` (4 — Turkey,
    Ostrich, Chicken, Rooster). Penguin is intentionally
    `waterbird` — biologically a bird (matching Animals's `bird`
    group) but among birds the kid-friendly classification puts
    it with the Antarctic / water-loving birds. Woodpecker is
    intentionally `songbird` — technically a Piciforme not a
    Passerine, but visually + behaviourally it sits in the "small
    bird in a tree" group. Deck order is group-sorted (songbird →
    raptor → waterbird → tropical → ground) — same precedent as
    Animals (mammal → bird → reptile → sea → insect), Colors (warm
    → cool → neutral) and Shapes (round → basic → special) reflows
    of vanilla's flat lists. **Bird *content* unchanged.**
  - `src/pages/games/birds-game.astro` — **~390 lines**. Clean
    copy-adapt of `animals-game.astro` (closest precedent). Deck
    uses the existing `.gl-tile--emoji` flex-column layout; detail
    card holds a Fluent UI 3D PNG (`<img id="detailImage">` with
    `installImageFallback`-installed inline SVG fallback per
    render — same helper alphabets / animals use). First-letter
    keyboard shortcut + arrow keys; group-coloured confetti on
    completion (5 colours: orange / coral / deep-coral / sea-green
    / sun-yellow — sunset palette mirrored across the celebration
    overlay).
  - **Page-local override** — `body.grid[data-theme='birds']
    .gl-detail-letter { font-size: clamp(1.4em, 4vw, 2.2em); text-
    transform: capitalize; letter-spacing: 0.3px; }` matches the
    Animals page-local override so the hero font sits at a
    comfortable mid-size that doesn't dominate the detail card.
- **Reorganised CSS:**
  - `src/styles/grid.css` — extended the existing Animals deck
    selector to be a comma-separated group (`.gl-deck.gl-deck--
    animals, .gl-deck.gl-deck--birds`) with the same `auto-fill,
    minmax(96px, 1fr); gap: 12px` rule, so both image-emoji decks
    share a single CSS rule. Added the `--gl-*` birds theme block
    (~32 lines, orange-to-coral sunset gradient lifted from
    vanilla `birds.html` `#ff9a56 → #ff6a88`; tile face stays
    warm-cream so the per-card emoji + name reads cleanly; action
    / filter pills lean on the deep-coral accent `#c41e58` for
    strong contrast against both warm tile interior and warm
    background) plus the dark-mode override (deep wine / maroon
    background, peach tile colour).
  - `src/layouts/GridLayout.astro` — extra FOUC pre-dark rule for
    `[data-theme='birds']` (deep maroon `#3d0d24` background,
    peach `#ffc7a8` text).
- **Wired:**
  - `src/components/GameNav.astro` — added Birds link.
  - `src/pages/index.astro` — Birds home tile flipped to `ready:
    true`, pointing at the real game; description summarises the
    15-bird emoji-tile + Fluent UI 3D portrait + 5-group filter
    pedagogy.
- **Theme decision codified at port time:** vanilla `birds.html`
  uses an orange/coral sunset palette (`#ff9a56 → #ff6a88`).
  Decision: **ship a distinct theme** rather than reuse the Animals
  palette unchanged. Reasoning: the +60-line CSS cost is well worth
  visual differentiation between sister "creature" games — children
  should be able to tell at a glance which game they're in. The
  resulting palette is also genuinely distinct from all 5 other
  GridLayout themes (alphabets purple/green, numbers sky-blue/
  orange, colors pastel pink/lavender, shapes pink/coral, animals
  sea-green/deep-blue) — birds claims the warm-orange/coral end
  while shapes claims the pink end. No per-game palette overlap.
- **Vanilla bug fixed:** vanilla `birds.html` uses `🦢` (swan emoji)
  as the object key for *both* Swan AND Woodpecker. Since
  `birdsData` is a plain object literal, the second key (Woodpecker)
  silently overwrites the first (Swan), so vanilla effectively
  rendered only 14 of the intended 15 birds while the progress
  counter still said "0 / 15 learned". Astro splits this:
  - 🦢          → Swan (canonical swan emoji)
  - 🐦‍⬛        → Woodpecker (Unicode 15.0 / 2022 black bird emoji,
                  supported on every target browser <3 years old —
                  iOS 16.4+, macOS 13.3+, Android 14+, Windows
                  11 22H2+)

  All 15 birds now render distinctly. Documented in `birds.ts`
  header. Live grep confirms `🐦‍⬛` appears exactly once on the
  production page.
- **Vanilla emoji-name mismatch preserved (with a doc note):**
  vanilla uses `🦤` (Dodo emoji per Unicode 13.0 / 2020) for
  "Ostrich". No Ostrich emoji exists in Unicode. We keep the
  vanilla *content* ("Ostrich" + "Largest bird in the world,
  cannot fly!") and the vanilla *emoji* (`🦤`), accepting the
  visual mismatch — kids identify the bird by the Fluent UI 3D
  image + name + fact, not the emoji glyph. The Fluent UI
  substitution for Ostrich is `Dodo/3D/dodo_3d.png` (the closest
  emoji-compatible asset — Fluent UI doesn't ship an Ostrich).
- **Sound onomatopoeia added (additive deviation):** vanilla had
  no `sound` field on bird entries. Astro adds kid-friendly bird
  calls (Peacock "Aaah!", Eagle "Screech!", Rooster "Cock-a-
  doodle-doo!", Woodpecker "Tap tap!" etc.). Pedagogy: kids love
  bird calls, foundational preschool content. Consistency:
  matches the Animals data shape so the same tile template +
  speech-synthesis pattern drives both games. speechSynthesis
  now says "Peacock. Aaah! National bird of India with beautiful
  tail feathers." which reads cleaner than vanilla's "Peacock.
  National bird..." with no audible call hint.
- **Image source migrated from vanilla Pixabay JPGs (`cdn
  .pixabay.com/photo/.../*.jpg`) to Fluent UI 3D PNGs (`cdn
  .jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/<path>`).**
  Same CDN origin already used by alphabets / flashcards / weather
  / animals, so the SW `CacheFirst` rule for `cdn.jsdelivr.net`
  covers everything and a child who's used another image-driven
  game has many bird assets pre-warmed (specifically Eagle, Owl,
  Penguin, Duck, Chicken, Rooster, Turkey from Animals).
- **Image substitutions** for birds not in the Fluent pack
  (alphabets `Q → Crown` precedent applied):
  - Sparrow    → `Bird/3D/bird_3d.png`     (no Sparrow — generic
                                            small bird, same fall-
                                            back animals uses for
                                            Quail / Nightingale)
  - Ostrich    → `Dodo/3D/dodo_3d.png`     (no Ostrich — closest
                                            flightless / large-
                                            bodied emoji-compatible
                                            asset; aligns with the
                                            vanilla `🦤` emoji
                                            being Dodo per Unicode)
  - Woodpecker → `Bird/3D/bird_3d.png`     (no Woodpecker — generic
                                            small bird)

  Per-card emoji `e` field stays as the original bird's emoji so
  the tile face still reads correctly even when the detail-card
  image is a substitute, and the inline-SVG `onerror` fallback
  gracefully degrades to that emoji on any future CDN issue.
  **All 13 unique image paths verified 200 OK pre-commit** via
  curl smoke test (6 newly-introduced + 7 already in use by
  Animals).
- **Bundle isolation verified:**
  - All 6 grid pages share the grid CSS chunk (~25.6 KB, was
    23.6 KB pre-birds). Delta is ~60 lines: `--birds` theme block
    + birds dark-mode override + FOUC pre-dark rule + the
    `.gl-deck--birds` selector folded into the existing animals
    rule. Card-machine pages still link only `dinosaurs-game
    .D1g7kimY.css` (17.8 KB, **unchanged from pre-birds** — the
    Birds port added zero card-machine selectors, and bidirectional
    grep confirms zero leakage).
  - 0 `data-theme="birds"` selectors in card-machine CSS chunk.
  - 0 `cm-*` / `.top-card` / `.press-btn` / `.machine-screen` /
    `.cm-cell` in grid CSS chunk.
  - 0 `data-theme="birds"` markup in alphabets / numbers / colors
    / shapes / animals HTML pages.
  - Birds HTML grep confirms `<body class="grid"
    data-theme="birds">`, all 15 `.gl-tile.gl-tile--emoji` tiles
    SSR-rendered with `data-name` + `data-group` + child emoji
    span + name label, data-group counts: songbird 3 / raptor 2
    / waterbird 4 / tropical 2 / ground 4 = 15, **6 filter pills**
    (`all` / `songbird` / `raptor` / `waterbird` / `tropical` /
    `ground` — second GridLayout game with a 6-pill filter row,
    after Animals), `0 / 15` initial progress, single `<img
    id="detailImage">` placeholder + `.gl-deck--birds` deck
    variant present.
  - **6-way GridLayout shared-chunk dedup** at the chunk level:
    `alphabets-game.…js`, `numbers-game.…js`, `colors-game.…js`,
    `shapes-game.…js`, `animals-game.…js`, and **`birds-game
    .…js`** all import the *exact same* `progress.Czz_LiQd.js`,
    `achievements.CySDez3r.js`, and `settings.zS6XEbod.js` —
    three shared modules served once and cached for every grid
    game.
  - **5-way image-driven shared-chunk dedup** at the chunk level:
    `alphabets-game.…js`, `flashcards-game.…js`, `weather-game
    .…js`, `animals-game.…js`, and **`birds-game.…js`** all import
    the *exact same* `fluent.rTHKURu4.js` (0.09 KB / gzip 0.10
    KB). `numbers / colors / shapes` correctly do *not* import it
    (they use CSS art instead).
- **Build verification (live):**
  - `astro check` → 0 errors / 0 warnings / 0 hints across 35
    files.
  - All 13 unique Fluent UI image paths verified 200 OK pre-commit
    via curl smoke test.
  - Live `/games/birds-game` → 200, `data-theme="birds"` reaches
    `<body>`, all 15 tiles SSR-rendered, 6 filter pills present,
    Sparrow + Woodpecker render with distinct emojis (🐦 vs 🐦‍⬛
    — vanilla bug fixed), `theme-color="#c41e58"` in head, all 9
    other games still return 200 with their original markup intact.
- **Pre-bundles client JS (gzipped):** birds **2.53 KB** (sits
  between shapes 2.11 KB and colors 2.25 KB — leaner than alphabets
  2.96 KB / animals 3.30 KB despite using the same image-detail
  pattern, reflecting the smaller deck of 15 vs 26 / 37). PWA
  precache: 42 → 44 entries (~289 → ~314 KiB).

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
