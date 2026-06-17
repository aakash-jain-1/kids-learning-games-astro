import { test, expect } from '@playwright/test';

/**
 * Week Friends — preschool days-of-the-week sequencing game smoke suite.
 *
 * Second preschool-COGNITIVE game (sister to Sorting Friends), built on
 * the proven Pattern Sequences interaction grammar: a run of consecutive
 * day-cards is shown ending in a "?" slot, three day-option buttons sit
 * below, and the answer is "tap the day that comes next". We assert:
 *
 *   - SSR renders header, scene, a sequence row of day-cards + a "?"
 *     slot, three option buttons each with a recognised day-index,
 *     exactly one of which equals the stage's `data-target`, and a
 *     non-empty caption.
 *   - Next button is gated on an answer.
 *   - Tapping any option eventually enables Next + bumps `rounds`.
 *   - Tapping the option whose day === target lights `week-opt--correct`,
 *     fills the slot (`week-slot--reveal`), and counts toward
 *     `correctFirstTry`.
 *   - Tapping a non-target option triggers a 250ms `week-opt--wrong`
 *     shake AND eventually reveals `week-opt--reveal` on the correct
 *     option after the guided "sing the days" walk (no `correctFirstTry`
 *     bump).
 *   - Home page links to the new game.
 *
 * The correct day is discoverable directly from the DOM: the page stamps
 * the target day-index on `#weekStage` as `data-target`, and each option
 * carries its day-index as `data-day` — so the test reads them rather
 * than reconstructing any sequence logic.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it forces
 * narrate()'s silent-mode `setTimeout(onEnd, 500)` fallback, which makes
 * round progression deterministic in headless Chromium (where
 * speechSynthesis often never fires onend).
 */

const STATS_KEY = 'week_friends_stats_v1';

const readTargetAndOptions = async (page: import('@playwright/test').Page) => {
  const target = Number(await page.locator('#weekStage').getAttribute('data-target'));
  const optDays = await page.evaluate(() =>
    [0, 1, 2].map((i) => Number(document.getElementById(`weekOpt${i}`)?.dataset.day)),
  );
  return { target, optDays, correctIdx: optDays.indexOf(target) };
};

test.describe('week friends (preschool days-of-the-week sequencing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/week-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a day-card run + "?" slot, three option buttons, exactly one matching the target, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Week Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="weekfriends"]')).toHaveCount(1);

    await expect(page.locator('.week-title')).toContainText(/Week Friends/);
    await expect(page.locator('#weekProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#weekStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#weekCaption')).not.toBeEmpty();

    // Sequence row: at least 2 day-cards + exactly 1 "?" slot.
    const cardCount = await page.locator('#weekSequence .week-card').count();
    expect(cardCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('#weekSlot')).toHaveCount(1);

    // Each shown card carries a valid Sunday-first day-index 0..6.
    const cardDays = await page
      .locator('#weekSequence .week-card')
      .evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.day)));
    for (const d of cardDays) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(6);
    }

    // Three option buttons, each a valid day-index, all distinct, with
    // exactly one equal to the stage's target.
    await expect(page.locator('.week-opt')).toHaveCount(3);
    const { target, optDays } = await readTargetAndOptions(page);
    expect(target).toBeGreaterThanOrEqual(0);
    expect(target).toBeLessThanOrEqual(6);
    for (const d of optDays) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(6);
    }
    expect(new Set(optDays).size).toBe(3);
    expect(optDays.filter((d) => d === target).length).toBe(1);

    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#weekOpt${i}`)).toHaveCount(1);
    }
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#weekNextBtn')).toBeDisabled();
  });

  test('tapping any option eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#weekOpt0').click();

    // Wrong-answer path narrates a rerun phrase + a 2..4-item day walk +
    // a reveal phrase. At silent-mode pacing (~500ms per narrate +
    // 160ms inter-item pause) worst case ≈ 4s; 20s buffers headless
    // variance. Either tap outcome works — we only assert SOME tap
    // eventually enables Next.
    await expect(page.locator('#weekNextBtn')).toBeEnabled({ timeout: 20_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the day that comes next lights the correct state, fills the slot, and counts toward first-try stats', async ({ page }) => {
    const { correctIdx } = await readTargetAndOptions(page);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#weekOpt${correctIdx}`).click();

    await expect(page.locator(`#weekOpt${correctIdx}`)).toHaveClass(/week-opt--correct/);
    // The slot fills with the target day so the week reads complete.
    await expect(page.locator('#weekSlot')).toHaveClass(/week-slot--reveal/);
    await expect(page.locator('#weekNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping a wrong day triggers shake + eventually reveals the correct day without bumping first-try', async ({ page }) => {
    const { correctIdx } = await readTargetAndOptions(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#weekOpt${wrongIdx}`).click();

    // The tapped wrong option gets a 250ms shake immediately on tap,
    // before the rerun narration starts. Assert BEFORE the long reveal
    // chain — the class stays put until the next renderRound.
    await expect(page.locator(`#weekOpt${wrongIdx}`)).toHaveClass(/week-opt--wrong/, {
      timeout: 1_000,
    });

    // The correct option lands `week-opt--reveal` only after the rerun
    // narration + day walk + reveal narration completes. ~4s worst case
    // at silent-mode pacing; 20s buffers headless variance.
    await expect(page.locator(`#weekOpt${correctIdx}`)).toHaveClass(/week-opt--reveal/, {
      timeout: 20_000,
    });
    await expect(page.locator('#weekSlot')).toHaveClass(/week-slot--reveal/);

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { correctFirstTry: number }) : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="week-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Week Friends');
  });
});
