import { test, expect } from '@playwright/test';

/**
 * More Friends — preschool-math magnitude-comparison game smoke suite.
 *
 * Sister suite to addition.spec.ts (Counting Friends). Same shape,
 * different game contract: two groups (left + right) with a `bigger`
 * side, the answer is "tap the side with more friends" rather than
 * "tap the numeral that equals the sum". We assert:
 *
 *   - SSR renders header, scene, two non-empty groups, "vs" connector,
 *     non-empty caption.
 *   - Group sizes are unequal (no degenerate equal-groups round).
 *   - Next button is gated on an answer.
 *   - Tapping any group eventually enables Next + bumps `rounds`.
 *   - Tapping the bigger group lights `mf-group--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping the smaller group reveals `mf-group--reveal` on the
 *     correct side after the guided count completes (no `correctFirstTry` bump).
 *   - Home page links to the new game.
 *
 * Same `sound: false` localStorage shim as the Counting Friends suite —
 * it forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback,
 * which makes round progression deterministic in headless Chromium
 * (where speechSynthesis often never fires onend).
 */

const STATS_KEY = 'more_friends_stats_v1';

test.describe('more friends (preschool magnitude comparison)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/magnitude-comparison-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, two unequal groups, vs connector, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/More Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="comparison"]')).toHaveCount(1);

    await expect(page.locator('.mf-title')).toContainText(/More Friends/);
    await expect(page.locator('#mfProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#mfStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden']).toContain(scene);
    await expect(page.locator('#mfCaption')).not.toBeEmpty();

    // The "vs" connector must be present so the comparison framing is
    // visually obvious even pre-narration.
    await expect(page.locator('.mf-vs')).toBeVisible();

    // Two groups with sizes ∈ {1..4} and left !== right.
    const left = await page.locator('#mfGroupLeft .mf-item').count();
    const right = await page.locator('#mfGroupRight .mf-item').count();
    expect(left).toBeGreaterThanOrEqual(1);
    expect(left).toBeLessThanOrEqual(4);
    expect(right).toBeGreaterThanOrEqual(1);
    expect(right).toBeLessThanOrEqual(4);
    expect(left).not.toBe(right);

    // Both groups are buttons (the whole panel is the answer button).
    await expect(page.locator('button#mfGroupLeft')).toHaveCount(1);
    await expect(page.locator('button#mfGroupRight')).toHaveCount(1);
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#mfNextBtn')).toBeDisabled();
  });

  test('tapping any group eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#mfGroupLeft').click();

    // The wrong-answer path waits for the guided count + narration
    // (silent-mode fallback fires onEnd via setTimeout). 8 items max
    // (4 left + 4 right) × ~600ms + phase pauses comfortably fits in 20s.
    await expect(page.locator('#mfNextBtn')).toBeEnabled({ timeout: 20_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the bigger group lights the correct state and counts toward first-try stats', async ({ page }) => {
    const left = await page.locator('#mfGroupLeft .mf-item').count();
    const right = await page.locator('#mfGroupRight .mf-item').count();
    const biggerSel = left > right ? '#mfGroupLeft' : '#mfGroupRight';

    await page.locator(biggerSel).click();

    await expect(page.locator(biggerSel)).toHaveClass(/mf-group--correct/);
    await expect(page.locator('#mfNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping the smaller group reveals the correct side and does not bump first-try', async ({ page }) => {
    const left = await page.locator('#mfGroupLeft .mf-item').count();
    const right = await page.locator('#mfGroupRight .mf-item').count();
    const biggerSel = left > right ? '#mfGroupLeft' : '#mfGroupRight';
    const smallerSel = left > right ? '#mfGroupRight' : '#mfGroupLeft';

    await page.locator(smallerSel).click();

    await expect(page.locator(biggerSel)).toHaveClass(/mf-group--reveal/, {
      timeout: 20_000,
    });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { correctFirstTry: number })
        : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card', { hasText: 'More Friends' });
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('href', /magnitude-comparison-game/);
  });
});
