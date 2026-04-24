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
   - `CardMachineLayout.astro` — card-machine games (Dinosaurs, Flashcards,
     Solar System, Weather).
   - `ClassicLayout.astro` *(TBD)* — two-pane classic games (Alphabets,
     Numbers, Colors, Shapes, Animals, Birds, Hindi, Vehicles, Transport).
   - `StoryLayout.astro` *(TBD)* — story games (Woodcutter, Daily Routines).
   Never build a bespoke HTML shell per game.
4. **Theme via CSS custom properties.** Palette changes go through
   `body.card-machine[data-theme='<game>']` blocks in `card-machine.css`
   (~25 tokens). Never hardcode game-specific colours in layout CSS.
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

**Not yet codified (decisions deferred to the Stats / Quiz pass):**

- Where per-game **learning state** (learned set, quiz history,
  achievements) lives in LocalStorage. Current proposal: single
  `kids_progress_v1` key, keyed by `gameId` — but we'll finalise it when
  we wire the first real quiz modal.
- Canonical structure for the Stats + Quiz modals (likely two more shared
  components under `src/components/`).

If a vanilla file contains something these rules don't cover (e.g. an
interaction that's genuinely unique to that one game), call it out in the
commit / PR description so we can decide whether to (a) extend the rules
or (b) document a one-off exception.

---

## Current status (snapshot)

- **Stack landed:** Astro `5.18.1` + strict TypeScript + `@vite-pwa/astro` `1.2.0` with `injectManifest` + Workbox 7.
- **Games ported (4 of 13):** 🎉 **card-machine cluster complete**.
  - Dinosaurs (card-machine, default green theme, 15 cards, diet filter)
  - Flashcards (card-machine, cyan/orange theme, 14 decks, 4 card-face variants)
  - Solar System (card-machine, purple/gold theme, 11 cards, pure-CSS planet art, type filter)
  - Weather (card-machine, deep-navy/ice-blue theme, 20 cards, season filter, full Fluent UI image deck)
- **Vanilla games still to port (9):**
  `alphabets-game`, `numbers-game`, `colors-game`, `shapes-game`, `animals-game`, `birds-game`, `hindi-game`, `vehicles-game`, `transport-game`, `woodcutter-story`, `daily-routines-story`.
  (The classic two-pane games unblock after `ClassicLayout.astro` lands; the two story games share a third layout.)
- **Shared infra in place:**
  - `CardMachineLayout.astro` shell — used by all 4 ported games. **Proven reusable four times; the shell is done.**
  - `card-machine.css` with ~25 theming CSS custom properties, so per-game theming is ~60 lines of CSS (palette + type-pill colours).
  - `src/lib/`: singleton AudioContext, speech wrapper, unified settings, achievement toasts + confetti.
  - `src/data/fluent.ts` — shared `FLUENT_IMG_BASE` constant (consumers: flashcards, weather; more to come).
  - Workbox SW (`src/sw.ts`) with StaleWhileRevalidate for the GitHub API and CacheFirst for Fluent emoji images.
- **Dev ergonomics:**
  - `npm run dev:fresh` — kills any stale dev/preview servers scoped to this project, then starts a clean one on `:4321`.
  - `npm run stop` — standalone kill script.
- **Deploy: LIVE** at https://aakash-jain-1.github.io/kids-learning-games-astro/ via GitHub Actions (`.github/workflows/deploy.yml`). Auto-deploys on every push to `main`.
  - `/` (home) — 200
  - `/games/flashcards-game` — 200
  - `/games/dinosaurs-game` — 200
  - `/games/solar-system-game` — 200 ✅ (verified 2026-04-24, both extensionless + `.html`)
  - `/games/weather-game` — 200 ✅ (verified 2026-04-24, both extensionless + `.html`; `data-theme="weather"` reaches `<body>` in production, first card SSR renders "Sunny" with `card-pill summer`)
  - `/manifest.webmanifest`, `/sw.js`, `/.nojekyll` — all 200
- **Production build sizes (client JS, gzipped):** flashcards **11.28 KB**, weather **3.34 KB**, dinosaurs **3.02 KB**, solar-system **2.66 KB**. Total PWA precache: 28 entries, ~146 KB.

---

## What still needs doing

Rough order of payoff:

1. **Build `ClassicLayout.astro`** — for the 9 two-pane games (`alphabets`, `numbers`, `colors`, `shapes`, `animals`, `birds`, `hindi`, `vehicles`, `transport`). That layout is the second big duplication cluster in the vanilla codebase. Unblocks porting all 9 games.
2. **Build `StoryLayout.astro`** — for Woodcutter and Daily Routines. Different enough from the other two that it needs its own shell.
3. **Wire the real Stats + Quiz modals.** Currently both are `alert(…)` stubs in the 4 ported games. While we're in there, finalise the `kids_progress_v1`-keyed-by-gameId LocalStorage pattern (see the "Not yet codified" list in Migration principles above).
4. **Add tests.** At minimum, one Playwright smoke test per layout (Card / Classic / Story) covering filter → navigate → done-overlay + confetti.
5. **Cut-over plan (only after all 13 games land).** Migrate `kids-learning-games` (the live repo) to serve the Astro build, with a SW handoff strategy so existing PWA installs upgrade cleanly.

### One-off tech-debt items

- `FLUENT_IMG_BASE` is now consumed by 2 data files — it was moved to
  `src/data/fluent.ts` during the Weather port and re-exported from
  `flashcards.ts` for backward compatibility. If a third consumer lands
  (likely once Classic games start using Fluent images too), audit the
  flashcards re-export and consider removing it.

---

## Changelog

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
