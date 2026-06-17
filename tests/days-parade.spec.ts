import { test, expect } from '@playwright/test';

/**
 * Days Parade — the foundational "meet & learn every day" game (prequel
 * to Week Friends). An explore/learn game, not a forced-choice rounds
 * game: a Sunday→Saturday week train the child taps to meet each day
 * (collect-them-all), a "Sing the days" walk-through, and a live "Today
 * is…" badge. We assert:
 *
 *   - SSR renders header, the 7-day week train in Sunday-first order,
 *     a 0/7 progress pill, an empty detail panel, a "Sing the days"
 *     button, and a non-empty caption.
 *   - Tapping a day card marks it met (progress 1/7, met class, detail
 *     fills) and persists the learned set.
 *   - Exactly one card gets the "Today" badge after hydration.
 *   - "Sing the days" walks all 7, reaching 7/7, opening the done
 *     overlay, and bumping the sing-along count.
 *   - Home page links to the game.
 *   - The /stats dashboard lists Days Parade in the preschool-cognitive
 *     section.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 350)` fallback so
 * the sing-the-days chain completes deterministically in headless
 * Chromium.
 */

const LEARNED_KEY = 'kids_progress_v1:days-parade';
const STATS_KEY = 'days_parade_stats_v1';

test.describe('days parade (preschool learn-the-days explore game)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/days-parade-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, a 7-day Sunday-first train, a 0/7 pill, an empty detail, the Sing button, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Days Parade/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="daysparade"]')).toHaveCount(1);

    await expect(page.locator('.dp-title')).toContainText(/Days Parade/);
    await expect(page.locator('#dpProgressText')).toContainText(/^\s*0\s*\/\s*7\s*$/);

    // Week train: 7 cards in Sunday-first order.
    const cards = page.locator('#dpTrain .dp-card');
    await expect(cards).toHaveCount(7);
    const names = await cards.evaluateAll((els) =>
      els.map((e) => e.querySelector('.dp-card-name')?.textContent?.trim()),
    );
    expect(names).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const dayIdxs = await cards.evaluateAll((els) =>
      els.map((e) => Number((e as HTMLElement).dataset.day)),
    );
    expect(dayIdxs).toEqual([0, 1, 2, 3, 4, 5, 6]);

    await expect(page.locator('#dpSingBtn')).toBeVisible();
    await expect(page.locator('#dpDetail')).toHaveClass(/dp-detail--empty/);
    await expect(page.locator('#dpCaption')).not.toBeEmpty();
  });

  test('exactly one card is flagged as today after hydration', async ({ page }) => {
    await expect(page.locator('.dp-card--today')).toHaveCount(1);
  });

  test('tapping a day meets it: progress bumps, the card shows met, the detail fills, and it persists', async ({ page }) => {
    await page.locator('#dpCard0').click();

    await expect(page.locator('#dpCard0')).toHaveClass(/dp-card--met/);
    await expect(page.locator('#dpProgressText')).toContainText(/^\s*1\s*\/\s*7\s*$/);
    await expect(page.locator('#dpDetail')).not.toHaveClass(/dp-detail--empty/);
    await expect(page.locator('#dpDetailName')).toContainText('Sunday');

    const learned = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as string[]) : [];
    }, LEARNED_KEY);
    expect(learned).toContain('0');
  });

  test('prev/next navigation walks the week and meets days in order', async ({ page }) => {
    await page.locator('#dpCard0').click();
    await expect(page.locator('#dpDetailName')).toContainText('Sunday');

    await page.locator('#dpNextBtn').click();
    await expect(page.locator('#dpDetailName')).toContainText('Monday');
    await expect(page.locator('#dpCard1')).toHaveClass(/dp-card--met/);
    await expect(page.locator('#dpProgressText')).toContainText(/^\s*2\s*\/\s*7\s*$/);
  });

  test('"Sing the days" walks all seven, reaches 7/7, opens the done overlay, and bumps the sing count', async ({ page }) => {
    await page.locator('#dpSingBtn').click();

    // 7 days × (~350ms silent narrate + 140ms gap) ≈ 3.5s; 20s buffers
    // headless variance.
    await expect(page.locator('#dpProgressText')).toContainText(/^\s*7\s*\/\s*7\s*$/, {
      timeout: 20_000,
    });
    await expect(page.locator('#dpDone')).toHaveClass(/dp-done--show/, { timeout: 20_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { sings: number }) : { sings: 0 };
    }, STATS_KEY);
    expect(stats.sings).toBeGreaterThanOrEqual(1);

    const learned = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as string[]) : [];
    }, LEARNED_KEY);
    expect(learned.length).toBe(7);
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="days-parade-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Days Parade');
  });

  test('stats page lists Days Parade in the preschool-cognitive family section', async ({ page }) => {
    await page.goto('stats.html');
    const card = page.locator('.stats-card[data-game-id="days-parade"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Days Parade');
  });
});
