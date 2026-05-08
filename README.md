# Kids Learning Games — Astro POC

A proof-of-concept migration of the [kids-learning-games](../kids-learning-games) vanilla HTML/CSS/JS PWA to **Astro + TypeScript + @vite-pwa/astro (Workbox)**. **All thirteen games ported end-to-end** — the migration is now complete, across **three shared layouts**:

- `CardMachineLayout.astro` — **reference-catalogue games** (browse a deck of fact cards). Hosts Dinosaurs, Flashcards, Solar System, Weather.
- `GridLayout.astro` — **foundational-set games** (scan a fixed chart, tap to hear). Hosts all 7 grid games: Alphabets, Numbers, Colors, Shapes, Animals, Birds, and Hindi.
- `StoryLayout.astro` — **story-flow games** (follow a linear narrative — paginated for Routines, single hero scene for Woodcutter — then take a quick comprehension quiz). Hosts Daily Routines (paginated, 10 scenes) and the Honest Woodcutter (single scene + 4 prose paragraphs + moral panel).

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
> with a grid/card/story view toggle). Now that all 13 games have
> shipped *and* `src/lib/quiz.ts` exists, Option C is unblocked — the
> evidence to date still leans towards keeping layouts separate (see
> PROGRESS.md for the full evidence trail).

## What this POC demonstrates

- **Zero-JS-by-default static output**: `astro build` produces plain HTML files. Same deploy target as today (GitHub Pages), same runtime cost. Only the interactive islands (card machine, grid, story shell, modals) ship JavaScript.
- **Three shared layouts, thirteen games, thirteen themes**:
  - `CardMachineLayout.astro` hosts Dinosaurs, Flashcards, Solar System, Weather — a reference-catalogue deck with filter + press-to-hear.
  - `GridLayout.astro` hosts Alphabets (image detail), Numbers (CSS count-objects detail), Colors (CSS shape-gallery detail), Shapes (CSS shape-figure-hero detail), Animals (Fluent UI 3D image detail with emoji-tile face), Birds (same emoji-tile + Fluent UI 3D image pattern as Animals, distinct sunset palette), and Hindi (Devanagari-script tile face + Fluent UI 3D image detail + bilingual filter pills + tricolor saffron/cream/green theme + `hi-IN` speech) — a foundational-set tile chart with filter + inline detail card + per-tile learned-state tracking via `kids_progress_v1:<gameId>`. Five deck variants in `grid.css`: `--capped` for medium-to-large decks (handles alphabets's 26 *and* hindi's 48 with a Hindi-only +12 % Devanagari font-size override), `--numbers` 5-column fixed for small decks, `--colors` auto-fill for swatch tiles, `--shapes` auto-fill for shape-tile + name label, and a single shared `--animals, --birds` rule for the two emoji-tile + name label decks.
  - `StoryLayout.astro` hosts Daily Routines (paginated 10-scene narrative + 8-question quiz) and the Honest Woodcutter (single CSS-animated hero scene + 4-paragraph prose + moral panel + 6-question quiz). Both feed through the same shell — header → optional progress bar → scene panel with per-game CSS art → optional Prev / 🔊 Listen / Next controls → comprehension quiz. The body background gradient morphs between sunrise / midday / evening / night palettes per scene for Routines via a `--st-bg` CSS custom property; Woodcutter sets it once at load to the deep navy → purple twilight gradient. Per-game scene art (`.sun`, `.bed`, `.fairy`, `.golden-axe`, etc.) lives in a per-game CSS file (`routines.css` / `woodcutter.css`), every selector scoped under `.routines-art` / `.woodcutter-art` and every keyframe prefixed `routines-*` / `woodcutter-*` so the two flat-named art systems can never collide. Scene-visited progress (Routines only) flows through `progress.ts` (`kids_progress_v1:routines`); quiz state (`{ attempts, bestScore, lastPlayed }`) flows through `src/lib/quiz.ts` (`<gameId>_quiz_v1`) — extracted as a shared library at the Woodcutter port time, per the "second consumer triggers a refactor" rule.
  - Together they replace the ~500-line shell the vanilla project copy-pastes across each of its 13 game HTML files.
- **Three themeable shared stylesheets**:
  - `card-machine.css` exposes ~25 `--cm-*` CSS custom properties; each theme is a ~35-line `body.card-machine[data-theme='<game>']` block plus ~10 lines of type-pill colours.
  - `grid.css` exposes ~25 `--gl-*` CSS custom properties; each theme is a ~35-line `body.grid[data-theme='<game>']` block.
  - `story.css` exposes ~20 `--st-*` CSS custom properties; each theme is a ~30-line `body.story[data-theme='<game>']` block. Game-specific scene art lives in a separate scoped CSS file (`routines.css` for the paginated game, `woodcutter.css` for the single-scene game) that the page imports alongside `story.css`. Both art files keep their selectors under a `.<game>-art` marker class and prefix all keyframes `<game>-*`, so the two stylesheets are bidirectionally collision-free.
  - Shared chrome primitives (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, progress bar, nav, modal) live in `global.css`, so all three layouts share them without cross-importing. Each layout provides its own `.cat-btn.active` override from its own theme tokens.
- **Typed data**: each game's content lives in `src/data/<game>.ts` with named interfaces and `readonly` arrays — TypeScript catches typos in card type/season/diet/group/scene enums at build time, not at runtime. The `QuizQuestion` shape is shared by both story games and lives in `src/lib/quiz.ts`.
- **Unified settings** (fixes audit H1): a single `kids_settings_v1` LocalStorage key, applied on every page on load.
- **Per-game learning state**: `kids_progress_v1:<gameId>` LocalStorage key with a JSON array of learned-item ids. **All seven grid games (Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi) plus Daily Routines** (storing the 10 scene IDs visited) consume the shared `src/lib/progress.ts` helper (`loadLearned` / `saveLearned` / `clearLearned`), extracted on the second consumer per the "two-consumers triggers a refactor" rule. Woodcutter doesn't track per-item progress — its single-scene story has no items to mark learned.
- **Per-game quiz state**: `<gameId>_quiz_v1` LocalStorage key with a `{ attempts, bestScore, lastPlayed }` JSON object. Both story games (Daily Routines and Woodcutter) consume the shared `src/lib/quiz.ts` controller (`mountQuiz` factory + `loadQuizState` / `saveQuizState` / `clearQuizState` / `escapeQuizHtml`), extracted at the Woodcutter port time per the same "second consumer triggers a refactor" principle. Build emits a single 1.80 KB shared chunk imported by both pages.
- **Shared singleton utilities** (fixes audit H2, M2): one `AudioContext`, one speech wrapper, one achievement toast system.
- **Shared Fluent UI image base** (`src/data/fluent.ts`): single `FLUENT_IMG_BASE` constant, imported directly by every consumer (alphabets, flashcards, weather, animals, birds, hindi). Build emits a single 0.09 KB shared chunk used by all six image-driven games. Daily Routines and Woodcutter deliberately opt out — both have pure CSS art, no Fluent UI assets.
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
│   │   ├── weather.ts            # typed weather cards + season filters
│   │   └── woodcutter.ts         # typed Honest Woodcutter single-scene art + 4-para STORY + MORAL + 6-question QUIZ
│   ├── layouts/
│   │   ├── CardMachineLayout.astro  # reference-catalogue games
│   │   ├── GridLayout.astro         # foundational-set games
│   │   └── StoryLayout.astro        # story-flow games
│   ├── lib/
│   │   ├── achievements.ts       # toast + localStorage helper
│   │   ├── audio.ts              # singleton AudioContext
│   │   ├── progress.ts           # kids_progress_v1:<gameId> store (alphabets, numbers, colors, shapes, animals, birds, hindi, routines)
│   │   ├── quiz.ts               # <gameId>_quiz_v1 store + mountQuiz controller (Routines + Woodcutter)
│   │   ├── settings.ts           # unified settings store
│   │   └── speech.ts             # Web Speech wrapper
│   ├── pages/
│   │   ├── games/
│   │   │   ├── alphabets-game.astro       # GridLayout
│   │   │   ├── animals-game.astro         # GridLayout
│   │   │   ├── birds-game.astro           # GridLayout
│   │   │   ├── colors-game.astro          # GridLayout
│   │   │   ├── daily-routines-game.astro  # StoryLayout (paginated)
│   │   │   ├── dinosaurs-game.astro       # CardMachineLayout
│   │   │   ├── flashcards-game.astro      # CardMachineLayout
│   │   │   ├── hindi-game.astro           # GridLayout
│   │   │   ├── numbers-game.astro         # GridLayout
│   │   │   ├── shapes-game.astro          # GridLayout
│   │   │   ├── solar-system-game.astro    # CardMachineLayout
│   │   │   ├── weather-game.astro         # CardMachineLayout
│   │   │   └── woodcutter-story.astro     # StoryLayout (single-scene)
│   │   └── index.astro
│   └── styles/
│       ├── card-machine.css      # themeable card-machine visual system
│       ├── grid.css              # themeable grid visual system
│       ├── story.css             # themeable story-flow visual system (--st-* tokens)
│       ├── routines.css          # Daily Routines per-scene CSS art (scoped under .routines-art)
│       ├── woodcutter.css        # Honest Woodcutter hero-scene CSS art + prose/moral cards (scoped under .woodcutter-art)
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

- *(All 13 vanilla games shipped as of 2026-05-08 — Woodcutter closed the migration. Routines + Woodcutter both ship a real, fully-functional inline quiz on the shared `src/lib/quiz.ts` controller. The migration is now complete.)*
- Option C — a unified `DeckLayout` with a per-user grid/card/story view toggle that would consolidate `CardMachineLayout` + `GridLayout` + `StoryLayout` into one. Now unblocked (all 13 games shipped + `src/lib/quiz.ts` extracted), but the evidence to date still leans **against** consolidation: different detail-payload shapes, different filter bars, different state shapes (`Set<string>` for grid progress vs `{ attempts, bestScore, lastPlayed }` for story quiz state vs no per-item state at all for Woodcutter). See the "Option C" entry in PROGRESS.md for the full evidence trail.
- Wire the real Stats + Quiz modals across **all** ported games — currently the foundational-set games (Alphabets/Numbers/Colors/Shapes/Animals/Birds/Hindi) and reference-catalogue games (Dinosaurs/Flashcards/Solar System/Weather) still show an `alert(…)` stub for the top-bar Quiz / Stats buttons. The story games (Routines + Woodcutter) ship the real flow. The remaining 11 games can now mount `mountQuiz` against a per-game question deck, since `src/lib/quiz.ts` is in place — author the question data, supply the right config, and remove the stub.
- Full test suite — Playwright smoke tests per layout (one for grid, one for card-machine, one for story) parameterised over themes are queued in PROGRESS.md.
- Cut-over plan — the live `kids-learning-games` repo still serves the vanilla static HTML pages. Migrating it to serve the Astro `dist/` build (with a SW handoff strategy so existing PWA installs gracefully transition to the new SW) is the final piece, intentionally postponed until after this POC's content stabilised.

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
| `daily-routines.html` lines | 1,287 | ~355 (`daily-routines-game.astro`, post-quiz extraction) + ~270 typed data file + ~250 `story.css` + ~400 `routines.css` (per-scene art, scoped) |
| `woodcutter-story.html` lines | 805 | ~145 (`woodcutter-story.astro`) + ~165 typed data file + ~370 `woodcutter.css` (per-scene art, scoped) |
| Reused layout lines | ~0 (copy-pasted per game) | ~140 `CardMachineLayout.astro` (4 games) + ~155 `GridLayout.astro` (7 games) + ~145 `StoryLayout.astro` (2 games) — three shells cover all 13 ported games |
| Shared CSS | Duplicated 5× inline (~450 lines each) | `card-machine.css` (~1050 lines, 4 games) + `grid.css` (~1340 lines, 7 games) + `story.css` (~265 lines, 2 games) + shared primitives in `global.css` |
| Shared JS util lines | Duplicated per game inline | 1 copy under `src/lib/` (audio, achievements, progress, quiz, settings, speech) |
| Settings storage | `flashcards_settings` vs `darkMode` vs `solar_system_settings` vs `weather_settings` vs `alphabet_learned` vs `numbers_learned` vs `colors_learned` vs `shapes_learned` vs `animals_learned` vs `birds_learned` vs `hindi_learned` vs `routines_progress` vs `woodcutter_progress` (+ `birds_achievements` + `birds_stats` + `hindi_achievements` + `hindi_stats` + `routines_quiz`) | Single `kids_settings_v1` + per-game `kids_progress_v1:<gameId>` (alphabets, numbers, colors, shapes, animals, birds, hindi, **routines**; shared `src/lib/progress.ts` helper) + `<gameId>_quiz_v1` for story-game quiz state (**routines + woodcutter**, shared `src/lib/quiz.ts` controller) |
| Service worker | Hand-rolled, manual cache name bumps | Workbox, auto-revisioned |
| Build-info fetch | N× per session, no cache | 1× per hour, SWR cached |
| Type safety | None | Strict TypeScript |
| Client JS bundle, gzipped | Inline, unminified | flashcards **11.30 KB**, **routines ~4.10 KB** (10 scenes' inline `artHtml` + 8-question quiz), hindi **~5.25 KB**, weather **3.36 KB**, **animals 3.31 KB**, dinosaurs **3.04 KB**, alphabets **2.98 KB**, solar-system **2.68 KB**, **birds 2.55 KB**, colors **2.27 KB**, shapes **2.13 KB**, numbers **2.09 KB**, **woodcutter 1.46 KB** (smallest — pure pre-rendered scene art + tiny quiz wiring); shared `quiz.ts` chunk **0.98 KB** dedups across both story pages |
