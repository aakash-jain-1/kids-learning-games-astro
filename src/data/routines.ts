/**
 * Data for the Daily Routines game — first StoryLayout port (12 of 13).
 *
 * Pedagogy: a paginated *day-in-the-life* narrative that walks the
 * child from sunrise (`6:30 AM — Morning`) to bedtime (`8:00 PM —
 * Bedtime`). One scene = one chapter; child taps `Next ▶` to advance,
 * `🔊 Listen` to hear the title + body read aloud, and `◀ Back` to
 * revisit. After the final scene, the same `Next ▶` button turns
 * into `Quiz ✔` and opens an 8-question multiple-choice comprehension
 * quiz.
 *
 * Layout decision (settled at port time): vanilla `daily-routines.html`
 * is a 10-scene paginated story flow. The pre-port docs proposed
 * "first try modelling story pages as cards on `CardMachineLayout`",
 * but that *collapsed* on first audit:
 *
 *   1. `body.card-machine` is viewport-locked (`height: 100dvh; overflow: hidden;`).
 *      Story pages need to scroll — prose + an 8-question quiz at the
 *      end won't fit in 100 vh on a phone.
 *   2. `.cm-layout` is a 50/50 two-pane split (deck on left,
 *      "machine screen" on right). A story is a single centered column.
 *   3. The DOM is a deck-of-cards stack (`.top-card` + 3 `.ghost`
 *      cards). A linear narrative isn't a deck; the metaphor is wrong.
 *   4. The right pane is an OLED-look "machine-screen" with green-glow
 *      CSS — entirely the wrong aesthetic for a story scene + prose.
 *
 * So we carve out `src/layouts/StoryLayout.astro` as a third shared
 * shell alongside `CardMachineLayout` and `GridLayout`. The shell is
 * just head/meta/nav plumbing + `body.story` + `data-theme` + a
 * `<slot />` (mirrors the other two layouts) — all visual structure
 * lives in `src/styles/story.css`. The first-consumer (Daily Routines)
 * gets the full visual system; Woodcutter (the second story) will
 * either reuse it directly or supply layout-prop variants for its
 * single-page hero-scene shape.
 *
 * Quiz storage decision: vanilla bundles scene-progress + quiz-state
 * into a single `routines_progress` LocalStorage key with `quizAttempts`
 * + `bestScore` + `lastPlayed` fields. The Astro port splits that:
 *   - **Scene-visited state** lives in the unified
 *     `kids_progress_v1:routines` Set<string> (matches the 7 other
 *     `progress.ts` consumers — alphabets, numbers, colors, shapes,
 *     animals, birds, hindi).
 *   - **Quiz state** lives in a separate `routines_quiz_v1` JSON
 *     object (`{ attempts, bestScore, lastPlayed }`). Originally
 *     page-inline at the Routines port, then extracted to
 *     `src/lib/quiz.ts` when Woodcutter (the second story consumer)
 *     landed (2026-05-08), per the migration principle "refactor
 *     trigger = second consumer". This data file now imports the
 *     `QuizQuestion` type from `src/lib/quiz.ts`; the page mounts a
 *     shared `mountQuiz()` controller against this `QUIZ` array.
 *
 * Per-scene art is kid-friendly CSS art (vanilla approach preserved
 * verbatim). Vanilla used short flat class names like `.sun`, `.bed`,
 * `.child`, `.tub`, `.swing`, `.slide`, `.book`, `.bag`, `.toothbrush`
 * — high collision risk if any future game lands those same names.
 * **Astro scopes every art selector under `.routines-art`** (a
 * marker class on the `.scene-art` container). That keeps the
 * `artHtml` strings here readable (no per-element BEM verbosity)
 * while guaranteeing zero CSS leakage to other pages. See
 * `src/styles/routines.css`.
 *
 * Vanilla content quirks preserved verbatim:
 *   - Scene 1's `🌅` matches the title's "Wake Up!" — the sun rises
 *     into the morning sky animation.
 *   - Scene 7 (Playtime) shows both swing + slide + child;
 *     visually busiest scene, vanilla included.
 *   - Scene 10 (Bedtime) renders 25 random twinkling stars in
 *     vanilla via `Math.random()` per-load. The Astro port hardcodes
 *     deterministic positions (visually identical, simpler markup,
 *     SSRs cleanly).
 *   - The 4 indoor scenes (toothbrush, breakfast, get-dressed,
 *     dinner) override the base `bg` (sky gradient) with a custom
 *     `artBg` (room-interior gradient). All other scenes use only
 *     `bg`.
 */

import type { QuizQuestion } from '@/lib/quiz';

export type SkyBg =
  | 'sky-morning'
  | 'sky-day'
  | 'sky-evening'
  | 'sky-night'
  | 'sky-indoor';

/**
 * Pre-rendered hardcoded star positions for the bedtime scene.
 * Vanilla generates 25 stars with `Math.random()` per render; we
 * snapshot one such generation at port time so the SSR'd HTML is
 * deterministic. Visually indistinguishable to a child.
 */
const BEDTIME_STARS = (() => {
  const stars = [
    [4, 8, 0.4], [12, 22, 1.6], [18, 5, 2.1], [24, 35, 0.9], [31, 12, 0.2],
    [38, 28, 2.8], [44, 4, 1.3], [51, 18, 0.6], [57, 33, 2.4], [63, 9, 1.9],
    [69, 24, 0.1], [75, 14, 2.6], [81, 30, 1.0], [86, 6, 0.5], [91, 21, 2.3],
    [7, 40, 1.4], [22, 44, 0.8], [35, 47, 2.0], [48, 41, 1.7], [60, 49, 0.3],
    [73, 38, 2.7], [83, 45, 1.1], [10, 16, 1.5], [40, 17, 2.2], [66, 6, 0.7],
  ];
  return stars
    .map(
      ([left, top, delay]) =>
        `<div class="s" style="left:${left}%;top:${top}%;animation-delay:${delay}s;"></div>`,
    )
    .join('');
})();

export interface RoutineScene {
  /** Stable kebab-case id (used as the `kids_progress_v1:routines` learned-set token) */
  id: string;
  /** Time-of-day label e.g. `6:30 AM — Morning` */
  time: string;
  /** Scene heading e.g. `Wake Up!` */
  title: string;
  /** Big emoji shown above the title in the scene-box */
  emoji: string;
  /** Body prose read aloud by the Listen button + shown on screen */
  text: string;
  /** Sky/scene gradient class applied to `.scene-art` */
  bg: SkyBg;
  /** Optional inline gradient that overrides `bg` (vanilla used this for indoor scenes) */
  artBg?: string;
  /** innerHTML for the `.scene-art` container — all selectors are scoped under `.routines-art` in `routines.css` */
  artHtml: string;
}

export const SCENES: readonly RoutineScene[] = [
  {
    id: 'wake-up',
    time: '6:30 AM — Morning',
    title: 'Wake Up!',
    emoji: '🌅',
    text:
      'The sun peeks through the window. It is time to wake up! You stretch your arms, yawn a big yawn, and hop out of your cosy bed.',
    bg: 'sky-morning',
    artHtml: [
      '<div class="sun sun-rise"></div>',
      '<div class="ground grass"></div>',
      '<div class="bed">',
        '<div class="mattress">',
          '<div class="pillow"></div>',
          '<div class="blanket"></div>',
        '</div>',
        '<div class="bed-frame"></div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'brush-teeth',
    time: '7:00 AM — Bathroom',
    title: 'Brush Your Teeth',
    emoji: '🪥',
    text:
      'Time to brush your teeth! Squeeze some toothpaste on your brush, and scrub scrub scrub — up, down, and all around. Sparkly clean teeth!',
    bg: 'sky-indoor',
    artBg: 'linear-gradient(180deg,#e3f2fd 0%,#bbdefb 100%)',
    artHtml: [
      '<div class="ground floor"></div>',
      '<div class="child" style="bottom:80px;left:35%;transform:none;">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
        '<div class="child-legs">',
          '<div class="child-leg"></div>',
          '<div class="child-leg"></div>',
        '</div>',
      '</div>',
      '<div class="toothbrush"><div class="brush-head"></div></div>',
      '<div class="bubbles">',
        '<div class="bub" style="right:23%;bottom:180px;width:10px;height:10px;animation-delay:0s;"></div>',
        '<div class="bub" style="right:26%;bottom:190px;width:8px;height:8px;animation-delay:0.4s;"></div>',
        '<div class="bub" style="right:20%;bottom:170px;width:12px;height:12px;animation-delay:0.8s;"></div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'breakfast',
    time: '7:30 AM — Kitchen',
    title: 'Eat Breakfast',
    emoji: '🥣',
    text:
      'Yummy breakfast time! A bowl of warm cereal, some fresh fruit, and a glass of milk. Eating breakfast gives you energy to play and learn all day!',
    bg: 'sky-indoor',
    artBg: 'linear-gradient(180deg,#fff8e1 0%,#ffecb3 100%)',
    artHtml: [
      '<div class="ground floor"></div>',
      '<div class="child" style="bottom:130px;">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="table">',
        '<div class="table-leg l"></div>',
        '<div class="table-leg r"></div>',
        '<div class="plate"></div>',
        '<div class="food-emoji">🥣</div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'get-dressed',
    time: '8:00 AM — Getting Ready',
    title: 'Get Dressed',
    emoji: '👕',
    text:
      'Pick out your favourite clothes! A comfy shirt, trousers, socks, and shoes. Getting dressed all by yourself is a big-kid achievement!',
    bg: 'sky-indoor',
    artBg: 'linear-gradient(180deg,#fce4ec 0%,#f8bbd0 100%)',
    artHtml: [
      '<div class="ground floor"></div>',
      '<div class="child">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body" style="background:#66bb6a;">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
        '<div class="child-legs">',
          '<div class="child-leg" style="background:#2e7d32;"></div>',
          '<div class="child-leg" style="background:#2e7d32;"></div>',
        '</div>',
      '</div>',
      '<div class="bag">',
        '<div class="bag-strap"></div>',
        '<div class="bag-pocket"></div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'school',
    time: '9:00 AM — School',
    title: 'Learn at School',
    emoji: '📚',
    text:
      'At school you learn so many things! ABCs, 123s, colours, shapes, and stories. You also get to draw, sing songs, and make new friends!',
    bg: 'sky-day',
    artHtml: [
      '<div class="sun sun-high"></div>',
      '<div class="ground grass"></div>',
      '<div class="child" style="left:35%;transform:none;">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
        '<div class="child-legs">',
          '<div class="child-leg"></div>',
          '<div class="child-leg"></div>',
        '</div>',
      '</div>',
      '<div class="book">',
        '<div class="book-line"></div>',
        '<div class="book-title">ABC<br>123</div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'lunch',
    time: '12:00 PM — Lunchtime',
    title: 'Eat Lunch',
    emoji: '🍱',
    text:
      'Lunchtime! Open your lunchbox and enjoy a delicious meal. Eating healthy food helps your body grow big and strong!',
    bg: 'sky-day',
    artHtml: [
      '<div class="sun sun-high" style="right:30%;"></div>',
      '<div class="ground grass"></div>',
      '<div class="child" style="bottom:130px;">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="table">',
        '<div class="table-leg l"></div>',
        '<div class="table-leg r"></div>',
        '<div class="plate"></div>',
        '<div class="food-emoji">🍱</div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'playtime',
    time: '3:00 PM — Playtime',
    title: 'Play Outside',
    emoji: '🤸',
    text:
      'After school it is time to play! Run around, swing on the swings, slide down the slide, and laugh with your friends. Playing makes you happy and healthy!',
    bg: 'sky-day',
    artHtml: [
      '<div class="sun sun-high" style="right:12%;top:8%;"></div>',
      '<div class="ground grass"></div>',
      '<div class="swing">',
        '<div class="swing-frame lf"></div>',
        '<div class="swing-frame rf"></div>',
        '<div class="swing-top"></div>',
        '<div class="swing-rope"><div class="swing-seat"></div></div>',
      '</div>',
      '<div class="slide"><div class="slide-body"></div></div>',
      '<div class="child" style="left:55%;transform:none;">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body" style="background:#ff7043;">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
        '<div class="child-legs">',
          '<div class="child-leg" style="background:#d84315;"></div>',
          '<div class="child-leg" style="background:#d84315;"></div>',
        '</div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'bath-time',
    time: '6:00 PM — Evening',
    title: 'Bath Time',
    emoji: '🛁',
    text:
      'Splash splash! Jump into a warm bubbly bath. Wash your hair, scrub behind your ears, and play with bath toys. Squeaky clean!',
    bg: 'sky-evening',
    artHtml: [
      '<div class="sun sun-set"></div>',
      '<div class="ground floor" style="background:linear-gradient(180deg,#e8eaf6,#c5cae9);"></div>',
      '<div class="tub">',
        '<div class="tub-water"></div>',
        '<div class="tub-bubbles">',
          '<div class="tub-b"></div>',
          '<div class="tub-b" style="width:16px;height:16px;"></div>',
          '<div class="tub-b"></div>',
          '<div class="tub-b" style="width:14px;height:14px;"></div>',
          '<div class="tub-b"></div>',
        '</div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'dinner',
    time: '7:00 PM — Dinner',
    title: 'Eat Dinner',
    emoji: '🍽️',
    text:
      'The whole family sits together for dinner. Yummy rice, vegetables, and something sweet for dessert. Eating together is the best part of the day!',
    bg: 'sky-evening',
    artBg: 'linear-gradient(180deg,#fff3e0 0%,#ffe0b2 100%)',
    artHtml: [
      '<div class="ground floor"></div>',
      '<div class="child" style="bottom:130px;left:40%;transform:none;">',
        '<div class="child-head">',
          '<div class="child-hair"></div>',
          '<div class="child-eyes">',
            '<div class="child-eye"></div>',
            '<div class="child-eye"></div>',
          '</div>',
          '<div class="child-smile"></div>',
        '</div>',
        '<div class="child-body">',
          '<div class="child-arms">',
            '<div class="child-arm"></div>',
            '<div class="child-arm"></div>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="table" style="left:45%;">',
        '<div class="table-leg l"></div>',
        '<div class="table-leg r"></div>',
        '<div class="plate"></div>',
        '<div class="food-emoji">🍽️</div>',
      '</div>',
    ].join(''),
  },
  {
    id: 'bedtime',
    time: '8:00 PM — Bedtime',
    title: 'Good Night!',
    emoji: '🌙',
    text:
      'The moon is up and the stars are twinkling. Put on your pyjamas, listen to a bedtime story, and snuggle under your warm blanket. Sweet dreams! Tomorrow is a brand new day!',
    bg: 'sky-night',
    artHtml: [
      '<div class="moon"></div>',
      '<div class="ground bed-floor"></div>',
      '<div class="bed">',
        '<div class="mattress">',
          '<div class="pillow"></div>',
          '<div class="blanket"></div>',
        '</div>',
        '<div class="bed-frame"></div>',
      '</div>',
      `<div class="stars-bg">${BEDTIME_STARS}</div>`,
    ].join(''),
  },
];

/**
 * Body-background gradients applied to `<body>` while each scene is
 * active. Vanilla precedent: the page bg morphs warm-orange in the
 * morning → soft-blue mid-day → pink-purple in the evening → deep-navy
 * at bedtime, matching the scene's time-of-day mood. Indices line up
 * 1-to-1 with `SCENES`.
 */
export const BODY_BGS: readonly string[] = [
  'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',  // wake-up
  'linear-gradient(135deg,#e3f2fd 0%,#bbdefb 100%)',  // brush-teeth
  'linear-gradient(135deg,#fff8e1 0%,#ffecb3 100%)',  // breakfast
  'linear-gradient(135deg,#fce4ec 0%,#f8bbd0 100%)',  // get-dressed
  'linear-gradient(135deg,#e8f5e9 0%,#c8e6c9 100%)',  // school
  'linear-gradient(135deg,#e8f5e9 0%,#a5d6a7 100%)',  // lunch
  'linear-gradient(135deg,#c8e6c9 0%,#a5d6a7 100%)',  // playtime
  'linear-gradient(135deg,#f3e5f5 0%,#ce93d8 100%)',  // bath-time
  'linear-gradient(135deg,#fff3e0 0%,#ffcc80 100%)',  // dinner
  'linear-gradient(135deg,#1a237e 0%,#311b92 50%,#4a148c 100%)',  // bedtime
];

export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'What is the first thing you do when you wake up?',
    opts: ['Eat dinner', 'Stretch and get out of bed', 'Go to school', 'Take a bath'],
    ans: 1,
  },
  {
    q: 'Why do we brush our teeth every morning?',
    opts: ['To make them sparkly clean', 'Because teeth are bored', 'To make them fall out', 'To paint them'],
    ans: 0,
  },
  {
    q: 'What does eating breakfast give you?',
    opts: ['Homework', 'Energy for the day', 'A stomachache', 'New shoes'],
    ans: 1,
  },
  {
    q: 'What do you learn at school?',
    opts: ['Nothing at all', 'Only how to sleep', 'ABCs, numbers, colours, and stories', 'How to fly'],
    ans: 2,
  },
  {
    q: 'Why is playing outside good for you?',
    opts: ['It makes you tired only', 'It makes you happy and healthy', 'It gives you homework', 'It makes the rain stop'],
    ans: 1,
  },
  {
    q: 'What do you do at bath time?',
    opts: ['Sleep', 'Wash and play with bath toys', 'Eat food', 'Read a book'],
    ans: 1,
  },
  {
    q: 'What happens at bedtime?',
    opts: ['You go to school', 'You eat breakfast', 'You put on pyjamas and listen to a story', 'You play outside'],
    ans: 2,
  },
  {
    q: 'What comes after dinner in the daily routine?',
    opts: ['Lunch', 'Bedtime', 'Breakfast', 'School'],
    ans: 1,
  },
];
