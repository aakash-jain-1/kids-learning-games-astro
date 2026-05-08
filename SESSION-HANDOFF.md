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
- **State (2026-05-08, end of day)**: **12 of 13 games ported and live** at
  https://aakash-jain-1.github.io/kids-learning-games-astro/.
  *Foundational-set chapter closed*; *story-flow chapter open with
  one of two games shipped*. Only **Woodcutter** remains.
- **Three shared layouts** in production (one new this session):
  - `CardMachineLayout` (4 games — Dinosaurs, Flashcards, Solar System, Weather).
  - `GridLayout` (7 games — Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi).
  - **`StoryLayout`** *(new — carved out 2026-05-08)* (1 game — **Daily Routines** ← shipped this session).
- **Just shipped**: Daily Routines on a brand-new `StoryLayout`
  shell — first story-flow port. **First port that required new
  layout infrastructure** since the Numbers port (six weeks ago).
  10 paginated scenes (sunrise wake-up → toothbrush → breakfast →
  school-bag → school-bell → reading → playground → bath → dinner →
  bedtime moon-window) with per-scene CSS art + ⬅️ Previous / 🔊
  Listen / Next ➡️ controls + an inline 8-question multiple-choice
  quiz with score tracking, retry, restart, and golden-confetti
  flourish on perfect score.
- **Layout decision settled at port time:**
  - First attempt: fit it into `CardMachineLayout` (the documented
    plan since the very first audit — "first try modelling story
    pages as cards"). **Outcome: collapsed**, exactly as the audit
    predicted. `CardMachineLayout` bakes in (1) viewport-locked
    `overflow:hidden` + `100vh` body, (2) a flex two-pane layout
    with a left deck + right detail pane, (3) a hardcoded
    deck-of-cards DOM (`.deck` / `.top-card` / `.ghost` + the
    press-to-flip semantics), and (4) an OLED `.machine-screen`
    aesthetic on the right pane — all four crash into a paginated
    narrative that wants to scroll, animate per scene, and end in
    a quiz.
  - Carved out **`src/layouts/StoryLayout.astro`** instead, plus
    two new shared CSS files: **`src/styles/story.css`** (`--st-*`
    theme tokens — page background, scene-card surface, title
    color, body color, progress-bar fill, button states, quiz
    panel surface, quiz option states for default / selected /
    correct / incorrect — with the page rewriting `--st-bg` per
    scene to morph the body gradient between sunrise / midday /
    evening / night) and **`src/styles/routines.css`** (per-scene
    art primitives: sun, bed, toothbrush, table, school-bag, book,
    swing+slide, bathtub, moon-window — *all selectors scoped
    under `.routines-art`* with `routines-*`-prefixed keyframes so
    short class names like `.bed` / `.tub` / `.swing` stay
    collision-free with future story games).
- **Quiz state ships *page-local*, not in `src/lib/`.** Per the
  rule-#5 *"refactor trigger = second consumer"* migration
  principle, the quiz logic lives inline in the Routines page with
  its own `routines_quiz_v1` LocalStorage key (~100 lines of TS;
  `{ attempts, bestScore, lastPlayed }` shape that doesn't fit the
  `Set<string>` `progress.ts` exposes). Woodcutter is the second
  consumer that triggers extraction to `src/lib/quiz.ts`.
  Routines uses `progress.ts` for the *other* state shape — scenes
  visited as a `Set<string>`, exactly the right fit, same pattern
  as the seven grid games.
- **Build & verification.** `npm run check` clean (0 errors,
  0 warnings, 0 hints). `npm run build` clean (13 pages, ~7.96 s).
  **`progress.ts` shared chunk now 8-way deduped** (alphabets,
  numbers, colors, shapes, animals, birds, hindi, *and routines*
  page-chunks all reference the *exact same*
  `/_astro/progress.Czz_LiQd.js` hash — three shared modules served
  once and cached for every consumer, now spanning *all three
  layouts*). Routines correctly opts out of the `fluent.ts` chunk
  (its scene art is pure CSS — no Fluent UI assets). Bidirectional
  CSS isolation verified: zero `cm-*` / `gl-*` leakage into the
  routines bundle, zero `.routines-art` / `.story-shell` leakage
  into card-machine or grid bundles. All three layout pre-paint
  scripts (`CardMachineLayout/GridLayout/StoryLayout.astro_astro_type_script_index_*_lang.*.js`)
  ship byte-for-byte identical content (same hash from the same
  Astro-generated FOUC handler in the layout component). Live: SSR
  markup confirmed via curl; `<body class="story" data-theme="routines">`
  reaches production with the inline `--st-bg` setter, all 10
  scene IDs SSR-renderable, all 8 quiz questions + 32 option
  buttons + score panel pre-rendered (hidden until completion).
- **Resume here**: **Woodcutter port** — the last vanilla game.
  Per the 2026-05-08 vanilla audit, Woodcutter is **not paginated
  like Routines** (the historical "paginated story" assumption was
  wrong) — it's a *single* CSS-animated hero scene + 4 paragraphs
  of continuous prose + a moral panel + a 6-question multiple-choice
  quiz + Play-Animation/Reset buttons. Decision call needed at port
  time: reuse `StoryLayout.astro` with a new `pagination={false}`
  prop (hide the prev/next chrome + progress bar) *or* carve out a
  small `StoryLayout--single` variant. **Quiz extraction to
  `src/lib/quiz.ts` is non-negotiable** — both games share the
  `{ attempts, bestScore, lastPlayed }` shape + `<gameId>_quiz_v1`
  storage key + retry / restart UI, so the rule-#5 trigger is
  finally satisfied. See "Next session: Woodcutter port" below for
  the full scope. **One vanilla game left** — and one shared lib
  to extract.

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
| `SESSION-HANDOFF.md` | ~605 | **This file.** Compact bootstrap for new chat sessions. |
| `PROGRESS.md` | ~1410 | **Primary status doc.** Migration principles, per-game decisions, ports completed, full dated changelog, "Resume here next session" marker. |
| `README.md` | ~145 | Architecture overview, full file structure tree, vanilla-vs-Astro comparison table, shared-module list. |

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
     the first-fit gate; now hosts Daily Routines, Woodcutter is
     pending.
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
  parked until all 13 vanilla games ship — *partly unblocked* as of
  2026-05-08 (12/13 ported; foundational-set chapter closed and
  story-flow chapter open with Daily Routines live). Decision still
  open: keep `CardMachineLayout`, `GridLayout`, and `StoryLayout`
  separate, or consolidate into a single `DeckLayout` with a per-user
  "Grid | Card | Story" toggle. Three pieces of evidence now lean
  *separate* (different detail-payload shapes, different filter bars,
  different storage shapes — `Set<string>` for grid progress vs
  `{ attempts, bestScore, lastPlayed }` for story quiz state). Worth
  finalising *after* Woodcutter lands and `src/lib/quiz.ts` exists,
  since that's the moment we'll have the fullest picture of what
  state shapes the layouts actually share.

Take-away: *when the user pushes back on an architectural choice,
treat it as a signal to investigate, not just implement the opposite.*

---

## Current state snapshot (commit `9813cbc` for the feat; docs commit will follow)

**12 of 13 games ported. Foundational-set chapter closed; story-flow chapter open with 1 of 2 games live.** Live URLs all return 200.

| Game | Layout | Theme | Bundle (gzip) | Notes |
|---|---|---|---|---|
| Flashcards | CardMachine | cyan/orange | 11.28 KB | 14 decks, 4 card-face variants |
| **Daily Routines** | **Story** | **sunrise/coral (morphs per scene)** | **~5.0 KB** | **First StoryLayout game; 10 paginated scenes with per-scene CSS art (sun, bed, toothbrush, etc., scoped under `.routines-art`); inline 8-question quiz with score tracking via `routines_quiz_v1`; `--st-bg` driven body-gradient transitions** |
| Hindi | Grid | saffron/cream/green tricolor | ~3.5 KB | 48 Devanagari tiles (12 vowels + 36 consonants), Devanagari-script tile face + Fluent UI 3D detail, bilingual `स्वर` / `व्यंजन` filter, `hi-IN` speech, 5 Q→Crown substitutions incl. *Sari* for Aurat/Woman |
| Weather | CardMachine | navy/ice-blue | 3.34 KB | 20 cards, full Fluent UI deck |
| Animals | Grid | sea-green/deep-blue | 3.30 KB | 37 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter |
| Dinosaurs | CardMachine | green | 3.02 KB | first POC game, 15 cards |
| Alphabets | Grid | purple/green | 2.96 KB | first GridLayout, 26 letters |
| Solar System | CardMachine | purple/gold | 2.66 KB | pure-CSS planet art |
| Birds | Grid | orange-coral sunset | 2.53 KB | 15 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter, vanilla emoji-collision bug fixed |
| Colors | Grid | pink/lavender | 2.25 KB | swatch tiles + shape gallery detail |
| Shapes | Grid | pink/coral | 2.11 KB | mini shape on tile, big shape detail |
| Numbers | Grid | sky-blue/orange | 2.08 KB | CSS count-objects detail |

**Pending (1 — story-flow)**: `woodcutter-story`. Vanilla audit
(2026-05-08) corrects the historical "paginated" assumption — it's a
*single* CSS-animated hero scene + 4 paragraphs of continuous prose +
moral panel + 6-question quiz. Decision call needed at port time:
reuse `StoryLayout.astro` with `pagination={false}` *or* carve out a
small `StoryLayout--single` variant. **Quiz extraction to
`src/lib/quiz.ts` is the second-consumer trigger** — both Routines
and Woodcutter end with a quiz that has the same shape; the rule-#5
trigger is finally satisfied.

**8-way `progress.ts` shared chunk dedup verified across all three
layouts** — alphabets, numbers, colors, shapes, animals, birds, hindi
(all GridLayout), **and routines** (StoryLayout) page-chunks all
import the *exact same*:

- `_astro/progress.Czz_LiQd.js` (0.24 KB gzip)
- `_astro/achievements.CySDez3r.js`
- `_astro/settings.zS6XEbod.js`

Plus a **clean 6-way `fluent` dedup** (the only 6 image-driven games:
alphabets, flashcards, weather, animals, birds, hindi; numbers /
colors / shapes / **routines** correctly do *not* import it because
they use CSS art):

- `_astro/fluent.rTHKURu4.js` (89 bytes raw, 0.09 KB)

Plus all three layout pre-paint scripts share **byte-for-byte
identical content** — the `CardMachineLayout` / `GridLayout` /
`StoryLayout.astro_astro_type_script_index_*_lang.*.js` pair is
generated from the same Astro-internal FOUC handler in the layout
component, so the same hash is reused across all three (1 hash for
`_index_0_lang`, 1 hash for `_index_1_lang`).

**CSS chunks**:

- `alphabets-game.*.css` — ~27.5 KB, used by all 7 grid games (unchanged from pre-routines).
- `dinosaurs-game.*.css` — 17.8 KB, used by all 4 card-machine games (unchanged from pre-routines).
- `daily-routines-game.BtooriIC.css` — **14.5 KB** (new — `body.story` + `.story-*` + `.scene-*` + `.routines-art *` selectors, plus the `--routines` theme block + dark-mode override + FOUC pre-dark rule).
- `solar-system-game.*.css` — solar-system-only.

**PWA precache**: 48 entries / ~390 KiB (was 46 / 352.45 KiB pre-routines).

**Recent commits** (newest first):

```
9813cbc feat(routines): port Daily Routines on new StoryLayout (12/13) + first story-flow shell + scoped routines.css art
<docs-commit-pending> docs: confirm Hindi grid deploy is live + 7-way GridLayout / 6-way fluent dedup verified
0cebf69 feat(hindi): port Hindi varnamala on GridLayout (11/13) + tricolor palette + Sari/Bowl-with-spoon substitutions
9803dbc chore(tooling): bake ASTRO_TELEMETRY_DISABLED=1 into npm scripts + add PRE-FLIGHT docs
15b6c4f docs: confirm Birds grid deploy is live + 6-way shared chunk verified
7db2bfc feat(birds): port Birds on GridLayout (10/13) + sunset palette + emoji collision fix
df1b627 docs: confirm Animals grid deploy is live + 5-way shared chunk verified
2b2c2a9 feat(animals): port Animals on GridLayout (9/13) + drop FLUENT_IMG_BASE re-exports
```

---

## What just shipped this session (Daily Routines port — first StoryLayout game)

Settled the long-deferred "story games" decision *and* shipped the
first port on the new layout in a single session. Departed from the
"ship a grid game" template because Daily Routines genuinely needed
new shared infra; the standard sequence applied at the *page* level,
but two new layout files + two new shared-CSS files came along for
the ride.

1. **Audit `kids-learning-games/games/daily-routines.html`** — 10
   paginated story scenes (sunrise wake-up → toothbrush → breakfast
   → school-bag → school-bell → reading → playground → bath →
   dinner → bedtime moon-window). Each scene has a unique CSS-art
   composition (no Fluent UI assets — pure CSS rendering of sun,
   bed, toothbrush, table, school-bag, book, swing+slide, bathtub,
   moon-window primitives), descriptive English prose (~30 words
   per scene), and a `Back` / `Listen` / `Next` control row.
   Document concludes with an 8-question multiple-choice quiz
   (`{ q, opts: [4 strings], ans: index }`) with score panel,
   retry, and restart. **Vanilla also morphs the body background
   gradient per scene** — sunrise warm → midday bright → evening
   amber → night dark → indoor neutral palettes — driven by
   per-scene class names on `<body>`.
2. **Audit `kids-learning-games/games/woodcutter-story.html` for
   cross-reference** — and *correct* the historical "paginated
   story" assumption that was driving every layout-decision call
   so far. Woodcutter is **single-scene**: one CSS-animated hero
   composition + 4 paragraphs of continuous prose + moral panel +
   6-question quiz + Play-Animation/Reset buttons. Routines is the
   *only* paginated story game; Woodcutter is a single-scene
   narrative with no prev/next semantics. This split changes how
   `StoryLayout` should be designed — covered below.
3. **Audit `src/layouts/CardMachineLayout.astro` + a card-machine
   page (`src/pages/games/weather-game.astro`)** to gauge whether
   it could fit a paginated story before carving out a new layout.
   It bakes in (1) viewport-locked `overflow:hidden` + `100vh`
   body, (2) flex two-pane layout with a left deck + right detail
   pane, (3) a hardcoded deck-of-cards DOM (`.deck` / `.top-card` /
   `.ghost` + press-to-flip semantics), and (4) an OLED
   `.machine-screen` aesthetic on the right pane. All four crash
   into Routines' contract (scrollable single-column shell, scene
   panel + controls + inline quiz, sunrise-warm palette, no deck
   metaphor at all). **Decision: collapsed → carve out
   `StoryLayout`**.
4. **Decide layout shape** — modelled `StoryLayout.astro` on the
   "scrollable single-column shell with theme tokens" pattern that
   `GridLayout.astro` already uses, but with a *different*
   content contract: header → progress bar → scene panel with
   per-scene CSS art → Prev / 🔊 Listen / Next controls → inline
   quiz block at the end (hidden until completion). Theme prop
   accepts `'routines' | 'woodcutter'` so Woodcutter can drop in
   later with just a theme override. FOUC pre-dark rule lives in
   the layout component (one `html.pre-dark body.story` block per
   theme). Quiz logic ships *page-local* (~100 lines of inline TS
   in `daily-routines-game.astro` + a dedicated `routines_quiz_v1`
   LocalStorage key) per the rule-#5 *"refactor trigger = second
   consumer"* migration principle — Woodcutter is the second
   consumer that triggers extraction to `src/lib/quiz.ts`.
5. **Build `src/data/routines.ts`** — 10 typed `RoutineScene`
   entries (`id` kebab-case + `time` + `title` + `emoji` + `text` +
   `bg` sky class + optional `artBg` indoor override + `artHtml`
   string with the per-scene CSS art HTML) + 10 `BODY_BGS` page
   gradients (the `--st-bg` value the page rewrites per scene) +
   8 typed `QuizQuestion` entries. ~90-line header doc covering
   the layout decision, the `.routines-art` namespace scoping
   strategy, the quiz-storage split (`progress.ts` for scenes
   visited + `routines_quiz_v1` page-local key for quiz metadata),
   and the vanilla quirks preserved verbatim.
6. **Build `src/styles/story.css`** — shared `--st-*` theme tokens
   (page background, scene-card surface, title color, body color,
   progress-bar fill, button states, quiz panel surface, quiz
   option states) + the core single-column `.story-shell` /
   `.story-header` / `.story-progress` / `.scene-box` / `.scene-art`
   / `.story-controls` / `.quiz-box` selectors. Default theme =
   `routines`; placeholder palette for `woodcutter` seeded so the
   second consumer's data shape is already proven. Generic dark
   mode override for story-specific elements.
7. **Build `src/styles/routines.css`** — per-scene CSS art
   primitives (sun, bed, toothbrush, table, school-bag, book,
   swing+slide, bathtub, moon-window). **All selectors scoped under
   `.routines-art`** (the marker class applied to the
   `<div class="scene-art routines-art …">` art container in the
   page) so vanilla-style short class names like `.bed` / `.tub` /
   `.swing` / `.child` / `.sun` stay collision-free with future
   story games. **All keyframes prefixed `routines-*`**
   (`routines-sunRise`, `routines-toothBrush`, `routines-bookFloat`,
   etc.) for the same reason.
8. **Build `src/layouts/StoryLayout.astro`** — third shared shell.
   Structure mirrors `GridLayout.astro` (head meta + PWA + nav +
   `<slot />` + settings modal + build info + SW auto-update
   handling) but `<body class="story" data-theme={theme}>` and the
   FOUC pre-dark rules target `body.story` instead of `body.grid`.
9. **Build `src/pages/games/daily-routines-game.astro`** — uses
   `StoryLayout`, imports `routines.css`. Renders header + progress
   bar + first scene SSR'd (so the page paints correctly on JS-off
   and during hydration) + control row + hidden inline quiz block
   with all 8 questions + 32 option buttons + score panel
   pre-rendered. Inline `<script is:inline>` sets the initial
   `--st-bg` value on `<body>` *before* hydration so the page
   never flashes the wrong palette on load. Client `<script>`
   block manages: scene navigation (Prev/Next + arrow keys),
   speech (default voice, no language override — Routines is
   English-only), scene-visited progress in
   `kids_progress_v1:routines` via `progress.ts`, quiz state in
   `routines_quiz_v1` via inline load/save helpers, completion
   overlay + golden-confetti flourish on perfect quiz score, and
   the per-scene `--st-bg` rewrite as the child clicks Next.
10. **Wire** `GameNav.astro` + `index.astro` home tile (mark
    `ready: true`); also flipped Woodcutter's home tile to its
    new "single-scene, layout shape TBD" copy.
11. **Build verification:** `npm run check` 0/0/0 across 38 files,
    default sandbox; `npm run build` **13 pages** emitted in
    7.96 s, default sandbox. Notable: an unused-import hint
    flagged by Astro's TS server because the frontmatter and the
    page `<script>` block had two separate `import { … } from
    '@/data/routines'` statements; dropped the unused `QUIZ` from
    the frontmatter, fix in-place pre-commit.
12. **Live deploy verified within ~45 s** of push:
    `/games/daily-routines-game` HTTP 200, all 11 prior live URLs
    still 200 (no regressions across the 4 card-machine + 7 grid
    games). **8-way `progress.ts` shared-chunk dedup confirmed at
    the chunk level** (alphabets + numbers + colors + shapes +
    animals + birds + hindi + **routines** all import the *exact
    same* `progress.Czz_LiQd.js` + `achievements.CySDez3r.js` +
    `settings.zS6XEbod.js` — three shared modules now serving
    *all three layouts*). Routines correctly does *not* import
    `fluent.rTHKURu4.js` (no Fluent UI assets — pure CSS art).
    All three layout pre-paint scripts ship byte-for-byte
    identical content (same hash from the Astro-internal FOUC
    handler in the layout component). Bidirectional CSS isolation
    verified: `daily-routines-game.BtooriIC.css` (14.5 KB)
    contains only `body.story` + `.story-*` + `.scene-*` +
    `.routines-art *` selectors, zero `cm-*` / `gl-*` /
    `.top-card` / `.machine-screen` / `.gl-tile` leakage; the
    card-machine and grid bundles contain zero `.routines-art` /
    `.story-shell` / `.scene-box` / `--st-*` selectors. SSR
    markup sniff confirms `<body class="story" data-theme="routines">`
    + the inline `--st-bg` setter + the first scene's CSS art
    tree (sun, ground, bed, mattress, pillow, blanket, bed-frame
    elements) + the prev/listen/next control row + the hidden
    inline quiz block with all 8 questions pre-rendered.

**Layout decision codified at port time**: carve out a third shared
shell (`StoryLayout`). The cost was ~200 lines of new layout +
~250 lines of new shared CSS + ~400 lines of game-specific scoped
CSS — *one-time* infra that's now amortised over both story games.
Reusing `CardMachineLayout` would have demanded heavy override
machinery for *all four* of the conflicts above, ending in a layout
file that's "card-machine OR story" with switch logic everywhere —
exactly the bespoke-shell-per-game smell rule #3 prohibits.

**Pre-existing bug surfaced (not fixed in this commit)**: still
open from the Hindi port — `flashcards.ts` line 360 uses
`Long%20Drum/3D/long_drum_3d.png` (capital D) for the Bongo card,
returns 403 in production (Fluent UI uses lowercase
`Long%20drum`). Filed as one-off tech-debt in `PROGRESS.md` for
the next session that touches flashcards data — the fix is one
character.

Full changelog entry: `PROGRESS.md` → "2026-05-08 — Daily Routines on a brand-new `StoryLayout` (12/13 games — story-flow chapter opens)".

---

## Next session: Woodcutter port

The "Resume here next session" marker in `PROGRESS.md` points at
**Woodcutter port** — the **last vanilla game**. After this lands,
the migration is 13/13 done and we're into the cut-over /
Stats-modal / unified-Deck phase of the project.

**Vanilla shape** (audit ran in *this* session, contradicting the
historical "paginated story" assumption):

- *Single* CSS-animated hero scene (woodcutter, river, lake, gold
  axe, silver axe, normal axe, deity figure — all rendered in
  pure CSS, no images).
- 4 paragraphs of continuous prose (the woodcutter loses his axe
  in the river, the river deity offers a gold axe then a silver
  axe, the woodcutter honestly identifies his own; the deity
  rewards his honesty with all three).
- 1 moral panel (`Honesty is the best policy`).
- 6-question multiple-choice quiz on the story.
- `Play Animation` / `Reset` buttons (re-runs the CSS animation
  from the start).
- **No prev/next semantics**, no scene pagination — fundamentally
  different from Daily Routines.

**Layout decision needed at port time** (two viable paths — pick
the cheapest):

1. **Reuse `StoryLayout.astro` with a new `pagination={false}`
   prop** — hide the prev/next chrome + progress bar + scene-count
   text via the layout shell when the prop is false. Single-scene
   pages then look like "header → scene panel → optional Listen
   button → quiz". Pro: zero new layout files, single source of
   truth for "story-flow games". Con: prop branching inside
   `StoryLayout.astro`.
2. **Carve out a small `StoryLayout--single` variant** (or a
   sibling layout file) — one-off shell for single-scene stories.
   Pro: cleaner boundary if more single-scene stories ever land
   (currently zero on the horizon, so YAGNI applies). Con: more
   files for one consumer.

**Default plan**: option 1 (`pagination={false}` prop). It's
cheaper and matches how `GridLayout` handles per-game variants
(`theme` prop + `data-theme` attribute, no per-game shell).
Re-evaluate at port time if the prop branching gets messy.

**`src/lib/quiz.ts` extraction is non-negotiable** — both Routines
and Woodcutter end with a quiz of the same shape:

- N multiple-choice questions: `{ q, opts: string[], ans: number }`.
- Score tracking: `{ attempts, bestScore, lastPlayed }`.
- LocalStorage key: `<gameId>_quiz_v1`.
- Retry / restart UI flow.

The rule-#5 "refactor trigger = second consumer" rule is finally
satisfied. Pull the inline quiz logic from
`src/pages/games/daily-routines-game.astro` (~100 lines of TS) into
a new `src/lib/quiz.ts` module that exposes:

- `loadQuizState(gameId): QuizState` / `saveQuizState(gameId, s)`.
- A `mountQuiz(rootEl, questions, gameId, onComplete)` helper that
  attaches click handlers to option buttons, tracks selected /
  correct / incorrect states, computes the score, and updates the
  ledger when the child submits.
- `clearQuizState(gameId)` for the Settings modal's eventual
  "Start Over" button.

Both pages should then collapse onto a `<QuizPanel
gameId="routines" questions={QUIZ} />` (or similar Astro
component) — refactor Routines as part of Woodcutter's commit.

**Reading order for the next agent**:

1. Vanilla source: `kids-learning-games/games/woodcutter-story.html`.
2. Closest Astro precedent: `src/pages/games/daily-routines-game.astro`
   (the only `StoryLayout` consumer so far) — copy-adapt the page
   skeleton + the quiz logic (which you'll be extracting to
   `src/lib/quiz.ts` as you go).
3. `src/layouts/StoryLayout.astro` — understand the existing
   layout, decide whether `pagination={false}` is a clean prop or
   needs to be a layout-config object.
4. `src/styles/story.css` — add a `--woodcutter` theme block (the
   placeholder palette is already there as a stub).
5. Tech-debt note: `flashcards.ts` Bongo's `Long%20Drum` path bug
   — fix in this commit since you're touching adjacent code.

**Expected scope**:

- New `src/data/woodcutter.ts` — typed `WoodcutterStory` entry
  (single scene + prose paragraphs as `text` blocks + moral) +
  6 typed `QuizQuestion` entries. Header doc covering the
  layout-decision rationale (single vs paginated) + the
  vanilla-CSS-animation strategy (pure CSS, no Fluent UI assets).
- New `src/pages/games/woodcutter-story.astro` — copy-adapt of
  `daily-routines-game.astro` (closest precedent) with
  `pagination={false}`. Single scene SSR'd; quiz block uses the
  new `<QuizPanel>` (or equivalent) component.
- New `src/lib/quiz.ts` (extraction trigger) — see shape above.
  Refactor `daily-routines-game.astro` to use it as part of the
  same commit.
- ~30-line `--woodcutter` theme block in `story.css` + dark-mode
  override + FOUC pre-dark rule (the FOUC rule should already
  exist as a placeholder in `StoryLayout.astro` — verify and
  flesh out).
- New `src/styles/woodcutter.css` (or inline in the page if it
  stays small) — per-scene CSS art primitives for the woodcutter,
  river, lake, gold/silver/normal axes, deity figure. Scope all
  selectors under `.woodcutter-art` and prefix keyframes
  `woodcutter-*` (mirroring the Routines pattern).
- Wire `GameNav.astro` + `index.astro` home tile (mark `ready: true`).
- Bulk-verify any image assets the port introduces (vanilla uses
  pure CSS art, so likely none — but check).

**Standard ship sequence** (now proven 8× — alphabets / numbers /
colors / shapes / animals / birds / hindi / routines):

1. Read vanilla `kids-learning-games/games/<game>.html`. Note
   exact data, scene count, image set, narrative flow, quiz shape.
2. Decide layout (`CardMachineLayout` / `GridLayout` /
   `StoryLayout` — first-fit on the closest precedent; carve out
   only if it collapses).
3. Build `src/data/<game>.ts` with header comment per migration
   principle #4.
4. Extract any second-consumer helpers to `src/lib/`
   (`src/lib/quiz.ts` is the queued one for Woodcutter).
5. Add the relevant CSS to the chosen layout's stylesheet.
6. Add FOUC pre-dark rule to the chosen layout component.
7. Write `src/pages/games/<game>.astro`.
8. Wire `GameNav.astro` + `index.astro`.
9. **Bulk-verify all Fluent UI image paths** (curl smoke test) —
   if applicable. The Hindi port confirmed Fluent has class-of-bug
   403s on humans + lowercase-second-word casing surprises. Fix
   any 404s pre-commit.
10. Run `npm run check` + `npm run build` (default sandbox — the
    2026-05-07 tooling fixes mean no `["all"]` needed for either).
11. Commit + push: `feat(<game>): port <game> on <layout> (13/13)`.
12. Verify live deploy (poll ~45 s, then HTTP 200 + SSR markup
    sniff via `curl + grep`).
13. Update `PROGRESS.md` + `README.md` + this file, add changelog
    entry, commit `docs:` follow-up.

After Woodcutter lands, the migration is **13/13 done** — time to:

- Revisit **Option C** (unified Deck layout with grid/card/story
  view toggle) — three pieces of evidence already lean *separate*
  (different detail-payload shapes, different filter bars,
  different storage shapes); decide once `src/lib/quiz.ts` exists.
- Wire the **real Stats modal** (currently `alert(…)` stub across
  all 12 ported games) to read from `progress.ts` + `quiz.ts`
  aggregations.
- Plan the **cut-over** of the vanilla `kids-learning-games` repo
  to serve the Astro build, with a SW handoff strategy so existing
  PWA installs upgrade cleanly.

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
- **Stats + Quiz modals**. The Stats modal is currently an `alert(…)`
  stub across all 12 ported games. Routines is the *only* game with
  a real quiz, but its quiz logic is inline in the page (not yet in
  `src/lib/`). Once Woodcutter lands and triggers the
  `src/lib/quiz.ts` extraction, the Stats modal becomes the natural
  next task — it can aggregate `progress.ts` learning state across
  all 7 grid games + Routines's scenes-visited progress, *and*
  `quiz.ts` quiz scores across both story games.
- **`src/lib/quiz.ts` extraction**. *Now the queued refactor* — both
  Routines and Woodcutter end with a quiz of the same shape
  (`{ q, opts, ans }` questions + `{ attempts, bestScore, lastPlayed }`
  state + `<gameId>_quiz_v1` LocalStorage key + retry / restart UI).
  The rule-#5 *"refactor trigger = second consumer"* trigger is
  finally satisfied. Pull from `src/pages/games/daily-routines-game.astro`
  (~100 lines of TS) into a new module + a `<QuizPanel>` Astro
  component when porting Woodcutter. See "Next session: Woodcutter
  port" for the full shape.
- **`flashcards.ts` Bongo image is broken in production.** Line 360
  uses `Long%20Drum/3D/long_drum_3d.png` (capital D) — that path
  returns 403; Fluent UI uses lowercase `Long%20drum/...`. Surfaced
  during the Hindi port's bulk Fluent-path verification (Hindi's
  Dhol consonant uses the same emoji and ships the lowercase path
  correctly). Fix is one character on one line. Easy follow-up for
  the Woodcutter session — fold into the same commit.
- **Playwright smoke tests**. One suite per layout. With Routines
  now live, that's three suites (card-machine / grid / story).
  Filter → navigate → completion overlay (grid + card-machine) /
  scene-flow → quiz → score panel (story). Parameterise over themes.
  Not started.
- **Option C — unified `Deck` layout with grid/card/story view
  toggle.** *Partly unblocked* as of 2026-05-08 — 12/13 games
  shipped, three layouts in production. Three pieces of evidence
  now lean *separate*: different detail-payload shapes, different
  filter bars, different storage shapes (`Set<string>` for grid
  progress vs `{ attempts, bestScore, lastPlayed }` for story quiz
  state). Best decided after Woodcutter lands and `src/lib/quiz.ts`
  exists.
- **Cut-over plan.** Only after all 13 games land. Migrate the
  vanilla repo to serve the Astro build. SW handoff strategy needed
  for existing PWA installs.

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
   - The target game's vanilla source: `kids-learning-games/games/<game>-game.html`
     (e.g. `woodcutter-story.html` for the next port).
   - The closest Astro precedent for the next port:
     `src/pages/games/daily-routines-game.astro` is the only
     `StoryLayout` consumer so far, so it's the precedent for
     Woodcutter. Copy-adapt the page skeleton + the inline quiz
     logic (which you'll be extracting to `src/lib/quiz.ts` as the
     second-consumer trigger).
   - For non-story ports (n/a after Woodcutter — the migration
     completes at 13/13 once Woodcutter lands): grid precedents are
     `src/pages/games/animals-game.astro` / `birds-game.astro` /
     `alphabets-game.astro` (image-driven), `colors-game.astro` /
     `shapes-game.astro` (CSS-art). Card-machine precedents are
     `weather-game.astro` (image deck) and `solar-system-game.astro`
     (CSS art).
   - The three shared layouts: `src/layouts/CardMachineLayout.astro`
     / `src/layouts/GridLayout.astro` / `src/layouts/StoryLayout.astro`.
   - The shared CSS: `src/styles/card-machine.css` /
     `src/styles/grid.css` / `src/styles/story.css` (plus
     game-specific scoped CSS like `routines.css`).
   - The shared libs in `src/lib/` (`progress.ts`, `audio.ts`,
     `speech.ts`, `settings.ts`, `achievements.ts`). After Woodcutter
     lands, `src/lib/quiz.ts` will join the list.
4. The next likely task is the **Woodcutter port** — the **last
   vanilla game**. Per the 2026-05-08 audit, Woodcutter is *not*
   paginated like Routines (the historical "paginated story"
   assumption was wrong) — it's a single CSS-animated hero scene +
   4 paragraphs of continuous prose + moral panel + 6-question
   quiz. Plan: reuse `StoryLayout.astro` with a new
   `pagination={false}` prop, *or* carve out a small
   `StoryLayout--single` variant; decide at port time. **Quiz
   extraction to `src/lib/quiz.ts` is the second-consumer
   refactor trigger — non-negotiable**. Full scope under
   "Next session: Woodcutter port" above.
5. **Do not** re-read the full chat transcript unless investigating a
   specific historical decision — the docs already capture the
   architectural conclusions.

---

*Last updated 2026-05-08 with Daily Routines port + docs follow-up.
12/13 games ported, all live, foundational-set chapter closed,
story-flow chapter open with 1 of 2 games shipped. Next: Woodcutter
port (the last vanilla game) + `src/lib/quiz.ts` extraction (the
second-consumer refactor trigger). After that — 13/13 done, time
for the Stats modal, Playwright suites, Option C decision, and
cut-over of the vanilla repo.*
