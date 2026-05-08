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
- **State (2026-05-08)**: **11 of 13 games ported and live** at
  https://aakash-jain-1.github.io/kids-learning-games-astro/.
  *Foundational-set chapter closed* — every grid-eligible vanilla
  game now ships on `GridLayout`. Only the 2 story games remain.
- **Two shared layouts** in production:
  - `CardMachineLayout` (4 games — Dinosaurs, Flashcards, Solar System, Weather).
  - `GridLayout` (7 games — Alphabets, Numbers, Colors, Shapes, Animals, Birds, **Hindi** ← shipped this session).
- **Just shipped**: Hindi varnamala on `GridLayout` — last
  foundational-set port. Largest grid game so far at 48 tiles
  (12 vowels + 36 consonants — corrects the docs' "~46" estimate).
  Settled the long-parked open layout question at port time: shipped
  **option (a)** — single filter-able deck, mirror of the Alphabets
  pattern, with a 3-pill bilingual filter (`🇮🇳 All` / `स्वर Vowels`
  / `व्यंजन Consonants`). The sectioned-grid `<h3>`-headings variant
  was the alternative; remains parked, *never built*. Tricolor theme
  lifted from vanilla `hindi-alphabets.html` (`#ff9933 → #fff4e6 →
  #138808` saffron/cream/green flag palette) — culturally meaningful
  and visually distinct. Image source migrated from vanilla
  `img.icons8.com` JPGs → Fluent UI 3D PNGs (jsDelivr, runtime-cached).
  46 unique image paths verified 200 OK pre-commit. Five characters
  got the alphabets `Q → Crown` substitution treatment: Anar/Pomegranate
  → Cherries, **Aurat/Woman → Sari** *(culturally on-point upgrade —
  Fluent has the Indian dress but not the generic Woman emoji,
  same human-emoji 403-class as Princess)*, Okhli/Mortar →
  Bowl-with-spoon, Thathera/Craftsman → Hammer-and-wrench (Construction
  Worker also in the human-emoji 403-class), Visarga → Lotus.
  Plus 6 case-fixes on Fluent paths (lowercase second-words: `Long
  drum` not `Long Drum`, `Red apple` not `Red Apple`, etc.). Speech
  uses `hi-IN` voice at rate 0.75 for the Hindi letter+word; the
  English fact stays in the default voice. Confetti is the tricolor
  + a gold accent. Devanagari renders with a +12 % Hindi-only
  page-local font-size override (akshara renders smaller than Latin
  caps in most system fonts; `क्ष` and `ज्ञ` need the bump). Pre-existing
  `flashcards.ts` bug surfaced (Bongo card uses a 403-returning
  `Long%20Drum` path with capital D — flagged for follow-up, not
  fixed in this commit).
- **Resume here**: **`StoryLayout` decision** — only 2 vanilla
  games remain (Woodcutter, Daily Routines), both linear-narrative
  story flows. The long-deferred decision is back on the table.
  Per the migration plan, *first try* modelling each story page as
  a card on `CardMachineLayout` (with press-to-read + Prev/Next),
  and only carve out a separate `StoryLayout.astro` if that
  collapses. See "Next session: Story games" below for the full
  scope. **No more open layout questions in the foundational-set
  chapter** — every grid game is shipped, every shared chunk is
  deduped at the level it should be (7-way `progress`, 6-way
  `fluent`), every theme block is in `grid.css`, every
  data-driven decision is documented in the data file headers.

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
2. **Two pedagogical layouts, not one.**
   - `CardMachineLayout` — *reference-catalogue* games (browse a deck,
     filter, press-to-hear).
   - `GridLayout` — *foundational-set* games (scan a fixed chart, tap
     to hear, completion overlay).
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
- **Option C (unified `Deck` layout with grid/card view toggle)** is
  parked until all 11 non-story games ship — *now unblocked* as of
  2026-05-08 (the foundational-set chapter is closed). Decision still
  open: keep `CardMachineLayout` and `GridLayout` separate, or
  consolidate into a single `DeckLayout` with a per-user "Grid | Card"
  toggle. Worth deciding *after* the 2 story games land, in case
  story-flow breaks the toggle premise.

Take-away: *when the user pushes back on an architectural choice,
treat it as a signal to investigate, not just implement the opposite.*

---

## Current state snapshot (commit `0cebf69` for the feat; docs commit will follow)

**11 of 13 games ported. Foundational-set chapter closed.** Live URLs all return 200.

| Game | Layout | Theme | Bundle (gzip) | Notes |
|---|---|---|---|---|
| Flashcards | CardMachine | cyan/orange | 11.28 KB | 14 decks, 4 card-face variants |
| **Hindi** | **Grid** | **saffron/cream/green tricolor** | **~3.5 KB** | **48 Devanagari tiles (12 vowels + 36 consonants), Devanagari-script tile face + Fluent UI 3D detail, bilingual `स्वर` / `व्यंजन` filter, `hi-IN` speech, 5 Q→Crown substitutions incl. *Sari* for Aurat/Woman** |
| Weather | CardMachine | navy/ice-blue | 3.34 KB | 20 cards, full Fluent UI deck |
| Animals | Grid | sea-green/deep-blue | 3.30 KB | 37 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter |
| Dinosaurs | CardMachine | green | 3.02 KB | first POC game, 15 cards |
| Alphabets | Grid | purple/green | 2.96 KB | first GridLayout, 26 letters |
| Solar System | CardMachine | purple/gold | 2.66 KB | pure-CSS planet art |
| Birds | Grid | orange-coral sunset | 2.53 KB | 15 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter, vanilla emoji-collision bug fixed |
| Colors | Grid | pink/lavender | 2.25 KB | swatch tiles + shape gallery detail |
| Shapes | Grid | pink/coral | 2.11 KB | mini shape on tile, big shape detail |
| Numbers | Grid | sky-blue/orange | 2.08 KB | CSS count-objects detail |

**Pending (2 — both story-flow)**: `woodcutter-story`,
`daily-routines-story` (→ `StoryLayout` TBD; first attempt is to
model each story page as a card on `CardMachineLayout`).

**7-way GridLayout shared chunk dedup verified** — alphabets, numbers,
colors, shapes, animals, birds, **and hindi** page-chunks all import the
*exact same*:

- `_astro/progress.Czz_LiQd.js` (0.24 KB gzip)
- `_astro/achievements.CySDez3r.js`
- `_astro/settings.zS6XEbod.js`

Plus a **clean 6-way `fluent` dedup** (the only 6 image-driven games:
alphabets, flashcards, weather, animals, birds, **hindi**; numbers /
colors / shapes correctly do *not* import it because they use CSS art):

- `_astro/fluent.rTHKURu4.js` (89 bytes raw, 0.09 KB)

**CSS chunks**:

- `alphabets-game.*.css` — **~27.5 KB** (was 25.6 pre-hindi), used by all 7 grid games. Delta is ~60 lines of `--hindi` theme block + dark-mode override + FOUC pre-dark rule + a Hindi-only Devanagari font-size override.
- `dinosaurs-game.*.css` — 17.8 KB, used by all 4 card-machine games (unchanged from pre-hindi).
- `solar-system-game.*.css` — solar-system-only.

**PWA precache**: 46 entries / 352.45 KiB (was 44 / 313.92 pre-hindi).

**Recent commits** (newest first):

```
0cebf69 feat(hindi): port Hindi varnamala on GridLayout (11/13) + tricolor palette + Sari/Bowl-with-spoon substitutions
9803dbc chore(tooling): bake ASTRO_TELEMETRY_DISABLED=1 into npm scripts + add PRE-FLIGHT docs
15b6c4f docs: confirm Birds grid deploy is live + 6-way shared chunk verified
7db2bfc feat(birds): port Birds on GridLayout (10/13) + sunset palette + emoji collision fix
df1b627 docs: confirm Animals grid deploy is live + 5-way shared chunk verified
2b2c2a9 feat(animals): port Animals on GridLayout (9/13) + drop FLUENT_IMG_BASE re-exports
669d616 docs: confirm Shapes grid deploy is live + 4-way shared chunk verified
db11e4c feat(shapes): port Shapes on GridLayout (8/13) + new gl-shape-figure namespace
```

---

## What just shipped this session (Hindi port)

Followed the established "ship a grid game" process — settled the
long-parked open layout question, then ran the standard 12-step
sequence cleanly:

1. **Audit `kids-learning-games/games/hindi-alphabets.html`** — 12
   vowels (`अ`–`अः` including Anusvara `अं` and Visarga `अः`) + 36
   consonants (`क`–`ज्ञ` including the three compound consonants
   `क्ष` / `त्र` / `ज्ञ`) = **48 letters** (corrects the docs'
   "~46" estimate; vanilla's progress counter literally says
   "0 / 48 learned"). Each entry has Devanagari script + Hindi word
   + English transliteration + meaning + pronunciation + image
   (vanilla used `img.icons8.com` JPGs/PNGs — a mix of "color" and
   "emoji" packs). Vanilla quirks noted: `अः` and `ङ`/`ञ` reuse the
   script char as their own "word" (they're phonetic markers, not
   true letters with example words); `ण`/`त`/`थ` share romanised
   pronunciations with `न`/`ट`/`ठ` (dental/retroflex distinction —
   preserved verbatim).
2. **Settle the open layout question** — went with **option (a),
   single filter-able deck** (mirror of Alphabets). The 3-pill
   bilingual filter (`🇮🇳 All` / `स्वर Vowels` / `व्यंजन Consonants`)
   replaces vanilla's "scroll past 12 vowels to find consonants"
   pattern with a tap-to-show-only-this affordance. Sectioned-grid
   `<h3>`-headings variant (option b) parked indefinitely — never
   built. Validated `--capped` (auto-fill 64–96 px) handles 48 tiles
   cleanly on phone with one Hindi-only page-local CSS override:
   `body.grid[data-theme='hindi'] .gl-tile { font-size: clamp(1.55em,
   4.4vw, 2.4em); }` (+12 % bump on the alphabets baseline because
   Devanagari aksharas render a touch smaller than Latin caps).
3. **Build `src/data/hindi.ts`** — 48 typed `HindiCard` entries
   with `vowel` / `consonant` filter. Field shape: `letter`
   (Devanagari char) + `pron` (romanised) + `word` (Hindi script
   word) + `trans` (transliteration) + `n` (English meaning) + `f`
   (kid-friendly fact in English) + `e` (emoji fallback) + `img`
   (Fluent path) + `type` + `label` (bilingual pill text — `स्वर
   Vowel` / `व्यंजन Consonant`). 75-line header doc covering layout
   decision rationale, all 17 substitutions with reasoning, vanilla
   quirks preserved with notes, consumer instructions.
4. **Bulk-verify Fluent UI image paths** — single curl pass over
   46 unique candidates (including known-good ones for safety).
   Found:
   - **5 missing-from-pack substitutions** (Q→Crown precedent):
     - Anar/Pomegranate → Cherries (red clustered fruit).
     - Aurat/Woman → **Sari** (*culturally on-point upgrade!* —
       Fluent has the Indian woman's traditional dress but not the
       generic Woman emoji; same human-emoji 403-class as Alphabets's
       Princess back-substitute).
     - Okhli/Mortar → Bowl-with-spoon (kitchen-tool family — Cooking
       Pot also missing in either case).
     - Thathera/Craftsman → Hammer-and-Wrench (craftsman's tools —
       Construction Worker is in the same human-emoji 403-class as
       Woman).
     - Visarga → Lotus (sacred Indian symbol — vanilla used Om
       emoji, also not in Fluent).
   - **6 case-fixes on Fluent paths** — Fluent UI uses lowercase
     second-words on multi-word emojis: `Long drum` not `Long Drum`,
     `Red apple` not `Red Apple`, `Trident emblem` not
     `Trident Emblem`, `Musical notes` not `Musical Notes`,
     `Potable water` not `Potable Water`, `Crossed swords` not
     `Crossed Swords`. My first draft shipped capital-cased
     variants (copy-pasted from `flashcards.ts`'s Bongo card —
     which has the same path bug, see tech-debt note below); curl
     batch returned 403 on all 9, lowercase alternates returned
     200, fixed in-place pre-commit.
   - **All 46 unique paths returned 200 OK after substitutions
     applied** — verification pass took ~60 s for the initial batch
     + ~25 s for the substitute candidates.
   - **Class-of-bug surfaced in Fluent UI pack**: every "raw human"
     emoji we tested returned 403 (`Woman`, `Man`, `Person`,
     `Adult`, `Princess`, `Mrs.%20Claus`, `Bride%20with%20veil`,
     `Dancer`, `Construction%20worker`), but accessory/clothing
     emojis (`Sari`, `Kimono`, `High-heeled%20shoe`, `Lipstick`)
     all returned 200. Future image-driven ports should plan to
     substitute on humans, not pivot.
5. **Extend `src/styles/grid.css`** — added the `--gl-*` hindi
   theme block (~30 lines, tricolor `#ff9933 → #fff4e6 → #138808`
   saffron/cream/green flag palette lifted from vanilla
   `hindi-alphabets.html` with the white middle-band softened to
   cream for legibility; deep-saffron `#cc5500` action/filter pill
   accents) + dark-mode override (~17 lines, "earthy after-dark
   tricolor": clay-saffron → warm-wood-brown → forest-green) + a
   Hindi-only Devanagari font-size bump on `.gl-tile` and
   `.gl-detail-letter`. Total CSS delta ~60 lines. The
   `body.grid[data-theme='hindi']` block is the *seventh* such
   per-game theme block in `grid.css`, all sharing the same ~25
   `--gl-*` token contract.
6. **Add FOUC pre-dark rule** for `[data-theme='hindi']` to
   `GridLayout.astro`. The `theme?: 'hindi'` enum was already in
   place from earlier session forward-thinking — no type-union
   update needed.
7. **Build `src/pages/games/hindi-game.astro`** — **clean copy-adapt
   of `alphabets-game.astro`** (the closest precedent: letter on
   tile face, Fluent UI image in detail card). Page-local stacking
   of the Hindi word + transliteration inside the `.gl-detail-word`
   slot — wraps in a `flex-direction: column; align-items: flex-end;`
   override scoped to `body.grid[data-theme='hindi'] .gl-detail-word`.
   Bilingual title (`🇮🇳 हिंदी · Hindi`), bilingual "Hear" button
   (`🔊 सुनें · Hear`), bilingual completion overlay (`शाबाश! You
   learned every Hindi letter! 🎉`). Speech: `speak(\`${c.letter}.
   ${c.word}.\`, { lang: 'hi-IN', rate: 0.75 })` — slower rate so
   young learners can match the akshara to its syllable; English
   fact stays in the default voice (vanilla precedent). Tricolor
   confetti on completion (saffron / white / green / deep-saffron /
   gold).
8. **Wire** `GameNav.astro` + `index.astro` home tile.
9. **Build verification:** `npm run check` 0/0/0 across 36 files,
   default sandbox; `npm run build` 12 pages emitted in 7.45 s,
   default sandbox (validating the 2026-05-07 tooling-friction
   fix's payoff on its first real port — no `["all"]` permission
   escalation needed).
10. **Live deploy verified within ~45 s** of push: `/games/hindi-game`
    HTTP 200, all 4 prior live URLs (birds, animals, alphabets,
    home) still 200, **7-way GridLayout shared-chunk dedup confirmed
    at the chunk level** (alphabets + numbers + colors + shapes +
    animals + birds + hindi all import the *exact same*
    `progress.Czz_LiQd.js` + `achievements.CySDez3r.js` +
    `settings.zS6XEbod.js`), **6-way `fluent` dedup confirmed**
    (alphabets + flashcards + weather + animals + birds + hindi
    all import `fluent.rTHKURu4.js`; numbers / colors / shapes
    correctly do *not* import it), zero `card-machine` / `cm-*` /
    `top-card` / `press-btn` / `machine-screen` cross-contamination
    in the hindi page chunk or HTML, 48 unique `data-letter` values
    in the SSR'd HTML with `data-type` split exactly 12 vowels +
    36 consonants.

**Layout decision codified at port time**: ship option (a) — single
filter-able deck. The +60-line CSS cost vs reusing the Alphabets
deck variant is purely the theme block + a Hindi-only Devanagari
font-size override; *zero new layout primitives*.

**Pre-existing bug surfaced (not fixed in this commit)**:
`flashcards.ts` line 360 uses `Long%20Drum/3D/long_drum_3d.png`
(capital D) for the Bongo card — that path returns 403 in
production (Fluent UI uses lowercase `Long%20drum`). Bongo's image
has been broken on the live flashcards page for as long as
flashcards has shipped Fluent UI imagery. Hindi's Dhol consonant
uses the lowercase path. **Filed as one-off tech-debt** in
`PROGRESS.md` for the next session that touches flashcards data —
the fix is one character.

Full changelog entry: `PROGRESS.md` → "2026-05-08 — Hindi varnamala on GridLayout (11/13 games — foundational-set chapter closed)".

---

## Next session: Story games

The "Resume here next session" marker in `PROGRESS.md` points at
**StoryLayout decision** — only 2 vanilla games remain, both
linear-narrative story flows (Woodcutter, Daily Routines), and the
long-deferred `StoryLayout` decision is back on the table.

**Per the migration plan, *first try* modelling story pages as
cards on `CardMachineLayout`** — push-to-read + Prev/Next button
pair, no shuffle / random. If that collapses (e.g. story narrative
needs a different visual rhythm than the card-machine fact-card
pattern, or the press-to-flip animation conflicts with paginated
story flow), carve out `src/layouts/StoryLayout.astro` as a third
shared shell.

**Reading order for the next agent**:

1. Vanilla source: `kids-learning-games/games/woodcutter-story.html`
   (and `daily-routines.html` for cross-reference).
2. Closest Astro precedent: there *is* none yet — story flows are
   genuinely new. Read `src/layouts/CardMachineLayout.astro` to
   understand what it currently bakes in (shuffle/random buttons,
   filter pills, press-to-flip animation), and *prototype* by
   trying to fit Woodcutter into it before touching the layout.
3. Reference Stats + Quiz wiring scope (see "Pending broader work"
   below) — natural follow-up once both story games land.

**Expected first-attempt scope** (model as card-machine):

- New `src/data/woodcutter.ts` — N typed entries, one per story
  page. Field shape probably: `n` (page heading) + `f` (page body
  text) + `img` (page illustration) + `e` (emoji fallback). No
  filter (linear story).
- New `src/pages/games/woodcutter-story.astro` — copy-adapt of an
  existing card-machine page (e.g. `weather-game.astro` for the
  full Fluent UI image pattern). Suppress shuffle/random buttons
  via a layout prop or a CSS hide on the page.
- ~30-line `--cm-*` woodcutter theme block in `card-machine.css`
  + dark-mode override + FOUC pre-dark rule.
- Wire `GameNav.astro` + `index.astro` home tile, mark `ready: true`.

**If `CardMachineLayout` turns out to be the wrong shell**:

- Carve out `src/layouts/StoryLayout.astro` modelled on the card
  machine but stripped to "page card + Prev/Next + speech" — no
  filters, no shuffle, no random. Decide whether the press-to-flip
  animation comes too.
- Move story-game-specific tokens to `src/styles/story.css`.

**Standard ship sequence** (proven 7× now — alphabets / numbers /
colors / shapes / animals / birds / hindi):

1. Read vanilla `kids-learning-games/games/<game>.html`. Note
   exact data, page count, image set, narrative flow.
2. Decide layout: `CardMachineLayout` first (per the plan), only
   carve out `StoryLayout` if it collapses.
3. Build `src/data/<game>.ts` with header comment per migration
   principle #4.
4. Add the relevant CSS to the chosen layout's stylesheet.
5. Add FOUC pre-dark rule to the chosen layout component.
6. Write `src/pages/games/<game>.astro`.
7. Wire `GameNav.astro` + `index.astro`.
8. **Bulk-verify all Fluent UI image paths** (curl smoke test) —
   the Hindi port confirmed Fluent has class-of-bug 403s on humans
   + lowercase-second-word casing surprises. Fix any 404s
   pre-commit.
9. Run `npm run check` + `npm run build` (default sandbox — the
   2026-05-07 tooling fixes mean no `["all"]` needed for either).
10. Commit + push: `feat(<game>): port <game> on <layout> (12/13)`.
11. Verify live deploy (poll ~45 s, then HTTP 200 + SSR markup
    sniff via `curl + grep`).
12. Update `PROGRESS.md` + `README.md` + this file, add changelog
    entry, commit `docs:` follow-up.

After both story games land, the migration is **13/13 done** —
time to revisit Option C (unified Deck layout with grid/card view
toggle) and plan the cut-over of the vanilla `kids-learning-games`
repo to serve the Astro build.

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
- **Stats + Quiz modals**. Currently `alert(…)` stubs in all 11 ported
  games. The `progress.ts` helper exposes `loadLearned` — Stats modal
  should read from it directly. With 7 grid games now sharing the
  same pattern, the modal's value is clear; natural next task to
  pair with the story-game ports (or do as a standalone session).
- **`flashcards.ts` Bongo image is broken in production.** Line 360
  uses `Long%20Drum/3D/long_drum_3d.png` (capital D) — that path
  returns 403; Fluent UI uses lowercase `Long%20drum/...`. Surfaced
  during the Hindi port's bulk Fluent-path verification (Hindi's
  Dhol consonant uses the same emoji and ships the lowercase
  path correctly). Fix is one character on one line. Easy follow-up
  for the next session that touches flashcards.
- **Playwright smoke tests**. One suite per layout. Filter → navigate
  → completion overlay. Parameterise over themes. Not started.
- **`StoryLayout` decision**. *Now the active item* — first try
  modelling story pages as cards on `CardMachineLayout`. Only carve
  out a new layout if that doesn't fit. See "Next session: Story
  games" above.
- **Option C — unified `Deck` layout with grid/card view toggle.**
  *Now unblocked* as of 2026-05-08 — all 11 non-story games shipped.
  Best decided after the 2 story games land.
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
27. *"Continue"* (this docs commit) → wrote this docs follow-up,
    rolling the Hindi port into PROGRESS.md (changelog entry +
    "11 of 13 ported" snapshot updates + per-game layout decisions
    table + tech-debt section + "Resume here next session" pointer
    moved to StoryLayout decision), README.md (game count +
    `GridLayout` description + file tree + comparison table +
    shared-module list), and this file (TL;DR + current state +
    "What just shipped" + "Next session: Story games" + tech debt).

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
     (or `hindi-alphabets.html` for Hindi).
   - The closest Astro precedent: usually `src/pages/games/animals-game.astro`
     or `src/pages/games/birds-game.astro` (for big-emoji + Fluent UI
     image grid games), `src/pages/games/alphabets-game.astro` (for
     letter + Fluent UI image grid games like Hindi), or
     `src/pages/games/colors-game.astro` / `shapes-game.astro` (for
     CSS-art grid games).
   - The shared layout(s) you'll be reusing: `src/layouts/GridLayout.astro`
     or `src/layouts/CardMachineLayout.astro`.
   - The shared CSS: `src/styles/grid.css` or `src/styles/card-machine.css`.
   - The shared libs in `src/lib/` (`progress.ts`, `audio.ts`,
     `speech.ts`, `settings.ts`, `achievements.ts`).
4. The next likely task is the **`StoryLayout` decision** — only
   2 vanilla games remain (Woodcutter, Daily Routines), both
   linear-narrative story flows. Per the migration plan, *first try*
   modelling each story page as a card on `CardMachineLayout` (with
   press-to-read + Prev/Next, no shuffle/random); only carve out a
   separate `StoryLayout.astro` if that collapses. Full scope under
   "Next session: Story games" above.
5. **Do not** re-read the full chat transcript unless investigating a
   specific historical decision — the docs already capture the
   architectural conclusions.

---

*Last updated 2026-05-08 with Hindi varnamala port + docs follow-up.
11/13 games ported, all live, foundational-set chapter closed.
Next: 2 story games + `StoryLayout` decision (try `CardMachineLayout`
first, only carve out new layout if it collapses).*
