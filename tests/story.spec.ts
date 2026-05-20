import { test, expect } from '@playwright/test';
import { answerQuizUntilResult, readQuizState } from './helpers';

/**
 * Story layout smoke suite.
 *
 * Asserts both ports (daily-routines, woodcutter-story) of the
 * scene-and-prose layout still:
 *  - SSR a meaningful first scene (`.scene-box` + `.scene-art`).
 *  - Wire `mountQuiz` into the inline `#quizBox` panel (story games
 *    don't use the modal overlay — the quiz is part of the page
 *    flow).
 *  - Persist `<gameId>_quiz_v1` after one full quiz run.
 *
 * Routines and Woodcutter have different entry paths into the
 * quiz, so the test keeps them as separate `describe` blocks
 * rather than parameterising:
 *  - Routines hides the quiz behind `#btnQuiz` (and the body
 *    flips `data-mode='quiz'`).
 *  - Woodcutter auto-starts the quiz on load (the quiz panel is
 *    always visible inline below the scene).
 */

test.describe('story layout', () => {
  test.describe('daily-routines-game (Routines, 10 scenes)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('games/daily-routines-game.html');
      await page.evaluate(() => localStorage.clear());
    });

    test('SSR scene 1 renders with header, art, and progress', async ({ page }) => {
      await expect(page).toHaveTitle(/Daily Routines/);
      await expect(page.locator('body')).toHaveClass(/story/);
      await expect(page.locator('body[data-theme="routines"]')).toHaveCount(1);

      // Scene shell.
      await expect(page.locator('#sceneBox')).toBeVisible();
      await expect(page.locator('#sceneArt')).toBeVisible();
      await expect(page.locator('#sceneTitle')).not.toBeEmpty();
      await expect(page.locator('#sceneText')).not.toBeEmpty();

      // Progress strip starts at scene 1 / 10.
      await expect(page.locator('#progText')).toContainText(/Scene\s*1\s*of\s*\d+/);

      // Quiz panel is hidden by default until `#btnQuiz` is pressed
      // (or the user finishes the last scene).
      await expect(page.locator('#quizBox')).toBeHidden();
    });

    test('Next button advances scenes', async ({ page }) => {
      await page.click('#nextBtn');
      await expect(page.locator('#progText')).toContainText(/Scene\s*2\s*of/);
    });

    test('quiz button reveals quizBox, advances to result, persists state', async ({ page }) => {
      const quizBox = page.locator('#quizBox');
      const body = page.locator('#quizBody');
      const result = page.locator('#quizResult');

      await page.click('#btnQuiz');
      await expect(quizBox).toBeVisible();
      // body.dataset.mode = 'quiz' — drives the page-local CSS that
      // hides the scene + nav while quizzing.
      await expect(page.locator('body[data-mode="quiz"]')).toHaveCount(1);

      await expect(body.locator('.quiz-question')).toBeVisible();
      await expect(body.locator('.quiz-opt')).not.toHaveCount(0);

      await answerQuizUntilResult(body, result);
      await expect(page.locator('#quizResEmoji')).not.toBeEmpty();
      await expect(page.locator('#quizResText')).not.toBeEmpty();

      const state = await readQuizState(page, 'routines');
      expect(state.attempts).toBe(1);
    });
  });

  test.describe('woodcutter-story (single scene + auto-started quiz)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('games/woodcutter-story.html');
      await page.evaluate(() => localStorage.clear());
    });

    test('SSR scene art renders + body theme is woodcutter', async ({ page }) => {
      await expect(page).toHaveTitle(/Woodcutter/);
      await expect(page.locator('body')).toHaveClass(/story/);
      await expect(page.locator('body[data-theme="woodcutter"]')).toHaveCount(1);
      await expect(page.locator('#sceneArt')).toBeVisible();
      // Scene contains animated children — at least the inline SVG/divs
      // injected via `set:html={SCENE_ART_HTML}` should produce a
      // non-empty descendant element count. (`toBeEmpty` matches on
      // *text* content, but `#sceneArt` is purely decorative — no
      // visible text — so we count descendants directly.)
      await expect(page.locator('#sceneArt > *')).not.toHaveCount(0);
    });

    test('quiz panel renders inline + auto-starts on load', async ({ page }) => {
      // Always-visible inline panel; no `[hidden]` toggle.
      await expect(page.locator('.quiz-box')).toBeVisible();
      // First question rendered immediately by `quiz?.start()` in the
      // page script.
      await expect(page.locator('#quizBody .quiz-question')).toBeVisible();
      await expect(page.locator('#quizBody .quiz-opt')).not.toHaveCount(0);
    });

    test('quiz advances to result + persists state on completion', async ({ page }) => {
      const body = page.locator('#quizBody');
      const result = page.locator('#quizResult');

      await answerQuizUntilResult(body, result);
      await expect(page.locator('#quizResEmoji')).not.toBeEmpty();
      await expect(page.locator('#quizResText')).not.toBeEmpty();

      const state = await readQuizState(page, 'woodcutter');
      expect(state.attempts).toBe(1);
    });

    test('reset button restarts the quiz', async ({ page }) => {
      const body = page.locator('#quizBody');
      const result = page.locator('#quizResult');

      await answerQuizUntilResult(body, result);
      await expect(result).toBeVisible();

      await page.click('#resetBtn');
      // Reset replays the scene *and* calls `quiz.start()` — result panel hides,
      // body returns to question 1.
      await expect(result).toBeHidden();
      await expect(body.locator('.quiz-question')).toContainText(/^1\s*\//);
    });
  });

  /**
   * Wrong-answer feedback (T-extra, 2026-05-20).
   *
   * Pinned to Woodcutter because Q1 has a deterministic answer
   * (`{ q: 'What did the woodcutter drop in the river?',
   *      opts: ['His shoes', 'His axe', 'A golden coin', 'His hat'],
   *      ans: 1 }` — see `src/data/woodcutter.ts`). That lets us
   * exercise both branches without having to know per-game data:
   *   - Tap `data-i="0"` ("His shoes") → wrong tap.
   *   - Tap `data-i="1"` ("His axe")  → correct tap.
   *
   * The feedback rules are global (`src/styles/global.css`) and the
   * controller (`src/lib/quiz.ts`) is shared by all 13 quiz games
   * (story + card-set + card-pure), so smoke-testing the wiring on
   * one consumer is sufficient. The preschool-math triad has its
   * own page-local errorless flow and is intentionally NOT covered
   * by this suite — see `tests/addition.spec.ts` etc.
   */
  test.describe('wrong-answer feedback (mountQuiz)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('games/woodcutter-story.html');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      // Quiz auto-starts on Woodcutter; ensure Q1 is rendered before
      // we tap.
      await expect(page.locator('#quizBody .quiz-question')).toContainText(/^1\s*\//);
    });

    test('wrong tap: shakes the tapped button + reveals the correct one + advances', async ({ page }) => {
      const body = page.locator('#quizBody');
      const wrongBtn = body.locator('.quiz-opt[data-i="0"]'); // "His shoes" — wrong (ans: 1)
      const correctBtn = body.locator('.quiz-opt[data-i="1"]'); // "His axe"   — correct

      await wrongBtn.click();

      // Synchronous part of `onAnswer`: classes are written, every
      // option is disabled.
      await expect(wrongBtn).toHaveClass(/quiz-opt--wrong/);
      await expect(correctBtn).toHaveClass(/quiz-opt--reveal/);
      // Tapped button is NOT also marked correct/reveal.
      await expect(wrongBtn).not.toHaveClass(/quiz-opt--correct/);
      await expect(wrongBtn).not.toHaveClass(/quiz-opt--reveal/);
      // Exactly one --reveal in the body (only the correct option).
      await expect(body.locator('.quiz-opt--reveal')).toHaveCount(1);
      // All four options disabled during the feedback window.
      await expect(body.locator('.quiz-opt[disabled]')).toHaveCount(4);

      // After the 700ms wrong-feedback gate, Q2 renders with fresh
      // enabled buttons and the feedback classes are gone (innerHTML
      // is fully rewritten by `renderQuestion`).
      await expect(body.locator('.quiz-question')).toContainText(/^2\s*\//, { timeout: 2000 });
      await expect(body.locator('.quiz-opt--wrong')).toHaveCount(0);
      await expect(body.locator('.quiz-opt--reveal')).toHaveCount(0);
      await expect(body.locator('.quiz-opt[disabled]')).toHaveCount(0);
    });

    test('correct tap: pops the tapped button (no --reveal anywhere) + advances', async ({ page }) => {
      const body = page.locator('#quizBody');
      const correctBtn = body.locator('.quiz-opt[data-i="1"]');

      await correctBtn.click();

      await expect(correctBtn).toHaveClass(/quiz-opt--correct/);
      // No --wrong class at all on a correct tap.
      await expect(body.locator('.quiz-opt--wrong')).toHaveCount(0);
      // No --reveal class either — we only reveal the correct answer
      // when the child got it wrong; no need on a correct tap because
      // the tapped button IS the correct one.
      await expect(body.locator('.quiz-opt--reveal')).toHaveCount(0);
      await expect(body.locator('.quiz-opt[disabled]')).toHaveCount(4);

      // After the 450ms correct-feedback gate, Q2 renders.
      await expect(body.locator('.quiz-question')).toContainText(/^2\s*\//, { timeout: 2000 });
      await expect(body.locator('.quiz-opt--correct')).toHaveCount(0);
      await expect(body.locator('.quiz-opt[disabled]')).toHaveCount(0);
    });

    test('double-tap during feedback window cannot fire onAnswer twice', async ({ page }) => {
      // Tap wrong, then immediately try to tap a different option
      // while the 700ms gate is still active. The second tap must
      // NOT mutate state — Q2 should still render normally and the
      // counter should still read 2/N (not 3/N).
      const body = page.locator('#quizBody');
      const wrongBtn = body.locator('.quiz-opt[data-i="0"]');
      const otherBtn = body.locator('.quiz-opt[data-i="2"]');

      await wrongBtn.click();
      // Buttons are now disabled — Playwright's default click would
      // wait for re-enable, which we don't want here. We explicitly
      // dispatch a click event bypassing actionability (force) to
      // simulate a fast double-tap.
      await otherBtn.dispatchEvent('click');

      // Still only one --wrong (the original tap), still one --reveal,
      // still no --correct.
      await expect(body.locator('.quiz-opt--wrong')).toHaveCount(1);
      await expect(body.locator('.quiz-opt--reveal')).toHaveCount(1);
      await expect(body.locator('.quiz-opt--correct')).toHaveCount(0);

      // Q2 still renders cleanly after the gate.
      await expect(body.locator('.quiz-question')).toContainText(/^2\s*\//, { timeout: 2000 });
    });
  });
});
