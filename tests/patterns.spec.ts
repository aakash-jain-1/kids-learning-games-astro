import { test, expect } from '@playwright/test';

/**
 * Pattern Sequences — preschool pattern-recognition game smoke suite.
 *
 * Sister suite to addition.spec.ts (Counting Friends), comparison.spec.ts
 * (More Friends), and numberfriends.spec.ts (Number Friends). Same shape
 * as numberfriends.spec.ts (forced-choice 3-option game), different
 * contract: five colored circles plus a "?" slot, three colored option
 * buttons, the answer is "tap the option whose color continues the
 * pattern". We assert:
 *
 *   - SSR renders header, scene, sequence row with 5 colored circles +
 *     a "?" slot, three option buttons with distinct colors, non-empty
 *     caption.
 *   - Next button is gated on an answer.
 *   - Tapping any option eventually enables Next + bumps `rounds`.
 *   - Tapping the matching option lights `ps-opt--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping a non-matching option triggers a 250 ms `ps-opt--wrong`
 *     shake AND eventually reveals `ps-opt--reveal` on the correct
 *     panel after the guided sequence walk completes (no
 *     `correctFirstTry` bump).
 *   - Home page links to the new game.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 500)` fallback,
 * which makes round progression deterministic in headless Chromium
 * (where speechSynthesis often never fires onend).
 *
 * Home-card test uses an `href`-based selector — the description
 * references "AB / AAB / ABB / ABC patterns" plus "Counting Friends"
 * and the cardinality triad, so a `hasText` filter would overmatch
 * sibling cards. Same href-from-day-one pattern numberfriends.spec.ts
 * adopted on 2026-05-18.
 */

const STATS_KEY = 'pattern_sequences_stats_v1';

test.describe('pattern sequences (preschool pattern recognition)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/pattern-sequences-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, sequence with 5 circles + "?" slot, three option buttons with distinct colors, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Pattern Sequences/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="patterns"]')).toHaveCount(1);

    await expect(page.locator('.ps-title')).toContainText(/Pattern Sequences/);
    await expect(page.locator('#psProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#psStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden']).toContain(scene);
    const kind = await stage.getAttribute('data-kind');
    expect(['AB', 'AAB', 'ABB', 'ABC']).toContain(kind);
    await expect(page.locator('#psCaption')).not.toBeEmpty();

    // Sequence row: 5 colored circles + 1 "?" slot.
    await expect(page.locator('#psSequence .ps-circle')).toHaveCount(5);
    await expect(page.locator('#psSlot')).toHaveCount(1);

    // Each circle has a recognised color.
    const circleColors = await page
      .locator('#psSequence .ps-circle')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.color));
    for (const c of circleColors) {
      expect(['red', 'blue', 'yellow', 'green']).toContain(c);
    }

    // Three option buttons, each with a recognised color, all
    // distinct so the answer is unambiguous.
    await expect(page.locator('.ps-opt')).toHaveCount(3);
    const optColors: string[] = [];
    for (let i = 0; i < 3; i++) {
      const c = await page.locator(`#psOpt${i}`).getAttribute('data-color');
      expect(c).not.toBeNull();
      expect(['red', 'blue', 'yellow', 'green']).toContain(c!);
      optColors.push(c!);
    }
    expect(new Set(optColors).size).toBe(3);

    // All three options are buttons (the whole panel is the answer button).
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#psOpt${i}`)).toHaveCount(1);
    }
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#psNextBtn')).toBeDisabled();
  });

  test('tapping any option eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#psOpt0').click();

    // Wrong-answer path here narrates one rerun phrase + a 5-item
    // sequence walk + a reveal phrase. At silent-mode pacing
    // (~500 ms per narrate + 160 ms inter-item pause): 500 + 5×500
    // + 4×160 + 500 ≈ 4 s worst case. 20 s timeout buffers headless
    // variance. The correct-tap path resolves in ~600 ms; either
    // outcome works for this assertion since we only care that
    // SOME tap eventually enables Next.
    await expect(page.locator('#psNextBtn')).toBeEnabled({ timeout: 20_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the matching option lights the correct state and counts toward first-try stats', async ({ page }) => {
    // The SSR'd round is generated with a deterministic seed
    // (`generateSession(() => 0.42)`) so we know the correct color —
    // but rather than hard-code it, find it dynamically by reading
    // which option's color the page believes is correct. The page
    // stores `correctIndex` privately, but the SSR shape gives us
    // enough to reconstruct: read `data-color` on each option, then
    // try each tap and observe which one lands `ps-opt--correct`.
    //
    // Cleaner approach: just iterate through the three options and
    // pick the one that fires `--correct` on tap. To avoid spending
    // 3× the budget, instead infer the correct color from the
    // sequence (the answer is `cycle[VISIBLE_LENGTH % cycle.length]`
    // applied to the round's color set).
    //
    // Actually simplest: tap each option in a fresh-page loop until
    // we find the correct one. Test stays fast because only one
    // attempt actually exercises the correct path.

    const optColors = await page.evaluate(() => {
      return [0, 1, 2].map((i) => {
        const el = document.getElementById(`psOpt${i}`);
        return el?.dataset.color ?? '';
      });
    });

    // Walk the sequence to figure out the expected next color. The
    // visible sequence is the round's pattern walked for 5 positions;
    // the 6th position is the answer. We can reconstruct by
    // inspecting cycle-vs-pattern from data-kind + the visible
    // colors.
    const seqColors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#psSequence .ps-circle'))
        .map((el) => (el as HTMLElement).dataset.color ?? '');
    });
    const kind = await page.locator('#psStage').getAttribute('data-kind');

    // Build the cycle definition + apply at position 5 (= VISIBLE_LENGTH).
    const cycleFor: Record<string, number[]> = {
      AB: [0, 1],
      AAB: [0, 0, 1],
      ABB: [0, 1, 1],
      ABC: [0, 1, 2],
    };
    const cycle = cycleFor[kind ?? 'AB']!;
    // Reconstruct the colors-by-cycle-index from the visible
    // sequence: position i in sequence = colors[cycle[i % cycle.length]].
    const colorsByCycleIdx: Record<number, string> = {};
    for (let i = 0; i < seqColors.length; i++) {
      colorsByCycleIdx[cycle[i % cycle.length]!] = seqColors[i]!;
    }
    const correctColor = colorsByCycleIdx[cycle[seqColors.length % cycle.length]!]!;

    const correctIdx = optColors.indexOf(correctColor);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#psOpt${correctIdx}`).click();

    await expect(page.locator(`#psOpt${correctIdx}`)).toHaveClass(
      /ps-opt--correct/,
    );
    // The slot also fills with the correct color on success — confirms
    // the visual pattern-completion that the kid sees.
    await expect(page.locator('#psSlot')).toHaveClass(/ps-slot--reveal/);
    await expect(page.locator('#psNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping a non-matching option triggers shake + eventually reveals the correct option without bumping first-try', async ({ page }) => {
    // Reuse the cycle-based correct-color computation from the
    // previous test to find a deterministic WRONG option to tap.
    const optColors = await page.evaluate(() => {
      return [0, 1, 2].map((i) => {
        const el = document.getElementById(`psOpt${i}`);
        return el?.dataset.color ?? '';
      });
    });
    const seqColors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#psSequence .ps-circle'))
        .map((el) => (el as HTMLElement).dataset.color ?? '');
    });
    const kind = await page.locator('#psStage').getAttribute('data-kind');
    const cycleFor: Record<string, number[]> = {
      AB: [0, 1],
      AAB: [0, 0, 1],
      ABB: [0, 1, 1],
      ABC: [0, 1, 2],
    };
    const cycle = cycleFor[kind ?? 'AB']!;
    const colorsByCycleIdx: Record<number, string> = {};
    for (let i = 0; i < seqColors.length; i++) {
      colorsByCycleIdx[cycle[i % cycle.length]!] = seqColors[i]!;
    }
    const correctColor = colorsByCycleIdx[cycle[seqColors.length % cycle.length]!]!;
    const correctIdx = optColors.indexOf(correctColor);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#psOpt${wrongIdx}`).click();

    // The tapped wrong option gets a 250 ms `ps-opt--wrong` shake
    // immediately on tap, before the rerun narration starts. Assert
    // this BEFORE waiting for the long reveal chain — the class
    // stays put through the round (it's only removed on the next
    // `renderRound` call).
    await expect(page.locator(`#psOpt${wrongIdx}`)).toHaveClass(
      /ps-opt--wrong/,
      { timeout: 1_000 },
    );

    // The correct option lands `ps-opt--reveal` only after the
    // rerun narration + 5-item sequence walk + reveal narration
    // completes. ~4 s worst case at silent-mode pacing; 20 s
    // timeout buffers headless variance.
    await expect(page.locator(`#psOpt${correctIdx}`)).toHaveClass(
      /ps-opt--reveal/,
      { timeout: 20_000 },
    );
    // Slot also fills with the correct color so the kid sees the
    // pattern complete.
    await expect(page.locator('#psSlot')).toHaveClass(/ps-slot--reveal/);

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
    // href-based selector from day one — the Pattern Sequences home
    // card description references "Counting Friends" and the
    // cardinality triad, so a hasText filter would overmatch.
    const card = page.locator('a.home-card[href*="pattern-sequences-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Pattern Sequences');
  });
});
