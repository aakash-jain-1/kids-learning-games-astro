# Kids Learning Games — Astro POC

[![Deploy to GitHub Pages](https://github.com/aakash-jain-1/kids-learning-games-astro/actions/workflows/deploy.yml/badge.svg)](https://github.com/aakash-jain-1/kids-learning-games-astro/actions/workflows/deploy.yml)
[![Playwright tests](https://github.com/aakash-jain-1/kids-learning-games-astro/actions/workflows/test.yml/badge.svg)](https://github.com/aakash-jain-1/kids-learning-games-astro/actions/workflows/test.yml)

A proof-of-concept migration of the [kids-learning-games](../kids-learning-games) vanilla HTML/CSS/JS PWA to **Astro + TypeScript + @vite-pwa/astro (Workbox)**. **All thirteen vanilla games ported end-to-end** — the migration is now complete — **plus three new preschool-math games (Counting Friends + More Friends + Number Friends, ages 3–4) added 2026-05-15 / 2026-05-18** as the first feature-driven builds after the migration arc closed, completing the cardinality triad (set→numeral, set vs set, numeral→set). Sixteen games across **three shared layouts**:

- `CardMachineLayout.astro` — **reference-catalogue games** (browse a deck of fact cards). Hosts Dinosaurs, Flashcards, Solar System, Weather.
- `GridLayout.astro` — **foundational-set games** (scan a fixed chart, tap to hear). Hosts all 7 grid games: Alphabets, Numbers, Colors, Shapes, Animals, Birds, and Hindi.
- `StoryLayout.astro` — **story-flow games** + **single-scene stage games** (follow a linear narrative — paginated for Routines, single hero scene for Woodcutter — then take a quick comprehension quiz; the three new preschool-math games (Counting Friends + More Friends + Number Friends) also ride this shell because the wiring it needs is identical, gated by a `theme: 'addition' | 'comparison' | 'numberfriends'` prop). Hosts Daily Routines (paginated, 10 scenes), the Honest Woodcutter (single scene + 4 prose paragraphs + moral panel), **Counting Friends (preschool addition, 8 round-based scenes per session)**, **More Friends (preschool magnitude comparison, 8 side-by-side scenes per session — sister/precursor to Counting Friends)**, and **Number Friends (preschool numeral recognition, 8 rounds with one numeral target + three group panels per round — completes the cardinality triad with Counting Friends and More Friends)**.

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
  - `StoryLayout.astro` hosts Daily Routines (paginated 10-scene narrative + 8-question quiz), the Honest Woodcutter (single CSS-animated hero scene + 4-paragraph prose + moral panel + 6-question quiz), **Counting Friends** (preschool-math addition for ages 3–4 — 8 single-scene rounds per session, two groups of friendly objects per scene that the child can tap-to-count, then pick a numeral from three five-frame buttons; errorless answer flow narrates a guided count when the child taps wrong; no scoring/timers/failures), **More Friends** (preschool-math magnitude comparison for ages 3–4 — 8 single-scene rounds per session, two groups of friendly objects shown side-by-side with sizes 1–4 each (always unequal); the child taps the bigger group; errorless flow narrates a guided count of *both* groups on a wrong tap, then reveals the correct side with a pulsing ring; sister game / developmental precursor to Counting Friends — children master "more vs less" comparison ~6–12 months before they consolidate cardinality enough to add), and **Number Friends** (preschool-math numeral recognition for ages 3–4 — 8 single-scene rounds per session, one numeral target 2–5 displayed at the top with a five-frame visualisation, three group panels with distinct sizes below where exactly one matches the target; the child taps the matching group; errorless wrong-tap flow narrates a guided count of the *tapped wrong* group ("four ducks — that was four, not three"), pauses, then narrates a guided count of the *correct* group ("look — one, two, three — three ducks"), and reveals the correct panel with a pulsing ring; completes the cardinality triad — Counting Friends asks set→numeral, More Friends asks set vs set, Number Friends asks numeral→set). All five games feed through the same shell — header → optional progress bar → scene panel with per-game CSS art → optional Prev / 🔊 Listen / Next controls → comprehension quiz (or per-round answer flow for the three preschool-math games). The body background gradient morphs between sunrise / midday / evening / night palettes per scene for Routines via a `--st-bg` CSS custom property; Woodcutter sets it once at load to the deep navy → purple twilight gradient; Counting Friends, More Friends, and Number Friends each pick a per-round palette from a shared 4-theme set (Pond / Orchard / Sea / Garden) extracted into `src/lib/preschool-themes.ts` at the More Friends ship as the second-consumer carve, validated as the right level of abstraction by Number Friends consuming it as the third consumer at zero changes. Per-game scene art (`.sun`, `.bed`, `.fairy`, `.golden-axe`, `.cf-item`, `.mf-item`, `.nf-item`, etc.) lives in a per-game CSS file (`routines.css` / `woodcutter.css` / `addition.css` / `comparison.css` / `numberfriends.css`), every selector scoped under `.routines-art` / `.woodcutter-art` / `body.story[data-theme='addition']` / `body.story[data-theme='comparison']` / `body.story[data-theme='numberfriends']` and (for the two story games' art) every keyframe prefixed `routines-*` / `woodcutter-*` so the five flat-named art systems can never collide. Scene-visited progress (Routines only) flows through `progress.ts` (`kids_progress_v1:routines`); quiz state (`{ attempts, bestScore, lastPlayed }`) flows through `src/lib/quiz.ts` (`<gameId>_quiz_v1`) — extracted as a shared library at the Woodcutter port time, per the "second consumer triggers a refactor" rule. The three preschool-math games keep their own bespoke stats schemas (`counting_friends_stats_v1` / `more_friends_stats_v1` / `number_friends_stats_v1`) because `mountQuiz`'s 4-option text-question shape doesn't fit a 2-or-3-option visual game for a 3yo.
  - Together they replace the ~500-line shell the vanilla project copy-pastes across each of its 13 game HTML files.
- **Three themeable shared stylesheets**:
  - `card-machine.css` exposes ~25 `--cm-*` CSS custom properties; each theme is a ~35-line `body.card-machine[data-theme='<game>']` block plus ~10 lines of type-pill colours.
  - `grid.css` exposes ~25 `--gl-*` CSS custom properties; each theme is a ~35-line `body.grid[data-theme='<game>']` block.
  - `story.css` exposes ~20 `--st-*` CSS custom properties; each theme is a ~30-line `body.story[data-theme='<game>']` block. Game-specific scene art lives in a separate scoped CSS file (`routines.css` for the paginated game, `woodcutter.css` for the single-scene game) that the page imports alongside `story.css`. Both art files keep their selectors under a `.<game>-art` marker class and prefix all keyframes `<game>-*`, so the two stylesheets are bidirectionally collision-free.
  - Shared chrome primitives (`.ctrl-pill`, `.cat-bar`, `.cat-btn` base, progress bar, nav, modal) live in `global.css`, so all three layouts share them without cross-importing. Each layout provides its own `.cat-btn.active` override from its own theme tokens.
- **Typed data**: each game's content lives in `src/data/<game>.ts` with named interfaces and `readonly` arrays — TypeScript catches typos in card type/season/diet/group/scene enums at build time, not at runtime. The `QuizQuestion` shape is shared by both story games and lives in `src/lib/quiz.ts`.
- **Unified settings** (fixes audit H1): a single `kids_settings_v1` LocalStorage key, applied on every page on load.
- **Per-game learning state**: `kids_progress_v1:<gameId>` LocalStorage key with a JSON array of learned-item ids. **All seven grid games (Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi) plus Daily Routines** (storing the 10 scene IDs visited) consume the shared `src/lib/progress.ts` helper (`loadLearned` / `saveLearned` / `clearLearned`), extracted on the second consumer per the "two-consumers triggers a refactor" rule. Woodcutter doesn't track per-item progress — its single-scene story has no items to mark learned.
- **Per-game quiz state**: `<gameId>_quiz_v1` LocalStorage key with a `{ attempts, bestScore, lastPlayed }` JSON object. **All 13 games** consume the shared `src/lib/quiz.ts` controller (`mountQuiz` factory + `loadQuizState` / `saveQuizState` / `clearQuizState` / `escapeQuizHtml`): **both story games** (Daily Routines, Honest Woodcutter) since the original Woodcutter port (when the lib was extracted per the "second consumer triggers a refactor" principle), **all four card-machine games** (Dinosaurs, Flashcards, Solar System, Weather) wired during Track 1 batches 1+2 of the post-migration polish (2026-05-08), and **all seven grid games** (Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi) wired during Track 1 batch 3 (2026-05-11). Build emits a single 3.20 KB raw / 1.69 KB gzip shared chunk imported by every game page — **13-way dedup**. The grid sweep also triggered the rule-#3 third-consumer extraction of the inner modal CSS selectors (`.quiz-question`, `.quiz-opt`, `.quiz-result-*`, `.quiz-heading`, plus the layout-agnostic `.cm-quiz-overlay, .gl-quiz-overlay` / `.cm-quiz-card, .gl-quiz-card` outer shells) into a shared `src/styles/quiz-modal.css` consumed by both `CardMachineLayout` and `GridLayout`. `card-machine.css` and `grid.css` keep only the canonical `--quiz-*` per-theme tokens + their own outer shell scope; story still keeps its inline `.quiz-box` panel because the DOM shape is genuinely different (always-visible, in-flow, not a fixed-position overlay).
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
│   │   ├── GameControls.astro    # 3-pill ctrl-row (Quiz/Stats/Settings) — 13-way dedup
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
│   │   ├── woodcutter.ts         # typed Honest Woodcutter single-scene art + 4-para STORY + MORAL + 6-question QUIZ
│   │   ├── addition.ts           # Counting Friends — sums-2-to-5 round generator + per-round narration script (re-exports themes from preschool-themes lib)
│   │   ├── comparison.ts         # More Friends — magnitude-comparison round generator + per-round narration script (imports themes from preschool-themes lib)
│   │   └── numberfriends.ts      # Number Friends — numeral-to-set round generator (target 2–5, three groups with one matching + two decoys, 4 near + 4 mixed difficulty mix per session) + per-round narration script (imports themes from preschool-themes lib)
│   ├── layouts/
│   │   ├── CardMachineLayout.astro  # reference-catalogue games
│   │   ├── GridLayout.astro         # foundational-set games
│   │   └── StoryLayout.astro        # story-flow games
│   ├── lib/
│   │   ├── achievements.ts       # toast + localStorage helper
│   │   ├── audio.ts              # singleton AudioContext
│   │   ├── preschool-themes.ts   # PreschoolTheme catalog + ThemeMeta + numberWord helpers — shared by Counting Friends + More Friends + Number Friends (second-consumer carve 2026-05-18, validated by third-consumer ship of Number Friends same day)
│   │   ├── progress.ts           # kids_progress_v1:<gameId> store (alphabets, numbers, colors, shapes, animals, birds, hindi, routines)
│   │   ├── quiz.ts               # <gameId>_quiz_v1 store + mountQuiz controller (13-way: every vanilla-port game; preschool-math games skip it for their own per-round flows)
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
│   │   │   ├── woodcutter-story.astro     # StoryLayout (single-scene)
│   │   │   ├── counting-friends-game.astro # StoryLayout (theme=addition; first feature-driven game — preschool addition)
│   │   │   ├── magnitude-comparison-game.astro # StoryLayout (theme=comparison; second feature-driven game — preschool magnitude comparison)
│   │   │   └── number-friends-game.astro # StoryLayout (theme=numberfriends; third feature-driven game — preschool numeral recognition; completes the cardinality triad)
│   │   └── index.astro
│   ├── styles/
│   │   ├── card-machine.css      # themeable card-machine visual system + --quiz-* token block per cm theme
│   │   ├── grid.css              # themeable grid visual system + --quiz-* token block per grid theme
│   │   ├── quiz-modal.css        # shared modal: inner .quiz-question/.quiz-opt/.quiz-result-* + outer .cm-quiz-overlay,.gl-quiz-overlay shells (consumed by BOTH CardMachineLayout and GridLayout)
│   │   ├── story.css             # themeable story-flow visual system (--st-* tokens; story keeps its own inline .quiz-box panel — DOM shape genuinely different)
│   │   ├── routines.css          # Daily Routines per-scene CSS art (scoped under .routines-art)
│   │   ├── woodcutter.css        # Honest Woodcutter hero-scene CSS art + prose/moral cards (scoped under .woodcutter-art)
│   │   ├── addition.css          # Counting Friends visual system — 4 scene palettes, five-frame numeral buttons, fly-in/pulse/celebrate animations (scoped under body.story[data-theme='addition'] .cf-*)
│   │   ├── comparison.css        # More Friends visual system — same 4 scene palettes, side-by-side group panels as answer buttons, fly-in/pulse/celebrate animations (scoped under body.story[data-theme='comparison'] .mf-*)
│   │   ├── numberfriends.css     # Number Friends visual system — same 4 scene palettes, big numeral target card at top + 3-panel grid below as answer buttons, fly-in/pulse/celebrate animations (scoped under body.story[data-theme='numberfriends'] .nf-*)
│   │   ├── planets.css           # solar-system-only CSS planet art
│   │   └── global.css            # base reset + shared chrome primitives
│   └── pages/                    # (see above)
├── tests/                        # Playwright smoke suites (Track 2)
│   ├── card-machine.spec.ts      # 4 themes × {SSR shell, quiz overlay flow, close button}
│   ├── grid.spec.ts              # 7 themes × {SSR deck, tile-tap progress, quiz flow, close}
│   ├── story.spec.ts             # routines (scene nav + quiz reveal) + woodcutter (auto-quiz + reset)
│   ├── addition.spec.ts          # counting-friends (SSR groups + sum invariant + correct/wrong-answer flows + home-card link)
│   ├── comparison.spec.ts        # more-friends (SSR groups + bigger-side invariant + correct/wrong-answer flows + home-card link)
│   ├── numberfriends.spec.ts     # number-friends (SSR target+groups + distinct-sizes + match-target invariant + correct/wrong-tap flows + home-card link, all using href-based selectors from day one)
│   ├── helpers.ts                # shared waiters: answerQuizUntilResult, readQuizState, readLearned, modal open/close
│   └── tsconfig.json             # extends ../tsconfig.json + adds @playwright/test types
├── playwright.config.ts          # webServer (astro preview) | PLAYWRIGHT_BASE_URL override | chromium-only | ignoreHTTPSErrors for Zscaler MitM
└── .github/workflows/
    ├── deploy.yml                # build + ship dist/ to GitHub Pages on push to main
    └── test.yml                  # build + Playwright smoke suite (soft gate, runs in parallel)
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

## Testing

Three Playwright smoke suites — one per layout (`tests/card-machine.spec.ts`,
`tests/grid.spec.ts`, `tests/story.spec.ts`) — assert that every shipped game
SSRs the right shell, the `mountQuiz` modal opens / advances / records to
LocalStorage, and the per-game progress writes hit `kids_progress_v1:<gameId>`
where applicable. Themes are parameterised inside each suite, so a regression
in any one of the 13 games shows up as a single failing row in the report.

```bash
npm run test:install   # one-time: install Playwright's chromium + deps
npm test               # build first if needed, then run all 47 tests
npm run test:ui        # interactive Playwright runner (debug a flaky test)
```

`playwright.config.ts` spawns `astro preview --host 127.0.0.1` via Playwright's
`webServer` config, so `npm test` is fully self-contained — you don't need a
separate `npm run preview` running. CI runs the same script in
`.github/workflows/test.yml` (one chromium worker, build first, then test;
artefacts uploaded as `playwright-report/`).

> **Local Zscaler note:** if `npm test` hangs or returns 403s on this dev box,
> the corporate Zscaler proxy is intercepting localhost traffic on every port.
> Workaround: point the suite at the live GitHub Pages deploy via
> `PLAYWRIGHT_BASE_URL`. The config skips spawning the webServer when this var
> is set, and `ignoreHTTPSErrors: true` accepts Zscaler's MitM cert.
>
> ```bash
> PLAYWRIGHT_BASE_URL="https://aakash-jain-1.github.io/kids-learning-games-astro/" npm test
> ```
>
> Trailing slash matters — tests use `page.goto('games/<slug>.html')` (no
> leading slash) so URLs compose under the Astro `base` prefix; without the
> trailing slash on the base URL, `new URL(path, baseURL)` resolves under the
> host root and you'll get a "Site not found · GitHub Pages" 404. Same applies
> to the local URL: `playwright.config.ts` always emits the trailing slash.

## What's NOT in scope for this POC

- *(All 13 vanilla games shipped as of 2026-05-08 — Woodcutter closed the migration. Routines + Woodcutter both ship a real, fully-functional inline quiz on the shared `src/lib/quiz.ts` controller. The migration is now complete.)*
- Option C — a unified `DeckLayout` with a per-user grid/card/story view toggle that would consolidate `CardMachineLayout` + `GridLayout` + `StoryLayout` into one. Now unblocked (all 13 games shipped + `src/lib/quiz.ts` extracted), but the evidence to date still leans **against** consolidation: different detail-payload shapes, different filter bars, different state shapes (`Set<string>` for grid progress vs `{ attempts, bestScore, lastPlayed }` for story quiz state vs no per-item state at all for Woodcutter). See the "Option C" entry in PROGRESS.md for the full evidence trail.
- ~~Wire the real Stats + Quiz modals across **all** ported games — *in progress (4 of 11 non-story games wired as of 2026-05-08)*.~~ **Done 2026-05-11**: 11 of 11 non-story games + both story games = all 13 wired. Track 1 closed across three batches: Dinosaurs (batch 1, 2026-05-08, paid the `.cm-quiz-overlay` shell + 4-theme `--cm-quiz-*` palette one-time CSS cost), Flashcards/Solar System/Weather (batch 2, same day, zero new CSS), 7 grid games + the rule-#3 third-consumer extraction (batch 3, 2026-05-11). Inner modal selectors now live once in `src/styles/quiz-modal.css`; per-layout CSS files keep only the canonical `--quiz-*` per-theme tokens + their own outer shell scope. Shared `quiz.ts` chunk now **13-way deduped** (`quiz.BkZwETv6.js`, 3.20 KB raw / 1.69 KB gzip — bigger than the 6-way version because Vite folds in helpers when importer count rises; per-game cost-of-entry stays *zero* JS). Live verified: 13 game pages + index all HTTP 200; SSR markup partition holds (`gl-quiz-overlay` × 7, `cm-quiz-overlay` × 4, no cross-leakage). Whether the Stats panel deserves a dedicated `/stats` page or per-page Stats modal is a follow-up question — best decided after Playwright lands so existing alert-shape behaviour can be locked in by tests first.
- ~~Full test suite — Playwright smoke tests per layout (one for grid, one for card-machine, one for story) parameterised over themes are queued in PROGRESS.md.~~ **Bootstrapped 2026-05-11** as Track 2 of the post-migration polish: 47 tests across `tests/{card-machine,grid,story}.spec.ts`, all 13 themes parameterised, run by `npm test` against `astro preview` via Playwright's `webServer` config (or against any `PLAYWRIGHT_BASE_URL`-pointed deploy). Wired into `.github/workflows/test.yml` as a soft gate (failures don't block deploy yet — promoting it to a hard gate is one line). Validated end-to-end against the live GitHub Pages deploy in 22.2 s wall-clock; full suite passes 47/47.
- ~~Cut-over plan — the live `kids-learning-games` repo still serves the vanilla static HTML pages. Migrating it to serve the Astro `dist/` build (with a SW handoff strategy so existing PWA installs gracefully transition to the new SW) is the final piece, intentionally postponed until after this POC's content stabilised.~~ **Track 4 closed 2026-05-12 — cut-over cancelled. Decision: the Astro app stays at `https://aakash-jain-1.github.io/kids-learning-games-astro/` as the permanent canonical URL; the vanilla `kids-learning-games` repo stays live independently as a legacy app, no cross-repo writes.** Same-day reversal of the morning's Phase-1 decision (Option A — Astro takes over the vanilla URL): the morning's session shipped Phase 1 (decision + ADR) + Phase 2 (groundwork code: SW source rename `src/sw.ts` → `src/service-worker.ts`, 4 redirect aliases for the divergent vanilla filenames, offline-fallback URL bug fix) and queued Phase 3 (URL flip + cross-repo deploy) for the next session pending explicit user OK; the afternoon pivot reversed Phase 1's decision and cancelled Phase 3 entirely. **The "-astro" suffix in the URL is no longer treated as a staging marker — it's the production URL.** The Phase 2 code changes stay in the codebase (the SW rename keeps a more conventional filename, the 4 redirect aliases are repurposed as robustness for hand-typed legacy URLs, and the offline-fallback URL fix was a real bug independent of the cut-over plan). The vanilla `kids-learning-games` repo is a no-touch zone going forward; users who have a vanilla bookmark continue to use vanilla, users who find the Astro URL use Astro, and the vanilla URL ages out by attrition. See `PROGRESS.md` → "Rough order of payoff → 6" → "Pivot 2026-05-12 (afternoon)" for the full reversal rationale + reopen conditions. **Same-day hotfix shipped (2026-05-12, afternoon, commit `fce0380`):** the morning's Phase-2 SW-install fix unmasked a latent `NavigationRoute(createHandlerBoundToURL('offline'))` bug in `src/service-worker.ts` that served the offline page on every navigation; replaced with `setCatchHandler` (Workbox's documented offline-fallback primitive that fires only when other handlers fail) — live deploy verified, home page returns 200 with HTML, SW has 0 `NavigationRoute` references and 1 `setCatchHandler` call. New follow-up filed (T8: SW-aware Playwright spec under `serviceWorkers: 'allow'`) since the existing suite blocks SWs and missed it. See `PROGRESS.md` changelog **2026-05-12 (afternoon, hotfix)** for the full ADR-style write-up.

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
| Shared CSS | Duplicated 5× inline (~450 lines each) | `card-machine.css` (~840 lines, 4 games — ~215 lines moved out into the shared `quiz-modal.css` at the rule-#3 extraction) + `grid.css` (~1420 lines, 7 games — `--quiz-*` token block + `.gl-quiz-overlay` shell added) + `story.css` (~265 lines, 2 games) + `quiz-modal.css` (~210 lines, shared by both modal layouts) + shared primitives in `global.css` |
| Shared JS util lines | Duplicated per game inline | 1 copy under `src/lib/` (audio, achievements, progress, quiz, settings, speech) |
| Settings storage | `flashcards_settings` vs `darkMode` vs `solar_system_settings` vs `weather_settings` vs `alphabet_learned` vs `numbers_learned` vs `colors_learned` vs `shapes_learned` vs `animals_learned` vs `birds_learned` vs `hindi_learned` vs `routines_progress` vs `woodcutter_progress` (+ `birds_achievements` + `birds_stats` + `hindi_achievements` + `hindi_stats` + `routines_quiz`) | Single `kids_settings_v1` + per-game `kids_progress_v1:<gameId>` (alphabets, numbers, colors, shapes, animals, birds, hindi, **routines**; shared `src/lib/progress.ts` helper) + per-game `<gameId>_quiz_v1` for quiz state (**all 13 games** — routines, woodcutter, dinosaurs, flashcards, solar-system, weather, alphabets, numbers, colors, shapes, animals, birds, hindi; shared `src/lib/quiz.ts` controller — 13-way dedup) |
| Service worker | Hand-rolled, manual cache name bumps | Workbox, auto-revisioned |
| Build-info fetch | N× per session, no cache | 1× per hour, SWR cached |
| Type safety | None | Strict TypeScript |
| Client JS bundle, gzipped | Inline, unminified | flashcards **11.94 KB** *(Quiz/Stats wired)*, **hindi 5.85 KB** *(post-quiz-wiring; +0.60 KB on Track 1 batch 3)*, **routines ~4.08 KB** (10 scenes' inline `artHtml` + 8-question quiz), **weather 4.03 KB** *(Quiz/Stats wired)*, **animals 3.90 KB** *(post-quiz-wiring; +0.59 KB)*, **dinosaurs 3.68 KB** *(Quiz/Stats wired)*, **alphabets 3.58 KB** *(post-quiz-wiring; +0.60 KB)*, **solar-system 3.26 KB**, **birds 3.13 KB** *(post-quiz-wiring; +0.58 KB)*, **colors 2.86 KB** *(post-quiz-wiring; +0.59 KB)*, **shapes 2.69 KB** *(post-quiz-wiring; +0.56 KB)*, **numbers 2.68 KB** *(post-quiz-wiring; +0.59 KB)*, **woodcutter 1.44 KB** (smallest — pure pre-rendered scene art + tiny quiz wiring); shared `quiz.ts` chunk **1.69 KB gzip** (3.20 KB raw, `quiz.BkZwETv6.js`) now dedups **13-way** across every game |
