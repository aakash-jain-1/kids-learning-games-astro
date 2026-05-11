import { test, expect } from '@playwright/test';
import {
  answerQuizUntilResult,
  expectModalClosed,
  expectModalOpen,
  readQuizState,
} from './helpers';

/**
 * Card-machine layout smoke suite.
 *
 * Asserts the four ports (dinosaurs / flashcards / solar-system /
 * weather) of the deck-and-machine layout still:
 *  - SSR a meaningful initial card (`#cardName` non-empty + `#topCard`
 *    present + `#cardNum` of the form "X / Y").
 *  - Open the `mountQuiz` overlay when `#btnQuiz` is clicked, render
 *    the first quiz question + 4 options, advance through every
 *    question, and reveal the result panel + per-game LocalStorage
 *    state once the last option is picked.
 *  - Close cleanly via `#quizCloseBtn`.
 *
 * Themes are parameterised so a regression in any one game's
 * wiring shows up as a single failing row in the report.
 *
 * URL shape: `astro.config.mjs` is configured with
 * `build: { format: 'file' }` so each page builds to
 * `<name>.html` and the preview server serves at
 * `/games/<name>.html` under the `/kids-learning-games-astro` base.
 */

interface CardMachineGame {
  /** URL slug under `/games/`. */
  slug: string;
  /** `<gameId>_quiz_v1` LocalStorage key prefix — mirrors GAME_ID in the page script. */
  gameId: string;
  /** Substring expected in the document title — sanity check that the right page rendered. */
  titleContains: string;
  /**
   * Theme name passed to `<CardMachineLayout theme=…>` when the page sets one.
   * Dinosaurs is the layout's "default" — it omits the prop, so the body has
   * no `data-theme` attribute. The other three set it so we can assert against
   * the rendered `body[data-theme=…]`.
   */
  theme?: string;
}

const GAMES: readonly CardMachineGame[] = [
  { slug: 'dinosaurs-game', gameId: 'dinosaurs', titleContains: 'Dinosaurs' },
  { slug: 'flashcards-game', gameId: 'flashcards', titleContains: 'Flash\\s*[Cc]ards', theme: 'flashcards' },
  { slug: 'solar-system-game', gameId: 'solar-system', titleContains: 'Solar System', theme: 'solar-system' },
  { slug: 'weather-game', gameId: 'weather', titleContains: 'Weather', theme: 'weather' },
];

test.describe('card-machine layout', () => {
  for (const game of GAMES) {
    test.describe(game.slug, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`games/${game.slug}.html`);
        // Clean storage before each test so quiz-attempt + per-game
        // progress assertions start from a known zero state. Done
        // *after* navigation so we have access to localStorage on
        // the right origin.
        await page.evaluate(() => localStorage.clear());
      });

      test('SSR card-machine shell renders', async ({ page }) => {
        await expect(page).toHaveTitle(new RegExp(game.titleContains));
        await expect(page.locator('body')).toHaveClass(/card-machine/);
        if (game.theme) {
          await expect(page.locator(`body[data-theme="${game.theme}"]`)).toHaveCount(1);
        }
        await expect(page.locator('#topCard')).toBeVisible();
        await expect(page.locator('#cardName')).not.toBeEmpty();
        await expect(page.locator('#cardNum')).toContainText(/\d+\s*\/\s*\d+/);
      });

      test('quiz overlay starts hidden, opens on btnQuiz, advances to result, persists state', async ({
        page,
      }) => {
        const overlay = page.locator('#quizOverlay');
        const body = page.locator('#quizBody');
        const result = page.locator('#quizResult');

        await expect(overlay).toHaveClass(/cm-quiz-overlay/);
        await expectModalClosed(overlay);

        await page.click('#btnQuiz');
        await expectModalOpen(overlay);

        // First question + at least one option button must be wired.
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
