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
- **State (2026-05-07)**: **10 of 13 games ported and live** at
  https://aakash-jain-1.github.io/kids-learning-games-astro/.
- **Two shared layouts** in production:
  - `CardMachineLayout` (4 games — Dinosaurs, Flashcards, Solar System, Weather).
  - `GridLayout` (6 games — Alphabets, Numbers, Colors, Shapes, Animals, **Birds** ← shipped this session).
- **Just shipped**: Birds game on `GridLayout`. Second consumer of the
  `.gl-tile--emoji` namespace (big emoji + name label tile face,
  Fluent UI 3D PNG inside the detail card) — clean copy-adapt of the
  Animals page. Decided at port time to ship a *distinct* sunset
  palette (vanilla `birds.html`'s `#ff9a56 → #ff6a88` orange-coral
  gradient lifted unchanged) rather than reuse the Animals palette,
  for visual differentiation between sister "creature" games. Two
  vanilla bugs caught and fixed: (a) emoji-key collision (vanilla
  `🦢` used for both Swan and Woodpecker, second wins, only 14 of
  15 birds rendered — Astro splits via the Unicode-15.0 `🐦‍⬛` for
  Woodpecker so all 15 render), (b) emoji-name mismatch noted
  (vanilla `🦤` is Dodo per Unicode but labelled "Ostrich" — Astro
  preserves vanilla content + emoji, accepts the visual mismatch).
  Synthesized 5-group filter (`songbird` / `raptor` / `waterbird`
  / `tropical` / `ground` — vanilla had none); synthesized bird-call
  onomatopoeia (vanilla had none). Image source migrated from
  Pixabay JPGs → Fluent UI 3D PNGs (jsDelivr, runtime-cached). All
  13 unique image paths verified 200 OK pre-commit.
- **Resume here**: **Hindi** game next — last remaining
  foundational-set game. The only port with an *open layout question*:
  vanilla `hindi-alphabets.html` shows two visually-distinct grids
  stacked (~13 vowels + ~33 consonants) and the choice between (a)
  collapsing into one filter-able deck (current Alphabets pattern)
  vs (b) extending `GridLayout` with a sectioned-grid variant that
  renders `<h3>` group headings + grouped `.gl-deck` blocks needs
  to be made at port time. Lean (a) for symmetry; (b) only if the
  visual flatness genuinely confuses learners. ~46 tiles is also a
  stretch for `--capped` (96px max) — may need an uncapped variant
  or a smaller tile size.

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
  parked until all 11 non-story games ship.

Take-away: *when the user pushes back on an architectural choice,
treat it as a signal to investigate, not just implement the opposite.*

---

## Current state snapshot (commit `7db2bfc` for the feat; docs commit will follow)

**10 of 13 games ported.** Live URLs all return 200.

| Game | Layout | Theme | Bundle (gzip) | Notes |
|---|---|---|---|---|
| Flashcards | CardMachine | cyan/orange | 11.28 KB | 14 decks, 4 card-face variants |
| Weather | CardMachine | navy/ice-blue | 3.34 KB | 20 cards, full Fluent UI deck |
| Animals | Grid | sea-green/deep-blue | 3.30 KB | 37 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter |
| Dinosaurs | CardMachine | green | 3.02 KB | first POC game, 15 cards |
| Alphabets | Grid | purple/green | 2.96 KB | first GridLayout, 26 letters |
| Solar System | CardMachine | purple/gold | 2.66 KB | pure-CSS planet art |
| **Birds** | **Grid** | **orange-coral sunset** | **2.53 KB** | **15 tiles, big-emoji tile + Fluent UI 3D detail, 5-group filter, vanilla emoji-collision bug fixed** |
| Colors | Grid | pink/lavender | 2.25 KB | swatch tiles + shape gallery detail |
| Shapes | Grid | pink/coral | 2.11 KB | mini shape on tile, big shape detail |
| Numbers | Grid | sky-blue/orange | 2.08 KB | CSS count-objects detail |

**Pending (3)**: `hindi-game` (→ `GridLayout`), `woodcutter-story`,
`daily-routines-story` (→ `StoryLayout` TBD).

**6-way GridLayout shared chunk dedup verified** — alphabets, numbers,
colors, shapes, animals, **and birds** page-chunks all import the
*exact same*:

- `_astro/progress.Czz_LiQd.js` (0.24 KB gzip)
- `_astro/achievements.CySDez3r.js`
- `_astro/settings.zS6XEbod.js`

Plus a **clean 5-way `fluent` dedup** (the only 5 image-driven games:
alphabets, flashcards, weather, animals, **birds**; numbers / colors
/ shapes correctly do *not* import it because they use CSS art):

- `_astro/fluent.rTHKURu4.js` (89 bytes raw, 0.09 KB)

**CSS chunks**:

- `alphabets-game.dL4LgLJJ.css` — **~25.6 KB**, used by all 6 grid games.
- `dinosaurs-game.D1g7kimY.css` — 17.8 KB, used by all 4 card-machine games (unchanged from pre-birds).
- `solar-system-game.*.css` — solar-system-only.

**Recent commits** (newest first):

```
7db2bfc feat(birds): port Birds on GridLayout (10/13) + sunset palette + emoji collision fix
df1b627 docs: confirm Animals grid deploy is live + 5-way shared chunk verified
2b2c2a9 feat(animals): port Animals on GridLayout (9/13) + drop FLUENT_IMG_BASE re-exports
669d616 docs: confirm Shapes grid deploy is live + 4-way shared chunk verified
db11e4c feat(shapes): port Shapes on GridLayout (8/13) + new gl-shape-figure namespace
9fb3328 docs: confirm Colors grid deploy is live + 3-way shared chunk verified
99f22fe feat(colors): port Colors on GridLayout (7/13)
```

---

## What just shipped this session (Birds port)

Followed the established "ship a grid game" process:

1. Audit `kids-learning-games/games/birds.html` — 15 birds (well,
   *intended* 15; vanilla bug drops one), no groups, no `sound`
   field, just `info` strings + Pixabay JPGs, `birds_learned`
   LocalStorage key. Caught the vanilla emoji-key collision: both
   Swan and Woodpecker keyed on `🦢`, so the `birdsData = { ... }`
   object literal silently dropped Swan (only 14 of 15 rendered).
2. Build `src/data/birds.ts` — 15 typed entries with synthesized
   5-group filter (`songbird` / `raptor` / `waterbird` / `tropical`
   / `ground` — vanilla had none, documented deviation).
   **Vanilla bug fixed**: Sparrow gets `🐦`, Woodpecker gets
   the distinct `🐦‍⬛` (Unicode 15.0 / 2022 black bird emoji,
   supported on every target browser <3 years old). Three birds
   not in the Fluent pack got the alphabets `Q → Crown` substitution:
   Sparrow → Bird, Ostrich → Dodo, Woodpecker → Bird. **Synthesized
   bird-call onomatopoeia** (vanilla had none): "Aaah!" / "Screech!"
   / "Cock-a-doodle-doo!" / "Tap tap!" etc. Image source migrated
   from vanilla Pixabay JPGs to Fluent UI 3D PNGs (jsDelivr,
   runtime-cached). All 13 unique paths verified 200 OK pre-commit
   via curl.
3. Extend `src/styles/grid.css` — extended the existing
   `.gl-deck--animals` rule to be a comma-separated group also
   covering `.gl-deck--birds` (single shared rule, both decks share
   the auto-fill 96px+ density). Added the `--gl-*` birds theme
   block (~32 lines, orange-to-coral sunset gradient `#ff9a56 →
   #ff6a88` lifted unchanged from vanilla `birds.html`; deep-coral
   `#c41e58` action/filter pill accents), dark-mode override (deep
   wine/maroon background, peach tile colour). Total CSS delta ~60
   lines.
4. Add FOUC pre-dark rule for `[data-theme='birds']` to
   `GridLayout.astro`.
5. Build `src/pages/games/birds-game.astro` — **clean copy-adapt of
   `animals-game.astro`** (the closest precedent: same tile-face
   strategy, same image-driven detail card, same emoji-fallback
   pattern). Tile face uses the existing `.gl-tile--emoji`
   flex-column layout; detail card holds a Fluent UI 3D PNG with
   the per-card emoji as fallback. Group-coloured confetti on
   completion (5 colours: orange / coral / deep-coral / sea-green
   / sun-yellow — sunset palette mirrored across the celebration
   overlay).
6. Wire `GameNav.astro` + `index.astro` home tile.
7. Build verification: `astro check` 0/0/0 across 35 files;
   `astro build` 11 pages emitted; live deploy verified within
   ~50 seconds with 6-way GridLayout + 5-way `fluent` shared chunk
   dedup confirmed; all 9 prior games still 200 with markup intact.

**Theme decision codified at port time**: ship a *distinct* sunset
palette rather than reuse the Animals palette. The +60-line CSS cost
is worth visual differentiation between sister "creature" games.

**Vanilla emoji-name mismatch preserved**: vanilla's `🦤` (Dodo per
Unicode) labelled "Ostrich" — Astro keeps the vanilla content + emoji,
swaps in `Dodo/3D/dodo_3d.png` as the closest emoji-compatible Fluent
asset.

Full changelog entry: `PROGRESS.md` → "2026-05-07 — Birds game ported (10/13) + sunset palette + emoji-collision fix".

---

## Next session: Hindi port

The "Resume here next session" marker in `PROGRESS.md` points at
**Hindi** — the last remaining foundational-set game and the only
remaining port with an *open layout question*.

**Open question to settle at port time**: vanilla
`hindi-alphabets.html` shows two visually-distinct grids stacked
(~13 vowels + ~33 consonants). Two paths:

- (a) Collapse into one filter-able deck (current Alphabets pattern,
  with `vowel` / `consonant` filter pills). Symmetric with the other
  grid games — one `.gl-deck`, filter row controls visibility.
- (b) Extend `GridLayout` with a sectioned-grid variant that renders
  `<h3>` group headings + grouped `.gl-deck` blocks. More faithful
  to vanilla but adds a new layout primitive.

Lean (a) for symmetry; (b) only if the visual flatness genuinely
confuses learners. Worth prototyping (a) first and seeing if
~46 tiles in one auto-fill grid works on phone — that's the upper
edge of what `--capped` (96px max) was designed for. May need a
smaller tile size or an uncapped variant.

**Expected scope** (assuming option a):

- New `src/data/hindi.ts` — ~46 entries (13 vowels + 33 consonants)
  with `vowel` (स्वर) / `consonant` (व्यंजन) filter. Per character:
  Devanagari script (e.g. `अ`), Hindi word (e.g. `अनार`), English
  gloss (e.g. `pomegranate`), and image. Source vanilla content
  from `hindi-alphabets.html` verbatim.
- New `src/pages/games/hindi-game.astro` — **copy-adapt of
  `alphabets-game.astro`** (closest precedent: letter on tile face,
  Fluent UI image in detail card). Or `animals-game.astro` if we
  use emoji-tile instead of script-tile.
- ~35-line `--gl-*` hindi theme block in `grid.css` + dark-mode
  override + FOUC pre-dark rule.
- Apply the alphabets `Q → Crown` precedent for any Hindi character
  whose target image isn't in the Fluent UI pack.
- Wire `GameNav.astro` + `index.astro` home tile.

**No new infra needed** unless option (b) wins — `GridLayout`,
`progress.ts`, `settings.ts`, `achievements.ts`, `fluent.ts` all
stay as-is. The `fluent` chunk will pick up Hindi as its sixth
consumer automatically.

**Standard ship sequence** (proven 6× now):

1. Read vanilla `kids-learning-games/games/hindi-alphabets.html`.
   Note exact data, vowel/consonant split, character-to-word
   mapping, image set, LocalStorage key.
2. **Decide layout question (a) vs (b) above.** If (b), design the
   sectioned-grid variant *first* before writing any data — it's a
   new layout primitive that the data file's shape will depend on.
3. Build `src/data/hindi.ts` with header comment per migration
   principle #4.
4. Add the relevant CSS to `grid.css` (theme block + any sectioned-
   grid additions).
5. Add FOUC pre-dark rule to `GridLayout.astro`.
6. Write `src/pages/games/hindi-game.astro`.
7. Wire `GameNav.astro` + `index.astro`.
8. Verify all Fluent UI image paths return 200 OK (curl smoke test).
9. Run the build (see "Build commands" below — `npx astro check`
   has a known interactive-prompt gotcha).
10. Commit + push: `feat(hindi): port Hindi on GridLayout (11/13)`.
11. Verify live deploy (poll for HTTP 200, sniff SSR markup).
12. Update `PROGRESS.md` + `README.md` + this file, add changelog
    entry, commit `docs:` follow-up.

After Hindi, only the 2 story games remain — and the long-deferred
`StoryLayout` decision is back on the table. Per the "first try
modelling story pages as cards" plan, the next session after Hindi
should attempt Woodcutter on `CardMachineLayout` and only carve out
`StoryLayout` if that doesn't fit.

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
- **Stats + Quiz modals**. Currently `alert(…)` stubs in all 10 ported
  games. The `progress.ts` helper exposes `loadLearned` — Stats modal
  should read from it directly. With 6 grid games now sharing the
  same pattern, the modal's value is clear; this is a natural next
  task once Hindi lands (or before, if a session falls long enough
  to do both).
- **Playwright smoke tests**. One suite per layout. Filter → navigate
  → completion overlay. Parameterise over themes. Not started.
- **`StoryLayout` decision**. First try modelling story pages as
  cards on `CardMachineLayout`. Only carve out a new layout if that
  doesn't fit. Don't pre-emptively design.
- **Option C — unified `Deck` layout with grid/card view toggle.**
  Parked until all 11 non-story games ship.
- **Cut-over plan.** Only after all 13 games land. Migrate the
  vanilla repo to serve the Astro build. SW handoff strategy needed
  for existing PWA installs.

---

## User communication style (notes for the next agent)

- **Short, directive prompts**: "Continue", "Go ahead", "Lets push", "HI".
  These mean: continue the documented plan / proceed with the next item
  on the active todo list / commit + push the queued work.
- **Standing delegation** for the ship → verify → docs cycle. The
  pattern (across 4 grid ports now): commit feat → push → verify live
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
4. The next likely task is the **Hindi** port — full scope under
   "Next session: Hindi port" above. Note the open layout question
   (one filter-able deck vs sectioned-grid variant) needs to be
   settled at port time before writing the data file.
5. **Do not** re-read the full chat transcript unless investigating a
   specific historical decision — the docs already capture the
   architectural conclusions.

---

*Generated 2026-05-07 from a single chat that ran from project audit
(2026-04-24) through Birds port + docs + tooling-friction fixes
(2026-05-07). 10/13 games ported, all live. Next: Hindi.*
