# Kids Learning Games — Astro POC

A proof-of-concept migration of the [kids-learning-games](../kids-learning-games) vanilla HTML/CSS/JS PWA to **Astro + TypeScript + @vite-pwa/astro (Workbox)**. **Seven games ported end-to-end**, across **two shared layouts** that together cover every non-story game in the vanilla repo:

- `CardMachineLayout.astro` — **reference-catalogue games** (browse a deck of fact cards). Hosts Dinosaurs, Flashcards, Solar System, Weather.
- `GridLayout.astro` — **foundational-set games** (scan a fixed chart, tap to hear). Hosts Alphabets, Numbers, and Colors today; Shapes, Animals, Birds, and Hindi all land here next.

Both layouts share the same head/meta, PWA wiring, nav, settings modal, build-info footer, and TS/lib utilities — only the core interaction surface differs.

> **Source of truth:** this Astro repo is authoritative on *patterns*
> (unified settings, singleton audio, speech wrapper, Workbox SW, typed
> data files, theming via CSS custom properties, `addEventListener`
> over `onclick=`). It is **not** authoritative on pedagogy —
> alphabet-style games still belong in a grid because that matches how
> children learn closed sets, exactly as the vanilla layout hinted.
> See **[PROGRESS.md → Migration principles](./PROGRESS.md#migration-principles-the-north-star)**
> for the full rule set, including the pedagogical split between the
> two layouts and the roadmap note on Option C (unified `Deck` layout
> with a grid/card view toggle — deferred until all 11 non-story games
> have shipped).

## What this POC demonstrates

- **Zero-JS-by-default static output**: `astro build` produces plain HTML files. Same deploy target as today (GitHub Pages), same runtime cost. Only the interactive islands (card machine, grid, modals) ship JavaScript.
- **Two shared layouts, seven games, seven themes**:
  - `CardMachineLayout.astro` hosts Dinosaurs, Flashcards, Solar System, Weather — a reference-catalogue deck with filter + press-to-hear.
  - `GridLayout.astro` hosts Alphabets (image detail), Numbers (CSS count-objects detail), and Colors (CSS shape-gallery detail) — a foundational-set tile chart with filter + inline detail card + per-tile learned-state tracking via `kids_progress_v1:<gameId>`. Three deck variants in `grid.css`: `--capped` for medium decks, `--numbers` 5-column fixed for small decks, `--colors` auto-fill for swatch tiles.
  - Together they replace the ~500-line shell the vanilla project copy-pastes across each of its 13 game HTML files.
- **Two themeable shared stylesheets**:
  - `card-machine.css` exposes ~25 `--cm-*` CSS custom properties; each theme is a ~35-line `body.card-machine[data-theme='<game>']` block plus ~10 lines of type-pill colours.
  - `grid.css` exposes ~25 `--gl-*` CSS custom properties; each theme is a ~35-line `body.grid[data-theme='<game>']` block.
  - Shared chrome primitives (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, progress bar, nav, modal) live in `global.css`, so both layouts share them without cross-importing. Each layout provides its own `.cat-btn.active` override from its own theme tokens.
- **Typed data**: each game's content lives in `src/data/<game>.ts` with named interfaces and `readonly` arrays — TypeScript catches typos in card type/season/diet enums at build time, not at runtime.
- **Unified settings** (fixes audit H1): a single `kids_settings_v1` LocalStorage key, applied on every page on load.
- **Per-game learning state**: `kids_progress_v1:<gameId>` LocalStorage key with a JSON array of learned-item ids. All three grid games (Alphabets, Numbers, Colors) consume the shared `src/lib/progress.ts` helper (`loadLearned` / `saveLearned` / `clearLearned`), extracted on the second consumer per the "two-consumers triggers a refactor" rule.
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
│   │   ├── colors.ts             # typed 12-colour deck (warm/cool/neutral filter)
│   │   ├── dinosaurs.ts          # typed dinosaur cards + diet filters
│   │   ├── flashcards.ts         # typed flashcard decks (14 × ~20 cards)
│   │   ├── fluent.ts             # shared Fluent UI emoji CDN base
│   │   ├── numbers.ts            # typed 1–10 number deck (low/high filter)
│   │   ├── solar-system.ts       # typed planet cards + type filters
│   │   └── weather.ts            # typed weather cards + season filters
│   ├── layouts/
│   │   ├── CardMachineLayout.astro  # reference-catalogue games
│   │   └── GridLayout.astro         # foundational-set games
│   ├── lib/
│   │   ├── achievements.ts       # toast + localStorage helper
│   │   ├── audio.ts              # singleton AudioContext
│   │   ├── progress.ts           # kids_progress_v1:<gameId> store (alphabets, numbers, colors)
│   │   ├── settings.ts           # unified settings store
│   │   └── speech.ts             # Web Speech wrapper
│   ├── pages/
│   │   ├── games/
│   │   │   ├── alphabets-game.astro     # GridLayout
│   │   │   ├── colors-game.astro        # GridLayout
│   │   │   ├── dinosaurs-game.astro     # CardMachineLayout
│   │   │   ├── flashcards-game.astro    # CardMachineLayout
│   │   │   ├── numbers-game.astro       # GridLayout
│   │   │   ├── solar-system-game.astro  # CardMachineLayout
│   │   │   └── weather-game.astro       # CardMachineLayout
│   │   └── index.astro
│   └── styles/
│       ├── card-machine.css      # themeable card-machine visual system
│       ├── grid.css              # themeable grid visual system
│       ├── planets.css           # solar-system-only CSS planet art
│       └── global.css            # base reset + shared chrome primitives
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

- The remaining 4 foundational-set games (Shapes, Animals, Birds, Hindi) — all scheduled to land on `GridLayout`; each port is ~35–50 lines of `--gl-*` theme tokens + ~200–300 lines of page + typed data. Per-game layout decisions and gotchas are tracked in [`PROGRESS.md → Per-game layout decisions`](./PROGRESS.md#per-game-layout-decisions-for-the-6-pending-ports).
- The 2 story games (Woodcutter, Daily Routines) — we'll first try modelling each story page as a card on the card machine; a separate `StoryLayout.astro` is only carved out if that doesn't fit.
- Full nav bar (nav lists only the 7 ported games + home; other links would 404 until those pages are ported).
- Option C — a unified `DeckLayout` with a per-user grid/card view toggle that would consolidate `CardMachineLayout` + `GridLayout` into one. Deferred until all 11 non-story games have shipped in their respective current layouts; see the "Not yet codified" block in PROGRESS.md.
- Quiz mode and full Stats modal — the top-bar buttons exist as `alert(…)` stubs in all 7 ported games. Settings storage is wired. `kids_progress_v1:<gameId>` is a real shipping pattern: alphabets, numbers, and colors all consume `src/lib/progress.ts`. The Stats modal can read from it directly when wired.
- Full test suite.

## Comparison at a glance

| Metric | Vanilla | Astro POC |
|---|---|---|
| `dinosaurs-game.html` lines | 544 | ~120 (`dinosaurs-game.astro`) |
| `flashcards-game.html` lines | 1,193 | ~295 (`flashcards-game.astro`) + typed data file |
| `solar-system-game.html` lines | 739 | ~280 (`solar-system-game.astro`) + typed data file + planets.css |
| `weather-game.html` lines | 551 | ~280 (`weather-game.astro`) + typed data file |
| `alphabet-game.html` lines | 1,527 | ~285 (`alphabets-game.astro`) + typed data file |
| `numbers-game.html` lines | 1,389 | ~300 (`numbers-game.astro`) + typed data file |
| `colors-game.html` lines | 1,400 | ~370 (`colors-game.astro`) + typed data file |
| Reused layout lines | ~0 (copy-pasted per game) | ~140 `CardMachineLayout.astro` (4 games) + ~150 `GridLayout.astro` (alphabets + numbers + colors + 4 upcoming) — two shells cover all 11 non-story games |
| Shared CSS | Duplicated 4× inline (~450 lines each) | `card-machine.css` (~1050 lines, 4 games) + `grid.css` (~870 lines, 7 games) + shared primitives in `global.css` |
| Shared JS util lines | Duplicated per game inline | 1 copy under `src/lib/` |
| Settings storage | `flashcards_settings` vs `darkMode` vs `solar_system_settings` vs `weather_settings` vs `alphabet_learned` vs `numbers_learned` vs `colors_learned` | Single `kids_settings_v1` + per-game `kids_progress_v1:<gameId>` (alphabets, numbers, colors; shared `src/lib/progress.ts` helper) |
| Service worker | Hand-rolled, manual cache name bumps | Workbox, auto-revisioned |
| Build-info fetch | N× per session, no cache | 1× per hour, SWR cached |
| Type safety | None | Strict TypeScript |
| Client JS bundle, gzipped | Inline, unminified | flashcards **11.28 KB**, weather **3.34 KB**, dinosaurs **3.02 KB**, alphabets **2.96 KB**, solar-system **2.66 KB**, colors **2.25 KB**, numbers **2.08 KB** |
