import { test, expect } from '@playwright/test';

/**
 * Number Bond Pop — preschool-math decomposition game smoke suite.
 *
 * Sister suite to numberfriends.spec.ts. Same shape, different game
 * contract: a bond frame for the WHOLE appears at the top with `have`
 * cells filled and `gap = whole - have` cells empty; three option
 * bunches appear below, exactly one holds `gap` items; the answer is
 * "tap the bunch that fills the empty spaces". We assert:
 *
 *   - SSR renders header, scene, bond card (Make N + a frame of N cells,
 *     `have` filled + `gap` empty), three option bunches with distinct
 *     sizes (one matching the gap), non-empty caption.
 *   - Next button is gated on an answer.
 *   - Tapping any bunch eventually enables Next + bumps `rounds`.
 *   - Tapping the matching bunch lights `nbp-opt--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping a non-matching bunch shakes it then reveals
 *     `nbp-opt--reveal` on the correct bunch after the guided count
 *     (no `correctFirstTry` bump).
 *   - A returning Stage-2 player sees the stage pill + a longer session.
 *   - Home page links to the new game.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so
 * round progression is deterministic in headless Chromium.
 */

const STATS_KEY = 'number_bond_stats_v1';

test.describe('number bond pop (preschool decomposition)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/number-bond-pop-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, bond frame with filled + empty cells, three bunches with distinct sizes, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Number Bond Pop/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="numberbond"]')).toHaveCount(1);

    await expect(page.locator('.nbp-title')).toContainText(/Number Bond Pop/);
    await expect(page.locator('#nbpProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#nbpStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden']).toContain(scene);
    await expect(page.locator('#nbpCaption')).not.toBeEmpty();

    // Bond card: Make N + a frame of N cells, `have` filled + `gap` empty.
    const bond = page.locator('#nbpBond');
    await expect(bond).toBeVisible();
    const whole = Number(await bond.getAttribute('data-whole'));
    const have = Number(await bond.getAttribute('data-have'));
    expect(whole).toBe(5); // Stage 1 is always make-5
    expect(have).toBeGreaterThanOrEqual(1);
    expect(have).toBeLessThanOrEqual(whole - 1);
    const gap = whole - have;

    await expect(page.locator('#nbpWhole')).toContainText(String(whole));
    await expect(page.locator('#nbpFrame .nbp-cell')).toHaveCount(whole);
    await expect(page.locator('#nbpFrame .nbp-cell--filled')).toHaveCount(have);
    await expect(page.locator('#nbpFrame .nbp-cell--empty')).toHaveCount(gap);

    // Three option bunches, distinct sizes, exactly one equals the gap.
    await expect(page.locator('.nbp-opt')).toHaveCount(3);
    const sizes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const n = await page.locator(`#nbpOpt${i} .nbp-item`).count();
      expect(n).toBeGreaterThanOrEqual(1);
      sizes.push(n);
    }
    expect(new Set(sizes).size).toBe(3);
    expect(sizes.filter((n) => n === gap).length).toBe(1);

    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#nbpOpt${i}`)).toHaveCount(1);
    }
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#nbpNextBtn')).toBeDisabled();
  });

  test('tapping any bunch eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#nbpOpt0').click();

    // The wrong path counts the empty cells (up to 4 at Stage 1) plus
    // narration phrases between, then fills. At silent-mode pacing
    // (~600ms/phrase + 160ms inter-cell) that's well under 25s.
    await expect(page.locator('#nbpNextBtn')).toBeEnabled({ timeout: 25_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the matching bunch lights the correct state and counts toward first-try stats', async ({ page }) => {
    const whole = Number(await page.locator('#nbpBond').getAttribute('data-whole'));
    const have = Number(await page.locator('#nbpBond').getAttribute('data-have'));
    const gap = whole - have;

    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const n = await page.locator(`#nbpOpt${i} .nbp-item`).count();
      if (n === gap) {
        correctIdx = i;
        break;
      }
    }
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#nbpOpt${correctIdx}`).click();

    await expect(page.locator(`#nbpOpt${correctIdx}`)).toHaveClass(/nbp-opt--correct/);
    await expect(page.locator('#nbpNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping a non-matching bunch reveals the correct bunch and does not bump first-try', async ({ page }) => {
    const whole = Number(await page.locator('#nbpBond').getAttribute('data-whole'));
    const have = Number(await page.locator('#nbpBond').getAttribute('data-have'));
    const gap = whole - have;

    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const n = await page.locator(`#nbpOpt${i} .nbp-item`).count();
      if (n === gap) {
        correctIdx = i;
        break;
      }
    }
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#nbpOpt${wrongIdx}`).click();

    // The tapped wrong bunch gets a 250ms shake immediately on tap,
    // before the rerun narration. Assert it BEFORE the long reveal chain
    // (the class is removed on the next round render).
    await expect(page.locator(`#nbpOpt${wrongIdx}`)).toHaveClass(/nbp-opt--wrong/, {
      timeout: 1_000,
    });

    // The correct bunch is revealed only after the guided count of the
    // empty cells + the rerun-done phrase complete.
    await expect(page.locator(`#nbpOpt${correctIdx}`)).toHaveClass(/nbp-opt--reveal/, {
      timeout: 25_000,
    });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { correctFirstTry: number })
        : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  test('returning player at Stage 2 sees the stage pill and a longer (10-round) session', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'number_bond_stats_v1',
        JSON.stringify({
          sessions: 1, rounds: 8, correctFirstTry: 8,
          lastPlayed: '2026-06-06', stage: 2, bestStage: 2,
        }),
      );
    });
    await page.reload();

    await expect(page.locator('#nbpStageText')).toHaveText('Stage 2');
    await expect(page.locator('#nbpProgressText')).toContainText(/^\s*1\s*\/\s*10\s*$/);
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="number-bond-pop-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Number Bond Pop');
  });
});
