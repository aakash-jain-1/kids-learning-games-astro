# Project Context — Kids Learning Games (Astro)

> **What this file is**: a fast-loading orientation map for any human or AI
> agent starting work in this repo. It is a *summary*, not the source of
> truth. When this file and the canonical docs disagree, the canonical docs
> win. Keep it short and current — see the update rule in
> `.cursor/rules/maintain-context.mdc`.
>
> **Last verified against the codebase**: 2026-06-06.

---

## 1. One-paragraph summary

An **Astro + TypeScript + `@vite-pwa/astro` (Workbox)** static PWA of
educational mini-games for young children. It began as a proof-of-concept
migration of the vanilla HTML/CSS/JS `kids-learning-games` repo and is now a
feature-driven project in its own right. **18 games** ship across **three
shared layouts**, deployed to GitHub Pages at
`https://aakash-jain-1.github.io/kids-learning-games-astro/`. Zero-JS-by-default
static output; only interactive islands ship JavaScript.

## 2. Canonical docs (read these for depth)

| File | What it holds |
|---|---|
| `README.md` | Architecture overview, file-by-file structure, vanilla-vs-Astro comparison table. |
| `PROGRESS.md` | **The living source of truth.** Migration principles ("the north star"), per-game layout decisions, and an append-only changelog of every ship. Large (~460 KB) — grep it by date heading rather than reading whole. |
| `SESSION-HANDOFF.md` | Compact bootstrap dump for a new session: TL;DR state, ship sequence, next-session candidates, tooling gotchas. Large (~280 KB). |
| `docs/T9-RECORDING-GUIDE.md` | Walkthrough for recording MP3 narration (T9 feature, not yet wired). |
| `docs/T9-PHRASE-SCRIPT.md` | The literal phrases to record for T9. |

> Note: `README.md` describes "sixteen games" — that text is **stale**; the
> code ships 18 (Pattern Sequences + Letter Friends were added after that
> prose was last revised). `PROGRESS.md` / `SESSION-HANDOFF.md` /
> `src/data/stats-registry.ts` are authoritative on the game count.

## 3. Tech stack & tooling

- **Astro 5** (`format: 'file'` build, `base: /kids-learning-games-astro`).
- **Strict TypeScript** (`astro/tsconfigs/strict`); path alias `@/* → src/*`.
- **PWA** via `@vite-pwa/astro` with `injectManifest` — SW source is
  `src/service-worker.ts` (Workbox: precaching + `StaleWhileRevalidate` for
  the GitHub API + `setCatchHandler` offline fallback).
- **Playwright** smoke tests (chromium-only, run against `astro preview`).
- **CI**: `.github/workflows/deploy.yml` runs `test → build → deploy` to GH
  Pages on push to `main` (Playwright is a **hard deploy gate**).
  `test.yml` runs the suite independently for badge/PR feedback.
- Package scripts: `npm run dev` / `dev:fresh` / `stop` / `build` / `preview`
  / `check` / `test` / `test:ui` / `test:install`. (`dev:fresh`/`stop` are
  bash scripts in `scripts/` — note this is a Windows dev box.)
- **Windows dev notes**: scripts use `cross-env` so the `ASTRO_TELEMETRY_DISABLED=1`
  prefix works under `cmd.exe`. Node lives at `C:\Program Files\nodejs` (add to
  PATH or restart the app if a terminal can't find `node`). The proxy (Zscaler)
  stalls `playwright install chromium`, so run the suite against the
  locally-installed Chrome via `PW_CHANNEL=chrome` + `NO_PROXY=127.0.0.1,localhost`.

## 4. The 19 games & three layouts

- **`GridLayout.astro`** — foundational-set games (scan a fixed chart, tap to
  hear): Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi (7).
- **`CardMachineLayout.astro`** — reference-catalogue decks (browse fact
  cards): Dinosaurs, Flashcards, Solar System, Weather (4).
- **`StoryLayout.astro`** — story-flow games *and* single-scene "stage" games
  (the preschool games reuse this shell via a `theme` prop): Daily Routines,
  Woodcutter (2 story) + Counting Friends, More Friends, Number Friends,
  Pattern Sequences, Number Bond Pop (5 preschool-math) + Letter Friends
  (1 preschool-literacy).

Each game = one `src/pages/games/<slug>.astro` + a typed `src/data/<game>.ts`
data file + a layout-specific themed CSS block. A parent dashboard lives at
`src/pages/stats.astro` (`/stats`); a friendly 404 at `src/pages/404.astro`.

## 5. Key conventions ("the north star" — see PROGRESS.md for full text)

1. **Data and view are separate.** Content lives in `src/data/<game>.ts` as
   typed, `readonly` arrays. No big inline JS literals in `.astro` pages.
2. **Reuse `src/lib/` primitives**, never re-implement: `settings.ts`
   (single `kids_settings_v1` key), `audio.ts` (singleton `AudioContext`),
   `speech.ts` (Web Speech wrapper), `achievements.ts` (toasts), `quiz.ts`
   (`mountQuiz` controller + `<gameId>_quiz_v1` state), `progress.ts`
   (`kids_progress_v1:<gameId>` learned-set), `retention.ts` (sitewide
   `kids_play_history_v1` activity), `preschool-themes.ts` (shared 6-theme
   catalog for the preschool games), `preschool-stages.ts` (shared
   3-stage model for the preschool-math triad — `STAGE_META` rounds/maxN/
   frameSize, `themesForStage`, `shouldAdvance`/`nextStage`/`clampStage`).
3. **Reuse a shared layout** — never build a bespoke per-game shell.
4. **Theme via CSS custom properties** in `body.<layout>[data-theme='<game>']`
   blocks. Shared chrome primitives live in `global.css`.
5. **Refactor trigger = second consumer** (the "two-consumers" rule). Shared
   libs were extracted exactly when a second game needed them.
6. **Base-path aware links** via `import.meta.env.BASE_URL`, never hardcoded.
7. **Event wiring in TypeScript** (`addEventListener`), never `onclick=`.
8. **Errorless, age-safe feedback** for ages 3–4: no red/buzzer/shame coding.
   Wrong taps get a kinesthetic shake + guided count, never punishment.
9. **The Astro repo is the source of truth on *patterns*** (the vanilla repo
   is treated as a spec of intent, not a template to copy).

## 6. LocalStorage keys (state shapes)

- `kids_settings_v1` — global settings (dark, sound, autoSpeak, fontSize).
- `kids_progress_v1:<gameId>` — learned-item set (sorted string array).
- `<gameId>_quiz_v1` — `{ attempts, bestScore, lastPlayed }` quiz metrics.
- `<game>_stats_v1` — bespoke preschool schema `{ sessions, rounds, correctFirstTry, lastPlayed }`.
  The staged preschool-math games (Counting / More / Number Friends + Number
  Bond Pop) also carry `{ stage, bestStage }` (1..3) for their auto-advancing
  stages (added 2026-06-03; Number Bond Pop adopted them at ship 2026-06-06).
- `kids_play_history_v1` — sitewide `Record<YYYY-MM-DD, gameId[]>` for the
  `/stats` activity chart (30-day rolling window).

`src/data/stats-registry.ts` is the single source of truth tying every game to
its storage keys and the `/stats` page (5 families: preschool-math,
preschool-literacy, story, card-set, card-pure). Adding a game = one entry.

## 7. Current state & what's next

- **Migration complete** (all 13 vanilla games ported, since 2026-05-08).
- **Feature-driven phase active**: 6 preschool games added since (cardinality
  triad + Pattern Sequences + Letter Friends + Number Bond Pop). Total
  **19 games**, all live.
- **Latest ship (2026-06-06)**: **Number Bond Pop** — fifth preschool-math
  game (number-bond decomposition, "how many more to make 5?"), completing the
  early-math arc (compare → count → recognise → decompose). Concrete
  part-whole: a bond frame shows what you `have` + the empty `gap`; tap the
  bunch that fills it and the objects pop into the frame counting on. Reuses
  `preschool-stages.ts` (make-5/five-frame → make-10/ten-frame) +
  `preschool-themes.ts`; bespoke `number_bond_stats_v1` with `stage`/`bestStage`.
- **Prior ship (2026-06-03)**: the cardinality triad (Counting / More /
  Number Friends) gained **3 auto-advancing stages** via the shared
  `preschool-stages.ts` lib. Stages scale the number ceiling (5 → 10 → 10,
  five-frame → ten-frame) and breadth (8 → 10 → 12 rounds, 4 → 6 themes);
  the child advances on ≥75% first-try accuracy, never drops. Added two
  themes (meadow, jungle) and a `stage`/`bestStage` row on `/stats`.
- **Open queued work**: **T9** — replace Web Speech with pre-recorded MP3
  narration (parked on the user's recording session; integration is ~30–45 min
  of agent work once MP3s land in `src/assets/narration/shared/`).
- **Deferred design decision**: `StageLayout` carve (deferred 5x — the
  `body.story` scope already does the isolation work). Option C unified
  `DeckLayout` decided NO-GO. The vanilla repo is a no-touch zone.
