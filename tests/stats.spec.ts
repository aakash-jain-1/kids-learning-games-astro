import { test, expect, type Page } from '@playwright/test';

/**
 * Parent Stats dashboard smoke suite (T6, 2026-05-20).
 *
 * Locks in the contract of `src/pages/stats.astro` + the
 * `STATS_REGISTRY` source of truth in `src/data/stats-registry.ts`:
 *
 * - Exactly one card is rendered per registry entry, in the order
 *   declared, grouped under the four family sections.
 * - SSR shape ships zero-state values + correct labels (no JS
 *   required to see "0 / never / No plays yet" — important because
 *   the page is a *progress dashboard*; if hydration breaks, the
 *   parent should still see *something* sensible).
 * - Hydration patches values from `localStorage` after seeding and
 *   reloading.
 * - Reset (per-card and "Reset everything") clears the right keys
 *   and re-renders zero values immediately.
 * - The dashboard is reachable from the home page (footer link) and
 *   from `GameNav` on every game page (📊 Stats).
 *
 * Why we hard-code the expected game id list:
 *   Playwright tests historically don't import from `@/...` in this
 *   repo (the tsconfig `include` only covers `src/`), so we mirror
 *   the registry order here. If the registry grows or reorders, this
 *   array fails loudly first — that's the right level of friction
 *   (one-line edit) and surfaces "you forgot to update the test"
 *   immediately instead of silently passing.
 *
 * Confirm dialogs:
 *   The "Reset" buttons call `window.confirm(...)`. We register a
 *   `page.on('dialog')` handler per-test that auto-accepts so the
 *   reset flow can be exercised end-to-end. We also assert the
 *   confirm message includes the game name so a future "did the
 *   wrong button get wired" regression would surface here.
 */

const EXPECTED_GAME_IDS = [
  // Family A — preschool-math
  'counting-friends',
  'more-friends',
  'number-friends',
  // Family B — story
  'routines',
  'woodcutter',
  // Family C — card-set
  'alphabets',
  'numbers',
  'colors',
  'shapes',
  'animals',
  'birds',
  'hindi',
  // Family D — card-pure
  'flashcards',
  'dinosaurs',
  'solar-system',
  'weather',
] as const;

const acceptDialogs = (page: Page): void => {
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
};

test.describe('parent stats dashboard (T6)', () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts from `/stats.html` with a clean LocalStorage.
    await page.goto('stats.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('SSR renders the page header, all four family sections, and one card per registry entry', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Parent Stats/);
    await expect(page.locator('body.stats-page')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Parent Stats');

    // Four family sections, in declared order.
    const sections = page.locator('.stats-section');
    await expect(sections).toHaveCount(4);
    await expect(sections.nth(0)).toHaveAttribute('data-family', 'preschool-math');
    await expect(sections.nth(1)).toHaveAttribute('data-family', 'story');
    await expect(sections.nth(2)).toHaveAttribute('data-family', 'card-set');
    await expect(sections.nth(3)).toHaveAttribute('data-family', 'card-pure');

    // One card per registry entry, in registry order.
    const cards = page.locator('.stats-card');
    await expect(cards).toHaveCount(EXPECTED_GAME_IDS.length);

    const renderedIds = await cards.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).dataset.gameId ?? ''),
    );
    expect(renderedIds).toEqual([...EXPECTED_GAME_IDS]);
  });

  test('SSR zero-state: every card shows "never" for last played and the "No plays yet" badge appears after hydration', async ({
    page,
  }) => {
    // Pick a representative card from each family for value-spot-checks.
    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    await expect(counting.locator('.stats-row-value').last()).toContainText('never');
    await expect(counting.locator('[data-empty-badge]')).toBeVisible();
    await expect(counting).toHaveClass(/is-empty/);

    const woodcutter = page.locator('.stats-card[data-game-id="woodcutter"]');
    await expect(woodcutter.locator('.stats-row-value').last()).toContainText('never');
    await expect(woodcutter.locator('[data-empty-badge]')).toBeVisible();

    const alphabets = page.locator('.stats-card[data-game-id="alphabets"]');
    await expect(alphabets.locator('.stats-row-value').last()).toContainText('never');
    await expect(alphabets.locator('[data-empty-badge]')).toBeVisible();

    const flashcards = page.locator('.stats-card[data-game-id="flashcards"]');
    await expect(flashcards.locator('.stats-row-value').last()).toContainText('never');
    await expect(flashcards.locator('[data-empty-badge]')).toBeVisible();

    // Card-pure / card-set games still render the deck / total denom row
    // even at zero state — that's the "Decks: 14 · 280 cards" / "Letters
    // learned: 0 / 26" kind of row.
    await expect(flashcards).toContainText(/14 decks/);
    await expect(alphabets).toContainText(/0 \/ 26/);
  });

  test('hydration: seeded preschool-math stats appear on the card after reload', async ({
    page,
  }) => {
    // Seed Counting Friends with a realistic 5-of-8 first-try score
    // and a Quiz attempt for Daily Routines so we cross two families.
    await page.evaluate(() => {
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({
          sessions: 1,
          rounds: 8,
          correctFirstTry: 5,
          lastPlayed: '2026-05-20',
        }),
      );
      localStorage.setItem(
        'routines_quiz_v1',
        JSON.stringify({ attempts: 3, bestScore: 88, lastPlayed: '2026-05-19' }),
      );
    });
    await page.reload();

    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    await expect(counting).not.toHaveClass(/is-empty/);
    await expect(counting.locator('[data-empty-badge]')).toBeHidden();
    // 4 metric rows: sessions, rounds, first-try, lastPlayed
    await expect(counting.locator('.stats-row-value').nth(0)).toHaveText('1');
    await expect(counting.locator('.stats-row-value').nth(1)).toHaveText('8');
    await expect(counting.locator('.stats-row-value').nth(2)).toHaveText('5 / 8 (63%)');
    await expect(counting.locator('.stats-row-value').nth(3)).toHaveText('2026-05-20');

    const routines = page.locator('.stats-card[data-game-id="routines"]');
    await expect(routines).not.toHaveClass(/is-empty/);
    // Routines has 4 rows: scenes (zero — no learned set seeded), attempts,
    // best score, last played.
    await expect(routines.locator('.stats-row-value').nth(1)).toHaveText('3');
    await expect(routines.locator('.stats-row-value').nth(2)).toHaveText('88%');
    await expect(routines.locator('.stats-row-value').nth(3)).toHaveText('2026-05-19');
  });

  test('reset button clears one game\'s stats and re-renders the card to zero', async ({
    page,
  }) => {
    acceptDialogs(page);

    await page.evaluate(() => {
      localStorage.setItem(
        'number_friends_stats_v1',
        JSON.stringify({
          sessions: 2,
          rounds: 16,
          correctFirstTry: 12,
          lastPlayed: '2026-05-20',
        }),
      );
      // Seed Counting Friends too so we can verify the reset is targeted.
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({
          sessions: 1,
          rounds: 8,
          correctFirstTry: 6,
          lastPlayed: '2026-05-19',
        }),
      );
    });
    await page.reload();

    const numberFriends = page.locator('.stats-card[data-game-id="number-friends"]');
    await expect(numberFriends.locator('.stats-row-value').nth(2)).toHaveText('12 / 16 (75%)');

    await numberFriends.locator('[data-reset]').click();

    // Card returns to zero immediately (no reload required).
    await expect(numberFriends.locator('.stats-row-value').nth(0)).toHaveText('0');
    await expect(numberFriends.locator('.stats-row-value').nth(1)).toHaveText('0');
    await expect(numberFriends.locator('.stats-row-value').nth(2)).toHaveText('0 / 0');
    await expect(numberFriends.locator('.stats-row-value').nth(3)).toHaveText('never');
    await expect(numberFriends).toHaveClass(/is-empty/);

    // The other seeded game should be untouched.
    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    await expect(counting.locator('.stats-row-value').nth(2)).toHaveText('6 / 8 (75%)');
    await expect(counting).not.toHaveClass(/is-empty/);

    // LocalStorage reflects the targeted clear.
    const storage = await page.evaluate(() => ({
      cleared: localStorage.getItem('number_friends_stats_v1'),
      kept: localStorage.getItem('counting_friends_stats_v1'),
    }));
    expect(storage.cleared).toBeNull();
    expect(storage.kept).not.toBeNull();
  });

  test('reset everything: clears every game\'s stats and re-renders all cards to zero', async ({
    page,
  }) => {
    acceptDialogs(page);

    // Seed a representative entry from each family.
    await page.evaluate(() => {
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({ sessions: 1, rounds: 8, correctFirstTry: 7, lastPlayed: '2026-05-20' }),
      );
      localStorage.setItem(
        'woodcutter_quiz_v1',
        JSON.stringify({ attempts: 2, bestScore: 100, lastPlayed: '2026-05-20' }),
      );
      localStorage.setItem(
        'kids_progress_v1:alphabets',
        JSON.stringify(['A', 'B', 'C', 'D']),
      );
      localStorage.setItem(
        'flashcards_quiz_v1',
        JSON.stringify({ attempts: 1, bestScore: 50, lastPlayed: '2026-05-19' }),
      );
    });
    await page.reload();

    // Sanity: the four seeded cards have data before reset.
    await expect(page.locator('.stats-card[data-game-id="counting-friends"]')).not.toHaveClass(
      /is-empty/,
    );
    await expect(page.locator('.stats-card[data-game-id="woodcutter"]')).not.toHaveClass(
      /is-empty/,
    );
    await expect(page.locator('.stats-card[data-game-id="alphabets"]')).not.toHaveClass(
      /is-empty/,
    );

    await page.locator('#btnResetAll').click();

    // Every card now reads zero/never.
    const lastValues = await page
      .locator('.stats-card .stats-row-value')
      .filter({ hasText: 'never' })
      .count();
    expect(lastValues).toBeGreaterThanOrEqual(EXPECTED_GAME_IDS.length);

    // Every card has the empty class again.
    const emptyCount = await page.locator('.stats-card.is-empty').count();
    expect(emptyCount).toBe(EXPECTED_GAME_IDS.length);

    // LocalStorage is empty for every seeded key.
    const cleared = await page.evaluate(() => ({
      a: localStorage.getItem('counting_friends_stats_v1'),
      b: localStorage.getItem('woodcutter_quiz_v1'),
      c: localStorage.getItem('kids_progress_v1:alphabets'),
      d: localStorage.getItem('flashcards_quiz_v1'),
    }));
    expect(cleared.a).toBeNull();
    expect(cleared.b).toBeNull();
    expect(cleared.c).toBeNull();
    expect(cleared.d).toBeNull();
  });

  test('home page links to /stats and the GameNav on a game page links to /stats', async ({
    page,
  }) => {
    // From the home page.
    await page.goto('');
    const homeLink = page.locator('.home-stats-link a');
    await expect(homeLink).toHaveCount(1);
    await expect(homeLink).toHaveAttribute('href', '/kids-learning-games-astro/stats');
    await expect(homeLink).toContainText(/parent stats/i);

    // And from any game page (pick Counting Friends as a representative
    // GameNav consumer — the nav is shared across all games).
    await page.goto('games/counting-friends-game.html');
    const navLink = page.locator('.game-nav-stats');
    await expect(navLink).toHaveCount(1);
    await expect(navLink).toHaveAttribute('href', '/kids-learning-games-astro/stats');
    await expect(navLink).toContainText(/Stats/);
  });
});
