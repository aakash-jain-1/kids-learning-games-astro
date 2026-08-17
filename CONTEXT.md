# Project Context — Kids Learning Games (Astro)

> **What this file is**: a fast-loading orientation map for any human or AI
> agent starting work in this repo. It is a *summary*, not the source of
> truth. When this file and the canonical docs disagree, the canonical docs
> win. Keep it short and current — see the update rule in
> `.cursor/rules/maintain-context.mdc`.
>
> **Last verified against the codebase**: 2026-08-17 (Animal Sounds shipped —
> game count now 24; real animal recordings + `src/lib/clip.ts` added, now 17 of
> 18 animals clip-backed; tooling/platform notes refreshed for the macOS dev
> box).

---

## 1. One-paragraph summary

An **Astro + TypeScript + `@vite-pwa/astro` (Workbox)** static PWA of
educational mini-games for young children. It began as a proof-of-concept
migration of the vanilla HTML/CSS/JS `kids-learning-games` repo and is now a
feature-driven project in its own right. **24 games** ship across **three
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
> code ships 23 (the preschool families grew well past that prose). `PROGRESS.md`
> / `SESSION-HANDOFF.md` / `src/data/stats-registry.ts` are authoritative on the
> game count.

## 3. Tech stack & tooling

- **Astro 5** (`format: 'file'` build, `base: /kids-learning-games-astro`).
- **Strict TypeScript** (`astro/tsconfigs/strict`); path alias `@/* → src/*`.
- **PWA** via `@vite-pwa/astro` with `injectManifest` — SW source is
  `src/service-worker.ts` (Workbox: precaching + `StaleWhileRevalidate` for
  the GitHub API + `setCatchHandler` offline fallback). `globPatterns` includes
  `mp3` so the vendored animal calls work offline.
- **Vendored audio**: `public/sounds/animals/` holds 17 real animal recordings
  (~500KB) used as the Animal Sounds prompts, with licences and the mastering
  standard in `public/sounds/animals/CREDITS.md`. Re-mastering clips needs
  **ffmpeg** (`brew install ffmpeg`); nothing else in the build does.
- **Playwright** smoke tests (chromium-only, run against `astro preview`).
  Note `preview` serves `dist/`, so the suite tests the **last build** — rebuild
  before trusting a run. Bundled Chromium also has no MP3 codec, so playback
  can't be asserted there; only that clips are requested and served.
- **CI**: `.github/workflows/deploy.yml` runs `test → build → deploy` to GH
  Pages on push to `main` (Playwright is a **hard deploy gate**).
  `test.yml` runs the suite independently for badge/PR feedback.
- Package scripts: `npm run dev` / `dev:fresh` / `stop` / `build` / `preview`
  / `check` / `test` / `test:ui` / `test:install`. (`dev:fresh`/`stop` are
  bash scripts in `scripts/`.)
- The dev server serves under the Astro `base`, so the app lives at
  `http://localhost:4321/kids-learning-games-astro` — a bare `localhost:4321`
  404s.
- **Dev box is macOS** (verified 2026-08-17; Node 24, npm 11). The bash helpers
  in `scripts/` run natively. `npm run test:install` (bundled Chromium) works
  here, so the plain `npm test` path is the default.
- **`PW_CHANNEL` escape hatch**: `playwright.config.ts` honours a `PW_CHANNEL`
  env var to run against a locally-installed browser instead of bundled
  Chromium (`PW_CHANNEL=chrome npm test`). It exists because bundled-Chromium
  *extraction* stalled hard on the project's former Windows box; keep it as a
  fallback if the bundled download ever misbehaves. CI never sets it — Linux
  runners use bundled Chromium.

## 4. The 24 games & three layouts

- **`GridLayout.astro`** — foundational-set games (scan a fixed chart, tap to
  hear): Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi (7).
- **`CardMachineLayout.astro`** — reference-catalogue decks (browse fact
  cards): Dinosaurs, Flashcards, Solar System, Weather (4).
- **`StoryLayout.astro`** — story-flow games *and* single-scene "stage" games
  (the preschool games reuse this shell via a `theme` prop): Daily Routines,
  Woodcutter (2 story) + Counting Friends, More Friends, Number Friends,
  Pattern Sequences, Number Bond Pop (5 preschool-math) + Letter Friends,
  Sound Friends (2 preschool-literacy) + Sorting Friends, Days Parade,
  Week Friends, Animal Sounds (4 preschool-cognitive).

Each game = one `src/pages/games/<slug>.astro` + a typed `src/data/<game>.ts`
data file + a layout-specific themed CSS block. A parent dashboard lives at
`src/pages/stats.astro` (`/stats`); a friendly 404 at `src/pages/404.astro`.

## 5. Key conventions ("the north star" — see PROGRESS.md for full text)

1. **Data and view are separate.** Content lives in `src/data/<game>.ts` as
   typed, `readonly` arrays. No big inline JS literals in `.astro` pages.
2. **Reuse `src/lib/` primitives**, never re-implement: `settings.ts`
   (single `kids_settings_v1` key), `audio.ts` (singleton `AudioContext` for
   synthesised tones), `speech.ts` (Web Speech wrapper — also owns
   `onFirstGesture`, the shared "speech is blocked until the first tap" hook
   used by all 11 round-based games), `clip.ts` (playback for vendored
   recordings, with an `onError` fallback path so a missing clip degrades to
   speech), `achievements.ts` (toasts), `quiz.ts`
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
8. **Guided wrong-answer feedback** for ages 3–4. A wrong tap gets a 250ms
   kinesthetic shake, a **red error tint**, a short error tone (`playWrong()`
   from `@/lib/audio`), and a spoken correction that always ends by revealing
   the right answer. Rounds are never failed and no score is shown to the
   child — they are corrected, then move on. **Revised 2026-08-17** at the
   user's request; this supersedes the original errorless rule ("no
   red/buzzer/shame coding, shake only"). **Animal Sounds is the first and so
   far only adopter**; the other 23 games still use shake-only feedback, so the
   app is mid-migration on this — see §7.
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
its storage keys and the `/stats` page (6 families: preschool-math,
preschool-literacy, preschool-cognitive, story, card-set, card-pure). Adding a
game = one entry. Animal Sounds (2026-08-17) is filed under
**preschool-cognitive** rather than opening a `preschool-science` family for a
single listening game — the dashboard stays at 6 families.

## 7. Current state & what's next

- **Migration complete** (all 13 vanilla games ported, since 2026-05-08).
- **Feature-driven phase active**: 11 preschool games added since (cardinality
  triad + Pattern Sequences + Letter Friends + Number Bond Pop + Sound
  Friends + Sorting Friends + Week Friends + Days Parade + Animal Sounds).
  Total **24 games**, all live.
- **Latest ship (2026-08-17, same day)**: **real audio** — three silent bugs
  fixed and the Animal Sounds prompts replaced with genuine recordings.
  (1) `speech.ts` no longer wedges Chrome's speech queue by calling `speak()` in
  the same task as `cancel()` — this was producing *no audio at all* across all
  24 games. (2) The per-game "narrate on first tap" `kickoff` blocks, which
  double-narrated when the first tap landed on a control that narrates, are now
  the shared `onFirstGesture()` (11 consumers, ~80 lines of duplication gone).
  (3) **real animal calls** vendored to `public/sounds/animals/` and played via
  the new `clip.ts`. Now **17 of the 18** curated animals: `lion`, `monkey` and
  `turkey` landed once the earlier corporate-proxy blocker was gone, leaving
  only `snake` — Commons has no genuine hiss, and a rattlesnake rattle can't
  stand in (wrong call, and a buzz inside the `bee`/`snake` collision group).
  Animals without a clip never carry a *prompt* but remain picture options.
  Narration is clip-aware (`buildNarration(round, { withClip })`) so the voice
  never pronounces the answer over the recording. Caveat worth knowing: the
  specs run with `sound: false`, and Playwright's bundled Chromium has no MP3
  codec, so the suite asserts clip **requests** rather than playback — that is
  what caught a base-path bug the speech fallback had hidden. Actual decode and
  playback of all 17 clips was verified manually in real Chrome.
- **Prior ship (2026-08-17)**: **Animal Sounds** — fourth preschool-cognitive
  game (listening / auditory discrimination, "who says moo?"). Inverts the
  Sound Friends prompt: the round plays an animal **call** (with the
  onomatopoeia shown as text) and offers three animal picture tiles; the child
  taps the animal that makes it. 8-round session over a curated pool of **18
  unambiguous, iconic calls** (`src/data/animal-sounds.ts`) — the raw `sound`
  fields in `animals.ts`/`birds.ts` could not be used directly because they collide
  (Bear and Tiger both "Growl!") and some are not onomatopoeic ("Float!"), so
  the pool declares explicit **sound-collision groups** to keep every round
  single-answer. Animal identity (emoji, name) is still sourced from
  `@/data/animals` + `@/data/birds`; Bee and Frog were added to `animals.ts`
  to supply two iconic toddler calls (39 animals, new `amphibian` group, so
  the Animals game gained a 6th filter pill). Bespoke
  `animal_sounds_stats_v1` (no stages). **First game to ship the revised
  red + error-tone wrong-answer feedback** (§5 rule 8).
- **Prior ship (2026-06-23)**: a shared **"🔄 Reset" control on every game** —
  restart the current session (a confirmed `location.reload()`; saved progress
  in LocalStorage survives, only in-session round/score/selection state resets).
  Lives entirely in the shared `GameControls.astro` (new `🔄 Reset` pill
  `#btnReset` + a `.modal-overlay` confirm dialog `#resetConfirmModal`), so all
  23 games inherit it with no per-game wiring. `tests/reset.spec.ts` covers one
  game per layout. No game-count, storage-key, or layout changes.
- **Prior ship (2026-06-17)**: **Days Parade** — foundational learn-the-days
  explore game and the **prequel to Week Friends** (learn all 7 days first, then
  sequence them). A Sunday-first week train; tap any day to meet it (hear its
  name + a fact, collect a "met ✓", N/7); a **"Sing the days"** button walks the
  whole week in order; a live **"Today is…"** badge anchors it in routine.
  No scoring/quiz — pure exploration. Reuses `@/data/week-friends` day identity;
  met-set via the shared progress lib + bespoke `days_parade_stats_v1` (sings +
  last-played). Bespoke `preschool-cognitive` registry entry (explore shape, not
  rounds), ordered before Week Friends; cognitive family now 3 cards (dashboard
  stays at 6 families).
- **Prior ship (2026-06-17)**: **Week Friends** — second preschool-cognitive
  game (days-of-the-week temporal sequencing). A run of consecutive days appears
  ("Sunday, Monday…") with a "?" slot; the child taps the day-card that comes
  next. Sunday-first like the days-of-the-week song; no week wrap; errorless
  "let's sing the days" guided reveal on a miss. 8-round tiered session
  (short→longer runs, adjacent-day distractors on the hardest tier); bespoke
  `week_friends_stats_v1` (no stages). Joins the **preschool-cognitive**
  family — no new family, so the dashboard stays at 6; the cognitive section
  label broadened to "sorting + sequencing".
- **Prior ship (2026-06-06)**: **Sorting Friends** — first preschool-cognitive
  game (single-attribute categorization). A category prompt appears ("Find all
  that live in the sea!"); the child taps every picture in the tray that
  belongs — a new **tap-all (multi-select)** mechanic. Errorless 250ms shake on
  a wrong tap (distractors come from sibling buckets of the same dimension, so
  membership is unambiguous); `correctFirstTry` counts rounds finished with zero
  wrong taps. 8-round tiered session over habitat/kind/size; bespoke
  `sorting_friends_stats_v1` (no stages). Introduced the **preschool-cognitive**
  stats family (teal `#14b8a6`), the 6th on `/stats`.
- **Prior ship (2026-06-06)**: **Sound Friends** — second preschool-literacy
  game (beginning-sounds phonics). A picture appears ("apple"); tap the
  letter its name starts with from three plain letter tiles. Combined
  name+sound+mnemonic narration ("A says ah"), SATPIN-tiered across an
  8-round session, errorless guided reveal on miss. Sibling to Letter
  Friends (NOT the math stage system); bespoke `sound_friends_stats_v1`
  (no stages). New `LETTER_SOUNDS` map of spoken sound cues; letter→word→
  emoji content reused from `@/data/alphabets`.
- **Prior ship (2026-06-06)**: **Number Bond Pop** — fifth preschool-math
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
- **Forward queue**: see [ROADMAP.md](ROADMAP.md) for the ranked candidate
  games, and [docs/GAME-DESIGNS-2026-08.md](docs/GAME-DESIGNS-2026-08.md) for
  the full six-game design set approved 2026-08-17. **Sound Friends**
  (candidate A) + **Sorting Friends** (candidate B) shipped 2026-06-06;
  **Week Friends** + **Days Parade** shipped 2026-06-17; **Animal Sounds**
  shipped 2026-08-17. Next up is **Rhyme Time → Opposites Friends → Feeling
  Friends → Memory Match**.
- **Open queued work**: **T9** — replace Web Speech with pre-recorded MP3
  narration (parked on the user's recording session; integration is ~30–45 min
  of agent work once MP3s land in `src/assets/narration/shared/`).
- **Deferred design decision**: `StageLayout` carve (deferred 5x — the
  `body.story` scope already does the isolation work). Option C unified
  `DeckLayout` decided NO-GO. The vanilla repo is a no-touch zone.
