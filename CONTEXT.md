# Project Context — Kids Learning Games (Astro)

> **What this file is**: a fast-loading orientation map for any human or AI
> agent starting work in this repo. It is a *summary*, not the source of
> truth. When this file and the canonical docs disagree, the canonical docs
> win. Keep it short and current — see the update rule in
> `.cursor/rules/maintain-context.mdc`.
>
> **Last verified against the codebase**: 2026-08-23 (**every correct answer in
> the app opened with the same word** — "Yes" led 96 spoken lines, 17.6% of all
> speech, and in the recognition games "Yes" plus wrong taps came to exactly the
> round count, so it was every single one. Four affirmations now rotate, seeded
> off the round's own content so no `buildNarration` signature had to change;
> see `RIGHT_LEADS` in `data/preschool-narration.ts`. Same playthrough found
> that **Animal Sounds asked the same question 27 times** — found by playing all 14 games through and reading
> the transcripts, not by a test: 27 rounds and one distinct prompt, where
> Where's Teddy manages 25 across 25. Six intros and three corrections now
> rotate by round index. The constraint that caused it still holds — while a
> clip plays, the prompt may not name the animal or say its call. Before that,
> **nothing a child needs is made of movement or of hue alone.** §5 rule 16: right and wrong were ~24 ΔE
> apart for normal colour vision and under 7 under simulated deuteranopia in
> nine of the fourteen games, with ten having no non-colour difference
> whatsoever — every wrong option now carries the `✗` badge the four original
> adopters already had. One thing that fix does *not* reach: Pattern Sequences
> is itself a colour-matching puzzle, so a red-green colour-blind child still
> can't play it; that needs shapes in the circles and is a content call. Before
> that, **nothing a child needs is made of movement any more** — §5 rule 15. Sweeping for the shape behind the
> quiz bug below found that every guided walk-through marks its current item
> with a class added before `narrate()` and removed on its `onEnd`, and in Week
> Friends, Days Parade and Pattern Sequences that class was a bare `animation:`
> over a stylesheet that disables animation under `prefers-reduced-motion`. So
> the one thing pairing a spoken word with the card it names rendered *nothing*
> for those children — measured identical before and after applying it. All
> three now carry a static ring. That came out of: **being told you were
> wrong no longer requires being able to see animation.** In the 13 games with a
> written quiz, `.quiz-opt--wrong` was made purely of shake — and reduced motion
> cuts animation to 0.01ms, leaving the tapped button pixel-identical to options
> the child never touched, with only a green ring on some *other* button to go
> on. It now carries a dashed slate ring as well, which keeps that flow's
> deliberate no-red rule (§5 rule 8's documented exemption, now named at both
> sites instead of each comment quietly contradicting the other). Also **both
> ends of the wording pass are done.** Winning now names the doing: eight "*X* champion!" headings,
> "You're a rhyming star!", "Geometric genius!" and "What a memory!" were the
> same copy-pasted trait label with the game's noun swapped in, and are now
> "Great looking!", "Great counting!", "Great remembering!" and so on — process
> praise rather than a title, which is the split Cimpian et al. (2007) measured
> on four-year-olds (§5 rule 14, held by `tests/praise.spec.ts`). And **a wrong
> answer now says so.** Every game opened its correction with "Hmm!" — which a three-year-old
> hears as the game thinking, not as "that isn't the one" — and two went
> straight into "Let's count them together!", so the only signals were a red
> tint and a tone, neither of which is language. Corrections now open with a
> shared **"Not that one."** (§5 rule 8, `src/data/preschool-narration.ts`),
> which is the *verification judgment* the feedback literature puts in ~85% of
> studied conditions and these games were missing while doing the harder half —
> naming the choice, the answer, and why — perfectly well. Also: **a child can
> now start a game and finish it.** Two fixes from one playthrough session. **Runs resume**:
> the longest are ~7 min of narration across 25 rounds, and reloading used to
> restart at 1/25, so the completion screen was arguably unreachable and
> "Full runs finished" stayed at zero — `lib/run-state.ts` now stores the
> unfinished run, and Reset had to be taught to clear it or "Start over?" would
> have meant "carry on". And **the opening question is
> now actually asked** — playing nine games end to end showed that if a child's
> first touch lands on an answer tile, which is what a child does, the intro
> narration was skipped entirely and the first words they heard were the
> correction, "Hmm! Let's listen again." Round one was unanswerable by design
> for a pre-reader. The first tap on an answer is now swallowed and asks the
> question instead; the next tap is a real answer. That is **§5 rule 13**, held
> by `tests/invariants.spec.ts`. Still open and a product call rather than a
> defect: whether 25–27 rounds is the right size for a 3–4 year old at all.
> Earlier: **§5 rule 8 migration
> closed** — the nine remaining games with a wrong answer now give the red
> tint, the error tone and the spoken correction, so all 14 that have one
> agree. Fixing it surfaced a second bug in the five games that *had* adopted
> the rule: they assigned the 16%-opaque tint to `background`, which erased the
> tile's white surface, so a wrongly-tapped tile turned into a translucent
> window onto the page gradient and read teal rather than red. The tint is now
> a shared token layered over each option's own surface, and
> `tests/wrong-answer.spec.ts` checks rendered pixels and the audio graph
> rather than CSS values. Chasing that shape further found it in **seven more
> games on the success path** — `--correct` and `--reveal`, which fire every
> round rather than only on mistakes — so it is now **§5 rule 12** with
> `tests/feedback-opacity.spec.ts` measuring each option's rendered alpha
> against its own resting value. A sweep for rules that drifted the same way —
> restated per-site with no cross-game test — found three more (mute,
> reduced motion, SSR'd first round); all three were being honoured, and
> `tests/invariants.spec.ts` now pins them. Earlier: **Memory Match shipped —
> the August arc is complete**, 6 of 6, **29 games**, and the first game whose
> skill is *remembering* rather than recognising. It answers the arc's last
> open design question (Q5) by dissolving it: the board growth the design doc
> wanted as persisted stages became the shape of **one run** — 3 → 4 → 6 pairs
> back to back, which is exactly the 13-animal pool dealt once. It is also the
> one preschool game that deliberately does **not** apply §5 rule 8, because a
> non-match is not a wrong answer. Shipped alongside it: a **UTC-vs-local date
> bug** found by a test failing at 00:35 local — all 16 `lastPlayed` writes
> stamped the UTC date while the dashboard compared against the local one, so
> every session before 05:30 local rendered as "yesterday". Earlier:
> **Where's Teddy? shipped**
> — fifth of the arc, and the first to teach
> spatial/positional language. It carries a lesson worth reusing: three of its
> five prepositions are drawn purely by *where an emoji sits*, and every
> behavioural test passed while two of them were visually wrong, so
> `tests/wheres-teddy.spec.ts` measures the rendered pixels. Same day, earlier:
> **dark mode now actually
> darkens the page in all 14 StoryLayout themes and the per-round scene artwork
> paints for the first time** — the two oldest §7 debt items, both closed;
> `tests/dark-mode.spec.ts` added. Same day, earlier: **a contrast + affordance
> sweep** fixed 16 unreadable page titles and 11 full-opacity `disabled`
> buttons, adding the §5 rule 10 corollary and
> `tests/headings.spec.ts`. Same day, earlier:
> **§5 rule 11 — no sampled
> sessions — was applied everywhere it applies**: Animal Sounds (27),
> Letter Friends (26), Sound Friends (26), Rhyme Time (18), Feeling Friends
> (20), Opposites Friends (20) and Week Friends (6). Sorting Friends was
> examined and needs no change. Earlier still: Rhyme Time
> shipped (fourth of the six-game August arc); the shared `.ctrl-pill` chips
> were fixed after measuring 1.07:1 contrast, adding §5 rule 10; Opposites
> Friends shipped; and a `clip.ts` playback bug fixed that made Animal Sounds
> narrate over its own correction. Platform note corrected — the dev box is
> Windows, not macOS).

---

## 1. One-paragraph summary

An **Astro + TypeScript + `@vite-pwa/astro` (Workbox)** static PWA of
educational mini-games for young children. It began as a proof-of-concept
migration of the vanilla HTML/CSS/JS `kids-learning-games` repo and is now a
feature-driven project in its own right. **29 games** ship across **three
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
- **Vendored audio**: `public/sounds/animals/` holds **27** real animal
  recordings (~800KB) used as the Animal Sounds prompts, with licences and the
  mastering standard in `public/sounds/animals/CREDITS.md`. Re-mastering clips
  needs **ffmpeg**; nothing else in the build does. Loudness is matched on
  **EBU R128 integrated LUFS**, not RMS — RMS averages the silence between calls
  in, so sparse ones measure quiet while sounding fine (see CREDITS for the
  full rule, including why clips are only ever attenuated, never boosted).
- **Playwright** smoke tests (chromium-only, run against `astro preview`).
  Note `preview` serves `dist/`, so the suite tests the **last build** — rebuild
  before trusting a run. Bundled Chromium also has no MP3 codec, so playback
  can't be asserted there; only that clips are requested and served.
  **Local workers are capped at 4** (CI stays at 1). Workers aren't CPU-bound
  here — every game page pulls its Fluent 3D art from jsDelivr and specs
  navigate with `waitUntil: 'load'` — so past ~4 browsers the CDN throttles and
  specs fail on navigation timeout *while showing a fully rendered page*. If you
  ever see that failure shape in specs you didn't touch, suspect concurrency,
  not the game.
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

## 4. The 29 games & three layouts

- **`GridLayout.astro`** — foundational-set games (scan a fixed chart, tap to
  hear): Alphabets, Numbers, Colors, Shapes, Animals, Birds, Hindi (7).
- **`CardMachineLayout.astro`** — reference-catalogue decks (browse fact
  cards): Dinosaurs, Flashcards, Solar System, Weather (4).
- **`StoryLayout.astro`** — story-flow games *and* single-scene "stage" games
  (the preschool games reuse this shell via a `theme` prop): Daily Routines,
  Woodcutter (2 story) + Counting Friends, More Friends, Number Friends,
  Pattern Sequences, Number Bond Pop (5 preschool-math) + Letter Friends,
  Sound Friends, Rhyme Time (3 preschool-literacy) + Sorting Friends,
  Days Parade, Week Friends, Animal Sounds, Opposites Friends, Where's Teddy?,
  Memory Match (7 preschool-cognitive) + Feeling Friends (1 preschool-social).

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
   used by every round-based game, which since 2026-08-23 also turns that first
   tap into the spoken question rather than a scored answer — see §5 rule 13,
   and pass it your option selector via `{ asksFirst }`), `clip.ts` (playback for vendored
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
8. **Say that it was wrong, then teach.** A correction opens with `WRONG_LEAD`
   from `src/data/preschool-narration.ts` — currently **"Not that one."** —
   before any explanation. Until 2026-08-23 every game opened with "Hmm!" and
   two (Counting Friends, More Friends) went straight into "Let's count them
   together!", so the only signals that an answer was wrong were a red tint and
   a 220Hz tone, neither of which is language. A three-year-old hears "Hmm!" as
   the game *thinking*, and the sentence after it starts teaching, which reads
   as agreement. Reviews of corrective feedback with 3–11 year olds put an
   explicit right/wrong judgment in ~85% of studied conditions, paired with the
   correct answer — these games had the second half and were missing the first.
   Shared, not restated per game, and held by `tests/wrong-answer.spec.ts`
   ("a wrong tap says so, out loud"), which asserts the *first* spoken phrase.
   The wording rationale — why not a bare "No", why not "Not quite" — is in the
   module. Everything below still applies after the lead:

   **Guided wrong-answer feedback** for ages 3–4. A wrong tap gets a 250ms
   kinesthetic shake, a **red error tint**, a short error tone (`playWrong()`
   from `@/lib/audio`), and a spoken correction that always ends by revealing
   the right answer. Rounds are never failed and no score is shown to the
   child — they are corrected, then move on. **Revised 2026-08-17** at the
   user's request; this supersedes the original errorless rule ("no
   red/buzzer/shame coding, shake only").

    **Migration finished 2026-08-23.** All 14 games that *have* a wrong
    answer now follow it. The nine that were still shake-only — Counting
    Friends, Magnitude Comparison, Number Friends, Letter Friends, Sound
    Friends, Week Friends, Pattern Sequences, Number Bond Pop, Sorting
    Friends — each also carried a stylesheet comment asserting that "NO
    colour shift" was correct, which is why the drift survived five months:
    the old rule was documented at every site as if it were still the rule.

    The tint is one shared pair of tokens, `--st-wrong-border` /
    `--st-wrong-fill` in `story.css`.

    Enforced by `tests/wrong-answer.spec.ts`, which measures **rendered
    pixels and the Web Audio graph**, not CSS values — the games disagree
    about how to tint (Where's Teddy? washes a whole scene) and the previous
    per-game specs only ever asserted the shake class their own game already
    added, which is how the whole rule drifted unnoticed.

    **Memory Match is a deliberate exception (2026-08-23), not a laggard.**
    The rule governs answers that are *wrong*; turning over two cards that
    don't match is how memory is played, and a child playing perfectly still
    does it. So a non-match gets no red, no tone and no shake — the two cards
    hold face up long enough to encode, get *named* ("A pig and a lion. Not a
    pair yet."), and turn back. Before applying rule 8 to a new game, check
    that the tap it punishes is actually a mistake.

    **The `mountQuiz` modal is the other deliberate exception (2026-08-23).**
    Thirteen browse games — the grid and card-machine ones, plus Routines and
    Woodcutter — put a written multiple-choice quiz behind the 🧠 pill. It is
    text-only with no narration, so its audience is a child who can *read*,
    not the 3–4 year olds rule 8 was revised for, and it keeps the gentler
    2026-05-20 feedback: shake plus a green ring on the right answer, no red,
    no tone. No preschool run-mode game mounts a quiz. Two rules, two
    audiences — but they were contradicting each other silently in comments
    for months, so both sites now name the other.

    What the exemption does **not** cover is *perceivability*. "No colour on
    wrong" had become "no static anything on wrong": the mark was made purely
    of shake, and `global.css` cuts animation to 0.01ms under
    `prefers-reduced-motion`, so a wrong tap left the tapped button
    pixel-identical to options the child never touched — the only signal left
    being a green ring on a *different* button, which is roughly what being
    right looks like too. `.quiz-opt--wrong` now also carries a dashed slate
    ring (solid green for the answer, so the two differ in line style as well
    as hue). The same measurement found the green itself at 2.28:1 on the
    white panel; light mode now uses green-700. Held by
    `tests/quiz-feedback.spec.ts`, which compares the tapped button against
    its untouched siblings with motion emulated off — comparing it to its own
    earlier self would pass on the disabled-dimming that every option gets.
9. **The Astro repo is the source of truth on *patterns*** (the vanilla repo
   is treated as a spec of intent, not a template to copy).
10. **Shared chrome carries its own contrast.** A primitive in `global.css`
    renders on backdrops it cannot see — 29 themed games plus `/stats` and
    the home hero — so it must not depend on the surface behind it. In
    particular, **don't key colours off `body.dark-mode`**: for months eleven
    `StoryLayout` themes painted a *light* background while that class was
    set, so the dark variant landed on a light page, and `currentColor` was no
    safer there because those themes inherited white text onto that light
    background. `.ctrl-pill` is the worked example (self-contained dark chip,
   white label); `tests/ctrl-pills.spec.ts` enforces it from rendered pixels
   rather than from CSS values, which is the only way the relationship is
   actually observable. *(The "light page under `body.dark-mode`" hazard was
   itself fixed on 2026-08-22 — see §7 — but the rule stands: shared chrome
   still shouldn't assume what a theme paints behind it.)*

    **Corollary for *themed* chrome (added 2026-08-22):** a shared token whose
    default suits a dark page — `--st-title-color`, `--gl-title-color` — is a
    trap for the next theme that ships a pale one. A theme that changes its
    background owns re-inking every token that paints on it.
    `tests/headings.spec.ts` is the enforcement, and it also holds the rule
    that **a `disabled` control must not render at full strength**, since a
    fully-saturated "Next round" reads as tappable for the whole time it isn't.
11. **A bounded set is played to completion — no sampled sessions.** Where the
    content is a finite set worth exhausting, a game runs through **every item
    exactly once**, tier-ordered, rather than sampling N rounds from the pool.
    Sampling leaves coverage to chance: an 8-round session over 27 animals could
    finish without the child meeting most of them while repeating `cow` three
    plays running, in a game whose whole purpose is breadth. Finishing should
    mean "you've heard all of them" — a goal a 3yo can hold, unlike an arbitrary
    eight. **Directed by the user 2026-08-22 as project-wide intent.**

    **Converted (7):** Animal Sounds 27, Letter Friends 26, Sound Friends 26,
    Feeling Friends 20 (8 feelings + 12 vignettes), Opposites Friends 20 (10
    pairs × 2 directions), Rhyme Time 18 (9 pairs × 2 directions), Week Friends
    6. Each exports `generateRun` plus a `TOTAL_ROUNDS` **derived from the
    content**, so adding a letter, a vignette or a pair lengthens the run
    instead of leaving it unreachable. **Built this way from the start (2):**
    Where's Teddy? 25 (5 pairs × 5 relations), Memory Match 13 (a 13-animal
    pool dealt across boards of 3 + 4 + 6 pairs).

    **The rule can also settle a difficulty question**, which is how Memory
    Match's board growth stopped being a stage model. The design doc wanted
    3 → 4 → 6 pairs across *sessions*, persisted; noticing that 3 + 4 + 6 is
    exactly the pool turned it into three boards inside one run, and the
    progression came free. Worth reaching for before adding stage state: a
    ramp that fits inside a run needs nothing remembered between sittings.

    It does **not** apply everywhere, and the test is whether a finite set exists
    to exhaust. **Sorting Friends** looks like a candidate and isn't: its 8
    rounds are a fixed list that already asks all seven categories every sitting,
    and the items filling each tray are a variety pool, not content to exhaust
    (the skill is the sort, not the roster). The preschool-math games (Counting /
    More / Number Friends, Patterns, Number Bond Pop) don't qualify either —
    their questions are generated, so there is no finite set to complete. Days
    Parade is an explore game with no rounds at all.

    Three things to get right when converting another game:

    - **"The set" is often not the obvious noun.** For Opposites Friends and
      Rhyme Time it's the *questions*, not the pairs, because asking a pair both
      ways is the pedagogy. For Week Friends it's smaller than the seven days —
      no-week-wrap means Sunday can't be an answer — and converting it made the
      game *shorter*, which was still right.
    - **The SSR handoff.** These pages SSR a deterministic round 0 and hand it to
      a fresh run. Both obvious approaches are wrong. `generateRun().slice(1)`
      drops the random run's first entry rather than the one on screen, so a
      question is asked twice and another never, at exactly the right run
      *length*. Filtering that question out instead fixes the coverage but
      **leaves its two former neighbours adjacent**, which in a game with an
      adjacency rule can put a pair back-to-back — the thing the ordering exists
      to prevent. Use `generateRun(rand, startWith)`: the pinned question becomes
      the ordering's first choice, nothing is removed, so no gap exists.
    - **Preload.** Warm a rolling window ahead of the current round, not the
      whole run, or start-up cost grows with the content. Warm from the round
      the child is actually on, not from 0 — on a resumed run those differ.
    - **A long run must be resumable** (added 2026-08-23, after measuring what
      rule 11 costs: 25 rounds of Where's Teddy is ~7 min of narration alone).
      Store the run via `lib/run-state.ts`, clear it on completion, on Play
      Again, and on Reset. Getting Reset right is not optional: it is a plain
      `location.reload()`, so persisting the round index without clearing turns
      "Start over?" into "carry on from round 18". Held by
      `tests/resume.spec.ts`.

      **Memory Match is exempt**, and not for convenience: its in-run state is a
      board plus a set of matched cards, not a round index, and a half-solved
      board is worthless to a child who has lost the memory of where things
      were — which *is* the skill. Starting the board again is the correct
      behaviour. The six generated-question games are exempt for the same
      reason they are exempt from rule 11: nothing finite to return to.
12. **Layer a feedback tint over the option; never assign it.** Applies to
    *every* state — `--wrong`, `--correct`, `--reveal` — not just rule 8.
    Every tint token in these games is translucent (0.16–0.22), so
    `background: var(--tint)` **replaces** the option's surface and turns it
    into a window onto the page gradient behind it. Measured: tiles sitting at
    0.93 alpha dropped to ~0.33, and the "feedback colour" became whatever the
    gradient was doing at that spot — Animal Sounds' wrongly-tapped tile came
    out *teal*, and the picture lost the surface it was meant to sit on. Write:

    ```css
    background:
      linear-gradient(var(--tint), var(--tint)),
      var(--x-tile-bg);
    ```

    Found 2026-08-23 in twelve places: five games on `--wrong`, then seven on
    `--correct`/`--reveal` (Animal Sounds, Feeling Friends, Opposites Friends,
    Rhyme Time, Letter Friends, Sound Friends, Week Friends) — the success
    path, which fires every round rather than only on mistakes. Enforced by
    `tests/feedback-opacity.spec.ts`, which measures each option's rendered
    alpha against **its own resting value**, so games with a deliberately
    translucent surface (Pattern Sequences, Magnitude Comparison, Number
    Friends, Number Bond Pop, all near 0.35) pass without being special-cased.
    Solid, fully opaque replacements are a different thing and are fine —
    Memory Match's matched card and Week Friends' revealed slot both do it on
    purpose.
13. **Ask the question before scoring the answer.** Browsers block speech until
    a user gesture, so every game defers its opening narration to the first tap.
    That deferral used to skip the intro whenever the tap landed on *any*
    interactive control — correct for a replay button, wrong for an answer tile,
    and an answer tile is what a child taps first, because it is the big
    colourful thing in the middle of the screen. Measured across nine games on
    2026-08-23, the opening question was therefore never spoken:

    | first touch lands on | what the child heard first |
    | --- | --- |
    | an answer tile (what actually happens) | "Hmm! Let's listen again." |
    | inert page background | "Listen! Who makes that sound?" |

    Round one was unanswerable by design for a pre-reader — the caption is text
    they cannot read, so they were asked to answer a question nobody had asked.
    `onFirstGesture(speakIntro, { asksFirst: '<option selector>' })` now swallows
    that first tap (capture phase, so the game's own handler never sees it) and
    speaks the question instead; the next tap is a real answer. Nothing is
    swallowed when narration would be silent anyway — sound off, or no speech
    support — since then the tap would be lost for nothing. Animal Sounds is the
    shape to copy: its "question" is the animal *clip*, which plays first, and
    the spoken prompt follows it. Days Parade is exempt (it has no judged
    answers). Held by `tests/invariants.spec.ts`, which asserts the sound-on and
    sound-off halves as a pair — the muted case doubles as the control proving
    the "was it judged" detector fires.

14. **Praise the doing, not the doer.** A completion screen names what the child
    did — "Great looking!", "Great counting!", "Great remembering!" — and never
    hands out a title. Thirteen strings across eleven games broke this on
    2026-08-23: eight "*X* champion!" headings copy-pasted with the noun swapped,
    plus "You're a rhyming star!", "Geometric genius!", "What a memory!",
    "alphabet star" and a bare "Brilliant!". Person praise makes a later failure
    evidence about the child; process praise commends the effort in that one
    episode, and Cimpian et al. (2007) demonstrated the split on **four-year-olds
    specifically** — the age this app is for — with the effect strongest in
    academically relevant settings, i.e. letters and counting. The subtitle still
    carries the tally, so nothing was lost but the label. Interjections aimed at
    the feat survive ("Amazing! You explored all ten objects!"); an interjection
    left standing alone as the whole verdict does not, because the only thing it
    can attach to is the child. Words and reasoning live in
    `PERSON_PRAISE_WORDS` (`src/data/preschool-narration.ts`), held by
    `tests/praise.spec.ts` — which checks the markup *and* the strings assigned
    from script, since the staged maths games and every quiz result overwrite
    their heading on the last round and a DOM-only test would never see them.

15. **State is never carried by motion alone.** If a class tells the child
    something — which item is being spoken about, which answer was wrong — it
    must render something *static*. Every stylesheet here already disables its
    animations under `prefers-reduced-motion`, so a class made only of
    `animation:` renders as literally nothing for those users. Found twice on
    2026-08-23: `.quiz-opt--wrong` (see rule 8's exemption above), and then a
    sweep for the same shape — selectors whose union of declarations across
    *all* rules is animation-only — turned up 26 candidates, 6 of them real.
    Every guided walk-through in the app is written as

    ```js
    item.classList.add('week-card--pulse');
    narrate(day, { onEnd: () => item.classList.remove('week-card--pulse') });
    ```

    so the class is on screen exactly while the word is spoken and is the only
    thing pairing a word a pre-reader can't read with the card it names. That
    pairing is the lesson. Counting/Number/More Friends already added a static
    `--counted` ring alongside; Week Friends, Days Parade and Pattern Sequences
    were animation-only and went blank. They now carry a two-tone ring (white
    inner, dark outer) which survives any card colour and either page
    background. Held by `tests/motion-independence.spec.ts`, which keeps the
    three already-correct games as controls — without them a fix that measured
    nothing would look like a pass. Note the two specs compare in opposite
    directions on purpose: here an element against *itself* (the days are
    different colours, so siblings aren't comparable), in the quiz against its
    *siblings* (the options are identical and all dim together).

    The same spec also **scans the stylesheets for the shape** rather than only
    the six known instances, so a new animation-only class has to be justified
    before it ships. Its allowlist takes one of two reasons per entry: the
    class carries no information (a pop on artwork being swapped anyway), or a
    static companion class always lands with it (`cf-pulse` + `cf-counted`). A
    second test deletes nothing but fails on allowlist entries whose CSS is
    gone, since an allowlist that outlives its subject is how a guard quietly
    stops guarding.

16. **Right and wrong never differ by hue alone.** Red-versus-green is the one
    pair a colour-blind eye can't resolve, and about 1 boy in 12 has some form
    of it. Measured across all 14 games with a wrong answer on 2026-08-23: a
    wrong option and a correct one sit ~24 ΔE apart for normal colour vision,
    and under simulated deuteranopia that **collapses to under 7 in nine of
    them**. Ten had no other difference between the two states at all. Rule 8
    does give a wrong tap three more channels — shake, tone, spoken correction
    — but all three vanish together with sound off and reduced motion, and none
    of them marks *which tile on screen* was which afterwards. The four
    original adopters already had the answer: a **`✗` badge** in `::after` on
    the wrong option. The other ten now copy it, which needed
    `position: relative` on several base rules (no offsets, so nothing moves).
    Rationale and measurements live beside `--st-wrong-*` in `story.css`.

    Held by `tests/colour-independence.spec.ts`, which is mechanism-agnostic:
    it asks whether the two states differ *once hue is discarded*, not whether
    there is a ✗, so Sorting Friends passes on lightness alone and a future
    game could use a shape or border style instead. The obvious metric — mean
    luminance difference — was tried and **rejected on evidence**: suppressing
    the badge moved it from 1.89 to 1.64, because a small glyph barely shifts a
    whole-tile average. What works is the *fraction of pixels differing
    strongly* in luminance: 0.22–0.55% with the badge, exactly 0.00% without.

    **Still open:** Pattern Sequences asks the child to continue a sequence of
    *coloured circles* (red, blue, green). The badge fixes its feedback, but
    the puzzle itself is a colour-discrimination task, so a red-green
    colour-blind child cannot play it at all. The standard fix is a shape or
    pattern inside each circle. That is a content decision, not a defect.

## 6. LocalStorage keys (state shapes)

- `kids_settings_v1` — global settings (dark, sound, autoSpeak, fontSize).
- `kids_progress_v1:<gameId>` — learned-item set (sorted string array).
- `<gameId>_quiz_v1` — `{ attempts, bestScore, lastPlayed }` quiz metrics.
- `<game>_stats_v1` — bespoke preschool schema `{ sessions, rounds, correctFirstTry, lastPlayed }`
  (newest: `wheres_teddy_stats_v1`, 2026-08-22). In the seven games converted to
  §5 rule 11 the `sessions` field is kept on disk (the shape is shared across
  every preschool game) but now counts **completed runs**, and the UI labels it
  "Full runs finished".
  The staged preschool-math games (Counting / More / Number Friends + Number
  Bond Pop) also carry `{ stage, bestStage }` (1..3) for their auto-advancing
  stages (added 2026-06-03; Number Bond Pop adopted them at ship 2026-06-06).
- `<game>_run_v1` — an **unfinished run**, so a child comes back to it rather
  than starting over (added 2026-08-23; `lib/run-state.ts`). Envelope is
  `{ v, run, idx, savedAt }`, holding the generated run itself rather than a
  seed — the run is already plain JSON, whereas a seed would have to keep
  meaning the same thing through every future change to the generator.
  Written on each round advance, **cleared on completion, on Play Again, and on
  Reset**. Discarded rather than migrated when `run.length !== TOTAL_ROUNDS`
  (content changed), when older than 48h, or when `idx` is out of range. Live in
  the eight run-mode games. See §5 rule 11 for who is exempt and why.
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
- **Feature-driven phase active**: 15 preschool games added since (cardinality
  triad + Pattern Sequences + Letter Friends + Number Bond Pop + Sound
  Friends + Sorting Friends + Week Friends + Days Parade + Animal Sounds +
  Feeling Friends + Opposites Friends + Rhyme Time + Where's Teddy? +
  Memory Match). Total **29 games**, all live.
- **Latest (2026-08-23) — played the games instead of testing them**, and the
  first thing a child does turned out to be broken. See §5 rule 13: the opening
  question was never spoken, because the first tap that unblocks speech was
  landing on an answer tile and being scored. Fixed and pinned.

  The same playthrough measured **how long a whole run takes**, which nobody had
  done when rule 11 made runs cover everything. Narration alone, no mistakes, no
  thinking time: Week Friends 53s (6 rounds), Animal Sounds 2.9 min (27), Letter
  Friends 4.2 min (26), Sound Friends 5.2 min (26), **Where's Teddy? 7.0 min
  (25)** — about 17s of speech per round before the child looks, decides, taps,
  and an adult taps Next.

  **Runs are now resumable** as a result (§5 rule 11, `lib/run-state.ts`,
  `tests/resume.spec.ts`). Before this, reloading restarted at 1/27 and
  `sessions` — "Full runs finished" on the dashboard — only incremented on
  completion, so on the three longest games a child who never sat through all
  25–27 rounds in one go never saw the completion screen and never registered a
  finished run. Wiring it also had to fix Reset, which is a plain
  `location.reload()` and would otherwise have carried on from the saved run.

  Still open, and a product decision rather than a defect: whether 25–27 rounds
  is the right size for a 3–4 year old at all.
- **Previous ship (2026-08-23)**: **Memory Match** — sixth and last of the
  August arc, **which closes it**, and the first game whose skill is
  *remembering* rather than recognising or discriminating.

  Three decisions carry it. **The board growth is the run**: 3 → 4 → 6 pairs
  played back to back, which is exactly the 13-animal pool dealt once, so the
  arc's last open design question (Q5 — bespoke stage model, or bend
  `preschool-stages.ts`?) was answered by needing neither. **A non-match is
  not a wrong answer**, so §5 rule 8 is deliberately not applied — see the
  exception noted there. And **matched cards stay on the board**, face up:
  removing them reflows the grid and destroys the positions the child has
  just memorised.

  The bug worth remembering is a layout one. The twelve-card board was sized
  by width alone, which pushed its bottom row under the fold on a phone — and
  *a child memorising positions cannot scroll to see the rest of the board*,
  so that isn't cosmetic, it breaks the mechanic. Cards are now sized by
  whichever axis runs out first, and `tests/memory-match.spec.ts` asserts at
  three viewports that no card falls below the fold.

  Two smaller ones, both caught by looking: the animal emoji rendered at a
  quarter of the card, because `.mm-card` is a `<button>` and buttons don't
  inherit font-size, so `em` resolved against the UA's ~13px default; and the
  spoken lines said "A elephant", "fishs" and "butterflys", so plural and
  article are now spelled out per animal in the data rather than derived.
- **Also 2026-08-23 — a UTC-vs-local date bug**, found because a test failed
  at 00:35 local. All 16 per-game `lastPlayed` writes stamped
  `new Date().toISOString().slice(0, 10)` (UTC) while `formatLastPlayed`
  compares against a *local* date, so east of UTC every session before the UTC
  rollover (00:00–05:30 local in UTC+5:30 — i.e. this project's own users)
  displayed as "yesterday" the moment it was played. `retention.ts` already
  had `todayLocal()` and already explained why local is the right clock; the
  games simply weren't using it. Now exported and used everywhere, including
  `quiz.ts`.
- **Previous ship (2026-08-22)**: **Where's Teddy?** — fifth of the six-game
  August arc, and the first game teaching spatial/positional language
  (`in / on / under / next to / behind`). A run is the full 5 × 5 grid: every
  preposition asked about every object/landmark pair, because "under" is only
  a *relation* if it survives changing the objects.

  Two decisions carry the game. **All three scenes show the same pair**, so
  the only thing that differs between the answers is the relation and
  picture-recognition can't win the round. And **`in` and `behind` are never
  offered together** — a teddy inside a box and a teddy behind a box are both
  "an emoji whose bottom is hidden", so rather than drop to the three
  prepositions the design doc was ready to fall back to, the collision is
  simply never drawn.

  The lesson worth carrying: three of the five relations are drawn purely by
  *where an emoji sits*, and **every behavioural test passed while two of them
  were visually wrong** — the mouse floated a clear tenth of a tile above its
  hat (reading as "above"), and `behind` left 84% of that mouse showing, which
  is a picture of "on". One cause: `on` and `behind` were positioned as a
  fixed share of tile height, but the five landmarks top out anywhere from 48%
  (a sun hat is nearly all brim) to 59% (a box, a basket, a tub). They are now
  per-pair (`--wt-on-y`, `--wt-behind-y`, joining the `--wt-in-y` that already
  existed for the same reason), measured by scanning the rendered tile for
  each landmark's silhouette. `tests/wheres-teddy.spec.ts` re-does that
  measurement, so a sixth pair can't be added without tuning it.

  **Then CI went red, and was right to.** Those offsets were measured against
  Segoe UI Emoji, the font on the Windows dev box; the Linux runner and
  **Android** use Noto Color Emoji, whose glyphs fill the em square and stand
  up to 7% of a tile taller. `behind` was hiding all but 15% of the ball and
  18% of the mouse *on the font a tablet would use* — a real defect that only
  the pixel test could see. Offsets are now the **midpoint of both fonts**
  (verified locally by injecting Noto over the real page, not by pushing
  again). Generalisable: **a hardcoded offset against an emoji glyph is a
  measurement of one font**, and this repo renders on at least three.
  222 tests pass.
- **Prior ship (2026-08-22, same day)**: **Dark mode actually goes dark, and the scene
  artwork paints for the first time.** Closes the two oldest §7 debt items,
  which turned out to be one bug wearing two hats: **a custom property read
  where it wasn't set**. Ten themes never redefined `--st-bg` under
  `body.dark-mode`, so the page stayed pale while every token around it went
  near-white; and nine declared their six `data-scene` gradients on `.X-stage`
  but read `--st-bg` on `body`, where a property written on a descendant can
  never reach. So the scene panels had been flat translucent white since they
  shipped, and dark mode had been white-on-pale.

  Each theme now gets a dark page in its own hue (matching the four games that
  already did this) plus a veil *background layer* rather than a `filter`, so
  the white cards inside the stage stay bright. `tests/dark-mode.spec.ts`
  checks page luminance in both modes and proves the scene reaches the stage by
  swapping `data-scene` and requiring the background to change. Both tests were
  verified against a deliberately reintroduced bug — the first version of the
  scene check passed on antialiasing noise. 210 tests pass.
- **Earlier ship (2026-08-22, same day)**: **Titles you can read and disabled buttons that
  look disabled.** Both defects were spotted on two games and turned out to be
  systemic: **16 of 22 page titles** failed a contrast check and **11 of 15
  disabled controls** rendered at full accent opacity. One cause each — shared
  tokens (`--st-title-color`, `--gl-title-color`) default to white for a dark
  page, and nothing ever dimmed `[disabled]`.

  Eleven pale themes now ink their own title (1.1:1 → 6–12:1); the five
  saturated grid headers were re-inked too, since white only read there thanks
  to a text shadow and measured 1.7–2.4:1. Routines keys its ink off the scene,
  because nine of its ten skies are pale and bedtime is not. Grid gained
  `--gl-cat-idle-*` so the `colors` filter pills stop being white-on-white.

  The find that mattered most came from checking **dark mode**: the ten themes
  that never darken their page were failing identically there. That deferred
  the title ink under `body.dark-mode` until the ship above fixed the page
  itself. `tests/headings.spec.ts` measures both modes from rendered pixels,
  like `ctrl-pills.spec.ts`.
- **Earlier the same day**: **Sound, Rhyme and Week Friends drop sessions**,
  completing §5 rule 11 across every game it applies to. Sound Friends 8 → **26**
  (bare letter tiles mean an unasked letter is a silent distractor — being the
  target is the only way it earns its "A says ah" narration). Rhyme Time 8 →
  **18** (every word gets a turn as the prompt, so each pair is asked both ways;
  needed the same adjacency guard as Opposites). Week Friends 8 → **6**, the one
  conversion that *shortens* a game: no-week-wrap means it can only ask "what
  comes after X" for six days, and six rounds that cover the list beat eight
  random draws that might ask about Sunday three times and never mention Friday.
  Sorting Friends was examined and left alone — see rule 11.

  Also **fixed the SSR handoff properly**. The previous ship's filter-by-identity
  fixed the duplicate-question bug but introduced a subtler one: removing a round
  from the middle of a run leaves its two former neighbours adjacent, which in
  Opposites and Rhyme Time can be the same pair. Now pinned by construction via
  `generateRun(rand, startWith)`. Caught by `--repeat-each=10`, not by a single
  pass — see rule 11.
- **Earlier the same day**: **Letter, Feeling and Opposites Friends
  drop sessions**, taking §5 rule 11 to four games.
  Letter Friends goes 8 rounds → **26** (the whole alphabet; the other 18
  letters were never absent, they were just never the thing being *asked for*).
  Feeling Friends → **20** (8 feelings named, then all 12 authored vignettes —
  a sitting used to reach two of the twelve, so half the hand-written content
  was unreachable in any given play). Opposites Friends → **20** (every pair
  both ways; asking both directions was always the pedagogy but the old session
  picked one direction per pair, so within a sitting the relation was only ever
  shown one way). Opposites also needed a pair's two directions kept apart —
  "which one is small?" straight after "which one is big?" is answerable
  without engaging with either word — which a shuffle-then-repair pass could
  not guarantee at the end of a tier, so it builds the order greedily instead.
  The shared bug fixed in all three: the SSR handoff appended
  `generateX().slice(1)`, dropping the random run's first question rather than
  the one already on screen. See §5 rule 11 for the pattern.
- **Prior ship (2026-08-22, same day)**: **Animal Sounds — 27 animals, one run,
  no sessions.** Direct user request ("we need a large number", "no more sessions,
  all in one go"). Ten new mastered recordings (`goat`, `donkey`, `goose`,
  `crow`, `bear`, `tiger`, `dove`, `peacock`, `cricket`, `seagull`) take the
  clip-backed pool from 17 to 27; six of them also needed adding to the browsing
  decks that supply picture + name (`animals.ts` → 42, `birds.ts` → 18).
  `generateSession` becomes `generateRun`: every clip-backed animal plays
  **exactly once**, tier-ordered farmyard → wild, and `TOTAL_ROUNDS` is derived
  rather than the literal 8. See §5 rule 11 — this is project-wide intent, and
  which games it applies to. Four candidates were **rejected** and the reasons
  recorded in CREDITS; `eagle` is the instructive one — the real bald-eagle call
  is an unrecognisable chatter and the screech everyone "knows" is a dubbed
  red-tailed hawk, so no honest eagle round exists. Also here: preload became a
  rolling window (27 clips up front is ~800KB before the first question); the
  clip set was re-levelled on EBU R128 LUFS rather than RMS (§3); and **Animal
  Sounds got the dark-mode + scene-token fixes**, so the counts below drop from
  11 to 10. Incidentally, `playwright.config.ts` now caps local workers at 4
  (§3) after the longer run test exposed CDN-throttling failures in ten
  unrelated specs.
- **Prior ship (2026-08-22, same day)**: **Rhyme Time** — third preschool-literacy
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
  Shipped as eight rounds over **ten pairs**, asked in *both* directions
  (big→small as often as small→big) so the child learns the relation rather than
  which card is always the answer — *the round count is superseded by the run-mode
  ship above, which asks all twenty directed questions*. Identity comes from the shipped `opposites` Flashcards
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
  game and the 7th `/stats` family. Eight feelings, three big faces per round.
  Shipped as eight rounds where 1–6 ask *label → face* ("Show me sad") and 7–8
  swap to a **vignette** ("Her ice cream fell on the ground. How do you think
  they feel?"), which moves the child from recognition to inference — the actual
  social skill. *Round count superseded by the run-mode ship above, which names
  every feeling and then plays all twelve vignettes.* Names + coping lines are reused from the `emotions` deck in
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
  taps the animal that makes it. Shipped as an 8-round session over a curated
  pool of **18 unambiguous, iconic calls** (`src/data/animal-sounds.ts`) —
  *both numbers superseded by the 2026-08-22 run-mode ship above* — the raw `sound`
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
  **Feeling Friends** shipped 2026-08-17; **Opposites Friends**, **Rhyme
  Time** and **Where's Teddy?** shipped 2026-08-22; **Memory Match** shipped
  2026-08-23. **The six-game set is complete** — the design doc's remaining
  open question is Q6 (palette headroom for a future stats family), which
  blocks nothing that is currently planned.
- **Open queued work**:
  - **T9** — replace Web Speech with pre-recorded MP3 narration (parked on the
    user's recording session; integration is ~30–45 min of agent work once MP3s
    land in `src/assets/narration/shared/`).
  - **The Quiz modal still predates §5 rule 8.** Closed 2026-08-23 for the 14
    games that have a wrong answer in *play*, but the shared `mountQuiz` panel
    behind the Quiz pill on 13 Grid/Card games is a separate surface, and it
    still answers a wrong pick with a shake and a green reveal — no red, no
    tone, no spoken correction. Left alone deliberately: the quiz is the one
    place in the app that *does* keep a score, so "corrected, then move on"
    needs a product decision before it can be ported, not just a stylesheet
    edit.
  - **Grid filter pills are white-on-translucent-white** (`.cat-btn` in
    `global.css`). Fixed for the `colors` theme on 2026-08-22 via the new
    `--gl-cat-idle-*` tokens; the same override is still owed to Animals,
    Birds, Hindi, Numbers and Shapes, where the idle pills are the least
    readable thing on the page (Hindi's worst — the gradient goes cream
    behind them). Tokens exist, so each is a four-line block.
  - **A rule restated per-site is a rule with nothing holding it.** The
    lesson from §5 rule 8, and worth applying to any *new* rule: if it ends up
    asserted in a comment in every game that implements it, it will drift, and
    each copy will read as a deliberate decision long after it stopped being
    one. State it once in a shared file and hold it with a cross-game test.
    The twelve per-game reduced-motion blocks are the surviving example —
    seven have stale selector lists, and the rule is actually held by one
    catch-all in `global.css`.
- **Deferred design decision**: `StageLayout` carve (deferred 5x — the
  `body.story` scope already does the isolation work). Option C unified
  `DeckLayout` decided NO-GO. The vanilla repo is a no-touch zone.
