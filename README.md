# Kids Learning Games — Astro POC

A proof-of-concept migration of the [kids-learning-games](../kids-learning-games) vanilla HTML/CSS/JS PWA to **Astro + TypeScript + @vite-pwa/astro (Workbox)**. **Five games ported end-to-end** across **two shared layouts**: every card-machine game (Dinosaurs, Flashcards, Solar System, Weather) runs through `CardMachineLayout`, and the first classic two-pane game (Alphabets) runs through the new `ClassicLayout`. Together they cover four distinct themes and four different card-face rendering strategies (emoji, pure-CSS art, image-with-fallback, tile-grid).

> **Source of truth:** this Astro repo is the authoritative design for
> every game we port. When the vanilla and Astro versions diverge, the
> Astro version wins — see **[PROGRESS.md → Migration principles](./PROGRESS.md#migration-principles-the-north-star)**
> for the full rule set.

## What this POC demonstrates

- **Zero-JS-by-default static output**: `astro build` produces plain HTML files. Same deploy target as today (GitHub Pages), same runtime cost. Only the interactive islands (card machine, modals) ship JavaScript.
- **DRY layouts** (two shells now cover 11 of 13 games):
  - `CardMachineLayout.astro` replaces the ~500-line shell the vanilla project duplicates across each of its 4 card-machine HTML files. All four of Dinosaurs, Flashcards, Solar System, and Weather render through that single layout — only `data-theme` and the slot content differ.
  - `ClassicLayout.astro` replaces the ~600-line shell duplicated across each of the 7 classic two-pane HTML files (alphabets, numbers, colors, shapes, animals, birds, hindi). Alphabets is the first game on it; the other 6 are unblocked.
- **Themeable shared stylesheets**:
  - `card-machine.css` exposes ~25 CSS custom properties; each card-machine theme is a ~30-line `[data-theme='<game>']` block.
  - `classic.css` exposes ~30 CSS custom properties for classic games (backdrop, pane surfaces, tile colours, control pills, display area, done overlay).
- **Typed data**: each game's content lives in `src/data/<game>.ts` with named interfaces and `readonly` arrays — TypeScript catches typos in card type/season/diet enums at build time, not at runtime.
- **Unified settings** (fixes audit H1): a single `kids_settings_v1` LocalStorage key, applied on every page on load.
- **Shared singleton utilities** (fixes audit H2, M2): one `AudioContext`, one speech wrapper, one achievement toast system.
- **Workbox-based service worker** (fixes audit H4, S7): precaching with automatic revisioning, `StaleWhileRevalidate` for the GitHub API (fixes audit H3), offline fallback.
- **Strict TypeScript**: catches typos in card data and refactor errors at build time.

## Project structure

```
.
├── astro.config.mjs              # Astro + PWA config
├── package.json
├── tsconfig.json
├── public/
│   ├── assets/                   # icons, copied from parent project
│   └── offline.html              # offline fallback
├── src/
│   ├── components/
│   │   ├── BuildInfo.astro       # cached GitHub build info (fixes H3)
│   │   ├── GameNav.astro         # unified top nav (fixes M5)
│   │   └── SettingsModal.astro   # unified settings UI (fixes H1)
│   ├── data/
│   │   ├── alphabets.ts          # typed 26-letter A–Z deck
│   │   ├── dinosaurs.ts          # typed dinosaur cards + diet filters
│   │   ├── flashcards.ts         # typed flashcard decks (14 × ~20 cards)
│   │   ├── fluent.ts             # shared Fluent UI emoji CDN base
│   │   ├── solar-system.ts       # typed planet cards + type filters
│   │   └── weather.ts            # typed weather cards + season filters
│   ├── layouts/
│   │   ├── CardMachineLayout.astro  # shared shell for card-machine games
│   │   └── ClassicLayout.astro      # shared shell for classic two-pane games
│   ├── lib/
│   │   ├── achievements.ts       # toast + localStorage helper
│   │   ├── audio.ts              # singleton AudioContext
│   │   ├── settings.ts           # unified settings store
│   │   └── speech.ts             # Web Speech wrapper
│   ├── pages/
│   │   ├── games/
│   │   │   ├── alphabets-game.astro
│   │   │   ├── dinosaurs-game.astro
│   │   │   ├── flashcards-game.astro
│   │   │   ├── solar-system-game.astro
│   │   │   └── weather-game.astro
│   │   └── index.astro
│   └── styles/
│       ├── card-machine.css      # themeable card-machine visual system
│       ├── classic.css           # themeable classic two-pane visual system
│       ├── planets.css           # solar-system-only CSS planet art
│       └── global.css
```

## Running

```bash
npm install
npm run dev         # dev server on http://localhost:4321/kids-learning-games
npm run dev:fresh   # kills any stale dev/preview servers from this project, then starts a fresh one
npm run stop        # kills dev/preview servers without starting anything
npm run build       # production build in dist/
npm run preview     # preview the production build locally
```

`dev:fresh` / `stop` are helpers in `scripts/` that safely tear down orphaned
`astro dev`, `astro preview`, `npm exec`, and `esbuild` child processes that
would otherwise hold ports `4321`–`4323`. They are scoped by the absolute
path of this project, so they will never touch an unrelated Astro dev server
running from a different repo.

## What's NOT in scope for this POC

- The remaining 6 classic two-pane games (Numbers, Colors, Shapes, Animals, Birds, Hindi) — `ClassicLayout` is ready; each port is ~60 lines of CSS theme tokens + ~200 lines of page + typed data.
- Story mode layout (Woodcutter, Daily Routines) — 2 games waiting on `StoryLayout.astro`.
- Full nav bar (nav lists only the 4 ported card-machine games, Alphabets, and home; other links would 404 until those pages are ported).
- Quiz mode and full Stats modal — the top-bar buttons exist as `alert(…)` stubs. Settings storage is wired. The `kids_progress_v1:<gameId>` LocalStorage key format is now locked in (alphabets is its first consumer); the shared wrapper helper will land with the real Stats/Quiz modals.
- Full test suite.

## Comparison at a glance

| Metric | Vanilla | Astro POC |
|---|---|---|
| `dinosaurs-game.html` lines | 544 | ~120 (`dinosaurs-game.astro`) |
| `flashcards-game.html` lines | 1,193 | ~295 (`flashcards-game.astro`) + typed data file |
| `solar-system-game.html` lines | 739 | ~280 (`solar-system-game.astro`) + typed data file + planets.css |
| `weather-game.html` lines | 551 | ~280 (`weather-game.astro`) + typed data file |
| `alphabet-game.html` lines | 1,527 | ~320 (`alphabets-game.astro`) + typed data file |
| Reused layout lines | ~0 (copy-pasted per game) | ~135 `CardMachineLayout.astro` (4 games) + ~110 `ClassicLayout.astro` (Alphabets + 6 more unblocked) |
| Shared card-machine CSS | Duplicated 4× inline (~450 lines each) | 1 themeable file (~1000 lines, covers all card-machine games) |
| Shared classic CSS | Duplicated 7× inline (~600 lines each) | 1 themeable file (~400 lines, covers all classic games) |
| Shared JS util lines | Duplicated per game inline | 1 copy under `src/lib/` |
| Settings storage | `flashcards_settings` vs `darkMode` vs `solar_system_settings` vs `weather_settings` vs `alphabet_learned` | Single `kids_settings_v1` + per-game `kids_progress_v1:<gameId>` |
| Service worker | Hand-rolled, manual cache name bumps | Workbox, auto-revisioned |
| Build-info fetch | N× per session, no cache | 1× per hour, SWR cached |
| Type safety | None | Strict TypeScript |
| Client JS bundle, gzipped | Inline, unminified | flashcards **11.28 KB**, weather **3.34 KB**, dinosaurs **3.02 KB**, alphabets **2.94 KB**, solar-system **2.66 KB** |
