import { test, expect } from '@playwright/test';

/**
 * Sorting Friends — preschool-COGNITIVE sorting smoke suite
 * (added 2026-06-06).
 *
 * First cognitive-family game. New mechanic vs the single-answer
 * literacy/math tiles: TAP-ALL (multi-select). A category prompt sits
 * at the top ("Find all that live in the sea") and a tray of ~4–6
 * picture tiles appears below — some belong to the target category
 * (`data-belongs="true"`), some are sibling-bucket distractors
 * (`data-belongs="false"`). The child taps EVERY belonging tile. We
 * assert:
 *
 *   - SSR renders header, scene, a category prompt card (emoji + label),
 *     a tray with at least one belonging tile + one distractor, and a
 *     non-empty caption.
 *   - Next button is gated until the round completes.
 *   - Tapping every belonging tile collects them all, completes the
 *     round, enables Next, and bumps `rounds`.
 *   - A clean round (zero wrong taps) bumps `correctFirstTry`.
 *   - A wrong tap (a distractor) triggers the 250ms shake, does NOT
 *     complete the round, and a round finished after a wrong tap does
 *     NOT bump `correctFirstTry`.
 *   - The home page links to the new game.
 *   - The /stats page picks up Sorting Friends in the
 *     preschool-cognitive family section.
 *
 * Same `sound: false` localStorage shim as the sibling suites — with
 * narration silenced the tap handlers run fully synchronously (no
 * onEnd chaining), so round completion is deterministic in headless
 * Chromium.
 */

const STATS_KEY = 'sorting_friends_stats_v1';

/** Collect the `data-i` indices of belonging / non-belonging tiles. */
const partitionTiles = async (page: import('@playwright/test').Page) => {
  const tiles = page.locator('#sortTiles .sort-tile');
  const count = await tiles.count();
  const belong: number[] = [];
  const distract: number[] = [];
  for (let i = 0; i < count; i++) {
    const el = tiles.nth(i);
    const belongs = await el.getAttribute('data-belongs');
    const idx = Number(await el.getAttribute('data-i'));
    if (belongs === 'true') belong.push(idx);
    else distract.push(idx);
  }
  return { count, belong, distract };
};

test.describe('sorting friends (preschool categorization)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/sorting-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a category prompt card, a mixed tray, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Sorting Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="sortingfriends"]')).toHaveCount(1);

    await expect(page.locator('.sort-title')).toContainText(/Sorting Friends/);
    await expect(page.locator('#sortProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#sortStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#sortCaption')).not.toBeEmpty();

    // Category prompt card — a habitat/kind/size emoji + a short label.
    await expect(page.locator('#sortPrompt')).toBeVisible();
    await expect(page.locator('#sortPromptEmoji')).not.toBeEmpty();
    await expect(page.locator('#sortPromptLabel')).not.toBeEmpty();

    // The tray holds at least one belonging tile and at least one
    // distractor, so the sort is meaningful. data-target-count equals
    // the number of belonging tiles.
    const { count, belong, distract } = await partitionTiles(page);
    expect(count).toBeGreaterThanOrEqual(4);
    expect(belong.length).toBeGreaterThanOrEqual(1);
    expect(distract.length).toBeGreaterThanOrEqual(1);

    const targetCount = Number(await stage.getAttribute('data-target-count'));
    expect(targetCount).toBe(belong.length);

    // Each tile is a real button carrying an emoji + a label.
    for (let i = 0; i < count; i++) {
      await expect(page.locator(`button#sortTile${i}`)).toHaveCount(1);
      await expect(page.locator(`#sortTile${i} .sort-tile-emoji`)).not.toBeEmpty();
      await expect(page.locator(`#sortTile${i} .sort-tile-label`)).not.toBeEmpty();
    }
  });

  test('next button is disabled until the round is completed', async ({ page }) => {
    await expect(page.locator('#sortNextBtn')).toBeDisabled();
  });

  test('tapping every belonging tile completes the round and persists round count', async ({ page }) => {
    const { belong } = await partitionTiles(page);
    for (const idx of belong) {
      await page.locator(`#sortTile${idx}`).click();
    }

    // Round auto-completes once all targets are found — Next enables.
    await expect(page.locator('#sortNextBtn')).toBeEnabled({ timeout: 4_000 });

    // Every belonging tile shows the collected (found) state.
    for (const idx of belong) {
      await expect(page.locator(`#sortTile${idx}`)).toHaveClass(/sort-tile--found/);
    }

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('a clean round (no wrong taps) counts toward first-try stats', async ({ page }) => {
    const { belong } = await partitionTiles(page);
    for (const idx of belong) {
      await page.locator(`#sortTile${idx}`).click();
    }
    await expect(page.locator('#sortNextBtn')).toBeEnabled({ timeout: 4_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('a wrong tap shakes, does not complete the round, and does not count as a clean sort', async ({ page }) => {
    const { belong, distract } = await partitionTiles(page);
    const wrongIdx = distract[0]!;

    await page.locator(`#sortTile${wrongIdx}`).click();

    // Age-safe wrong-tap kinesthetic feedback: the tapped distractor
    // gets a 250ms `sort-tile--wrong` shake immediately on tap.
    await expect(page.locator(`#sortTile${wrongIdx}`)).toHaveClass(
      /sort-tile--wrong/,
      { timeout: 1_000 },
    );

    // The wrong tap is errorless — it neither completes the round nor
    // collects the tile. Next stays disabled, the distractor stays
    // un-found and still tappable.
    await expect(page.locator('#sortNextBtn')).toBeDisabled();
    await expect(page.locator(`#sortTile${wrongIdx}`)).not.toHaveClass(/sort-tile--found/);

    // Finish the round cleanly from here. Because there was a wrong tap,
    // it must NOT bump correctFirstTry, but it DOES count as a round.
    for (const idx of belong) {
      await page.locator(`#sortTile${idx}`).click();
    }
    await expect(page.locator('#sortNextBtn')).toBeEnabled({ timeout: 4_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(0);
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="sorting-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Sorting Friends');
  });

  test('stats page lists Sorting Friends in the preschool-cognitive family section', async ({ page }) => {
    await page.goto('stats.html');

    const cognitiveSection = page.locator(
      '.stats-section[data-family="preschool-cognitive"]',
    );
    await expect(cognitiveSection).toHaveCount(1);

    const card = cognitiveSection.locator(
      '.stats-card[data-game-id="sorting-friends"]',
    );
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Sorting Friends');

    // Card has the expected 4 metric rows (sessions / rounds /
    // first-try / last played).
    await expect(card.locator('.stats-row')).toHaveCount(4);

    await expect(card).toHaveAttribute('data-family', 'preschool-cognitive');
  });
});
