# Kids Learning Games — Astro POC

A proof-of-concept migration of the [kids-learning-games](../kids-learning-games) vanilla HTML/CSS/JS PWA to **Astro + TypeScript + @vite-pwa/astro (Workbox)**. **Twelve games ported end-to-end** (every game in the vanilla repo except the last single-scene story game, Woodcutter), across **three shared layouts**:

- `CardMachineLayout.astro` — **reference-catalogue games** (browse a deck of fact cards). Hosts Dinosaurs, Flashcards, Solar System, Weather.
- `GridLayout.astro` — **foundational-set games** (scan a fixed chart, tap to hear). Hosts all 7 grid games today: Alphabets, Numbers, Colors, Shapes, Animals, Birds, and Hindi.
- `StoryLayout.astro` — **story-flow games** (follow a linear narrative one chapter at a time, then take a quick quiz). Hosts Daily Routines today; Woodcutter is the in-flight second consumer (single-scene shape, layout adjustments TBD at port time).

All three layouts share the same head/meta, PWA wiring, nav, settings modal, build-info footer, and TS/lib utilities — only the core interaction surface differs.

> **Source of truth:** this Astro repo is authoritative on *patterns*
> (unified settings, singleton audio, speech wrapper, Workbox SW, typed
> data files, theming via CSS custom properties, `addEventListener`
> over `onclick=`). It is **not** authoritative on pedagogy —
> alphabet-style games still belong in a grid because that matches how
> children learn closed sets, exactly as the vanilla layout hinted.
> See **[PROGRESS.md → Migration principles](./PROGRESS.md#migration-principles-the-north-star)**
> for the full rule set, including the pedagogical split between the
> three layouts and the roadmap note on Option C (unified `Deck` layout
> with a grid/card/story view toggle — deferred until all 13 vanilla
> games have shipped).

## What this POC demonstrates

- **Zero-JS-by-default static output**: `astro build` produces plain HTML files. Same deploy target as today (GitHub Pages), same runtime cost. Only the interactive islands (card machine, grid, story shell, modals) ship JavaScript.
- **Three shared layouts, twelve games, twelve themes**:
  - `CardMachineLayout.astro` hosts Dinosaurs, Flashcards, Solar System, Weather — a reference-catalogue deck with filter + press-to-hear.
  - `GridLayout.astro` hosts Alphabets (image detail), Numbers (CSS count-objects detail), Colors (CSS shape-gallery detail), Shapes (CSS shape-figure-hero detail), Animals (Fluent UI 3D image detail with emoji-tile face), Birds (same emoji-tile + Fluent UI 3D image pattern as Animals, distinct sunset palette), and Hindi (Devanagari-script tile face + Fluent UI 3D image detail + bilingual filter pills + tricolor saffron/cream/green theme + `hi-IN` speech) — a foundational-set tile chart with filter + inline detail card + per-tile learned-state tracking via `kids_progress_v1:<gameId>`. Five deck variants in `grid.css`: `--capped` for medium-to-large decks (handles alphabets's 26 *and* hindi's 48 with a Hindi-only +12 % Devanagari font-size override), `--numbers` 5-column fixed for small decks, `--colors` auto-fill for swatch tiles, `--shapes` auto-fill for shape-tile + name label, and a single shared `--animals, --birds` rule for the two emoji-tile + name label decks.
  - `StoryLayout.astro` hosts Daily Routines — a paginated narrative shell with header → progress bar → scene panel with per-scene CSS art → Prev / 🔊 Listen / Next controls → inline multiple-choice quiz at the end. The body background gradient morphs between sunrise / midday / evening / night palettes per scene via a `--st-bg` CSS custom property the page rewrites on every Next. Per-scene CSS art (`.sun`, `.bed`, `.toothbrush`, etc.) lives in `routines.css`, all selectors scoped under `.routines-art` + all keyframes prefixed `routines-*` so short class names stay collision-free with future story games. Scene-visited progress flows through the shared `progress.ts` helper (`kids_progress_v1:routines`); quiz state (`{ attempts, bestScore, lastPlayed }`) ships page-local in `routines_quiz_v1` until Woodcutter triggers extraction to `src/lib/quiz.ts`.
  - Together they replace the ~500-line shell the vanilla project copy-pastes across each of its 13 game HTML files.
- **Three themeable shared stylesheets**:
  - `card-machine.css` exposes ~25 `--cm-*` CSS custom properties; each theme is a ~35-line `body.card-machine[data-theme='<game>']` block plus ~10 lines of type-pill colours.
  - `grid.css` exposes ~25 `--gl-*` CSS custom properties; each theme is a ~35-line `body.grid[data-theme='<game>']` block.
  - `story.css` exposes ~20 `--st-*` CSS custom properties; each theme is a ~30-line `body.story[data-theme='<game>']` block. Game-specific scene art lives in a separate scoped CSS file (e.g. `routines.css`) that the page imports alongside `story.css`.
  - Shared chrome primitives (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, progress bar, nav, modal) live in `global.css`, so all three layouts share them without cross-importing. Each layout provides its own `.cat-btn.active` override from its own theme tokens.
- **Typed data**: each game's content lives in `src/data/<game>.ts` with named interfaces and `readonly` arrays — TypeScript catches typos in card type/season/diet/group/scene enums at build time, not at runtime.
- **Unified settings** (fixes audit H1): a single `kids_settings_v1` LocalStorage key, applied on every page on load.
- **Per-game learning state**: `kids_progress_v1:<gameId>` LocalStorage key with a JSON array of learned-item ids. **All seven grid games (Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi) plus Daily Routines** (storing the 10 scene IDs visited) consume the shared `src/lib/progress.ts` helper (`loadLearned` / `saveLearned` / `clearLearned`), extracted on the second consumer per the "two-consumers triggers a refactor" rule. **Per-game quiz state**: Daily Routines additionally uses a `routines_quiz_v1` LocalStorage key (page-local) for `{ attempts, bestScore, lastPlayed }` quiz metadata; this graduates to a shared `src/lib/quiz.ts` once Woodcutter (second consumer) ports.
- **Shared singleton utilities** (fixes audit H2, M2): one `AudioContext`, one speech wrapper, one achievement toast system.
- **Shared Fluent UI image base** (`src/data/fluent.ts`): single `FLUENT_IMG_BASE` constant, imported directly by every consumer (alphabets, flashcards, weather, animals, birds, hindi). Build emits a single 0.09 KB shared chunk used by all six image-driven games. Daily Routines deliberately opts out — its scene art is pure CSS, no Fluent UI assets.
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
│   │   ├── animals.ts            # typed 37-animal deck (mammal/bird/reptile/sea/insect filter)
│   │   ├── birds.ts              # typed 15-bird deck (songbird/raptor/waterbird/tropical/ground filter)
│   │   ├── colors.ts             # typed 12-colour deck (warm/cool/neutral filter)
│   │   ├── dinosaurs.ts          # typed dinosaur cards + diet filters
│   │   ├── flashcards.ts         # typed flashcard decks (14 × ~20 cards)
│   │   ├── fluent.ts             # shared Fluent UI emoji CDN base (consumed directly by every image-driven data file + page)
│   │   ├── hindi.ts              # typed 48-letter Hindi varnamala deck (12 vowels + 36 consonants, vowel/consonant filter)
│   │   ├── numbers.ts            # typed 1–10 number deck (low/high filter)
│   │   ├── routines.ts           # typed 10-scene Daily Routines story + 10 body-gradient backgrounds + 8-question quiz
│   │   ├── shapes.ts             # typed 14-shape deck (round/basic/special filter)
│   │   ├── solar-system.ts       # typed planet cards + type filters
│   │   └── weather.ts            # typed weather cards + season filters
│   ├── layouts/
│   │   ├── CardMachineLayout.astro  # reference-catalogue games
│   │   ├── GridLayout.astro         # foundational-set games
│   │   └── StoryLayout.astro        # story-flow games
│   ├── lib/
│   │   ├── achievements.ts       # toast + localStorage helper
│   │   ├── audio.ts              # singleton AudioContext
│   │   ├── progress.ts           # kids_progress_v1:<gameId> store (alphabets, numbers, colors, shapes, animals, birds, hindi, routines)
│   │   ├── settings.ts           # unified settings store
│   │   └── speech.ts             # Web Speech wrapper
│   ├── pages/
│   │   ├── games/
│   │   │   ├── alphabets-game.astro       # GridLayout
│   │   │   ├── animals-game.astro         # GridLayout
│   │   │   ├── birds-game.astro           # GridLayout
│   │   │   ├── colors-game.astro          # GridLayout
│   │   │   ├── daily-routines-game.astro  # StoryLayout (first story-flow consumer)
│   │   │   ├── dinosaurs-game.astro       # CardMachineLayout
│   │   │   ├── flashcards-game.astro      # CardMachineLayout
│   │   │   ├── hindi-game.astro           # GridLayout
│   │   │   ├── numbers-game.astro         # GridLayout
│   │   │   ├── shapes-game.astro          # GridLayout
│   │   │   ├── solar-system-game.astro    # CardMachineLayout
│   │   │   └── weather-game.astro         # CardMachineLayout
│   │   └── index.astro
│   └── styles/
│       ├── card-machine.css      # themeable card-machine visual system
│       ├── grid.css              # themeable grid visual system
│       ├── story.css             # themeable story-flow visual system (--st-* tokens)
│       ├── routines.css          # Daily Routines per-scene CSS art (scoped under .routines-art)
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

- *(All 7 foundational-set games shipped as of 2026-05-08 — Hindi closed the chapter. Daily Routines shipped same day on the new `StoryLayout`.)* The 1 remaining vanilla game is `woodcutter-story`, which the 2026-05-08 audit confirmed is *not* paginated like Daily Routines but a single CSS-animated hero scene + 4 paragraphs of continuous prose + moral panel + 6-question quiz. Layout decision will be made at port time: reuse `StoryLayout.astro` with a `pagination={false}` prop *or* carve out a small `StoryLayout--single` variant. The same port will also extract `src/lib/quiz.ts` (the second-consumer refactor trigger — both Routines and Woodcutter end with a quiz of the same shape). Per-game layout decisions and gotchas are tracked in [`PROGRESS.md → Per-game layout decisions`](./PROGRESS.md#per-game-layout-decisions-for-the-5-pending-ports).
- Full nav bar (nav lists only the 12 ported games + home; the Woodcutter link would 404 until that page is ported).
- Option C — a unified `DeckLayout` with a per-user grid/card/story view toggle that would consolidate `CardMachineLayout` + `GridLayout` + `StoryLayout` into one. Three pieces of evidence already lean against consolidation (different detail-payload shapes, different filter bars, different storage shapes — `Set<string>` for grid progress vs `{ attempts, bestScore, lastPlayed }` for story quiz state). Deferred until all 13 vanilla games have shipped + `src/lib/quiz.ts` exists; see the "Not yet codified" block in PROGRESS.md.
- Quiz mode is **partly wired** — Daily Routines ships a real, fully-functional inline quiz (8 multiple-choice questions, score tracking, retry, restart, golden-confetti flourish on perfect score). Every other ported game still shows an `alert(…)` stub for the top-bar Quiz button. Once Woodcutter lands and `src/lib/quiz.ts` exists, the shared `<QuizPanel>` component can mount in place of the stub for any game that wires up question data.
- Full Stats modal — `alert(…)` stub in all 12 ported games. Once `src/lib/quiz.ts` exists, the modal can aggregate `progress.ts` learning state across all 7 grid games + Routines's scenes-visited progress, *and* `quiz.ts` quiz scores across both story games.
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
| `shapes-game.html` lines | 1,557 | ~370 (`shapes-game.astro`) + typed data file |
| `animals-game.html` lines | 1,461 | ~395 (`animals-game.astro`) + typed data file |
| `birds.html` lines | 1,415 | ~390 (`birds-game.astro`) + typed data file |
| `hindi-alphabets.html` lines | 1,493 | ~370 (`hindi-game.astro`) + typed data file |
| `daily-routines.html` lines | 1,287 | ~370 (`daily-routines-game.astro`) + ~270 typed data file + ~250 `story.css` + ~400 `routines.css` (per-scene art, scoped) |
| Reused layout lines | ~0 (copy-pasted per game) | ~140 `CardMachineLayout.astro` (4 games) + ~155 `GridLayout.astro` (7 games) + ~200 `StoryLayout.astro` (1 game so far, Woodcutter pending) — three shells cover all 12 ported games |
| Shared CSS | Duplicated 5× inline (~450 lines each) | `card-machine.css` (~1050 lines, 4 games) + `grid.css` (~1340 lines, 7 games) + `story.css` (~250 lines, 1 game so far) + shared primitives in `global.css` |
| Shared JS util lines | Duplicated per game inline | 1 copy under `src/lib/` |
| Settings storage | `flashcards_settings` vs `darkMode` vs `solar_system_settings` vs `weather_settings` vs `alphabet_learned` vs `numbers_learned` vs `colors_learned` vs `shapes_learned` vs `animals_learned` vs `birds_learned` vs `hindi_learned` vs `routines_progress` (+ `birds_achievements` + `birds_stats` + `hindi_achievements` + `hindi_stats` + `routines_quiz`) | Single `kids_settings_v1` + per-game `kids_progress_v1:<gameId>` (alphabets, numbers, colors, shapes, animals, birds, hindi, **routines**; shared `src/lib/progress.ts` helper) + `routines_quiz_v1` for story-game quiz state (page-local until Woodcutter triggers extraction to `src/lib/quiz.ts`) |
| Service worker | Hand-rolled, manual cache name bumps | Workbox, auto-revisioned |
| Build-info fetch | N× per session, no cache | 1× per hour, SWR cached |
| Type safety | None | Strict TypeScript |
| Client JS bundle, gzipped | Inline, unminified | flashcards **11.28 KB**, **routines ~5.0 KB** (largest by JS — 10 scenes' inline `artHtml` + 8-question quiz), hindi **~3.5 KB**, weather **3.34 KB**, **animals 3.30 KB**, dinosaurs **3.02 KB**, alphabets **2.96 KB**, solar-system **2.66 KB**, **birds 2.53 KB**, colors **2.25 KB**, shapes **2.11 KB**, numbers **2.08 KB** |
