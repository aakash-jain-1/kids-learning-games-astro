# Session Handoff — kids-learning-games Astro migration

> **Purpose**: Compact context dump for the next chat session.
> The previous chat was getting slow, so this file rolls up everything
> needed to bootstrap a fresh agent without re-reading the full transcript.
>
> **Required read order in the next session** — do these *before* writing
> any code:
>
> 1. **This file** — high-level state, conversation context, ship sequence.
> 2. **`kids-learning-games-astro/PROGRESS.md`** — canonical status,
>    migration principles, per-game layout decisions, full changelog.
> 3. **`kids-learning-games-astro/README.md`** — architecture overview,
>    file structure, comparison table.
> 4. **`kids-learning-games/dev/SESSION_CONTEXT.md`** — vanilla repo's own
>    session-handoff (covers pre-Astro history).
> 5. **`kids-learning-games/dev/AUDIT_2026_04.md`** — the audit that started
>    this whole migration. Useful when something in the Astro port traces
>    back to a known vanilla-side bug or regression-risk.
> 6. **`kids-learning-games/dev/GAME_REFERENCE.md`** — vanilla-side
>    "how to add a new game" guide. Read when porting to know what content,
>    icons, and patterns the vanilla version uses.
> 7. **`kids-learning-games/dev/ACTION_ITEMS.md`** — vanilla repo's bug
>    tracker. Skim to know what *not* to port.
> 8. **`kids-learning-games/README.md`** — vanilla repo's public README.
>
> See "Documentation map" below for one-line descriptions of each file.
>
> **Then explore the rest of the project structure** — read the next game's
> source files (e.g., `kids-learning-games/games/animals-game.html`), the
> closest Astro precedent (`src/pages/games/alphabets-game.astro`), and the
> shared layout / lib / styles you'll be touching, before proposing a plan.
>
> **Don't** re-read the full chat transcript at
> `/Users/aakasjai/.cursor/projects/Users-aakasjai-Documents-GIT-Projects-Github-AJ/agent-transcripts/<uuid>.jsonl`
> unless investigating a specific historical decision — those docs already
> capture the architectural conclusions.
>
> ⚠️ **Before you run a single shell command, read the PRE-FLIGHT block
> right below this — it's 5 lines and it'll save ~10 wasted tool calls.**

---

## PRE-FLIGHT — read these 5 lines before running any shell command

> Burned ~15 tool calls in 2026-05-07's session re-discovering these. Don't.
>
> 1. **Always `cd` to the project with an absolute path** — chain it into the
>    command itself (`cd "/Users/aakasjai/Documents/GIT Projects/Github_AJ/kids-learning-games-astro" && …`).
>    The Shell tool's `working_directory` parameter has dropped silently
>    multiple times, leaving npm/git looking at the parent directory.
> 2. **Use the npm scripts, not raw astro/npx.** `npm run check`,
>    `npm run build`, `npm run dev` all have `ASTRO_TELEMETRY_DISABLED=1`
>    baked in (since 2026-05-07). They run cleanly in the **default
>    sandbox** — no `["all"]` needed. Avoid `npx astro …` (registry lookup
>    can hang) and raw `astro …` (telemetry tries to `mkdir ~/Library/Preferences/astro` → EPERM).
> 3. **`git push` needs `required_permissions: ["all"]`** — corp TLS
>    interception blocks the default sandbox's proxy. Any other git command
>    (status, add, commit, log, diff) runs fine in the default sandbox.
> 4. **`["all"]` mode starts a FRESH shell** — no preserved CWD, no preserved
>    env vars from prior calls. Always re-`cd` with the absolute path inside
>    the same `["all"]` invocation, and prefer absolute binary paths
>    (`/opt/homebrew/bin/node`, `/usr/bin/curl`) since PATH may differ.
> 5. **Full gotcha catalog and rationale** lives in **Tool / environment
>    gotchas** further down — skim it once per session, then refer back as
>    needed.

---

## TL;DR

- **Project**: Migrate vanilla HTML/CSS/JS PWA `kids-learning-games`
  (13 games, ~500–1500 lines each, copy-pasted shells) to a typed
  Astro + `@vite-pwa/astro` (Workbox) project `kids-learning-games-astro`.
- **State (2026-05-08, end of day): all 13 games ported and live —
  migration complete** at https://aakash-jain-1.github.io/kids-learning-games-astro/.
  *Foundational-set chapter closed*; *story-flow chapter closed*;
  *no vanilla games remaining*.
- **Three shared layouts** in production:
  - `CardMachineLayout` (4 games — Dinosaurs, Flashcards, Solar System, Weather).
  - `GridLayout` (7 games — Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi).
  - `StoryLayout` (2 games — Daily Routines paginated, **Honest Woodcutter** ← shipped this session as the 13th and final port).
- **Just shipped (this session)**: **Track 1 batch 2 — card-machine
  sweep complete (4 of 11 wired)**. Flashcards + Solar System +
  Weather all ship real `mountQuiz` flows in place of their
  `alert(…)` Quiz/Stats stubs in a single follow-up commit to the
  Dinosaurs ship. Cost was *zero* new CSS — these three games
  inherited the `.cm-quiz-overlay` modal shell + 4-theme
  `--cm-quiz-*` palette tokens that batch 1 paid for, so this commit
  ships **only data + page wiring** (~50 LoC of glue per page + 5
  questions per game + per-game `gameId` for LocalStorage
  isolation). `quiz.h5Df3D_T.js` shared chunk now **6-way deduped**
  (routines + woodcutter + dinosaurs + flashcards + solar-system +
  weather — same hash, byte-for-byte identical bundle, just five
  more importers compared to the Woodcutter ship). Per-page chunk
  deltas predictable: flashcards 11.30 → 11.96 KB gzip (+0.66 KB),
  solar-system 2.68 → 3.28 KB (+0.60 KB), weather 3.36 → 4.05 KB
  (+0.69 KB) — all within ±0.04 KB of the Dinosaurs +0.67 KB
  baseline. 0 stale `alert(…)` stubs remain in `dist/` across the
  4 card-machine pages. Commit `64e5e5e`. Full breakdown under
  "What just shipped this session" below.
- **Shipped earlier today (same date 2026-05-08)**: Track 1 batch 1
  — **Dinosaurs** as first non-story `mountQuiz` consumer. 5-question
  quiz on the deck contents + Stats panel reading `quiz.getState()` +
  the one-time CSS payment for the `.cm-quiz-overlay` modal shell +
  4-theme `--cm-quiz-*` palette in `card-machine.css` (the additive
  block that batch 2 then inherited free). Commit `da97b21` *(feat)*
  + `5cc3092` *(docs)*.
- **Shipped previous session**: the Honest Woodcutter — last vanilla
  game, closed the migration. Single CSS-animated hero scene + 4
  paragraphs of prose + moral panel + 6-question quiz on shared
  `mountQuiz`. Same session also extracted **`src/lib/quiz.ts`** as
  the long-deferred second-consumer refactor and refactored Daily
  Routines to consume it (~80 LoC of inline quiz code removed).
  Commit `ca2fa2d` *(feat)* + `9b69b85` *(docs)*.
- **Layout decision settled at port time — no new prop, no new
  variant.** Pre-port docs flagged "reuse `StoryLayout` with a
  `pagination={false}` prop *or* carve out `StoryLayout--single`
  variant". Audit at port time went one level deeper: the layout
  shell never *enforced* the progress bar / Prev / Next chrome —
  those elements live in the consuming page's slot content, not
  in `StoryLayout.astro` itself. So Daily Routines includes them,
  the Woodcutter page omits them, and the layout stays neutral.
  Cleanest possible reuse pattern.
- **`src/lib/quiz.ts` extracted (the long-deferred second-consumer
  refactor).** Both story games share an identical
  `{ attempts, bestScore, lastPlayed }` quiz state + `<gameId>_quiz_v1`
  LocalStorage key + multiple-choice question rendering / scoring
  / retry / confetti flow. The lib exposes:
  - **Types**: `QuizQuestion` (now imported from the lib by both
    `src/data/routines.ts` and `src/data/woodcutter.ts` instead of
    each declaring their own) + `QuizState`.
  - **Helpers**: `loadQuizState(gameId)` / `saveQuizState(gameId, s)` /
    `clearQuizState(gameId)` (defensive add for a future "Start
    Over" button) / `escapeQuizHtml(s)` (was inline in Routines).
  - **Controller**: `mountQuiz(config)` → `{ start, getState }`.
    Wires a single delegated click listener on the body element;
    supports per-game `messages` overrides, configurable
    `greatGteThreshold` (default 63 %), `onPerfect` callback for
    the per-game confetti palette, `playTap` SFX hook.
  Bundle: 1.80 KB raw / 0.98 KB gzip — 2-way dedup'd across
  `daily-routines-game.*.js` + `woodcutter-story.*.js`. The same
  commit refactored Daily Routines to consume `mountQuiz` (~80
  lines of inline page-local quiz code removed; functional
  behaviour identical).
- **Hero scene art lives in `src/styles/woodcutter.css`** with
  every selector scoped under `.woodcutter-art` and every keyframe
  prefixed `woodcutter-*` (twinkle / sun-glow / cloud-move / sway
  / wave / chop / drop / splash / fairy-appear / float / wing-flap
  / axe-rise) — bidirectional collision-freeness with `routines.css`
  enforced. Build-time grep confirms 0 woodcutter selectors in the
  routines CSS bundle and 0 routines selectors in the woodcutter
  CSS bundle. Both story pages share `daily-routines-game.Cgea29N_.css`
  (the story.css + global.css base bundle) — 2-way CSS dedup.
- **Animation choreography preserved verbatim** via CSS
  animation-delay (no JS choreography). **Play Animation / Reset
  buttons replay the entire timeline by re-setting `.scene-art`'s
  innerHTML** — cleaner than vanilla's per-element
  `style.animation = 'none'` reset. Reset additionally restarts
  the quiz from question 1.
- **60 deterministic background stars pre-rendered server-side**
  (vanilla generated 100 with `Math.random()` per page load).
  Visually equivalent to a child; SSR markup is byte-for-byte
  stable.
- **Bongo flashcard fix folded in** (`src/data/flashcards.ts`):
  `Long%20Drum/3D/long_drum_3d.png` (capital D, returned 403) →
  `Long%20drum/3D/long_drum_3d.png` (lowercase d, returns 200).
  Single-character fix, surfaced during the Hindi port and parked
  as tech-debt at that commit; cleaned up here.
- **Build & verification.** `npm run check` clean (0 errors / 0
  warnings / 0 hints across 43 files). `npm run build` clean (14
  pages, 6.12 s post Track 1 batch 2 wiring). Chunk-dedup invariants:
  - `quiz.h5Df3D_T.js` — **6-way dedup** (routines + woodcutter +
    dinosaurs + **flashcards + solar-system + weather**). Same hash
    as the Woodcutter ship — bundle content unchanged, just five
    extra importers across the two batches.
  - `progress.Czz_LiQd.js` — **still 8-way** (7 grid games +
    Routines; Woodcutter and the 4 card-machine games correctly do
    *not* import it — none of those track per-item learned state).
  - `fluent.rTHKURu4.js` — **still 6-way** (alphabets, animals,
    birds, flashcards, hindi, weather; both story games + the 2
    pure-CSS-art card-machine games correctly opt out).
  - `achievements.DT2pP3cz.js` — **13-way** (every game).
  - Layout pre-paint scripts (`CXGnnBDI.js` + `CMRSRHTE.js`) —
    **3-way dedup** across all three layouts.
  Live HTTP 200 from `/games/flashcards-game`,
  `/games/solar-system-game`, `/games/weather-game` (the three new
  Track 1 batch 2 wirings) plus regression sweep across `/`,
  `/games/dinosaurs-game`, `/games/woodcutter-story`,
  `/games/daily-routines-game`, `/games/alphabets-game` — all 200.
  SSR markup verified at the dist HTML level for all 4 card-machine
  pages: `id="quizOverlay"` + 7 child element ids
  (quizBody / quizCloseBtn / quizDoneBtn / quizResEmoji /
  quizResText / quizResult / quizRetryBtn) + per-game heading
  ("🧠 Quick Dinosaur Quiz" / "🧠 Quick Flashcards Quiz" /
  "🧠 Quick Solar System Quiz" / "🧠 Quick Weather Quiz"); **0**
  `alert(…)` "not yet implemented" strings remain in `dist/` across
  the entire 14-page build; per-game `gameId` literals appear once
  each in their own bundle (`"flashcards"` × 1 in flashcards bundle,
  etc.) with **0** cross-bundle leakage of LocalStorage keys.
- **Resume here**: migration is complete (13/13). **Track 1 of
  post-migration polish is in progress — 4 of 11 non-story games
  wired (card-machine sweep complete: Dinosaurs + Flashcards +
  Solar System + Weather).** Suggested next batch (Track 1 batch 3):
  the **7 grid games** (Alphabets, Numbers, Colors, Shapes, Animals,
  Birds, Hindi). That batch is the *third consumer* of the inner
  `.quiz-question` / `.quiz-opt` / `.quiz-result-*` selectors that
  `mountQuiz` writes — story games inline them in `story.css`,
  card-machine games scope them under `.cm-quiz-card` in
  `card-machine.css`, and the grid games trigger the rule-#3
  *"third consumer triggers a refactor"* decision: ship a third
  per-layout block in `grid.css` (`.gl-quiz-overlay` + `.gl-quiz-card`
  shell + scoped inner selectors) **or** extract the inner
  selectors to a shared `src/styles/quiz-modal.css` consumed by all
  three layouts. Lean toward extraction — three layouts now want
  the same inner DOM, the inner styles haven't drifted since they
  were copy-pasted at the Dinosaurs port, and the existing outer
  shell scope keeps theming clean either way. **Worked example to
  copy for batch 3**: `src/pages/games/weather-game.astro` is the
  cleanest reference (filter pills + `seasonLabel` helper mirror
  the grid games' filter shape). Other tracks remain queued: (b)
  Playwright smoke tests per layout, (c) Option C revisit (unified
  `DeckLayout` with view toggle — now fully unblocked but evidence
  still leans against), (d) cut-over plan to migrate the live
  `kids-learning-games` repo to serve the Astro `dist/` build. See
  "Next session: post-migration polish" below for the full scope.

---

## Workspace shape

Sibling-folder "monorepo":

```
/Users/aakasjai/Documents/GIT Projects/Github_AJ/
├── kids-learning-games/          # ORIGINAL vanilla PWA
│   └── games/*.html              # 13 game files (source of truth on CONTENT)
└── kids-learning-games-astro/    # NEW Astro POC
    ├── PROGRESS.md               # primary status doc
    ├── README.md                 # architecture overview
    ├── SESSION-HANDOFF.md        # ← you are here
    └── src/                      # source of truth on PATTERNS
```

Repos:

- Vanilla: `https://github.com/aakash-jain-1/kids-learning-games`
- Astro:   `https://github.com/aakash-jain-1/kids-learning-games-astro`
  (auto-deploys to GitHub Pages on every push to `main` via
  `.github/workflows/deploy.yml`).

---

## Documentation map (read all of these for full project context)

There are **8 markdown files** across both repos. The next agent should
have read each at least once before making decisions. Most are small
(<300 lines) — budget ~10-15 minutes total.

### Astro repo (`kids-learning-games-astro/`)

| File | Lines | Purpose |
|---|---|---|
| `SESSION-HANDOFF.md` | ~1660 | **This file.** Compact bootstrap for new chat sessions. |
| `PROGRESS.md` | ~2230 | **Primary status doc.** Migration principles, per-game decisions, ports completed, full dated changelog, "Resume here next session" marker. |
| `README.md` | ~165 | Architecture overview, full file structure tree, vanilla-vs-Astro comparison table, shared-module list. |

### Vanilla repo (`kids-learning-games/`)

| File | Lines | Purpose |
|---|---|---|
| `README.md` | ~145 | Public-facing README for the vanilla PWA. Describes the 12 (originally) games, features, install steps. |
| `dev/AUDIT_2026_04.md` | ~315 | **The audit that started this migration** (Apr 2026). Findings ranked by user-facing impact: PWA bugs, accessibility gaps, perf issues, security notes, stack-modernisation discussion. The Astro POC was the answer to this audit's "Tech stack" section. |
| `dev/SESSION_CONTEXT.md` | ~240 | Vanilla repo's *own* session-handoff (predecessor of this file). Covers project history before the Astro POC was started. Useful if a question about origin/intent comes up. |
| `dev/ACTION_ITEMS.md` | ~225 | Issue tracker for the vanilla repo. Skim to know what *not* to port — fixed-in-vanilla bugs that shouldn't reappear in Astro. |
| `dev/GAME_REFERENCE.md` | ~905 | **Authoritative guide for adding a new game in the vanilla style.** Has all the patterns: file naming, icon CDNs (Iconify Noto SVG vs Microsoft Fluent UI 3D PNG), two-pane vs flashcard layouts, theming, settings/SW wiring. **Read this first when porting** — the vanilla content/icon choices are documented here. |

### When to read which

- **Starting a port** → re-skim `PROGRESS.md` + this file, then read
  `kids-learning-games/dev/GAME_REFERENCE.md` sections relevant to the
  target game (e.g., the "Two-pane (Iconify)" section for Animals/Birds).
- **Architectural question** ("should this be a card-machine or a grid?")
  → `PROGRESS.md` "Migration principles" + "Per-game layout decisions".
- **"Why does the vanilla version do X?"** → `dev/AUDIT_2026_04.md` may
  flag X as a known issue, or `dev/GAME_REFERENCE.md` may document the
  pattern's origin.
- **"What tech debt is open?"** → this file's "Open tech debt" section +
  `PROGRESS.md` "One-off tech-debt items".
- **"What was already fixed in vanilla?"** → `dev/ACTION_ITEMS.md`.

---

## Migration principles — the "north star"

Codified across multiple sessions. Full text in
`PROGRESS.md` → "Migration principles". The five rules that come up
most often:

1. **Astro wins on patterns, vanilla wins on content.** If the two
   diverge, the Astro pattern is canonical. *Document the deviation in
   `PROGRESS.md` + the data file's header comment.*
2. **Three pedagogical layouts, not one.**
   - `CardMachineLayout` — *reference-catalogue* games (browse a deck,
     filter, press-to-hear).
   - `GridLayout` — *foundational-set* games (scan a fixed chart, tap
     to hear, completion overlay).
   - `StoryLayout` — *story-flow* games (follow a linear narrative
     one chapter at a time, then take a quick quiz). Carved out at
     the Routines port (2026-05-08) when `CardMachineLayout` failed
     the first-fit gate; now hosts both Daily Routines (paginated)
     and Honest Woodcutter (single-scene) — same shell, the page
     decides whether to render the progress bar / Prev / Next
     chrome in its slot content.
   - Decision was non-trivial — see "Layout debate history" below.
3. **Refactor trigger = second consumer.** Don't extract a helper
   into `src/lib/` until a second game wants it. Example:
   `kids_progress_v1:<gameId>` LocalStorage was inlined in alphabets,
   then extracted to `src/lib/progress.ts` when Numbers landed.
4. **Per-game data lives in `src/data/<game>.ts`** with named
   interfaces, `readonly` arrays, and a header comment that documents
   *every* deviation from vanilla.
5. **Verify CSS isolation bidirectionally.** No grid selectors in the
   card-machine bundle; no card-machine selectors in the grid bundle.
   Use `Grep` (ripgrep) on the built CSS chunks.

---

## Layout debate history (briefly — for future course-correction context)

Mid-migration the user pushed back on an Alphabets implementation that
used the "cards / card-machine" interpretation of "use Astro patterns":

- **First attempt**: Alphabets ported onto `CardMachineLayout` to
  match the existing shipped pattern.
- **User pushback**: *"the alphabet game is not in cards design rather
  it is in tile design"*. The Astro-pattern principle didn't mean
  "everything is a card-machine" — it meant "follow the pattern that
  matches the pedagogy."
- **Research phase**: Audited Starfall, Khan Kids, DotIAM. Confirmed
  alphabet/foundational-set games industry-wide use a tile chart, not
  a card stack. User picked option B (two shared layouts) over option
  C (unified `Deck` with toggle).
- **Course correction**: Built `GridLayout`, re-ported Alphabets onto
  it. Fixed a left/right pane overlap bug from an earlier two-pane
  attempt by going single-column-everywhere.
- **Option C (unified `Deck` layout with grid/card/story view toggle)** is
  *fully unblocked* as of 2026-05-08 (13/13 ported; both shared libs
  `progress.ts` + `quiz.ts` exist). Decision still open: keep
  `CardMachineLayout`, `GridLayout`, and `StoryLayout` separate, or
  consolidate into a single `DeckLayout` with a per-user "Grid | Card
  | Story" toggle. Three pieces of evidence now lean *separate*:
  (a) different detail-payload shapes (Fluent image vs CSS shape gallery
  vs CSS count grid vs scene art vs hero scene + prose + moral panel),
  (b) different filter bars (Animals's 6-pill filter vs Hindi's bilingual
  3-pill vs Routines's no-filter vs Woodcutter's no-filter), (c)
  different state shapes (`Set<string>` for grid progress vs
  `{ attempts, bestScore, lastPlayed }` for story quiz state vs no
  per-item state at all for Woodcutter). Best revisited *after* the
  real Stats + Quiz modals land across all 13 games (current backlog
  item 3 in PROGRESS.md) — that's the cleanest signal of how much DOM
  / CSS the three layouts truly share.

Take-away: *when the user pushes back on an architectural choice,
treat it as a signal to investigate, not just implement the opposite.*

---

## Current state snapshot (commit `ca2fa2d` for the feat; docs commit will follow)

**13 of 13 games ported — migration complete. All three chapters closed.** Live URLs all return 200.

| Game | Layout | Theme | Bundle (gzip) | Notes |
|---|---|---|---|---|
| Flashcards | CardMachine | cyan/orange | 11.30 KB | 14 decks, 4 card-face variants |
| Hindi | Grid | saffron/cream/green tricolor | ~5.25 KB | 48 Devanagari tiles (12 vowels + 36 consonants), Devanagari-script tile face + Fluent UI 3D detail, bilingual `स्वर` / `व्यंजन` filter, `hi-IN` speech, 5 Q→Crown substitutions incl. *Sari* for Aurat/Woman |
| **Daily Routines** | **Story** | **sunrise/coral (morphs per scene)** | **~4.10 KB** | 10 paginated scenes with per-scene CSS art (sun, bed, toothbrush, etc., scoped under `.routines-art`); 8-question quiz on shared `mountQuiz` from `src/lib/quiz.ts` (refactored at the Woodcutter port — was inline ~5 KB pre-extraction); `--st-bg` driven body-gradient transitions per scene |
| Weather | CardMachine | navy/ice-blue | 3.36 KB | 20 cards, full Fluent UI deck |
| Animals | Grid | sea-green/deep-blue | 3.31 KB | 37 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter |
| Dinosaurs | CardMachine | green | **3.71 KB** *(post-quiz-wire 2026-05-08)* | first POC game; 15 cards; **first non-story `mountQuiz` consumer** with 5-question quiz on deck contents + Stats panel reading `quiz.getState()` |
| Alphabets | Grid | purple/green | 2.98 KB | first GridLayout, 26 letters |
| Solar System | CardMachine | purple/gold | 2.68 KB | pure-CSS planet art |
| Birds | Grid | orange-coral sunset | 2.55 KB | 15 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter, vanilla emoji-collision bug fixed |
| Colors | Grid | pink/lavender | 2.27 KB | swatch tiles + shape gallery detail |
| Shapes | Grid | pink/coral | 2.13 KB | mini shape on tile, big shape detail |
| Numbers | Grid | sky-blue/orange | 2.09 KB | CSS count-objects detail |
| **Honest Woodcutter** | **Story** | **deep navy → purple twilight + gold accents** | **1.46 KB** | **13th and final port. Single CSS-animated hero scene (woodcutter chops → drops axe at 1s → fairy at 3s → golden axe at 6s → silver axe at 9s) + 4-para prose + moral panel + 6-question quiz on shared `mountQuiz`. Pure CSS art under `.woodcutter-art` with `woodcutter-*` keyframes for collision-freeness with `routines.css`. Smallest game by JS — pre-rendered scene art string + ~50 LoC of glue.** |

**Pending: 0. Migration complete.**

**Chunk dedup invariants (verified at the bundle level — `grep -l` on
the production page-chunks):**

- `quiz.h5Df3D_T.js` (1.80 KB raw / 0.98 KB gzip) — **2-way dedup**
  (routines + woodcutter). Second-consumer refactor delivered.
- `progress.Czz_LiQd.js` (0.24 KB gzip) — **8-way dedup** (7 grid
  games + Routines; Woodcutter correctly does *not* import it).
- `fluent.rTHKURu4.js` (89 bytes raw / 0.09 KB gzip) — **6-way**
  (alphabets, animals, birds, flashcards, hindi, weather; both story
  games correctly opt out — pure CSS art).
- `achievements.DT2pP3cz.js` — **13-way** (every game).
- `speech.CM0jYrqL.js` — **12-way** (every game except Weather).
- `settings.zS6XEbod.js` — **13-way** + index page (loaded by every
  page incl. home).
- Layout pre-paint scripts (`CXGnnBDI.js` + `CMRSRHTE.js`) — **3-way
  dedup** across all three layouts (CardMachineLayout + GridLayout +
  StoryLayout). Astro hashes them per layout file but the chunk
  content is byte-for-byte identical (same auto-generated FOUC
  handler).

**CSS chunks**:

- `alphabets-game.*.css` — ~26 KB, used by all 7 grid games.
- `dinosaurs-game.*.css` — 17 KB, used by all 4 card-machine games.
- `daily-routines-game.Cgea29N_.css` — **6.9 KB shared** (the
  story.css + global.css base bundle). Loaded by *both* story pages
  — 2-way CSS dedup.
- `daily-routines-game.CxrRS3LH.css` — 7.7 KB (routines per-scene art
  under `.routines-art`).
- `woodcutter-story.BLoeGVIr.css` — 7.4 KB (woodcutter hero-scene art
  + prose + moral panel under `.woodcutter-art`).
- `solar-system-game.*.css` — solar-system-only.

**PWA precache**: 57 entries / ~438 KiB (was 425 KiB post-Dinosaurs and
390 KiB pre-Woodcutter; Track 1 batch 2 added ~13 KiB across the three
larger card-machine page chunks + their `QUIZ` arrays — same single
shared `quiz.ts` chunk).

**Recent commits** (newest first):

```
64e5e5e feat(card-machine): wire mountQuiz across remaining 3 card-machine games (Track 1: 4 of 11)
5cc3092 docs: roll Dinosaurs quiz wiring into PROGRESS / README / SESSION-HANDOFF (Track 1: 1 of 11)
da97b21 feat(dinosaurs): wire mountQuiz against in-deck QUIZ — first non-story consumer of src/lib/quiz.ts (Track 1: 1 of 11 wired)
9b69b85 docs: roll Honest Woodcutter port + 13/13 migration completion into PROGRESS / README / SESSION-HANDOFF
ca2fa2d feat(woodcutter): port Honest Woodcutter on StoryLayout (13/13 — migration complete) + extract src/lib/quiz.ts
bcacab4 docs: roll Daily Routines port (12/13) + StoryLayout shell into PROGRESS / README / SESSION-HANDOFF
9813cbc feat(routines): port Daily Routines on new StoryLayout (12/13) + first story-flow shell + scoped routines.css art
5a2881c docs: roll Hindi port into PROGRESS/README/SESSION-HANDOFF (11/13 — foundational-set chapter closed)
0cebf69 feat(hindi): port Hindi varnamala on GridLayout (11/13) + tricolor palette + Sari/Bowl-with-spoon substitutions
9803dbc chore(tooling): bake ASTRO_TELEMETRY_DISABLED=1 into npm scripts + add PRE-FLIGHT docs
```

---

## What just shipped this session (Track 1 of post-migration polish, batch 2: card-machine sweep complete — 4 of 11 wired)

Same-day follow-up to the Track 1 batch 1 (Dinosaurs) ship — see
"What shipped just before this" below for batch 1 detail. This
session **closes the card-machine sweep**: all four card-machine
games (Dinosaurs, Flashcards, Solar System, Weather) now run real
`mountQuiz` flows in place of their `alert(…)` Quiz / Stats stubs.
The cost-zero CSS prediction from batch 1 held: these three games
inherited the `.cm-quiz-overlay` modal shell + 4-theme
`--cm-quiz-*` palette tokens that batch 1 paid for, so this commit
ships **only data + page wiring** — no new CSS, no new shared
library, no new layout primitives. The shared `quiz.h5Df3D_T.js`
chunk grows from 3-way deduped to **6-way deduped** (same hash,
byte-for-byte identical bundle, just three more importers).

1. **Audit** — read `src/pages/games/{flashcards,solar-system,weather}-game.astro`
   + their data files. Confirmed the existing per-game confetti
   palettes (`FLASH_COLORS` / `SPACE_COLORS` / `WEATHER_COLORS`)
   could be reused unchanged for the `mountQuiz` `onPerfect`
   callback; confirmed the existing keyboard-nav handlers
   (ArrowLeft/Right + Space/Enter) needed the same suspension-while-modal-open
   guard that Dinosaurs got in batch 1; confirmed every option
   string I planned to use in the Flashcards cross-deck quiz exists
   as a real card name in one of the 14 decks (verified via grep
   pre-commit).
2. **Author 5-question `QUIZ` per data file** — typed as
   `readonly QuizQuestion[]` (imported from `@/lib/quiz`).
   - **`src/data/flashcards.ts`** — *cross-deck* recognition
     questions (the whole point of a 14-deck flashcards game), so
     each question mixes options from different decks. E.g. "Which
     is a fruit?" → Lion / Apple / Triangle / Trumpet (animal /
     food / shape / instrument); "Which is a vehicle?" → Banana /
     Crocodile / Bicycle / Square; "Which is an insect?" → Eagle /
     Butterfly / Dolphin / Apple; "Which is a shape?" → Penguin /
     Pizza / Star / Drum; "Which is a musical instrument?" → Tiger
     / Train / Strawberry / Guitar. Storage key: `flashcards_quiz_v1`.
   - **`src/data/solar-system.ts`** — questions about the deck
     content (biggest planet, planet with rings, hottest planet,
     Red Planet, what the Sun is made of). Every answer is
     derivable from the per-card `f` fact text. Storage key:
     `solar-system_quiz_v1`.
   - **`src/data/weather.ts`** — recognition (rainbow has 7
     colours, snowflakes are unique) + pedagogy (which season for
     leaves changing colour, what to do during a thunderstorm —
     stay indoors). Storage key: `weather_quiz_v1`.
3. **Wire each `*-game.astro` page** — same Dinosaurs pattern, applied
   three times:
   - Hidden `#quizOverlay` modal markup added as a `CardMachineLayout`
     sibling (parallel to `.done-overlay` but `position: fixed` so
     it can open mid-deck) — close button + per-game heading
     ("🧠 Quick Flashcards Quiz" / "🧠 Quick Solar System Quiz" /
     "🧠 Quick Weather Quiz") + `#quizBody` for questions +
     `#quizResult` for the score panel + retry/close action buttons.
   - Added `QUIZ` + `mountQuiz` imports + a per-game `GAME_ID`
     constant.
   - Replaced the Quiz `alert(…)` stub with a `mountQuiz` call wired
     to the new modal + Esc / click-outside / Close-button dismissal
     handlers. Per-game `messages` config carries that game's
     perfect-score copy ("Perfect score! You are a flashcard star!"
     / "Stellar! Perfect score!" / "Brilliant! Perfect score!" —
     each matches the tone of that game's existing `.done-overlay`
     heading).
   - Replaced the Stats `alert(…)` stub with a real Stats panel that
     reads `quiz.getState()` and surfaces game-specific aggregations:
     Flashcards (deck count: 14, total cards across all decks,
     attempts, best score, last played); Solar System (space
     objects in deck: 11, attempts, best score, last played);
     Weather (weather cards in deck: 20, attempts, best score, last
     played).
   - Quiz keyboard nav suspended while the modal is open across all
     three pages (Arrow keys + Space + Enter behind the modal are
     intercepted by the same Esc-key dismisser block in the keyboard
     handler).
4. **Build verified**: `npm run check` 0/0/0 across **43 files**;
   `npm run build` 14 pages in 6.12 s. Notable invariants:
   - **`quiz.h5Df3D_T.js` shared chunk now 6-way deduped**
     (Routines + Woodcutter + Dinosaurs + **Flashcards + Solar
     System + Weather**). Same hash as the Dinosaurs ship — bundle
     content unchanged, just three additional importers. Per-game
     cost of joining the shared lib stays *zero* JS.
   - Per-page chunk deltas predictable, all within ±0.04 KB of the
     Dinosaurs +0.67 KB baseline:
     - flashcards 11.30 → **11.96 KB** gzip (+0.66 KB)
     - solar-system 2.68 → **3.28 KB** gzip (+0.60 KB)
     - weather 3.36 → **4.05 KB** gzip (+0.69 KB)
   - **CSS bundle byte-for-byte identical** to the Dinosaurs ship
     (`dinosaurs-game.*.css`, the shared card-machine bundle, did
     not change). Verified at the chunk level: 0 new `cm-quiz-*`
     selectors introduced; the 12 from the batch-1 ship cover every
     modal surface across all four card-machine games.
   - **Bidirectional CSS isolation re-verified**: 0 `.cm-quiz-*`
     selectors leak into any of the 7 grid bundles + 2 story
     bundles. The new `cm-quiz-overlay` HTML element appears
     in all four card-machine HTML pages (`#quizOverlay` count = 1
     per page) and 0 other pages.
   - **Per-page `gameId` literal isolation verified**: each
     card-machine bundle contains its own gameId literal exactly
     once (`"flashcards"` × 1, `"solar-system"` × 1, `"weather"` ×
     1, `"dinosaurs"` × 1) and **0** cross-bundle leakage. Each
     game writes to its own LocalStorage key.
   - **0 `alert(…)` "not yet implemented in this POC" stubs remain
     in `dist/`** — exhaustive grep across all 14 HTML pages
     returned zero hits.
5. **Live deploy verified within ~45 s** of push: all 4 card-machine
   pages plus a sample grid game (`/games/alphabets-game`) and both
   story games (`/games/daily-routines-game`,
   `/games/woodcutter-story`) still HTTP 200 — no regressions
   across any layout.

**The grid games (Track 1 batch 3 — Alphabets / Numbers / Colors /
Shapes / Animals / Birds / Hindi) are next**, and they trigger the
rule-#3 *"third consumer triggers a refactor"* decision: ship a
third per-layout block in `grid.css` (`.gl-quiz-overlay` +
`.gl-quiz-card` shell + scoped inner selectors) **or** extract the
inner `.quiz-question` / `.quiz-opt` / `.quiz-result-*` selectors
that `mountQuiz` writes into a shared `src/styles/quiz-modal.css`
consumed by all three layouts. Lean toward extraction — three
layouts now want the same inner DOM, the inner styles haven't
drifted since they were copy-pasted at the Dinosaurs port, and the
existing `.cm-quiz-card` / `.gl-quiz-card` outer-shell scope keeps
theming clean either way.

**Worked example to copy for batch 3**: any of the 4 wired
card-machine games is a clean reference, but **Weather** is the
most representative because it has both filter pills + a
`seasonLabel` helper, mirroring the grid games' filter shape. The
modal markup is ~13 lines + the script-side wiring is ~80 lines
(QUIZ data + mountQuiz mount + open/close + Stats getState() read
+ keyboard suspend).

Commit `64e5e5e` *(feat)* + docs commit *(this entry)*.

---

## What shipped just before this (Track 1 of post-migration polish, batch 1: Dinosaurs gets a real quiz, 1 of 11 wired)

Same date 2026-05-08 (earlier in the day). First step into the
post-migration polish backlog. Migration stays at 13/13 — this is
*iterative* polish work: replacing the `alert(…)` Quiz / Stats
stubs across the 11 non-story games with real flows on the
`src/lib/quiz.ts` controller that shipped with Woodcutter.
Dinosaurs went first because it's the smallest card-machine deck
(15 cards) and the cheapest first wiring to validate the modal
pattern.

1. **Author 5-question `QUIZ` in `src/data/dinosaurs.ts`** — typed
   as `readonly QuizQuestion[]` (imported from `@/lib/quiz`).
   Questions draw verbatim from the existing card facts so a child
   who has flipped through the deck can score 100 % from memory
   (Triceratops three horns, Diplodocus sonic-boom tail, Pterodactyl
   flying reptile, Velociraptor turkey-sized + feathered, Mammoth
   ice-age). LocalStorage key: `dinosaurs_quiz_v1`.
2. **Add `.cm-quiz-overlay` + `.cm-quiz-card` modal shell to
   `src/styles/card-machine.css`** (~150 new LoC, parallel to the
   pre-existing `.done-overlay` but `position: fixed` so it can
   open mid-deck, not just on completion) + the inner
   `.quiz-question` / `.quiz-opt` / `.quiz-result-*` selectors that
   `mountQuiz` writes, scoped under `.cm-quiz-card` so they never
   leak to grid or story bundles. 8 new `--cm-quiz-*` design tokens
   on `body.card-machine` + per-theme overrides for **flashcards**
   (orange/coral), **solar-system** (purple/lavender), and
   **weather** (navy/blue) — so the remaining 3 card-machine games
   inherited the modal shell + 4-theme palette free of charge in
   batch 2 (above). Dark mode + `<600px` mobile tweaks included.
3. **Wire `dinosaurs-game.astro`** — added hidden `#quizOverlay`
   modal markup (close button + heading + `#quizBody` for questions
   + `#quizResult` for the score panel + retry/close action
   buttons). Replaced the Quiz `alert(…)` stub with a `mountQuiz`
   call wired to the new modal + Esc / click-outside / Close-button
   dismissal handlers. Replaced the Stats `alert(…)` stub with a
   real Stats panel that reads `quiz.getState()` and surfaces deck
   size + attempts + best score + last played. Keyboard nav on the
   deck (Arrow keys + Space/Enter) is suspended while the modal is
   open so it doesn't navigate the deck behind the dimmed overlay.
4. **Build verified**: `npm run check` 0/0/0 across 43 files;
   `npm run build` 14 pages. Dinosaurs page chunk: 3.04 KB → 3.71
   KB gzip (+0.67 KB for the modal handlers + `mountQuiz` import +
   Esc-key / click-outside dismissers + Stats panel `getState()`
   read). `quiz.h5Df3D_T.js` 3-way deduped at this point (Routines
   + Woodcutter + Dinosaurs).
5. **Live deploy verified** ~45 s of push;
   `/games/dinosaurs-game` HTTP 200, no regressions.

Commits `da97b21` *(feat)* + `5cc3092` *(docs)*.

---

## What shipped before this (Honest Woodcutter port — 13th and final game)

**Closed the migration.** Last vanilla game ported, second-consumer
refactor extracted, `flashcards.ts` Bongo bug folded in as a cleanup.
The "story games" chapter is now closed alongside the foundational-set
and reference-catalogue chapters.

1. **Audit `kids-learning-games/games/woodcutter-story.html`** — single
   CSS-animated hero scene composition: woodcutter character (head +
   body + arms + chopping axe) chopping by a river, with sun + 2
   clouds + 3 trees + animated wave overlay + 100 JS-injected
   twinkling stars. On load, vanilla auto-runs a choreographed timeline
   — woodcutter drops his axe at 1 s (`.scene.animated .woodcutter`
   gets a 2 s drop animation) → splash on the river at 2-3.5 s → fairy
   appears at 3-5 s with a scale-and-rotate entrance → fairy floats
   forever from 5 s → golden axe rises with rotation at 6-9 s → silver
   axe rises at 9-12 s. Below the scene: 4 paragraphs of continuous
   prose + golden moral panel ("Honesty is always rewarded") +
   6-question multiple-choice quiz + Play-Animation/Reset buttons.
   Vanilla auto-starts the quiz on load. Storage key:
   `woodcutter_progress` with `{ quizAttempts, bestScore, lastPlayed }`
   shape (similar to `routines_quiz_v1` but with `quizAttempts` instead
   of `attempts`). **Confirmed: not paginated**, no prev/next, no
   progress bar — single hero scene + linear prose + always-visible
   quiz.
2. **Audit `src/pages/games/daily-routines-game.astro`** — found the
   inline quiz block (`loadQuizState` / `saveQuizState` /
   `escapeHtml` / `startQuiz` / `renderQuestion` / `onQuizAnswer` /
   `showQuizResult` + the `quizBody` click delegation). ~80 lines of
   page-local TS that should now move to the shared lib.
3. **Audit `src/layouts/StoryLayout.astro`** — found that the layout
   shell *never enforced* the progress bar / Prev / Next chrome.
   Those elements live in the consuming page's slot content, not in
   the layout. The pre-port docs assumed we'd need a `pagination={false}`
   prop or a `StoryLayout--single` variant; the audit revealed neither
   is necessary. The Woodcutter page just omits the progress bar +
   Prev/Listen/Next controls from its slot, the layout stays neutral,
   and the existing `theme: 'routines' | 'woodcutter'` prop +
   pre-existing FOUC pre-dark rule for `[data-theme='woodcutter']`
   are everything we need.
4. **Build `src/lib/quiz.ts`** — the second-consumer refactor.
   Exports `QuizQuestion` (now imported by both `routines.ts` and
   `woodcutter.ts` instead of each declaring their own) +
   `QuizState` types; `loadQuizState(gameId)` /
   `saveQuizState(gameId, s)` / `clearQuizState(gameId)` /
   `escapeQuizHtml(s)` helpers; and `mountQuiz(config)` controller
   that renders questions, scores them, persists state, fires
   `onPerfect` for confetti, and handles a single delegated click
   listener on the body element. Per-game `messages` overrides,
   configurable `greatGteThreshold` (default 63 %), idempotent
   `start()` for retries.
5. **Refactor `daily-routines-game.astro`** — drops the local
   `QuizState` interface + `loadQuizState` / `saveQuizState` /
   `escapeHtml` / `startQuiz` / `renderQuestion` / `onQuizAnswer` /
   `showQuizResult` / the `quizBody` click delegation; replaces
   them with a single `mountQuiz({ gameId: 'routines', questions: QUIZ,
   bodyEl, resultEl, ..., onPerfect, playTap })` call. Page keeps the
   page-specific bits: `data-mode='quiz'` body toggle (hides the
   progress bar + scene-box + Prev/Listen/Next while quiz is showing
   — Routines-only), the "Read Again" button (resets the page to
   scene 1 — Routines-only, no Woodcutter equivalent).
6. **Build `src/data/woodcutter.ts`** — typed exports: `STORY` (the 4
   prose paragraphs verbatim from vanilla), `MORAL` (verbatim),
   `QUIZ` (6 `QuizQuestion` entries verbatim from vanilla
   `storyQuizData`), `SCENE_ART_HTML` (pre-rendered hero-scene
   markup as a single string — sun + 2 clouds + 3 trees + river +
   wave + woodcutter character + fairy character + golden axe +
   silver axe + splash + 60 deterministic background stars). ~85-line
   header doc covering the layout decision rationale (no new prop
   needed), the storage-key harmonisation (`woodcutter_progress` →
   `woodcutter_quiz_v1`), the animation choreography, and the
   pre-rendered-stars decision.
7. **Build `src/styles/woodcutter.css`** — per-scene CSS art primitives
   (sun, clouds, trees, river+wave, woodcutter, fairy, axes, splash,
   stars) + the `.story-prose` reading panel + the `.story-moral`
   golden-scroll panel. **All selectors scoped under `.woodcutter-art`**
   (the marker class on the `<div class="scene-art woodcutter-art">`
   container) and **all keyframes prefixed `woodcutter-*`**
   (`woodcutter-twinkle` / `-sun-glow` / `-cloud-move` / `-sway` /
   `-wave` / `-chop` / `-drop` / `-splash` / `-fairy-appear` / `-float`
   / `-wing-flap` / `-axe-rise`) for bidirectional collision-freeness
   with `routines.css`. Hero-scene height overridden to 500 px on
   desktop / 380 px on mobile (story.css default `.scene-art` is
   340 px / 240 px — Routines per-scene panels are smaller). Dark-mode
   tweaks for the prose surface (moral keeps its golden palette as a
   "scroll of wisdom" UI element).
8. **Update `src/styles/story.css`** — flesh out the woodcutter theme
   block (was a placeholder palette). New tokens: `--st-bg` deep navy →
   purple twilight gradient `#1e3c72 / #2a5298 / #7e22ce` lifted from
   vanilla `body { background: linear-gradient(...) }`, `--st-btn-next-bg`
   navy/blue, `--st-btn-prev-bg` neutral grey, `--st-btn-restart-bg`
   purple, `--st-quiz-heading` deep navy, `--st-quiz-opt-bg` soft
   blue-violet, `--st-done-accent` gold. Plus a dark-mode override
   for `body.dark-mode.story[data-theme='woodcutter']` (deeper
   night-sky body bg + brighter quiz heading + dark-mode quiz options).
9. **Build `src/pages/games/woodcutter-story.astro`** — uses
   `StoryLayout` with `theme="woodcutter"`. Renders header + single
   `.scene-box` containing the entire pre-rendered hero scene
   (`set:html={SCENE_ART_HTML}`) + Play Animation / Reset button row
   + 4-paragraph prose article + moral panel + always-visible
   `.quiz-box` with score panel pre-rendered. Inline `<script is:inline>`
   sets `--st-bg` to the woodcutter gradient before hydration. Client
   `<script>` block snapshots the original scene innerHTML at hydration
   and replays it on Play / Reset (re-setting innerHTML restarts all
   CSS animations — cleaner than vanilla's `style.animation = 'none'`
   reset). Mounts `mountQuiz({ gameId: 'woodcutter', questions: QUIZ,
   ..., messages: { perfect: 'Perfect! You truly understood the
   story!', great: 'Great job!', keepReading: 'Read the story again
   and try once more!' }, onPerfect: () => launchConfetti(WOODCUTTER_CONFETTI),
   playTap })` and calls `quiz.start()` immediately on load to match
   vanilla's auto-start behaviour. Reset additionally restarts the
   quiz from question 1.
10. **Wire** `GameNav.astro` (add Woodcutter link) + `index.astro` home
    tile (flip `ready: true` with full description copy).
11. **Fix `src/data/flashcards.ts`** — Bongo's image path:
    `Long%20Drum/3D/long_drum_3d.png` → `Long%20drum/3D/long_drum_3d.png`
    (lowercase d). Single-character fix; image now returns 200 OK from
    Microsoft's CDN.
12. **Build verification:** `npm run check` 0/0/0 across **43 files**
    (was 40 — +4 new files: woodcutter.css/.ts/.astro + quiz.ts;
    routines page lost ~80 lines but still 1 file). `npm run build`
    **14 pages** emitted in 8.2 s. Notable: shared `quiz.h5Df3D_T.js`
    chunk emitted at 1.80 KB raw / 0.98 KB gzip; pre-paint layout
    chunks unchanged (3-way dedup preserved); shared CSS bundle
    `daily-routines-game.Cgea29N_.css` now serves 2 pages (was 1).
13. **Live deploy verified within ~90 s** of push:
    `/games/woodcutter-story` HTTP 200, all 12 prior live URLs still
    200 (no regressions across all 4 card-machine + 7 grid + Routines).
    SSR markup sniff confirms 60 stars, 4 prose paragraphs, golden +
    silver axes, splash, fairy ensemble, moral text, Comprehension
    Quiz heading all rendered server-side. Bidirectional chunk dedup
    invariants verified at the bundle level: `quiz.h5Df3D_T.js` 2-way
    (routines + woodcutter), `progress.Czz_LiQd.js` 8-way (no
    woodcutter), `fluent.rTHKURu4.js` 6-way (no woodcutter),
    `achievements.DT2pP3cz.js` 13-way. Bidirectional CSS isolation:
    0 `.woodcutter-art` selectors in the routines page bundle, 0
    `.routines-art` selectors in the woodcutter page bundle, 0
    `cm-*` / `gl-*` selectors in either story bundle.

**Layout decision codified at port time**: reuse `StoryLayout` with
the page omitting the progress bar / Prev / Next chrome. **No new
prop, no new variant.** Total cost: zero changes to `StoryLayout.astro`,
~30 new lines of theme tokens in `story.css`, ~370 lines of new
`woodcutter.css` (per-scene art + prose + moral primitives), ~165
lines of `src/data/woodcutter.ts`, ~145 lines of page, plus the
shared `src/lib/quiz.ts` (~195 lines) which is *not* a Woodcutter
cost — both story games now share it.

Full changelog entry: `PROGRESS.md` → "2026-05-08 — Honest Woodcutter
ships on `StoryLayout` + `src/lib/quiz.ts` extracted (13/13 games —
migration complete)".

---

## Next session: post-migration polish

The migration is **13/13 done**. The "Resume here next session"
marker in `PROGRESS.md` no longer points at any game port — it
now points at the post-migration backlog. There are four candidate
tracks; pick one (or run them sequentially in roughly the order
below — that's also the prioritisation in `PROGRESS.md` →
"Rough order of payoff" → "Post-migration polish").

### Track 1 — Wire `mountQuiz` across the 11 non-story games (highest payoff, 4 of 11 done — card-machine sweep complete)

**Status (2026-05-08, end of day)**: card-machine sweep complete.
**Dinosaurs + Flashcards + Solar System + Weather all wired** —
4 of 11 non-story games done. Commit history: batch 1 = `da97b21`
(Dinosaurs first, paid the one-time CSS cost for the
`.cm-quiz-overlay` modal shell + 4-theme `--cm-quiz-*` palette in
`card-machine.css`); batch 2 = `64e5e5e` (Flashcards + Solar
System + Weather, *zero* new CSS — they inherited the modal
infra free). All four card-machine pages now write to their own
LocalStorage state via per-game `gameId`
(`dinosaurs_quiz_v1` / `flashcards_quiz_v1` /
`solar-system_quiz_v1` / `weather_quiz_v1`).
`quiz.h5Df3D_T.js` shared chunk now **6-way deduped** (4
card-machine + 2 story games).

**Suggested next batch (Track 1 batch 3) — the 7 grid games**
(Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi). This
is the **third consumer of the inner `.quiz-question` /
`.quiz-opt` / `.quiz-result-*` selectors** that `mountQuiz` writes
— inline in `story.css` (story-flow shell), inline in
`card-machine.css` (card-machine shell), and now needed for the
grid shell. Per rule #3 *("refactor trigger = second/third
consumer")*, that's the trigger to extract those inner selectors
to a shared `src/styles/quiz-modal.css` (or just `quiz.css`)
imported by all three layouts. Keep the *outer* shell selectors
(`.cm-quiz-overlay`, `.gl-quiz-overlay`, story's `.quiz-box`
inline panel) per-layout since they have genuinely different
layout semantics (modal overlay vs always-visible inline). **Lean
toward extraction** — three layouts now want the same inner DOM,
the inner styles haven't drifted since they were copy-pasted at
the Dinosaurs port, and the existing `.cm-quiz-card` /
`.gl-quiz-card` outer-shell scope keeps theming clean either way.

**Per-grid-game cost (after the extraction)**: ~40 LoC of page
glue (a tiny bit more than card-machine because the grid game's
Stats panel typically also surfaces "tiles learned vs total"
from the `progress.ts` store on top of `quiz.getState()`) + 5
questions in `src/data/<game>.ts` + a one-time additive
`.gl-quiz-overlay` + `.gl-quiz-card` shell block in `grid.css`
that draws on the freshly-extracted inner selectors. Mirror the
4 card-machine pages' pattern verbatim:

1. **`src/data/<game>.ts`** — add `import type { QuizQuestion } from '@/lib/quiz';`
   then `export const QUIZ: readonly QuizQuestion[] = [ ... ]`.
   For grid games, draw questions from the deck content (Hindi
   has 48 characters, Alphabets has 26, Animals has 37, etc. —
   pick the most-recognised members).
2. **The page** — add a sibling `<div class="gl-quiz-overlay" id="quizOverlay">`
   modal (or `cm-quiz-overlay` if we keep the outer shells
   per-layout — decide at refactor time) with the same internal
   structure as the 4 card-machine wirings (close button +
   heading + `#quizBody` + `#quizResult` with emoji/text/actions
   + retry/done buttons).
3. **Replace the Quiz `alert(…)` stub** (every grid game still
   has one — verified pre-merge) with a `mountQuiz` call
   (`gameId: '<game>'`, `questions: QUIZ`, the four element
   refs, `onPerfect: () => launchConfetti(...)`, `playTap`).
   Wire the open / close / retry / Esc / click-outside handlers.
4. **Replace the Stats `alert(…)` stub** with a real Stats panel
   that reads `quiz.getState()` *and* `loadProgress(GAME_ID)` (the
   per-tile learned `Set<string>`) — the grid games have richer
   stats than card-machine (they track which tiles have been
   tapped). Surface tiles-learned + total-tiles + attempts + best
   score + last played.
5. **Suspend keyboard nav** while the modal is open — copy the
   guard from any of the 4 card-machine pages verbatim.

**Worked example to copy**: any of the 4 wired card-machine
games is a clean reference, but **Weather** is the most
representative because it has both filter pills + a `seasonLabel`
helper, mirroring the grid games' filter-bar shape. The modal
markup is ~13 lines + the script-side wiring is ~80 lines (QUIZ
data + mountQuiz mount + open/close + Stats getState() read +
keyboard suspend).

**Don't add a Stats modal yet** — the per-page `alert(…)`-style
Stats panel is good enough for now (matches the existing pattern
across the 4 card-machine games). Once all 11 non-story games
are wired, then decide whether the Stats panel deserves a global
modal (in the layouts) or a dedicated `/stats` page.

### Track 2 — Playwright smoke tests (one suite per layout)

Three suites: card-machine, grid, story. Each parameterised over
themes inside the suite. Per-layout test scope:

- **CardMachineLayout** (Dinosaurs, Flashcards, Solar System,
  Weather) — load page, assert deck count, click a card, assert
  detail-pane render (Fluent image / pure CSS art / detailed
  text), click Quiz button, assert overlay open, answer
  questions, assert score panel + LocalStorage write.
- **GridLayout** (Alphabets, Numbers, Colors, Shapes, Animals,
  Birds, Hindi) — load page, assert tile count, click a tile,
  assert detail-pane render + audio TTS event firing
  (`speechSynthesis.speak` mock), filter pills change visible
  tiles, completion-overlay fires after all tiles tapped, golden
  confetti DOM nodes appear.
- **StoryLayout** (Daily Routines, Honest Woodcutter) — load
  page, assert SSR'd scene art, click Next / Listen / Prev
  (Routines only), reach end of story, quiz appears, answer
  questions, assert score panel + LocalStorage write +
  perfect-score confetti.

**Setup**: install `@playwright/test`, configure `playwright.config.ts`
to run against `npm run preview` (dist/ output), add `npm test`
script, optionally wire into the GH Actions workflow as a
gate-on-merge check.

### Track 3 — Option C decision (unified `DeckLayout`)

Now unblocked since both shared libs (`progress.ts` + `quiz.ts`)
exist. **Current evidence still leans *separate***:

- Different detail-payload shapes (Fluent image vs pure CSS shape
  gallery vs CSS count grid vs scene art with prose vs hero scene
  with prose + moral panel).
- Different filter bars (Animals 6-pill vs Hindi bilingual 3-pill
  vs Routines no-filter vs Woodcutter no-filter).
- Different state shapes (`Set<string>` for grid progress vs
  `{ attempts, bestScore, lastPlayed }` for story quiz state vs
  no per-item state at all for Woodcutter).
- Different page rhythms (browse a deck → flip vs scan a chart
  → tap vs follow a story → quiz at end).

**Best decided after Track 1 lands** — the per-game Quiz wiring
will surface either "all 13 games share the same modal" (lean
*together*) or "the modal needs game-specific entry points and
state schemas" (lean *separate*). If the answer is *together*,
the per-layout shells could collapse into a single
`DeckLayout.astro` with a `view: 'grid' | 'card' | 'story'` prop.
If *separate*, leave the three shells.

### Track 4 — Cut-over plan (vanilla → Astro)

Migrate the live `kids-learning-games` GH Pages site to serve the
Astro `dist/` build. The hard part isn't the file copy — it's the
PWA service-worker handoff. Existing installs of the vanilla PWA
have a SW registered against the vanilla scope; if we just swap
the assets, the SW will continue serving stale vanilla content
from cache until it expires.

**Strategy** (sketch — needs a session of investigation):

1. Bake a "kill switch" SW into the vanilla repo *first*: a
   minimal SW that on activate calls `self.registration.unregister()`
   then forces a hard reload. Ship this as a vanilla update; let
   it propagate over ~24-48 h.
2. Only then deploy the Astro build to the vanilla repo's GH
   Pages domain. The new SW (Workbox-generated) will install
   fresh and serve the Astro assets. No stale vanilla cache.
3. Validate with a manual test on a phone that has the vanilla
   PWA installed: install vanilla → wait for kill-switch → push
   Astro → confirm the next launch serves Astro.

**Open questions**: which domain becomes the canonical one? Do
we keep `kids-learning-games-astro.github.io` as the staging
mirror, or fold it back? Routing under `/` vs `/games/`?
Discuss before implementation.

---

### Reading order for the next agent (post-migration)

1. **`PROGRESS.md`** — re-read "Resume here next session" + "Rough
   order of payoff" → "Post-migration polish".
2. **This file** → "Next session: post-migration polish" (this
   section).
3. **`src/lib/quiz.ts`** + the 2 consumer pages
   (`daily-routines-game.astro`, `woodcutter-story.astro`) — the
   shape `mountQuiz` expects.
4. **One non-story page** as the wiring target — e.g. start with
   `src/pages/games/animals-game.astro` (it has the most
   user-facing content) or `dinosaurs-game.astro` (smallest, fewest
   moving parts).
5. **`src/data/animals.ts`** (or whichever page you target) for
   where to add the `QUIZ` export.

---

## Tool / environment gotchas (hit during this session)

These tripped me up — bake them in early. The PRE-FLIGHT block at the
top of this file is the 60-second version; this is the rationale.

- **Use `npm run check` / `npm run build` — not raw `astro` or `npx astro`.**
  As of 2026-05-07 the npm scripts in `package.json` have
  `ASTRO_TELEMETRY_DISABLED=1` baked in, so they run cleanly in the
  **default sandbox** (no `["all"]` escalation needed). Why this matters:
  - **Astro telemetry blocks the sandbox.** Without that env var, astro
    tries to write to `~/Library/Preferences/astro` (outside the
    workspace) and fails with `EPERM: operation not permitted, mkdir`.
  - **`npx astro check` can hang on an interactive prompt.** With newer
    npm versions, `npx astro check` may try to install astro@6 from the
    registry instead of resolving the local astro@5, then
    `@astrojs/check` may also be missing and astro prompts "Continue?
    Yes / No" on stdin — invisible behind a `tail` pipe and the command
    hangs forever.
  - The escape hatch (still works if npm scripts are unavailable):

    ```bash
    cd "/Users/aakasjai/Documents/GIT Projects/Github_AJ/kids-learning-games-astro"
    ASTRO_TELEMETRY_DISABLED=1 node ./node_modules/astro/astro.js check
    ASTRO_TELEMETRY_DISABLED=1 node ./node_modules/astro/astro.js build
    ```

- **The Shell tool's `working_directory` parameter has dropped silently.**
  Hit this on 2026-05-07 — set `working_directory` to the project
  absolute path, the shell's reported CWD matched, but `npm run check`
  then errored saying it couldn't find `package.json` in the **parent**
  directory. Always chain `cd "<absolute path>" && …` into the command
  itself; treat `working_directory` as a hint at best.
- **`["all"]` shell mode = fresh shell, no preserved CWD or env.**
  Each `["all"]` invocation starts a brand-new zsh that does not
  inherit the workspace shell's CWD, exports, or PATH hashes. Always:
  - Re-`cd` with the absolute path inside the same `["all"]` invocation.
  - Use absolute binary paths if you need fixed tools
    (`/opt/homebrew/bin/node`, `/usr/bin/curl`, `/bin/echo`).
  - Re-export any env vars the command depends on.
- **`["all"]` shell mode also loses some PATH hashes.** Even when PATH
  is correct, built-ins like `grep` / `sort` / `head` occasionally
  report `command not found`. Workaround: use the IDE's `Grep` tool
  for searching instead of spawning shell processes. For `curl`, use
  full path `/usr/bin/curl`.
- **`git push` needs `["all"]`.** Corp TLS interception blocks the
  default sandbox's outbound proxy with "Couldn't establish connection
  to proxy / Operation not permitted". Any other git command (status,
  add, commit, log, diff, fetch on small refs) works in the default
  sandbox.
- **TLS interception in `["full_network"]` mode.** `curl https://...`
  returns "self signed certificate in certificate chain" inside the
  default sandbox. Use `["all"]` to escape (no MITM there).
- **GitHub Pages trailing-slash quirk.** `/games/<game>/` → 404.
  Canonical extensionless URL `/games/<game>` → 200. Astro defaults to
  `trailingSlash: 'never'` for static GH Pages projects. Sniff with
  the canonical form, or you'll think the deploy is broken. Note: the
  Astro config sets `format: 'file'`, so production paths are
  actually `/games/<game>.html` — both extensionless and `.html` work.
- **Deploy time**: ~30 seconds end-to-end after a push. Pattern:
  `for i in 1..12; sleep 15; check 200` (Animals + Birds both ~30s,
  Shapes ~25s — consistent across grid games).
- **Files in `/tmp/` from one Shell call are NOT guaranteed to persist
  to the next.** Hit on 2026-05-07 verifying live deploys —
  `curl -o /tmp/foo.html` followed by a separate `grep /tmp/foo.html`
  raised "No such file or directory". Either pipe `curl | grep`
  in one call, or write to a workspace path.

---

## Open tech debt / future work

(Most also tracked in `PROGRESS.md` → "One-off tech-debt items" + "Rough order of payoff".)

- ~~**`FLUENT_IMG_BASE` re-exports**.~~ **Done 2026-05-07** as part of
  the Animals port. All three re-exports dropped from
  `flashcards.ts` / `alphabets.ts` / `weather.ts`; consumer pages
  updated to import from `@/data/fluent` directly. Build now ships a
  single 0.09 KB `fluent.rTHKURu4.js` shared chunk.
- ~~**`src/lib/quiz.ts` extraction**.~~ **Done 2026-05-08** as part of
  the Woodcutter port. The rule-#5 *"refactor trigger = second
  consumer"* trigger is satisfied — `mountQuiz` controller +
  `QuizQuestion` / `QuizState` types + `loadQuizState` /
  `saveQuizState` / `clearQuizState` / `escapeQuizHtml` helpers all
  live in `src/lib/quiz.ts` (~195 LoC). Both story games consume it;
  2-way dedup'd via `quiz.h5Df3D_T.js` shared chunk (1.80 KB raw /
  0.98 KB gzip). Daily Routines refactored in the same commit:
  ~80 LoC of inline quiz code removed.
- ~~**`flashcards.ts` Bongo image is broken in production**.~~ **Done
  2026-05-08** as part of the Woodcutter port (cleanup commit fold-in).
  `Long%20Drum/3D/long_drum_3d.png` (capital D, returned 403) →
  `Long%20drum/3D/long_drum_3d.png` (lowercase d, returns 200).
  Single-character fix on line 360 of `src/data/flashcards.ts`.
  Surfaced during the Hindi port's bulk Fluent-path verification
  and parked as tech-debt at that commit; cleaned up here.
- **Stats + Quiz modals (per-page wiring)**. The Stats and Quiz
  modals are still `alert(…)` stubs across all 11 non-story
  ported games. The infra now exists (`src/lib/quiz.ts` shipped
  with the Woodcutter port, 2-way dedup'd). **This is the
  highest-payoff post-migration task** — see "Next session:
  post-migration polish" → Track 1 above for the wiring shape.
- **Playwright smoke tests**. One suite per layout — three suites
  (card-machine / grid / story). With both story games now live,
  the test matrix is: filter → navigate → completion overlay
  (grid + card-machine) / scene-flow → quiz → score panel
  (story). Parameterise over themes inside each suite. Not
  started. See "Next session: post-migration polish" → Track 2.
- **Option C — unified `Deck` layout with grid/card/story view
  toggle.** *Fully unblocked* as of 2026-05-08 — 13/13 games
  shipped, three layouts in production, both shared libs
  (`progress.ts` + `quiz.ts`) exist. Three pieces of evidence
  lean *separate*: different detail-payload shapes, different
  filter bars, different storage shapes (`Set<string>` for grid
  progress vs `{ attempts, bestScore, lastPlayed }` for story
  quiz state vs no per-item state for Woodcutter). **Best decided
  after Track 1 (Stats + Quiz modal wiring) surfaces how much DOM
  / CSS / JS the three layouts truly share at the
  user-interaction level.** See "Next session: post-migration
  polish" → Track 3.
- **Cut-over plan.** Migration of the live `kids-learning-games`
  vanilla repo to serve the Astro `dist/` build. Hard part is the
  PWA service-worker handoff for existing installs. Sketch in
  "Next session: post-migration polish" → Track 4. Lower priority
  than Track 1 — the Astro site at
  `aakash-jain-1.github.io/kids-learning-games-astro/` is fully
  functional standalone and can serve as the canonical URL until
  the cut-over plan is firm.

---

## User communication style (notes for the next agent)

- **Short, directive prompts**: "Continue", "Go ahead", "Lets push", "HI".
  These mean: continue the documented plan / proceed with the next item
  on the active todo list / commit + push the queued work.
- **Standing delegation** for the ship → verify → docs cycle. The
  pattern (across 7 grid ports now): commit feat → push → verify live
  deploy → commit docs → push. The user delegates this cycle.
- **Concise wins.** Show numbers, tables, before/after. Skip
  re-explaining things the user already knows. When something fails,
  show the failure *and* the fix (don't hide it).
- **Course-correction signals**. The user has occasionally pushed
  back on architectural choices (cards-vs-tiles for Alphabets, layout
  research request). When something feels ambiguous, *ask* before
  building. Better one round-trip question than a re-port.
- **Documentation discipline.** The user explicitly asked twice to
  "update progress in the file" and "update any docs files if needed".
  `PROGRESS.md` and `README.md` are treated as living artifacts, not
  README boilerplate. Every feat ships with a docs follow-up.

---

## Useful commands

```bash
# 0. ALWAYS start with this — chain it into every command (working_directory
#    parameter has dropped silently; see PRE-FLIGHT at the top of this file).
cd "/Users/aakasjai/Documents/GIT Projects/Github_AJ/kids-learning-games-astro"

# 1. dev (kills any stale dev/preview servers first)
npm run dev:fresh
# → http://localhost:4321/kids-learning-games-astro/

# 2. type-check + build (default-sandbox-friendly since 2026-05-07 —
#    ASTRO_TELEMETRY_DISABLED=1 is baked into the npm scripts).
npm run check    # ~5–15s
npm run build    # ~12–20s, includes check

# 3. git connectivity diagnostics (default sandbox is fine for these)
git remote -v
git status -sb
git ls-remote --heads origin main
ssh -o BatchMode=yes -o ConnectTimeout=8 -T git@github.com   # exits 1 by design

# 4. git push (NEEDS required_permissions: ["all"] — corp TLS interception)
git push origin main

# 5. live deploy verification (use full curl path inside ["all"] shells)
/usr/bin/curl -sS -o /dev/null -w "%{http_code}\n" -L \
  https://aakash-jain-1.github.io/kids-learning-games-astro/games/<game>

# shared-chunk verification (use IDE Grep on dist/_astro/*-game.astro_*.js)
# Pattern: progress\.[A-Za-z0-9_-]+\.js
```

---

## Summary of every user message in chronological order

(Compressed from the previous chat's full transcript. For each, the
agent's high-level response.)

1. *"Lets audit the whole project. Also find ways to improve"* →
   wrote audit covering accessibility, security, perf, PWA, etc.
2. *"Write it in a file first then we will se what we can do"* →
   audit landed as a markdown file.
3. *"Now I want to know on which latest tech stack we can implement,
   what are the better alternatives ?"* → tech-stack evaluation
   addendum (Astro vs Next vs SvelteKit, etc.).
4. *"Add it in the audit and lets do a poc for 1 game"* → first POC:
   Dinosaurs on `CardMachineLayout`.
5. *"This site can't be reached localhost…"* → fixed dev server.
6. *"Looks good"* + *"Go ahead"* → ported Flashcards.
7. *"4321 is still running, kill all servers, everything, and then
   start fresh/ maybe create a script for that as well"* → built
   `scripts/stop-dev.sh` + `scripts/dev.sh`.
8. *"Tell me, this new astro project can be hiosted live on github
   pages ?"* + *"Lets create a new repo… and push…"* → set up GH
   Pages deploy via Actions.
9. *"Lets do one by one and update progress in the file"* → ported
   Solar System.
10. *"All the games that we are migrating shall be on a similar
    patter, if there is any deviation from the original repo, we will
    implement how it is designed in the new astro repo"* → codified
    migration principles in PROGRESS.md (Astro=patterns,
    vanilla=content).
11. Multiple *"Go ahead"* → ported Weather.
12. Built `ClassicLayout` + ported Alphabets to it (initial cards
    interpretation).
13. *"I told you in case there is any deviation we will use astro as
    main reference, now this alphabet game is not in cards design
    rather it is in tile design, lets bnot do that."* → user
    pushback. Re-ported Alphabets onto `CardMachineLayout`.
14. *"Lets push"* → pushed.
15. *"Lets re think, for alphabet the card layout or the original
    tile layot was correct ? which is better ? Check the stadnard
    games accross internet."* → researched (Starfall, Khan Kids,
    DotIAM), surfaced 3 options.
16. *"Yeah lets revert to grid layout, but maybe keep option c as a
    future change. Also in the grid layout lets redesign if needed.
    because there are issues on what we previously impmented in the
    grid layout, the left right sections were overlapping."* → built
    `GridLayout` (single-column, no two-pane), re-ported Alphabets.
17. *"Lets continue tomorrow, update any docs files if needed"* +
    *"Also make a note of pending games to be added on the layout to
    decide, also analyze from your end while implementing which
    layot is fine"* → updated docs, audited every pending vanilla
    game, locked layout decisions in PROGRESS.md.
18. *"HI"* + *"Continue"* + *"Continue"* → ported Numbers (6/13)
    extracted `progress.ts`, then ported Colors (7/13).
19. *"How to check git connectivity is workibng"* → diagnostics
    (SSH auth + `ls-remote` + `status -sb`).
20. *"Continue"* (this session) → finished queued Colors docs commit,
    ported **Shapes (8/13)**, verified live, updated docs.
21. *"Summarize full chat history so far in a file, i will open a new
    session. The chat is getting slow"* → wrote this file.
22. *"Before writing any code, do all of these in order"* + *"All
    eight md files. Don't skip any."* + *"Then propose a short
    plan"* + *"Go ahead"* + *"Go ahead"* (next session) → ported
    **Animals (9/13)** in one go: built `src/data/animals.ts` with a
    synthesized 5-group filter, the `.gl-tile--emoji` namespace +
    animals theme in `grid.css`, `animals-game.astro` page, FOUC
    rule, GameNav + home tile wiring; bonus cleanup of the
    `FLUENT_IMG_BASE` re-exports; verified all 36 unique Fluent UI
    image paths 200 OK; 33-file `astro check` clean; live deploy
    verified with 5-way shared-chunk dedup.
23. *"Continue"* (next session) → ported **Birds (10/13)** following
    the standard ship sequence: built `src/data/birds.ts` with a
    synthesized 5-group filter (`songbird` / `raptor` / `waterbird`
    / `tropical` / `ground`) + caught-and-fixed vanilla emoji
    collision (Swan + Woodpecker both keyed on `🦢`, vanilla rendered
    only 14 of 15 birds — Astro splits to `🐦` Sparrow + `🐦‍⬛`
    Woodpecker so all 15 render) + synthesized bird-call onomatopoeia
    (vanilla had none); shipped a *distinct* sunset palette
    (`#ff9a56 → #ff6a88` lifted from vanilla `birds.html`) rather
    than reuse the Animals palette, for visual differentiation
    between sister "creature" games; reused the existing
    `.gl-tile--emoji` namespace; verified all 13 unique Fluent UI
    image paths 200 OK; 35-file `astro check` clean; live deploy
    verified with **6-way GridLayout shared-chunk dedup** + **5-way
    `fluent` shared-chunk dedup**, zero regressions on prior 9 games.
24. *"Continue"* (this docs commit) → wrote this docs follow-up.
25. *"Why these issues are coming, previous chat sessions these issues
    werent there like bash, sandbox, post deployment polling, etc"* +
    *"Go ahead"* → audited the recurring shell / sandbox / npx / git
    push issues hit during the Birds port, distinguished documented
    gotchas from fresh-session quirks, then implemented the agreed
    fixes: (a) baked `ASTRO_TELEMETRY_DISABLED=1` into all `astro`
    npm scripts in `package.json` so `npm run check` / `npm run build`
    now run cleanly in the **default sandbox** with no `["all"]`
    escalation; (b) added a 5-line **PRE-FLIGHT** block at the top of
    this file (above the TL;DR) so the next agent sees the
    operational gotchas before the architectural state; (c) rewrote
    the **Tool / environment gotchas** section to lead with the npm
    scripts and added two new gotchas observed this session
    (`working_directory` parameter dropping silently; `/tmp/` files
    not persisting across `Shell` calls); (d) refreshed the **Useful
    commands** list to the new sandbox-friendly invocations, marking
    which commands need `["all"]` (only `git push`).
26. *"Continue"* (next session) → ported **Hindi (11/13 — foundational-set
    chapter closed)** following the standard ship sequence: settled
    the long-parked open layout question by shipping option (a) — single
    filter-able deck on `--capped`, mirror of Alphabets — rather than
    extending `GridLayout` with a sectioned-grid variant; built
    `src/data/hindi.ts` with 48 typed `HindiCard` entries (12 vowels +
    36 consonants, corrects the docs' "~46" estimate) + 3-key bilingual
    filter (`स्वर` / `व्यंजन`); shipped a tricolor saffron/cream/green
    flag palette (lifted from vanilla, white→cream for legibility) +
    Devanagari font-size override (+12 % on the alphabets baseline so
    `क्ष` and `ज्ञ` read as clearly as A and B); 5 Q→Crown
    substitutions including the *culturally on-point* Aurat/Woman →
    Sari (raw human emojis are a 403-class in the Fluent UI pack —
    documented as a class-of-bug in `PROGRESS.md`); 6 case-fixes on
    Fluent paths (`Long%20drum` not `Long%20Drum`, etc.); `hi-IN` voice
    at rate 0.75 for the Hindi letter+word, English fact in default
    voice; bilingual UI strings throughout (first grid game whose UI
    strings reach SSR'd HTML in non-Latin script); 36-file
    `astro check` clean in the default sandbox + 7.45s build (validating
    the 2026-05-07 tooling fixes' payoff); live deploy verified with
    **7-way GridLayout shared-chunk dedup** + **6-way `fluent`
    shared-chunk dedup**, zero regressions on prior 10 games. Pre-existing
    `flashcards.ts` Bongo image-path bug surfaced during the bulk Fluent
    verification (capital `Long%20Drum` vs lowercase `Long%20drum`) —
    flagged as one-off tech-debt for the next session that touches
    flashcards.
27. *"Continue"* (Hindi docs follow-up) → wrote the docs follow-up
    for the Hindi port, rolling it into PROGRESS.md (changelog entry +
    "11 of 13 ported" snapshot updates + per-game layout decisions
    table + tech-debt section + "Resume here next session" pointer
    moved to StoryLayout decision), README.md (game count +
    `GridLayout` description + file tree + comparison table +
    shared-module list), and this file (TL;DR + current state +
    "What just shipped" + "Next session: Story games" + tech debt).
28. *"Continue"* (next session — Daily Routines port) → audited
    `kids-learning-games/games/daily-routines.html` (10 paginated
    scenes + per-scene CSS art + 8-question quiz) and
    `woodcutter-story.html` (single CSS-animated scene + 4
    paragraphs of prose + moral panel + 6-question quiz —
    *correcting the historical "paginated story" assumption*).
    Audited `CardMachineLayout.astro` as the documented first-fit
    target; concluded it collapses for paginated stories
    (viewport-locked + two-pane + deck-of-cards DOM + OLED right
    pane all crash into the contract). **Carved out three new
    shared infra files** — `src/layouts/StoryLayout.astro`
    (third shared shell), `src/styles/story.css` (`--st-*` theme
    tokens + scrollable single-column layout), and
    `src/styles/routines.css` (per-scene CSS art primitives, all
    selectors scoped under `.routines-art` + `routines-*`-prefixed
    keyframes for collision-free namespacing). Built
    `src/data/routines.ts` (10 typed `RoutineScene` entries + 10
    `BODY_BGS` page gradients + 8 typed `QuizQuestion` entries +
    a 90-line header doc) and `src/pages/games/daily-routines-game.astro`
    (renders header + progress bar + first scene SSR'd + control
    row + hidden inline quiz block; client `<script>` manages
    scene navigation + per-scene `--st-bg` rewrite + speech +
    progress in `kids_progress_v1:routines` + quiz state in
    `routines_quiz_v1` + completion overlay + golden-confetti
    flourish; inline `<script is:inline>` sets initial `--st-bg`
    pre-hydration so the page never flashes the wrong palette).
    Quiz logic ships *page-local* per the rule-#5 *"refactor
    trigger = second consumer"* principle — Woodcutter is the
    second consumer that triggers extraction to `src/lib/quiz.ts`.
    Build verified: `npm run check` 0/0/0 across 38 files; `npm
    run build` 13 pages emitted in 7.96 s. Dropped one unused-import
    hint (`QUIZ` was imported in both frontmatter and client
    `<script>` block; removed from frontmatter). **8-way
    `progress.ts` shared-chunk dedup verified at the chunk level**
    (alphabets + numbers + colors + shapes + animals + birds +
    hindi + **routines** all import the *exact same*
    `progress.Czz_LiQd.js` — three shared modules now spanning all
    three layouts), with Routines correctly opting out of
    `fluent.rTHKURu4.js` (no Fluent UI assets — pure CSS art).
    Bidirectional CSS isolation verified: zero `cm-*` / `gl-*`
    leakage into the routines bundle; zero `.routines-art` /
    `.story-shell` / `.scene-box` / `--st-*` leakage into
    card-machine or grid bundles. All three layout pre-paint
    scripts ship byte-for-byte identical content (same Astro
    FOUC handler hash). Live deploy verified within ~45 s of push:
    `/games/daily-routines-game` HTTP 200 + SSR markup confirmed
    (`<body class="story" data-theme="routines">` + inline
    `--st-bg` setter + first scene's CSS art tree + hidden inline
    quiz block with all 8 questions + 32 option buttons +
    score panel pre-rendered); all 11 prior live URLs still 200,
    no regressions. Commit `9813cbc`.
29. *"Continue"* (this docs commit) → wrote this docs follow-up,
    rolling the Daily Routines port into PROGRESS.md (changelog
    entry + "12 of 13 ported" snapshot updates + per-game layout
    decisions table updated for Routines [shipped] and Woodcutter
    [layout TBD with single-scene audit] + tech-debt section +
    "Resume here next session" pointer moved to Woodcutter port),
    README.md (game count + `StoryLayout` added + file tree +
    comparison table + shared-module list), and this file (TL;DR
    + current state + "What just shipped" + "Next session:
    Woodcutter port" + tech debt).
30. *"Continue"* (next session — Woodcutter port; closes the
    migration) → audited
    `kids-learning-games/games/woodcutter-story.html` and
    confirmed it's a *single* CSS-animated hero scene (not
    paginated like Routines): woodcutter chops by a river → drops
    axe at 1 s → fairy appears at 3 s → golden axe at 6 s → silver
    axe at 9 s, all on choreographed CSS animation-delays + 4
    paragraphs of continuous prose + golden moral panel + 6-question
    quiz + Play-Animation/Reset buttons + auto-starting quiz on
    load. Audited `src/layouts/StoryLayout.astro` and discovered
    the layout shell *never enforced* the progress bar / Prev /
    Next chrome — those elements live in the consuming page's slot
    content, not in the layout. **This collapsed the pre-port
    "pagination={false} prop vs StoryLayout--single variant"
    debate** — zero changes to `StoryLayout.astro` were needed; the
    Woodcutter page just omits those elements from its slot.
    **Built `src/lib/quiz.ts`** (the long-deferred second-consumer
    refactor): `QuizQuestion` / `QuizState` types + `loadQuizState`
    / `saveQuizState` / `clearQuizState` / `escapeQuizHtml` helpers
    + `mountQuiz(config)` controller with per-game `messages`
    overrides, configurable `greatGteThreshold`, `onPerfect`
    callback, and `playTap` SFX hook (~195 LoC). Refactored
    `daily-routines-game.astro` to consume `mountQuiz` (~80 LoC of
    inline quiz code removed; functional behaviour identical).
    Built `src/data/woodcutter.ts` (typed `STORY` / `MORAL` /
    `QUIZ` / `SCENE_ART_HTML` exports — the SCENE_ART is a
    pre-rendered hero-scene markup string with sun + 2 clouds + 3
    trees + woodcutter character + fairy + axes + 60 deterministic
    background stars; vanilla generated 100 with `Math.random()`
    per page load, the Astro version pre-renders 60 server-side
    for SSR stability) and `src/styles/woodcutter.css` (per-scene
    art primitives + prose panel + golden moral scroll, all under
    `.woodcutter-art` with `woodcutter-*`-prefixed keyframes for
    bidirectional collision-freeness with `routines.css`). Updated
    `src/styles/story.css` woodcutter theme block (fleshed out the
    placeholder with deep navy → purple twilight + gold accents +
    blue-violet quiz palette + dark-mode override). Built
    `src/pages/games/woodcutter-story.astro` (uses `StoryLayout`
    with `theme="woodcutter"`; renders pre-rendered hero scene +
    Play / Reset buttons + 4-paragraph prose + moral panel +
    always-visible quiz; client `<script>` snapshots scene innerHTML
    at hydration and replays it on Play / Reset by re-setting the
    innerHTML — cleaner than vanilla's `style.animation = 'none'`
    reset; mounts `mountQuiz` with woodcutter-specific messages and
    confetti palette and auto-starts on load to match vanilla).
    Wired `GameNav.astro` + `index.astro` (Woodcutter tile
    `ready: true` with full description). **Cleanup fold-in**:
    fixed the Bongo image-path bug in `src/data/flashcards.ts`
    (`Long%20Drum/3D/long_drum_3d.png` → `Long%20drum/...` —
    capital D returned 403; Fluent UI uses lowercase). Build
    verified: `npm run check` 0/0/0 across **43 files**;
    `npm run build` **14 pages** in 8.2 s. Notable: shared
    `quiz.h5Df3D_T.js` chunk emitted at 1.80 KB raw / 0.98 KB
    gzip — **2-way dedup** (routines + woodcutter); pre-paint
    layout chunks unchanged (3-way dedup preserved); shared CSS
    bundle `daily-routines-game.Cgea29N_.css` now serves 2 pages
    (was 1) — 2-way CSS dedup. Bidirectional CSS isolation
    verified: 0 `.woodcutter-art` selectors in routines page
    bundle, 0 `.routines-art` selectors in woodcutter page bundle,
    0 `cm-*` / `gl-*` selectors in either story bundle. Live
    deploy verified within ~90 s of push: `/games/woodcutter-story`
    HTTP 200, all 12 prior live URLs still 200, no regressions.
    SSR markup confirmed: 60 stars + 4 prose paragraphs + golden
    + silver axes + splash + fairy ensemble + moral text +
    Comprehension Quiz heading all rendered server-side. Commit
    `ca2fa2d`. **Migration complete: 13/13 games ported and
    live.**
31. *"Continue"* (Woodcutter docs commit) → wrote the docs
    follow-up rolling the Woodcutter port + 13/13 migration
    completion into PROGRESS.md (changelog entry + "13 of 13
    ported" snapshot + per-game layout decisions table updated
    for Woodcutter [shipped, no new prop or variant] + tech-debt
    section [`src/lib/quiz.ts` extraction marked Done; Bongo image
    bug marked Done] + "Resume here next session" pointer moved
    to post-migration polish + "Rough order of payoff" reorganised
    to close all three chapters), README.md (game count + new
    `src/lib/quiz.ts` in shared-module list + file tree updated +
    comparison table updated + "What's NOT in scope" updated for
    post-migration items), and this file (TL;DR rewritten for
    13/13 + current state snapshot + "What just shipped"
    rewritten for Woodcutter + "Next session: post-migration
    polish" with 4 candidate tracks + tech debt updated). Commit
    `9b69b85`.
32. *"Go ahead"* (next session — post-migration polish kicks off) →
    started **Track 1 — wire `mountQuiz` across the 11 non-story
    games**. Picked Dinosaurs as the first wiring (smallest
    card-machine deck — 15 cards). Authored a 5-question
    `QUIZ: readonly QuizQuestion[]` array in `src/data/dinosaurs.ts`
    drawn verbatim from existing card facts (Triceratops three
    horns / Diplodocus sonic-boom tail / Pterodactyl flying reptile
    / Velociraptor turkey-sized + feathered / Mammoth ice-age).
    Added `.cm-quiz-overlay` + `.cm-quiz-card` modal shell to
    `src/styles/card-machine.css` (~150 LoC) + 8 new `--cm-quiz-*`
    design tokens on `body.card-machine` + per-theme overrides for
    flashcards (orange/coral), solar-system (purple/lavender), and
    weather (navy/blue) — so the remaining 3 card-machine games
    inherit the modal shell + 4-theme palette free of charge. Added
    hidden `#quizOverlay` modal markup to
    `src/pages/games/dinosaurs-game.astro` + `mountQuiz` controller
    wiring (Esc / click-outside / Close-button dismissal handlers,
    keyboard nav suspended while modal is open) + a real Stats
    panel reading `quiz.getState()` aggregations. Build verified:
    `npm run check` 0/0/0 across 43 files; `npm run build` 14
    pages in 7.25 s; **`quiz.h5Df3D_T.js` shared chunk now 3-way
    deduped** (routines + woodcutter + dinosaurs); page chunk
    3.04 KB → 3.71 KB gzip (+0.67 KB for modal handlers); 0
    `cm-quiz-*` CSS leakage to non-card-machine bundles; SSR markup
    confirmed. Live deploy verified within ~45 s of push:
    `/games/dinosaurs-game` HTTP 200 + 5-URL regression sweep all
    200; SSR: `id="quizOverlay"` + 7 child element ids + heading +
    0 alert stubs. Commit `da97b21`.
33. *"Continue"* (Dinosaurs docs commit) → wrote that docs follow-up,
    rolling the Dinosaurs Track-1-step-1 wiring into PROGRESS.md
    (focused changelog entry + "1 of 11 wired" status update on
    the post-migration polish item + "Resume here next session"
    pointer flipped from "Track 1 not started" to "Track 1 in
    progress, 1 of 11 wired"), README.md (small status nudge to
    the relevant "What's NOT in scope" bullet + updated comparison
    table with the new 3.71 KB Dinosaurs bundle size), and this
    file (TL;DR bullet swap to lead with Track 1 step 1 + chunk
    dedup line bumped to 3-way + "Resume here" rewritten + Recent
    commits refreshed + Dinosaurs row in current-state snapshot
    + Track 1 section in "Next session" rewritten with
    "1/11 done; suggested batch = 3 remaining card-machine games
    next" + trailing footer updated). Commit `5cc3092`.
34. *"Go ahead"* (Track 1 batch 2 — finish the card-machine sweep) →
    wired `mountQuiz` across the remaining 3 card-machine games
    (Flashcards + Solar System + Weather) in a single follow-up
    commit. Audited each page + data file in parallel, then in
    parallel authored 5-question `QUIZ` arrays in
    `src/data/{flashcards,solar-system,weather}.ts`: Flashcards
    used cross-deck recognition questions (Lion vs Apple vs
    Triangle vs Trumpet → "Which is a fruit?", etc. — every option
    verified to exist as a real card name pre-commit); Solar
    System used deck-content questions (biggest planet, Saturn's
    rings, hottest planet, Red Planet, what the Sun is made of);
    Weather mixed recognition (rainbow has 7 colours, snowflakes
    are unique) with pedagogy (which season for leaves changing
    colour, what to do in a thunderstorm). Wired each page with
    the same Dinosaurs pattern verbatim — hidden `#quizOverlay`
    modal markup added as a `CardMachineLayout` sibling, `QUIZ` +
    `mountQuiz` imports added with a per-game `GAME_ID` constant,
    Quiz `alert(…)` stub replaced with `mountQuiz` + Esc /
    click-outside / Close-button dismissal handlers + per-game
    `messages` config with that game's perfect-score copy
    ("Perfect score! You are a flashcard star!" / "Stellar!
    Perfect score!" / "Brilliant! Perfect score!"), Stats
    `alert(…)` stub replaced with a real Stats panel reading
    `quiz.getState()` plus game-specific aggregations (Flashcards:
    14 decks + total cards across all decks; Solar System: 11
    space objects; Weather: 20 weather cards), keyboard nav
    suspended while modal is open. **Zero new CSS** — these three
    inherited the `.cm-quiz-overlay` shell + 4-theme `--cm-quiz-*`
    palette that batch 1 paid for. Build verified: `npm run check`
    0/0/0 across 43 files; `npm run build` 14 pages in 6.12 s.
    `quiz.h5Df3D_T.js` shared chunk now **6-way deduped** (routines
    + woodcutter + dinosaurs + flashcards + solar-system + weather
    — same hash, byte-for-byte identical bundle, three more
    importers). Per-page chunk deltas: flashcards 11.30 → 11.96 KB
    gzip (+0.66 KB), solar-system 2.68 → 3.28 KB (+0.60 KB),
    weather 3.36 → 4.05 KB (+0.69 KB). Per-page `gameId` literal
    isolation verified (each card-machine bundle contains its own
    gameId × 1, 0 cross-bundle leakage). 0 stale `alert(…)` "not
    yet implemented" stubs remain in `dist/` across all 14 HTML
    pages. Live deploy verified within ~45 s of push: all 4
    card-machine pages + sample grid + both story games HTTP 200,
    no regressions. Commit `64e5e5e`.
35. *"Go ahead"* (Track 1 batch 2 docs commit — this entry) →
    rolling the card-machine sweep into PROGRESS.md (new dated
    changelog entry covering the 3-game batch + chunk-dedup bumped
    to 6-way + "Resume here" pointer flipped to "4 of 11 wired,
    card-machine sweep complete; next batch = 7 grid games which
    triggers rule-#3 third-consumer extraction" + production-build
    sizes table updated for the post-quiz card-machine bundles +
    the "Wire the real Stats + Quiz modals" item updated to "4 of
    11 wired"), README.md (in-progress note bumped to 4/11 with
    same-day batch context + comparison table updated for the
    three new bundle sizes + 6-way dedup mention + per-game quiz
    state list expanded to all 6 consumers + file-tree comment on
    `quiz.ts` updated + storage-table updated to list all 6
    `<gameId>_quiz_v1` consumers), and this file (TL;DR rewritten
    so "Just shipped" leads with batch 2 and the prior Dinosaurs
    bullet becomes "Shipped earlier today" + 6-way dedup
    everywhere + Recent commits refreshed + the existing "What
    just shipped" section rewritten end-to-end for the batch-2
    sweep + the prior Dinosaurs section renamed and demoted to
    "What shipped just before this" + Track 1 section in "Next
    session" rewritten with "4/11 done, card-machine sweep
    complete; next batch = 7 grid games + likely the rule-#3
    inner-selectors extraction" + line counts in Documentation
    map updated + this user-message summary appended +
    trailing-footer pointer flipped).

---

## How to use this file in the next session

1. Open this file (or have it as a recently-viewed file in the IDE).
   The new agent will pick it up via the `<open_and_recently_viewed_files>`
   context attachment.
2. **Read every markdown file listed in "Documentation map" above** —
   not just this one. Specifically:
   - `kids-learning-games-astro/PROGRESS.md` (migration principles,
     per-game decisions table, "Resume here next session" callout).
   - `kids-learning-games-astro/README.md` (file structure + comparison).
   - `kids-learning-games/dev/SESSION_CONTEXT.md` (vanilla pre-history).
   - `kids-learning-games/dev/AUDIT_2026_04.md` (why this migration exists).
   - `kids-learning-games/dev/GAME_REFERENCE.md` (vanilla porting patterns).
   - `kids-learning-games/dev/ACTION_ITEMS.md` (what's already fixed).
   - `kids-learning-games/README.md` (vanilla public README).
3. **Then explore the codebase** — at minimum:
   - **Migration is complete** as of 2026-05-08 — all 13 vanilla
     games ported. There's no "next port" to research a vanilla
     source for. The post-migration backlog is in
     `PROGRESS.md` → "Resume here next session" + Track 1-4 in
     "Next session: post-migration polish" (this file).
   - For **Track 1 (wire `mountQuiz` across non-story games)**:
     `src/lib/quiz.ts` is the API; **all 4 card-machine games are
     already wired** as worked examples (Dinosaurs / Flashcards /
     Solar System / Weather — pick any). The remaining 7 grid
     games are next; **Weather** is the most representative
     reference because it has filter pills + a `seasonLabel`
     helper, mirroring the grid games' filter-bar shape. The
     wiring shape is a hidden modal overlay (~13 lines of markup)
     + ~50–80 LoC of page-side glue (mountQuiz mount + open/close
     handlers + Stats panel reading `quiz.getState()` + keyboard
     suspend). Story games (Routines, Woodcutter) are *not* a
     good reference for the grid wirings — they use an
     always-visible inline `.quiz-box` instead of a modal.
   - For **Track 2 (Playwright)**: install `@playwright/test`,
     write three suites (one per layout), parameterise over
     themes inside each suite. The card-machine and grid suites
     can be cribbed from each other (filter → tap → detail-pane
     → quiz modal). The story suite is structurally different
     (linear flow → quiz at end).
   - For **Track 3 (Option C)**: re-read this file's "Layout
     debate history" + the three "evidence leans separate"
     bullets in "Next session: post-migration polish" → Track 3.
     Best decided after Track 1 lands.
   - The three shared layouts: `src/layouts/CardMachineLayout.astro`
     / `src/layouts/GridLayout.astro` / `src/layouts/StoryLayout.astro`.
   - The shared CSS: `src/styles/card-machine.css` /
     `src/styles/grid.css` / `src/styles/story.css` (plus
     game-specific scoped CSS like `routines.css` /
     `woodcutter.css`).
   - The shared libs in `src/lib/` (`progress.ts`, `quiz.ts`,
     `audio.ts`, `speech.ts`, `settings.ts`, `achievements.ts`,
     `fluent.ts`).
4. The next likely task is **Track 1, batch 3 — wire `mountQuiz`
   across the 7 grid games** (Alphabets, Numbers, Colors, Shapes,
   Animals, Birds, Hindi). The card-machine sweep finished on
   2026-05-08 (4/4 wired across two same-day commits — Dinosaurs
   first, then Flashcards + Solar System + Weather as a no-CSS
   batch). Batch 3 is the **third consumer of the inner
   `.quiz-question` / `.quiz-opt` / `.quiz-result-*` selectors**
   that `mountQuiz` writes — story games inline them in
   `story.css`, card-machine games scope them under `.cm-quiz-card`
   in `card-machine.css`, and the grid games trigger the rule-#3
   *"third consumer triggers a refactor"* decision: ship a third
   per-layout block in `grid.css` (`.gl-quiz-overlay` + `.gl-quiz-card`
   shell + scoped inner selectors) **or** extract the inner
   selectors into a shared `src/styles/quiz-modal.css` consumed
   by all three layouts. **Lean toward extraction.** Worked
   example to copy verbatim:
   `src/pages/games/weather-game.astro` (most representative of
   the grid shape because it has filter pills + a `seasonLabel`
   helper). Full scope under "Next session: post-migration polish"
   → Track 1 above.
5. **Do not** re-read the full chat transcript unless investigating a
   specific historical decision — the docs already capture the
   architectural conclusions.

---

*Last updated 2026-05-08 — **Track 1 of post-migration polish:
card-machine sweep complete (4 of 11 wired)**. Same-day same-date
batch 1 = Dinosaurs (paid the one-time CSS cost for the
`.cm-quiz-overlay` shell + 4-theme `--cm-quiz-*` palette in
`card-machine.css`); batch 2 = Flashcards + Solar System + Weather
(zero new CSS, just data + page wiring — the prediction from batch
1 held). Migration remains complete (13/13). `quiz.h5Df3D_T.js`
shared chunk now **6-way deduped** (4 card-machine + 2 story
games — same hash, byte-for-byte identical bundle, just five more
importers compared to the Woodcutter ship). Per-game `gameId`
isolation verified at the bundle level (`"flashcards"` /
`"solar-system"` / `"weather"` / `"dinosaurs"` each appear × 1 in
their own bundle, 0 cross-bundle leakage of LocalStorage keys). 0
stale `alert(…)` "not yet implemented" stubs remain in `dist/`
across all 14 HTML pages. Full state: foundational-set chapter
closed (7 grid games), reference-catalogue chapter closed (4
card-machine games + all 4 wired with real Quiz/Stats), story-flow
chapter closed (2 story games), three shared layouts + two
shared controllers (`progress.ts` 8-way + `quiz.ts` 6-way).
Next: **Track 1 batch 3 — wire the 7 grid games** (Alphabets,
Numbers, Colors, Shapes, Animals, Birds, Hindi); that batch is
the rule-#3 third-consumer trigger to extract the inner
`.quiz-question` / `.quiz-opt` / `.quiz-result-*` selectors into
a shared `src/styles/quiz-modal.css` consumed by all three
layouts. After the grid sweep: Stats modal decision, then
Playwright suites (Track 2), then Option C decision (Track 3 —
unified `DeckLayout` with view toggle), then the cut-over plan
for the live vanilla repo (Track 4).*
