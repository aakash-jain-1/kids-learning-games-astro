import { test, expect } from '@playwright/test';

/**
 * Counting Friends — preschool-math addition game smoke suite.
 *
 * The game shape doesn't fit any of the existing layout suites (no deck
 * filter like grid, no card flip like card-machine, no inline 4-option
 * quiz like story), so it gets its own spec. We assert the SSR'd first
 * round renders meaningfully (the page works without JS), the page
 * scripts boot, the numeral options are tappable, and stats persist
 * the same way every other game persists Quiz/Stats state.
 *
 * Service workers are blocked globally in `playwright.config.ts`, which
 * also means `speechSynthesis` does nothing in tests — that's fine; the
 * game's caption fallback covers the silent-mode path and we exercise
 * it here.
 */

const STATS_KEY = 'counting_friends_stats_v1';

test.describe('counting friends (preschool addition)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/counting-friends-game.html');
    // Wipe any prior progress, then mute sound so `narrate()` takes
    // its silent-mode fallback path (`setTimeout(onEnd, 600)`) — that
    // makes the round-progression chain deterministic and fast,
    // independent of whatever `speechSynthesis.speak()` does in
    // headless Chromium (some CI runners have no system TTS engine
    // and never fire `onend`, which would stall the rerun chain
    // beyond the test timeout). The page also has a watchdog for
    // real browsers; we don't rely on it here.
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    // Reload so the page picks up the muted settings on first script run.
    await page.reload();
  });

  test('SSR renders header, scene, three numeral options, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Counting Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="addition"]')).toHaveCount(1);

    // Header + progress.
    await expect(page.locator('.cf-title')).toContainText(/Counting Friends/);
    await expect(page.locator('#cfProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    // Stage with a scene theme + a non-empty caption.
    const stage = page.locator('#cfStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden']).toContain(scene);
    await expect(page.locator('#cfCaption')).not.toBeEmpty();

    // Two non-empty groups of countable items.
    await expect(page.locator('#cfGroupA .cf-item')).not.toHaveCount(0);
    await expect(page.locator('#cfGroupB .cf-item')).not.toHaveCount(0);

    // Three numeral options, each with a digit + 5-dot frame.
    const opts = page.locator('#cfOptions .cf-opt');
    await expect(opts).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(opts.nth(i).locator('.cf-opt-digit')).not.toBeEmpty();
      await expect(opts.nth(i).locator('.cf-opt-dot')).toHaveCount(5);
    }
  });

  test('SSR sum matches the visible group counts (no off-by-one bug)', async ({ page }) => {
    const a = await page.locator('#cfGroupA .cf-item').count();
    const b = await page.locator('#cfGroupB .cf-item').count();
    const expected = a + b;

    // Exactly one of the three options must equal `a + b`.
    const optDigits = await page.locator('#cfOptions .cf-opt-digit').allInnerTexts();
    const nums = optDigits.map((s) => Number(s.trim()));
    expect(nums.filter((n) => n === expected).length).toBe(1);
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#cfNextBtn')).toBeDisabled();
  });

  test('clicking an option enables Next and persists round count to stats', async ({ page }) => {
    // Tap any option — correct or wrong both end the round in the
    // errorless model, both bump `rounds`. We don't try to identify
    // the right answer here (the tap-anywhere flow is the contract);
    // the next test asserts the right-answer path specifically.
    await page.locator('#cfOptions .cf-opt').first().click();

    // The round eventually becomes "answered" and Next becomes enabled.
    // The wrong-answer path waits for the guided count + narration —
    // since speechSynthesis is a no-op in tests, the no-TTS fallback
    // path fires onEnd via setTimeout and the chain still progresses.
    // Generous timeout (15s) covers up to 5 items × 600ms guided count
    // plus phase pauses.
    await expect(page.locator('#cfNextBtn')).toBeEnabled({ timeout: 15_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('correct answer triggers the green correct state and counts toward first-try stats', async ({ page }) => {
    // Read the SSR'd correct sum from the visible groups.
    const a = await page.locator('#cfGroupA .cf-item').count();
    const b = await page.locator('#cfGroupB .cf-item').count();
    const expected = a + b;

    await page.locator(`#cfOptions .cf-opt[data-n="${expected}"]`).click();

    await expect(page.locator(`#cfOptions .cf-opt[data-n="${expected}"]`)).toHaveClass(
      /cf-opt--correct/,
    );
    await expect(page.locator('#cfNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number }) : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('wrong answer triggers the rerun reveal — correct option gets the cf-opt--reveal class', async ({ page }) => {
    const a = await page.locator('#cfGroupA .cf-item').count();
    const b = await page.locator('#cfGroupB .cf-item').count();
    const expected = a + b;

    // Pick any option other than the correct one. There are always
    // exactly 3 options — `expected`, `expected-1`, `expected+1` — so
    // either of the other two works.
    const wrong = expected === 1 ? expected + 1 : expected - 1;
    await page.locator(`#cfOptions .cf-opt[data-n="${wrong}"]`).click();

    // The reveal class lands on the *correct* option after the guided
    // count completes.
    await expect(page.locator(`#cfOptions .cf-opt[data-n="${expected}"]`)).toHaveClass(
      /cf-opt--reveal/,
      { timeout: 15_000 },
    );

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { correctFirstTry: number }) : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    // Filter by href, not by hasText — the More Friends card (added
    // 2026-05-18) mentions "Counting Friends" in its description ("…
    // Companion to Counting Friends …"), so a hasText-only filter
    // would now match 2 cards. The href substring is unique by
    // construction.
    const card = page.locator('a.home-card[href*="counting-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Counting Friends');
  });
});
