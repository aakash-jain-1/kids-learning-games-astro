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
});
