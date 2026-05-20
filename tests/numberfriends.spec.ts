import { test, expect } from '@playwright/test';

/**
 * Number Friends — preschool-math numeral-recognition game smoke suite.
 *
 * Sister suite to addition.spec.ts (Counting Friends) and
 * comparison.spec.ts (More Friends). Same shape, different game
 * contract: a numeral target appears at the top, three group panels
 * appear below, exactly one panel has `target` items, the answer is
 * "tap the group that matches the number". We assert:
 *
 *   - SSR renders header, scene, target card with a digit + 5-frame,
 *     three group panels with distinct sizes (one matching target +
 *     two decoys), non-empty caption.
 *   - Next button is gated on an answer.
 *   - Tapping any group eventually enables Next + bumps `rounds`.
 *   - Tapping the matching group lights `nf-group--correct` and
 *     counts toward `correctFirstTry`.
 *   - Tapping a non-matching group reveals `nf-group--reveal` on the
 *     correct panel after the guided count completes (no
 *     `correctFirstTry` bump). The Number Friends rerun is longer
 *     than More Friends's (counts the wrong group, then the correct
 *     group, with two narration phrases between) so the timeout is
 *     more generous.
 *   - Home page links to the new game.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback,
 * which makes round progression deterministic in headless Chromium
 * (where speechSynthesis often never fires onend).
 *
 * Home-card test uses an `href`-based selector from the start (rather
 * than `hasText`) — same fix that addition.spec.ts and
 * comparison.spec.ts retroactively adopted on 2026-05-18 after the
 * "Counting Friends" / "More Friends" naming overlap caused
 * `hasText: 'Counting Friends'` to match two cards and fail the
 * `toHaveCount(1)` assertion. Number Friends's description references
 * Counting Friends + More Friends + the cardinality triad explicitly,
 * so a hasText filter would overmatch even more aggressively here.
 */

const STATS_KEY = 'number_friends_stats_v1';

test.describe('number friends (preschool numeral recognition)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/number-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, target card with a digit, three groups with distinct sizes, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Number Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="numberfriends"]')).toHaveCount(1);

    await expect(page.locator('.nf-title')).toContainText(/Number Friends/);
    await expect(page.locator('#nfProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#nfStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden']).toContain(scene);
    await expect(page.locator('#nfCaption')).not.toBeEmpty();

    // Target card has a digit and a 5-frame with the right number of
    // filled dots. The digit is what the child has to match.
    const target = page.locator('#nfTarget');
    await expect(target).toBeVisible();
    const targetN = Number(await target.getAttribute('data-target'));
    expect(targetN).toBeGreaterThanOrEqual(2);
    expect(targetN).toBeLessThanOrEqual(5);
    await expect(page.locator('#nfTargetDigit')).toContainText(String(targetN));
    // Five total dots; `targetN` of them filled.
    await expect(page.locator('#nfTargetFrame .nf-target-dot')).toHaveCount(5);
    await expect(
      page.locator('#nfTargetFrame .nf-target-dot--filled'),
    ).toHaveCount(targetN);

    // Three group panels, each with sizes ∈ {1..6}. Sizes must be
    // distinct (otherwise the match wouldn't be unique). Exactly one
    // size must equal the target.
    await expect(page.locator('.nf-group')).toHaveCount(3);
    const sizes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const n = await page.locator(`#nfGroup${i} .nf-item`).count();
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      sizes.push(n);
    }
    expect(new Set(sizes).size).toBe(3);
    expect(sizes.filter((n) => n === targetN).length).toBe(1);

    // All three groups are buttons (the whole panel is the answer button).
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#nfGroup${i}`)).toHaveCount(1);
    }
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#nfNextBtn')).toBeDisabled();
  });

  test('tapping any group eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#nfGroup0').click();

    // The wrong-answer path here is longer than More Friends's (it
    // counts the tapped wrong group, narrates the wrong-done phrase,
    // pauses, counts the correct group, narrates the right-done
    // phrase, then reveals). At silent-mode pacing (600ms per
    // narration + 180ms inter-item pause) and up to 6 items per
    // group, that's ~6×600 + 600 + 350 + 6×600 + 600 ≈ 9s worst
    // case. 25s timeout buffers headless variance.
    await expect(page.locator('#nfNextBtn')).toBeEnabled({ timeout: 25_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the matching group lights the correct state and counts toward first-try stats', async ({ page }) => {
    const targetN = Number(await page.locator('#nfTarget').getAttribute('data-target'));

    // Find which group has `targetN` items.
    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const n = await page.locator(`#nfGroup${i} .nf-item`).count();
      if (n === targetN) {
        correctIdx = i;
        break;
      }
    }
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#nfGroup${correctIdx}`).click();

    await expect(page.locator(`#nfGroup${correctIdx}`)).toHaveClass(
      /nf-group--correct/,
    );
    await expect(page.locator('#nfNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping a non-matching group reveals the correct panel and does not bump first-try', async ({ page }) => {
    const targetN = Number(await page.locator('#nfTarget').getAttribute('data-target'));

    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const n = await page.locator(`#nfGroup${i} .nf-item`).count();
      if (n === targetN) {
        correctIdx = i;
        break;
      }
    }
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#nfGroup${wrongIdx}`).click();

    // T-extra (2026-05-20, triad extension): the tapped wrong panel
    // gets a 250ms `nf-group--wrong` shake immediately on tap, before
    // the two-phase rerun narration starts. Assert this BEFORE
    // waiting for the long reveal chain — the class is removed on
    // the next round render (`renderRound` calls `classList.remove`).
    await expect(page.locator(`#nfGroup${wrongIdx}`)).toHaveClass(
      /nf-group--wrong/,
      { timeout: 1_000 },
    );

    // Same long timeout rationale as the "any group" test — the
    // wrong-tap rerun chain has two count phases plus phrase
    // narrations between. `nf-group--reveal` lands on the *correct*
    // panel only after both phases complete.
    await expect(page.locator(`#nfGroup${correctIdx}`)).toHaveClass(
      /nf-group--reveal/,
      { timeout: 25_000 },
    );

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
    // href-based selector from day one — the Number Friends home
    // card description references both "Counting Friends" and
    // "More Friends" (and the cardinality triad), so a hasText
    // filter would overmatch heavily. Same approach addition.spec.ts
    // and comparison.spec.ts adopted retroactively on 2026-05-18.
    const card = page.locator('a.home-card[href*="number-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Number Friends');
  });
});
