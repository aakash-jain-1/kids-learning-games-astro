# Project Context — Kids Learning Games (Astro)

> **What this file is**: a fast-loading orientation map for any human or AI
> agent starting work in this repo. It is a *summary*, not the source of
> truth. When this file and the canonical docs disagree, the canonical docs
> win. Keep it short and current — see the update rule in
> `.cursor/rules/maintain-context.mdc`.
>
> **Last verified against the codebase**: 2026-08-22 (Rhyme Time shipped —
> game count now 27, fourth of the six-game August arc, filed under the
> existing `preschool-literacy` family. Same day: Opposites Friends shipped,
> and a `clip.ts` playback bug fixed that made Animal Sounds narrate over its
> own correction. Platform note corrected — the dev box is Windows, not
> macOS).

---

## 1. One-paragraph summary

An **Astro + TypeScript + `@vite-pwa/astro` (Workbox)** static PWA of
educational mini-games for young children. It began as a proof-of-concept
migration of the vanilla HTML/CSS/JS `kids-learning-games` repo and is now a
feature-driven project in its own right. **27 games** ship across **three
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
> code ships 27 (the preschool families grew well past that prose).
> `SESSION-HANDOFF.md` is stale too: it predates the August 2026 games and
> mentions neither Animal Sounds nor Feeling Friends. **`PROGRESS.md` and
> `src/data/stats-registry.ts` are the authoritative pair** — the changelog for
> "what shipped", the registry for the game count and families.

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
- **Dev box is Windows** (verified 2026-08-22; Node 24, npm 11, bash shell).
  The earlier "dev box is macOS" note was true only for the 2026-08-17
  session. The bash helpers in `scripts/` work under the bash shell.
- **`PW_CHANNEL` is required here, not optional**: `playwright.config.ts`
  honours a `PW_CHANNEL` env var to run against a locally-installed browser
  instead of bundled Chromium. On this box bundled Chromium is **not
  installed** — a plain `npm test` fails every spec with "Executable doesn't
  exist", so use **`PW_CHANNEL=chrome npm test`**. (Bundled-Chromium
  *extraction* has stalled hard on this machine before, which is why the
  hatch exists.) CI never sets it — Linux runners use bundled Chromium.

## 4. The 27 games & three layouts

- **`GridLayout.astro`** — foundational-set games (scan a fixed chart, tap to
  hear): Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi (7).
- **`CardMachineLayout.astro`** — reference-catalogue decks (browse fact
  cards): Dinosaurs, Flashcards, Solar System, Weather (4).
- **`StoryLayout.astro`** — story-flow games *and* single-scene "stage" games
  (the preschool games reuse this shell via a `theme` prop): Daily Routines,
  Woodcutter (2 story) + Counting Friends, More Friends, Number Friends,
  Pattern Sequences, Number Bond Pop (5 preschool-math) + Letter Friends,
  Sound Friends, Rhyme Time (3 preschool-literacy) + Sorting Friends,
  Days Parade, Week Friends, Animal Sounds, Opposites Friends
  (5 preschool-cognitive) + Feeling Friends (1 preschool-social).

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
   red/buzzer/shame coding, shake only"). **Animal Sounds, Feeling Friends,
   Opposites Friends and Rhyme Time are the only adopters so far**; the other
   23 games still use shake-only feedback, so the app is mid-migration —
   see §7.
9. **The Astro repo is the source of truth on *patterns*** (the vanilla repo
   is treated as a spec of intent, not a template to copy).

## 6. LocalStorage keys (state shapes)

- `kids_settings_v1` — global settings (dark, sound, autoSpeak, fontSize).
- `kids_progress_v1:<gameId>` — learned-item set (sorted string array).
- `<gameId>_quiz_v1` — `{ attempts, bestScore, lastPlayed }` quiz metrics.
- `<game>_stats_v1` — bespoke preschool schema `{ sessions, rounds, correctFirstTry, lastPlayed }`
  (newest: `rhyme_time_stats_v1`, 2026-08-22).
  The staged preschool-math games (Counting / More / Number Friends + Number
  Bond Pop) also carry `{ stage, bestStage }` (1..3) for their auto-advancing
  stages (added 2026-06-03; Number Bond Pop adopted them at ship 2026-06-06).
- `kids_play_history_v1` — sitewide `Record<YYYY-MM-DD, gameId[]>` for the
  `/stats` activity chart (30-day rolling window).

`src/data/stats-registry.ts` is the single source of truth tying every game to
its storage keys and the `/stats` page (**7 families**: preschool-math,
preschool-literacy, preschool-cognitive, **preschool-social**, story, card-set,
card-pure). Adding a game = one entry. Two family judgements worth knowing, both
2026-08-17: Animal Sounds is filed under **preschool-cognitive** rather than
opening a `preschool-science` family for a single listening game, but Feeling
Friends **did** open `preschool-social` (indigo `#6366f1`) even though it's the
only game in it — social-emotional learning is a developmental domain a parent
reads separately from thinking skills, and filing it under cognitive would have
hidden that. (The other five games in the design set are cognitive/literacy, so
this family stays at one for now.)

## 7. Current state & what's next

- **Migration complete** (all 13 vanilla games ported, since 2026-05-08).
- **Feature-driven phase active**: 14 preschool games added since (cardinality
  triad + Pattern Sequences + Letter Friends + Number Bond Pop + Sound
  Friends + Sorting Friends + Week Friends + Days Parade + Animal Sounds +
  Feeling Friends + Opposites Friends + Rhyme Time). Total **27 games**, all
  live.
- **Latest ship (2026-08-22)**: **Rhyme Time** — third preschool-literacy
  game and the fourth of the six-game August arc. A word shows with its
  picture ("Dog"); three picture cards below, tap the one that rhymes. It is
  the end-of-word partner to Sound Friends' start-of-word skill, which is why
  it shares the literacy pink rather than taking a new accent. Content is
  restructured from the `rhyming` deck: that deck stores a whole pair as one
  display string with one emoji (`Cat – Hat`), which is fine to browse and
  useless for a forced choice, so the pairs are re-declared with an emoji and
  an **onset** per *word* — only the rhyming sentence is still read from the
  deck by card name, so a rename there fails the build loudly. Five of the 14
  deck pairs are dropped: four can't be pictured, and **bow–snow** can't be
  reliably *said* — `bow` is a homograph and the child only ever hears it, so
  a voice reading /baʊ/ would present a false rhyme out loud in a game about
  listening. The difficulty curve is the distractor rule: rimes are unique
  across families (asserted at module load), so any distractor from another
  family is guaranteed not to rhyme, and at tier 3 one distractor deliberately
  **starts with the target's sound** — cook against cat/car/cake — so the last
  rounds can only be won by attending to the end of the word. The shared
  ending is **written and never spoken**: speech synthesis can't know the "ow"
  in *snow* isn't the one in *cow*, so the script demonstrates with the two
  whole words ("Listen — cat, hat. They end the same way!") and a chip carries
  the letters. Bespoke `rhyme_time_stats_v1`; theme key `rhymetime`;
  `preschool-literacy`, so no new family. Fourth adopter of the red
  wrong-answer rule (§5 rule 8), and third to get dark mode and the per-round
  scene tokens right rather than inheriting the sibling bugs below.
- **Prior ship (2026-08-22, same day)**: **Opposites Friends** — fifth
  preschool-cognitive game and the third of the six-game August arc. A target
  word shows with its picture ("Hot"); three cards below, tap the opposite.
  Eight rounds over **ten pairs**, asked in *both* directions (big→small as
  often as small→big) so the child learns the relation rather than which card
  is always the answer. Identity comes from the shipped `opposites` Flashcards
  deck — this is the payoff for the Strong/Light pair bug fixed on 2026-08-17,
  which is what made ten clean pairs exist. Two things are pinned locally: the
  **picture** where the deck's emoji can't carry the concept (Big/Small ship
  as 🔆/🔅, the brightness symbols — overridden to 🐘/🐜, the subjects of those
  cards' own facts), and a **hint** per word for the correction ("small means
  little, so look for the tiniest one"). The distractor rule is the pedagogy:
  `big/heavy/strong` and `small/light/weak` are declared **meaning
  collisions** and never share a round, because asked the opposite of *big* a
  child tapping *light* is not really mistaken; and at tier 3 the two
  distractors are drawn *as a pair*, so the tray holds two full
  opposite-pairs. Bespoke `opposites_friends_stats_v1`; theme key
  `oppositesfriends` (amber); `preschool-cognitive`, so no new family. Third
  adopter of the red wrong-answer rule (§5 rule 8), and the second game after
  Feeling Friends to get **dark mode and the per-round scene tokens right**
  rather than inheriting the sibling bugs below.
- **Prior ship (2026-08-22, same day)**: **`clip.ts` interrupted-playback
  fix**. Clips are cached one `HTMLAudioElement` per URL, but `stopClip()`
  only paused — it never detached the in-flight `ended`/`error` listeners. The
  element is reused, so those fired the *next* time that clip ended, running
  an abandoned round's `onEnd` alongside the current one. In Animal Sounds
  that meant the previous prompt's narration spoke over the guided correction
  and the two chopped each other up, which is what "some sounds don't play
  correctly" actually was. `playClip` now publishes a `detach()` that
  `stopClip()` calls, firing neither callback (interrupting is deliberate).
  Note the suite could not have caught it: specs run `sound: false` and
  bundled Chromium has no MP3 codec, so clips are asserted as *requested*,
  not played.
- **Prior ship (2026-08-17)**: **Feeling Friends** — first social-emotional
  game and the 7th `/stats` family. Eight feelings, eight rounds, three big
  faces per round. Rounds 1–6 ask *label → face* ("Show me sad"); rounds 7–8
  swap to a **vignette** ("Her ice cream fell on the ground. How do you think
  they feel?"), which moves the child from recognition to inference — the actual
  social skill. Names + coping lines are reused from the `emotions` deck in
  `flashcards.ts`; what's new is a per-face **`cue`** (one checkable detail,
  "there is a big tear on the cheek") spoken during the guided correction, so a
  miss teaches a reusable rule. `FACE_COLLISIONS` keeps happy/excited and
  love/caring off the same round. Bespoke `feeling_friends_stats_v1`; theme key
  `feelingfriends`. Second adopter of the red wrong-answer rule (§5 rule 8).
  Two things it changed beyond itself: the 8 Fluent faces are **vendored** to
  `public/images/feelings/` (356KB) because here the picture *is* the question
  and a jsDelivr miss — one wrong capital away, answering in 8–44s — leaves
  nothing tappable; and its dark mode actually works, unlike its
  `StoryLayout` siblings (see the follow-up below).
- **Prior ship (2026-08-17, same day)**: **real audio** — three silent bugs
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
  **Week Friends** + **Days Parade** shipped 2026-06-17; **Animal Sounds** and
  **Feeling Friends** shipped 2026-08-17; **Opposites Friends** and **Rhyme
  Time** shipped 2026-08-22 (**4 of the 6 designs done**). Remaining in the
  set, in build order: **Where's Teddy? → Memory Match**. Only Memory Match is
  still blocked on an open question (Q5, board progression).
- **Open queued work**:
  - **T9** — replace Web Speech with pre-recorded MP3 narration (parked on the
    user's recording session; integration is ~30–45 min of agent work once MP3s
    land in `src/assets/narration/shared/`).
  - **Dark mode is broken across the `StoryLayout` preschool family.** None of
    the sibling themes redefine `--st-bg` under `body.dark-mode`, so they keep
    their pale light-mode gradient and paint near-white text on it. Feeling
    Friends, Opposites Friends and Rhyme Time each fix it for themselves (dark
    `--st-bg` + a scene-veil background layer, chosen over a `filter` so the
    white cards stay bright); the same 4-line pattern needs applying to the
    other **11**.
  - **The per-round scene never paints in 11 of the preschool games.** Same
    11 stylesheets declare the six `data-scene` gradients on their `.X-stage`
    element but read `--st-bg` on `body` — a custom property set on a
    descendant can't reach an ancestor. One line each; the three games above
    read it on the stage, where it's set.
  - **The Reset / Quiz / Stats / Settings pills are unreadable in light
    mode** (found 2026-08-22). `.ctrl-pill` in `global.css` is white text on a
    10%-white fill — sized for a dark page, and every light-background game
    renders it near-invisible (verified on Sound Friends, Opposites Friends
    and Rhyme Time). It's one shared rule, so it's one fix for all 27 games,
    but it's a global change worth its own verification pass.
  - **Wrong-answer feedback migration** — 23 games still shake-only (§5 rule 8).
- **Deferred design decision**: `StageLayout` carve (deferred 5x — the
  `body.story` scope already does the isolation work). Option C unified
  `DeckLayout` decided NO-GO. The vanilla repo is a no-touch zone.
