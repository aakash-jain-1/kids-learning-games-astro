/**
 * Data for the Honest Woodcutter story — the *thirteenth and final* port,
 * second consumer of `StoryLayout` (after Daily Routines).
 *
 * Pedagogy: a *single-scene narrative* tale on the moral of honesty.
 * Vanilla `kids-learning-games/games/woodcutter-story.html` is a
 * one-shot animated hero scene (woodcutter chopping by a river, fairy
 * appears, offers a gold axe, then a silver axe, then the iron one;
 * woodcutter only claims the iron one as his own and is rewarded with
 * all three) followed by 4 paragraphs of continuous prose, a moral
 * panel, and a 6-question multiple-choice comprehension quiz.
 *
 * Layout decision (settled at port time): vanilla is *not* paginated.
 * Earlier docs assumed both story games shared the same Routines-style
 * scene-by-scene flow; an audit at port time corrected that. So
 * Woodcutter:
 *   - Reuses `StoryLayout.astro` (already accepts a `theme: 'woodcutter'`).
 *   - Omits the progress bar + Prev/Next chrome from the page slot
 *     (those elements live in the consuming page, not in the layout
 *     shell — the layout doesn't need a `pagination={false}` prop).
 *   - Renders the hero scene + Play Animation + Reset button row
 *     instead of `◀ Back / 🔊 Listen / Next ▶`.
 *   - Quiz section is always-visible at the bottom (matches vanilla).
 *
 * Quiz: handled by the shared `mountQuiz` controller in
 * `src/lib/quiz.ts` — the same library Routines uses (extracted at
 * Woodcutter port time per the rule-#5 second-consumer trigger). The
 * `QUIZ` array exported here is exactly the typed `QuizQuestion[]` the
 * controller expects.
 *
 * Vanilla quirks preserved verbatim:
 *   - Body theme `#1e3c72 → #2a5298 → #7e22ce` (deep navy → purple) —
 *     mapped to `body.story[data-theme='woodcutter']` in `story.css`.
 *   - The fairy appears at scene-time 3 s, floats from 5 s, the golden
 *     axe rises at 6 s, the silver axe at 9 s. The Astro port preserves
 *     these timings via animation-delay in `woodcutter.css`.
 *   - The 100 twinkling stars background in vanilla is a JS-injected
 *     overlay (`createStars()` runs on load). The Astro port renders
 *     them as deterministic CSS-only `.star` elements inside the
 *     scene-art so SSR is meaningful pre-hydration. Visually identical.
 *   - The 20 fairy sparkles in vanilla are JS-injected `setTimeout`
 *     bursts. The port omits them — the wand glow + fairy float
 *     animations carry the magical-moment beat without DOM churn.
 *   - "Play Animation" rebuilds the scene innerHTML to restart all CSS
 *     animations (cleaner than vanilla's `style.animation = 'none'`
 *     reset). "Reset" replays the animation AND restarts the quiz.
 *   - Vanilla auto-starts the quiz on load; we preserve that — the
 *     page calls `quiz.start()` immediately after mount.
 *
 * Per-scene art is scoped under `.woodcutter-art` (a marker class on the
 * `.scene-art` container) and every keyframe is prefixed `woodcutter-*`,
 * so this game can never leak art-CSS to any other page. See
 * `src/styles/woodcutter.css`.
 */

import type { QuizQuestion } from '@/lib/quiz';

/**
 * Pre-rendered hardcoded star positions for the night-sky background
 * inside the hero scene. Vanilla generates 100 stars with `Math.random`
 * per page load; we snapshot 60 deterministic positions at port time so
 * the SSR'd HTML is identical on every render. Visually equivalent to a
 * child — sparse twinkle backdrop behind the daytime forest scene.
 */
const STAR_POSITIONS: readonly (readonly [number, number, number])[] = [
  [3, 12, 0.4], [9, 5, 1.7], [16, 22, 0.9], [22, 8, 2.3], [28, 31, 1.1],
  [34, 4, 0.6], [41, 18, 2.8], [47, 9, 1.5], [54, 27, 0.3], [61, 15, 2.1],
  [68, 6, 1.9], [74, 24, 0.7], [80, 12, 2.5], [86, 30, 1.3], [92, 7, 0.5],
  [97, 19, 2.2], [5, 36, 1.0], [11, 42, 2.6], [18, 38, 0.2], [25, 45, 1.8],
  [31, 33, 2.4], [38, 47, 0.8], [44, 35, 1.6], [50, 41, 2.9], [57, 49, 0.1],
  [63, 39, 1.4], [70, 46, 2.7], [76, 34, 0.5], [83, 43, 1.2], [89, 37, 2.0],
  [95, 48, 0.9], [2, 55, 1.7], [8, 60, 2.3], [14, 53, 0.4], [21, 58, 1.9],
  [27, 52, 2.5], [33, 64, 0.6], [40, 56, 1.3], [46, 62, 2.8], [53, 51, 1.0],
  [59, 57, 2.2], [66, 65, 0.3], [72, 54, 1.5], [78, 59, 2.6], [85, 63, 0.7],
  [91, 50, 1.8], [4, 70, 2.1], [10, 75, 0.5], [17, 68, 1.6], [23, 73, 2.9],
  [30, 77, 0.2], [36, 67, 1.4], [43, 72, 2.5], [49, 76, 0.8], [55, 69, 1.7],
  [62, 74, 2.3], [69, 71, 0.9], [75, 78, 1.1], [82, 66, 2.7], [88, 79, 0.4],
];

const STARS_HTML: string = STAR_POSITIONS
  .map(
    ([left, top, delay]) =>
      `<div class="star" style="left:${left}%;top:${top}%;animation-delay:${delay}s;"></div>`,
  )
  .join('');

/**
 * The full hero-scene markup. Pre-rendered to a single string so the
 * page can SSR the scene meaningfully and re-set `innerHTML` to replay
 * all CSS animations on the Play / Reset buttons.
 *
 * Selectors used inside (`.sun`, `.cloud`, `.tree`, `.river`, `.wave`,
 * `.woodcutter`, `.fairy`, `.golden-axe`, `.silver-axe`, `.splash`,
 * `.star`) are all scoped under `.woodcutter-art` in
 * `src/styles/woodcutter.css` — they will never collide with other
 * pages even though the names match vanilla verbatim.
 */
export const SCENE_ART_HTML: string = [
  `<div class="stars" aria-hidden="true">${STARS_HTML}</div>`,
  '<div class="sun"></div>',
  '<div class="cloud cloud1"></div>',
  '<div class="cloud cloud2"></div>',
  '<div class="tree tree1"></div>',
  '<div class="tree tree2"></div>',
  '<div class="tree tree3"></div>',
  '<div class="river"><div class="wave"></div></div>',
  // Woodcutter character — head + arms (with axe) + body
  '<div class="woodcutter">',
  '<div class="woodcutter-head"></div>',
  '<div class="woodcutter-arms"><div class="axe"></div></div>',
  '<div class="woodcutter-body"></div>',
  '</div>',
  // Fairy character — head + wings + body + wand. opacity:0 by default; reveal animation in CSS.
  '<div class="fairy">',
  '<div class="fairy-head"></div>',
  '<div class="fairy-wings"></div>',
  '<div class="fairy-body"></div>',
  '<div class="wand"></div>',
  '</div>',
  '<div class="golden-axe"></div>',
  '<div class="silver-axe"></div>',
  '<div class="splash"></div>',
].join('');

/**
 * The four story paragraphs. Verbatim from vanilla
 * `woodcutter-story.html`. Each paragraph is rendered as a separate
 * `<p>` element so the `:first-child` rule that strips the top-margin
 * works cleanly in the prose styles.
 */
export const STORY: readonly string[] = [
  'Once upon a time, there lived a poor but honest woodcutter. One day, while cutting wood near a river, his axe slipped from his hands and fell into the deep water. The woodcutter was very sad because the axe was his only means of earning a living.',
  'As he sat crying by the river, a beautiful fairy appeared from the water. She asked him why he was crying. The woodcutter explained his situation. The kind fairy dove into the river and brought up a golden axe, asking, "Is this your axe?"',
  'The honest woodcutter replied, "No, that is not mine." The fairy went back and returned with a silver axe. Again the woodcutter said, "No, that is not mine either." Finally, the fairy brought his old iron axe. The woodcutter\'s eyes lit up, "Yes! That\'s my axe!"',
  'The fairy was very pleased with his honesty. She rewarded him by giving him both the golden and silver axes along with his own axe. The woodcutter thanked the fairy and returned home happily with all three axes.',
];

/** The moral panel text. Verbatim from vanilla. */
export const MORAL: string =
  'Honesty is always rewarded. Truth and integrity are the greatest virtues one can possess.';

/**
 * 6-question multiple-choice quiz. Verbatim from vanilla
 * `woodcutter-story.html` (`storyQuizData` array). Question count and
 * answer indices preserved exactly — children who learned the vanilla
 * quiz get the same answers in the Astro port.
 */
export const QUIZ: readonly QuizQuestion[] = [
  {
    q: 'What did the woodcutter lose in the river?',
    opts: ['His shoes', 'His axe', 'A golden coin', 'His hat'],
    ans: 1,
  },
  {
    q: 'Who appeared when the woodcutter was crying?',
    opts: ['A king', 'A wizard', 'A fairy', 'A fish'],
    ans: 2,
  },
  {
    q: 'What did the fairy bring up first from the river?',
    opts: ['Silver axe', 'Iron axe', 'Golden axe', 'Diamond axe'],
    ans: 2,
  },
  {
    q: 'Did the woodcutter claim the golden axe was his?',
    opts: ['Yes, he did', 'No, he said it was not his', 'He was not sure', 'He ran away'],
    ans: 1,
  },
  {
    q: 'How was the woodcutter rewarded for his honesty?',
    opts: ['He got money', 'He got all three axes', 'He got a house', 'He got nothing'],
    ans: 1,
  },
  {
    q: 'What is the moral of the story?',
    opts: ['Be greedy', 'Honesty is always rewarded', "Don't go near rivers", 'Fairies are scary'],
    ans: 1,
  },
];
