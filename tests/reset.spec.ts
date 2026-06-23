import { test, expect } from '@playwright/test';
import { expectModalClosed, expectModalOpen } from './helpers';

/**
 * Reset-button smoke suite.
 *
 * The `🔄 Reset` pill + its confirm dialog live in the shared
 * `GameControls.astro`, so every game in all three layouts inherits the
 * exact same wiring. We exercise one representative game per layout to
 * prove the shared control:
 *  - Renders the `#btnReset` pill.
 *  - Opens the `#resetConfirmModal` confirm dialog (`.show`) on tap and
 *    does NOT reload until confirmed (the kid-safe gate).
 *  - Closes the dialog on "Keep playing" (cancel) with no reload.
 *  - Reloads the page on "Start over" (confirm) while keeping the saved
 *    LocalStorage progress intact.
 *
 * URL shape mirrors the other suites: `build.format: 'file'` serves each
 * page at `/games/<slug>.html` under the project base.
 */

interface ResetGame {
  /** URL slug under `/games/`. */
  slug: string;
  /** Layout shell the game uses (for the test label only). */
  layout: 'grid' | 'card-machine' | 'story';
}

const GAMES: readonly ResetGame[] = [
  { slug: 'alphabets-game', layout: 'grid' },
  { slug: 'flashcards-game', layout: 'card-machine' },
  { slug: 'daily-routines-game', layout: 'story' },
];

test.describe('reset button', () => {
  for (const game of GAMES) {
    test.describe(`${game.slug} (${game.layout})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`games/${game.slug}.html`);
        await page.evaluate(() => localStorage.clear());
      });

      test('pill renders and confirm dialog starts hidden', async ({ page }) => {
        await expect(page.locator('#btnReset')).toBeVisible();
        await expectModalClosed(page.locator('#resetConfirmModal'));
      });

      test('tapping Reset opens the confirm dialog without reloading', async ({ page }) => {
        // Sentinel survives only if the page did NOT reload.
        await page.evaluate(() => {
          (window as unknown as { __noReload?: boolean }).__noReload = true;
        });

        await page.click('#btnReset');
        await expectModalOpen(page.locator('#resetConfirmModal'));

        const stillThere = await page.evaluate(
          () => (window as unknown as { __noReload?: boolean }).__noReload,
        );
        expect(stillThere, 'opening the dialog must not reload the page').toBe(true);
      });

      test('"Keep playing" cancels without reloading', async ({ page }) => {
        await page.evaluate(() => {
          (window as unknown as { __noReload?: boolean }).__noReload = true;
        });

        await page.click('#btnReset');
        await expectModalOpen(page.locator('#resetConfirmModal'));
        await page.click('#resetCancelBtn');
        await expectModalClosed(page.locator('#resetConfirmModal'));

        const stillThere = await page.evaluate(
          () => (window as unknown as { __noReload?: boolean }).__noReload,
        );
        expect(stillThere, 'cancel must not reload the page').toBe(true);
      });

      test('"Start over" reloads the page but keeps saved progress', async ({ page }) => {
        // Seed a saved-progress key and a JS-only sentinel. A reload keeps
        // the LocalStorage key but wipes the in-memory sentinel.
        await page.evaluate(() => {
          localStorage.setItem('reset_spec_marker', 'kept');
          (window as unknown as { __noReload?: boolean }).__noReload = true;
        });

        await page.click('#btnReset');
        await expectModalOpen(page.locator('#resetConfirmModal'));

        await Promise.all([
          page.waitForEvent('load'),
          page.click('#resetConfirmBtn'),
        ]);

        const sentinel = await page.evaluate(
          () => (window as unknown as { __noReload?: boolean }).__noReload,
        );
        expect(sentinel, 'confirm must reload the page (sentinel gone)').toBeUndefined();

        const kept = await page.evaluate(() => localStorage.getItem('reset_spec_marker'));
        expect(kept, 'saved progress survives the reset').toBe('kept');
      });
    });
  }
});
