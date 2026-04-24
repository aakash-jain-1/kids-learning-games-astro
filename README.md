# Kids Learning Games — Astro POC

A proof-of-concept migration of the [kids-learning-games](../kids-learning-games) vanilla HTML/CSS/JS PWA to **Astro + TypeScript + @vite-pwa/astro (Workbox)**. **Five games ported end-to-end**, all running through one shared shell: `CardMachineLayout`. Dinosaurs, Flashcards, Solar System, Weather, and Alphabets each show a different theme and a different card-face rendering strategy (emoji, pure-CSS art, image-with-fallback, big digit, big letter) — same machine, five coats of paint.

> **Source of truth:** this Astro repo is the authoritative design for
> every game we port. When the vanilla and Astro versions diverge, the
> Astro version wins — including *structural* divergence. A vanilla
> two-pane tile grid (e.g. the old alphabet game) gets reshaped into a
> card-machine deck, not carried forward as a second layout. See
> **[PROGRESS.md → Migration principles](./PROGRESS.md#migration-principles-the-north-star)**
> for the full rule set.

## What this POC demonstrates

- **Zero-JS-by-default static output**: `astro build` produces plain HTML files. Same deploy target as today (GitHub Pages), same runtime cost. Only the interactive islands (card machine, modals) ship JavaScript.
- **One shared layout, five games, five themes**:
  - `CardMachineLayout.astro` replaces the ~500-line shell the vanilla project duplicates across each of its 13 game HTML files. Dinosaurs, Flashcards, Solar System, Weather, and Alphabets all render through that single layout — only `data-theme` and the slot content differ.
  - Every remaining non-story game in the vanilla repo (Numbers, Colors, Shapes, Animals, Birds, Hindi) will land on this same shell; no second layout is planned.
- **One themeable shared stylesheet**:
  - `card-machine.css` exposes ~25 CSS custom properties; each theme is a ~35-line `[data-theme='<game>']` block plus ~10 lines of type-pill colours.
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
│   │   └── CardMachineLayout.astro  # shared shell for every ported game
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

- The remaining 6 non-story games (Numbers, Colors, Shapes, Animals, Birds, Hindi) — all scheduled to land on `CardMachineLayout`; each port is ~35–50 lines of CSS theme tokens + ~200–300 lines of page + typed data.
- The 2 story games (Woodcutter, Daily Routines) — we'll first try modelling each story page as a card on the card machine; a separate `StoryLayout.astro` is only carved out if that doesn't fit.
- Full nav bar (nav lists only the 5 ported games + home; other links would 404 until those pages are ported).
- Quiz mode and full Stats modal — the top-bar buttons exist as `alert(…)` stubs. Settings storage is wired. The `kids_progress_v1:<gameId>` LocalStorage key shape is still a proposal; the shared wrapper (`src/lib/progress.ts`) will land with the first real Stats/Quiz modal.
- Full test suite.

## Comparison at a glance

| Metric | Vanilla | Astro POC |
|---|---|---|
| `dinosaurs-game.html` lines | 544 | ~120 (`dinosaurs-game.astro`) |
| `flashcards-game.html` lines | 1,193 | ~295 (`flashcards-game.astro`) + typed data file |
| `solar-system-game.html` lines | 739 | ~280 (`solar-system-game.astro`) + typed data file + planets.css |
| `weather-game.html` lines | 551 | ~280 (`weather-game.astro`) + typed data file |
| `alphabet-game.html` lines | 1,527 | ~290 (`alphabets-game.astro`) + typed data file |
| Reused layout lines | ~0 (copy-pasted per game) | ~140 `CardMachineLayout.astro`, used by all 5 ported games (and every remaining non-story game) |
| Shared card-machine CSS | Duplicated 4× inline (~450 lines each) | 1 themeable file (~1100 lines, covers every ported game including Alphabets) |
| Shared JS util lines | Duplicated per game inline | 1 copy under `src/lib/` |
| Settings storage | `flashcards_settings` vs `darkMode` vs `solar_system_settings` vs `weather_settings` vs `alphabet_learned` | Single `kids_settings_v1` + per-game `kids_progress_v1:<gameId>` (shape proposed, wrapper lands with Stats/Quiz) |
| Service worker | Hand-rolled, manual cache name bumps | Workbox, auto-revisioned |
| Build-info fetch | N× per session, no cache | 1× per hour, SWR cached |
| Type safety | None | Strict TypeScript |
| Client JS bundle, gzipped | Inline, unminified | flashcards **11.28 KB**, weather **3.34 KB**, dinosaurs **3.02 KB**, alphabets **2.84 KB**, solar-system **2.66 KB** |
