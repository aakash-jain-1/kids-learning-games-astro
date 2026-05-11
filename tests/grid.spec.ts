import { test, expect } from '@playwright/test';
import {
  answerQuizUntilResult,
  expectModalClosed,
  expectModalOpen,
  readLearned,
  readQuizState,
} from './helpers';

/**
 * Grid layout smoke suite.
 *
 * Asserts the seven ports (alphabets / numbers / colors / shapes /
 * animals / birds / hindi) of the tile-grid layout still:
 *  - SSR a non-empty `#deck` of `.gl-tile` items.
 *  - Tap the first tile and persist the click into
 *    `kids_progress_v1:<gameId>` (via `progress.ts`).
 *  - Open the shared `mountQuiz` overlay (`gl-quiz-overlay` shell,
 *    same `#quizOverlay` id as card-machine), advance through every
 *    question, reveal the result panel, and write `<gameId>_quiz_v1`.
 *  - Close cleanly via `#quizCloseBtn`.
 *
 * The grid suite intentionally does not assert the filter pills
 * for every theme — pill counts vary (`alphabets` has none, `birds`
 * has 4 habitat filters, etc.). The smoke contract is "the deck
 * renders + the tap pipeline writes progress + the quiz fires" —
 * theme-specific UI surfaces stay out of the parameterised loop.
 */

interface GridGame {
  /** URL slug under `/games/`. */
  slug: string;
  /** `<gameId>_quiz_v1` + `kids_progress_v1:<gameId>` LocalStorage prefix. */
  gameId: string;
  /** Substring expected in the document title. */
  titleContains: string;
}

const GAMES: readonly GridGame[] = [
  { slug: 'alphabets-game', gameId: 'alphabets', titleContains: 'Alphabet' },
  { slug: 'numbers-game', gameId: 'numbers', titleContains: 'Number' },
  { slug: 'colors-game', gameId: 'colors', titleContains: 'Color' },
  { slug: 'shapes-game', gameId: 'shapes', titleContains: 'Shape' },
  { slug: 'animals-game', gameId: 'animals', titleContains: 'Animal' },
  { slug: 'birds-game', gameId: 'birds', titleContains: 'Bird' },
  { slug: 'hindi-game', gameId: 'hindi', titleContains: 'Hindi' },
];

test.describe('grid layout', () => {
  for (const game of GAMES) {
    test.describe(game.slug, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`games/${game.slug}.html`);
        await page.evaluate(() => localStorage.clear());
      });

      test('SSR grid shell renders with non-empty deck', async ({ page }) => {
        await expect(page).toHaveTitle(new RegExp(game.titleContains));
        await expect(page.locator('body')).toHaveClass(/grid/);
        await expect(page.locator(`body[data-theme="${game.gameId}"]`)).toHaveCount(1);
        await expect(page.locator('#deck')).toBeVisible();
        const tileCount = await page.locator('#deck .gl-tile').count();
        expect(tileCount, `${game.slug} deck should have at least one tile`).toBeGreaterThan(0);
      });

      test('tile tap persists into kids_progress_v1', async ({ page }) => {
        const firstTile = page.locator('#deck .gl-tile').first();
        await firstTile.click();
        // The detail panel reveals + the tile gets `learned`.
        await expect(firstTile).toHaveClass(/learned/);
        const learned = await readLearned(page, game.gameId);
        expect(learned.length, 'at least one item in learned set').toBeGreaterThan(0);
      });

      test('quiz overlay opens, advances to result, persists state', async ({ page }) => {
        const overlay = page.locator('#quizOverlay');
        const body = page.locator('#quizBody');
        const result = page.locator('#quizResult');

        await expect(overlay).toHaveClass(/gl-quiz-overlay/);
        await expectModalClosed(overlay);

        await page.click('#btnQuiz');
        await expectModalOpen(overlay);

        await expect(body.locator('.quiz-question')).toBeVisible();
        await expect(body.locator('.quiz-opt')).not.toHaveCount(0);

        await answerQuizUntilResult(body, result);
        await expect(page.locator('#quizResEmoji')).not.toBeEmpty();
        await expect(page.locator('#quizResText')).not.toBeEmpty();

        const state = await readQuizState(page, game.gameId);
        expect(state.attempts).toBe(1);
      });

      test('quiz overlay closes via close button', async ({ page }) => {
        const overlay = page.locator('#quizOverlay');
        await page.click('#btnQuiz');
        await expectModalOpen(overlay);
        await page.click('#quizCloseBtn');
        await expectModalClosed(overlay);
      });
    });
  }
});
