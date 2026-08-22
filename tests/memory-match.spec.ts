import { test, expect, type Page } from '@playwright/test';

/**
 * Memory Match — preschool COGNITIVE (working memory) smoke suite
 * (added 2026-08-23).
 *
 * Sixth and last of the 2026-08 design set. Four of the assertions here are
 * specific to this game and are the ones worth reading:
 *
 *   - **Every card back is identical.** The entire game rests on this. A back
 *     that differed by so much as a character or a shade would make the board
 *     solvable by looking rather than by remembering, and no other assertion
 *     in the suite would notice.
 *   - **The whole board fits on screen**, on a phone as well as a desktop.
 *     A child memorising positions cannot scroll to see the rest of the
 *     board, so a bottom row under the fold isn't a cosmetic bug, it breaks
 *     the mechanic. The twelve-card board did exactly that before the cards
 *     were sized by height as well as width.
 *   - **Matched cards stay put.** They stay on the board face up instead of
 *     being removed, because removing them reflows the grid and destroys the
 *     positions the child has just committed to memory.
 *   - **A non-match is not treated as a wrong answer.** No error styling, no
 *     "no" / "wrong" / "try again" in the caption. Turning over two cards
 *     that don't match is how the game is played, so §5 rule 8's
 *     wrong-answer treatment is deliberately not applied — see the header of
 *     src/data/memory-match.ts.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it forces
 * narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so anything
 * waiting on speech resolves deterministically in headless Chromium, where
 * `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'memory_match_stats_v1';

/** Declared independently of the app so a data edit shows up here. */
const BOARD_SIZES = [3, 4, 6] as const;
const TOTAL_PAIRS = BOARD_SIZES.reduce((n, s) => n + s, 0);
const POOL_SIZE = 13;

/** Pause after a non-match before the cards turn back (MISS_HOLD_MS + slack). */
const MISS_HOLD_MS = 1800;
/** Pause on a cleared board before the next is dealt (BOARD_HOLD_MS + slack). */
const BOARD_HOLD_MS = 2100;

interface Slot {
  slot: number;
  animal: string;
}

const readBoard = async (page: Page): Promise<Slot[]> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.mm-card')).map((el) => ({
      slot: Number(el.dataset.slot),
      animal: el.dataset.animal ?? '',
    })),
  );

/** The two slots holding `animal`, still playable. */
const pairSlots = async (page: Page, animal: string): Promise<number[]> =>
  page.evaluate(
    (a) =>
      Array.from(
        document.querySelectorAll<HTMLElement>(`.mm-card[data-animal="${a}"]`),
      ).map((el) => Number(el.dataset.slot)),
    animal,
  );

const tap = async (page: Page, slot: number): Promise<void> => {
  await page.locator(`.mm-card[data-slot="${slot}"]`).click();
};

/** Match one pair on the current board. Returns the animal matched. */
const matchOnePair = async (page: Page): Promise<string> => {
  const open = await page.evaluate(() => {
    const m = new Map<string, number[]>();
    for (const el of document.querySelectorAll<HTMLElement>(
      '.mm-card:not([disabled])',
    )) {
      const a = el.dataset.animal ?? '';
      m.set(a, (m.get(a) ?? []).concat(Number(el.dataset.slot)));
    }
    return [...m.entries()].find(([, v]) => v.length === 2) ?? null;
  });
  expect(open, 'no unmatched pair left on the board').not.toBeNull();
  const [animal, slots] = open!;
  await tap(page, slots[0]!);
  await tap(page, slots[1]!);
  await page.waitForTimeout(220);
  return animal;
};

/** Clear the current board, then wait out the hand-off to the next one. */
const clearBoard = async (page: Page): Promise<string[]> => {
  const matched: string[] = [];
  for (;;) {
    const left = await page.locator('.mm-card:not([disabled])').count();
    if (left === 0) break;
    matched.push(await matchOnePair(page));
  }
  return matched;
};

/**
 * Wait for the deal / flip / pop animations to finish.
 *
 * Needed before any geometry is read: cards deal in with a staggered
 * `translateY` + `scale`, so a rect sampled mid-animation is several pixels
 * off its resting place and every position comparison drifts.
 */
const settle = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => undefined)),
    );
  });
};

const readStats = async (page: Page) =>
  page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as Record<string, number | string>) : null;
  }, STATS_KEY);

test.describe('memory match (preschool cognitive — working memory)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/memory-match-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, a themed stage, a caption and the first board', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Memory Match/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="memorymatch"]')).toHaveCount(1);

    await expect(page.locator('.mm-title')).toContainText(/Memory Match/);
    await expect(page.locator('#mmProgressText')).toContainText(
      new RegExp(`^\\s*0\\s*/\\s*${TOTAL_PAIRS}\\s*$`),
    );

    const stage = page.locator('#mmStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#mmCaption')).not.toBeEmpty();

    // The run opens on the smallest board.
    await expect(page.locator('.mm-card')).toHaveCount(BOARD_SIZES[0] * 2);
    await expect(page.locator('#mmBoard')).toHaveAttribute(
      'data-pairs',
      String(BOARD_SIZES[0]),
    );
  });

  test('a board deals each of its animals exactly twice', async ({ page }) => {
    const cards = await readBoard(page);
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.animal, (counts.get(c.animal) ?? 0) + 1);

    expect(counts.size).toBe(BOARD_SIZES[0]);
    for (const [animal, n] of counts) {
      expect(n, `${animal} appears ${n} times, not twice`).toBe(2);
    }
  });

  test('every card back is identical, so the board can only be solved by memory', async ({
    page,
  }) => {
    const backs = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.mm-face--back')).map((el) => {
        const cs = getComputedStyle(el);
        return [
          el.textContent?.trim() ?? '',
          cs.backgroundImage,
          cs.backgroundColor,
          cs.color,
          cs.opacity,
        ].join('|');
      }),
    );

    expect(backs.length).toBe(BOARD_SIZES[0] * 2);
    expect(
      new Set(backs).size,
      'card backs differ from each other, so the board is readable without flipping',
    ).toBe(1);
  });

  test('the face-down card gives nothing away in the accessibility tree either', async ({
    page,
  }) => {
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.mm-card')).map(
        (el) => el.getAttribute('aria-label') ?? '',
      ),
    );
    expect(new Set(labels).size, 'face-down cards are individually labelled').toBe(1);

    // The animal is in the DOM (it has to be, to flip), but never in text a
    // screen reader would announce before the card is turned over.
    const front = page.locator('.mm-face--front').first();
    await expect(front).toHaveAttribute('aria-hidden', 'true');
  });

  test('turning over two matching cards keeps them face up, and keeps them in place', async ({
    page,
  }) => {
    await settle(page);
    const before = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.mm-card')).map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.dataset.slot}:${Math.round(r.x)},${Math.round(r.y)}`;
      }),
    );

    const animal = await matchOnePair(page);

    const matched = page.locator(`.mm-card[data-animal="${animal}"]`);
    await expect(matched).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(matched.nth(i)).toHaveClass(/mm-card--matched/);
      await expect(matched.nth(i)).toBeDisabled();
    }

    // Matched cards stay on the board: removing them would reflow the grid
    // and wipe out the positions the child has memorised.
    await settle(page);
    const after = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.mm-card')).map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.dataset.slot}:${Math.round(r.x)},${Math.round(r.y)}`;
      }),
    );
    expect(after, 'the board reflowed after a match').toEqual(before);

    await expect(page.locator('#mmProgressText')).toContainText(
      new RegExp(`^\\s*1\\s*/\\s*${TOTAL_PAIRS}\\s*$`),
    );
  });

  test('a non-match is never treated as a wrong answer', async ({ page }) => {
    const cards = await readBoard(page);
    const a = cards[0]!;
    const b = cards.find((c) => c.animal !== a.animal)!;

    await tap(page, a.slot);
    await tap(page, b.slot);

    // Both stay face up long enough to be encoded...
    await expect(page.locator(`.mm-card[data-slot="${a.slot}"]`)).toHaveClass(
      /mm-card--up/,
    );
    await expect(page.locator(`.mm-card[data-slot="${b.slot}"]`)).toHaveClass(
      /mm-card--up/,
    );

    // ...named rather than corrected...
    const caption = (await page.locator('#mmCaption').textContent()) ?? '';
    expect(caption).toMatch(/not a pair yet/i);
    expect(
      caption,
      'the caption scolds the child for a move that is how the game is played',
    ).not.toMatch(/\bwrong\b|\btry again\b|\boops\b|\bno\b/i);

    // ...and no error styling anywhere.
    await expect(page.locator('.mm-card--wrong')).toHaveCount(0);

    // ...then turned back, both of them, with nothing kept.
    await page.waitForTimeout(MISS_HOLD_MS);
    await expect(page.locator('.mm-card--up')).toHaveCount(0);
    await expect(page.locator('.mm-card--matched')).toHaveCount(0);
    await expect(page.locator('#mmProgressText')).toContainText(
      new RegExp(`^\\s*0\\s*/\\s*${TOTAL_PAIRS}\\s*$`),
    );
  });

  test('a third card cannot be turned over while a non-match is being held', async ({
    page,
  }) => {
    const cards = await readBoard(page);
    const a = cards[0]!;
    const b = cards.find((c) => c.animal !== a.animal)!;
    const c = cards.find((x) => x.slot !== a.slot && x.slot !== b.slot)!;

    await tap(page, a.slot);
    await tap(page, b.slot);
    await tap(page, c.slot);

    await expect(
      page.locator('.mm-card--up'),
      'a third card flipped while two were already face up',
    ).toHaveCount(2);
  });

  test('a pair found after missing it does not count as found by memory', async ({
    page,
  }) => {
    const cards = await readBoard(page);
    const a = cards[0]!;
    const b = cards.find((c) => c.animal !== a.animal)!;

    // Turn both over and get them wrong, so both animals are now known.
    await tap(page, a.slot);
    await tap(page, b.slot);
    await page.waitForTimeout(MISS_HOLD_MS);

    const slots = await pairSlots(page, a.animal);
    await tap(page, slots[0]!);
    await tap(page, slots[1]!);
    await page.waitForTimeout(300);

    const stats = await readStats(page);
    expect(stats?.rounds, 'the pair was not recorded as found').toBe(1);
    expect(
      stats?.correctFirstTry,
      'a pair found by elimination was credited as remembered',
    ).toBe(0);
  });

  test('a pair found without missing it counts as found by memory', async ({ page }) => {
    await matchOnePair(page);
    const stats = await readStats(page);
    expect(stats?.rounds).toBe(1);
    expect(stats?.correctFirstTry).toBe(1);
  });

  test('the boards grow, and a full run deals every animal in the pool exactly once', async ({
    page,
  }) => {
    const seen: string[] = [];

    for (let i = 0; i < BOARD_SIZES.length; i++) {
      await expect(page.locator('#mmBoard')).toHaveAttribute(
        'data-pairs',
        String(BOARD_SIZES[i]),
      );
      await expect(page.locator('.mm-card')).toHaveCount(BOARD_SIZES[i]! * 2);

      seen.push(...(await clearBoard(page)));
      await page.waitForTimeout(BOARD_HOLD_MS);
    }

    // CONTEXT.md §5 rule 11: a bounded set is played to completion. 3 + 4 + 6
    // is exactly the pool, so no animal repeats and none is left out.
    expect(seen.length).toBe(TOTAL_PAIRS);
    expect(new Set(seen).size, 'an animal was dealt on more than one board').toBe(
      POOL_SIZE,
    );

    await expect(page.locator('#mmDone')).toHaveClass(/mm-done--show/);
    await expect(page.locator('#mmProgressText')).toContainText(
      new RegExp(`^\\s*${TOTAL_PAIRS}\\s*/\\s*${TOTAL_PAIRS}\\s*$`),
    );

    const stats = await readStats(page);
    expect(stats?.sessions).toBe(1);
    expect(stats?.rounds).toBe(TOTAL_PAIRS);
    expect(stats?.lastPlayed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('each board gets its own backdrop', async ({ page }) => {
    const scenes: (string | null)[] = [];
    for (let i = 0; i < BOARD_SIZES.length; i++) {
      scenes.push(await page.locator('#mmStage').getAttribute('data-scene'));
      await clearBoard(page);
      await page.waitForTimeout(BOARD_HOLD_MS);
    }
    expect(new Set(scenes).size, 'two boards in a row used the same backdrop').toBe(
      BOARD_SIZES.length,
    );
  });

  test('play again re-deals from the start', async ({ page }) => {
    for (let i = 0; i < BOARD_SIZES.length; i++) {
      await clearBoard(page);
      await page.waitForTimeout(BOARD_HOLD_MS);
    }
    await page.locator('#mmPlayAgainBtn').click();

    await expect(page.locator('#mmDone')).not.toHaveClass(/mm-done--show/);
    await expect(page.locator('.mm-card')).toHaveCount(BOARD_SIZES[0]! * 2);
    await expect(page.locator('.mm-card--matched')).toHaveCount(0);
    await expect(page.locator('#mmProgressText')).toContainText(
      new RegExp(`^\\s*0\\s*/\\s*${TOTAL_PAIRS}\\s*$`),
    );
  });

  /**
   * The one layout rule this game cannot trade away. A child memorising
   * positions cannot scroll to find the rest of the board, so every card on
   * the biggest board has to be inside the viewport at once — on a phone as
   * well as a desktop.
   */
  for (const [label, width, height] of [
    ['phone', 390, 780],
    ['tablet', 820, 900],
    ['desktop', 1280, 800],
  ] as const) {
    test(`the whole twelve-card board is on screen at once (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });

      for (let i = 0; i < BOARD_SIZES.length - 1; i++) {
        await clearBoard(page);
        await page.waitForTimeout(BOARD_HOLD_MS);
      }
      await expect(page.locator('.mm-card')).toHaveCount(12);
      await settle(page);

      const overflow = await page.evaluate(
        (vh) =>
          Array.from(document.querySelectorAll<HTMLElement>('.mm-card'))
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { slot: el.dataset.slot, bottom: Math.round(r.bottom) };
            })
            .filter((c) => c.bottom > vh),
        height,
      );

      expect(
        overflow,
        `cards fall below the fold, so the board cannot be memorised without scrolling`,
      ).toEqual([]);

      // ...and they must still be big enough to tap and to recognise.
      const smallest = await page.evaluate(() =>
        Math.min(
          ...Array.from(document.querySelectorAll<HTMLElement>('.mm-card')).map(
            (el) => el.getBoundingClientRect().width,
          ),
        ),
      );
      expect(smallest, 'cards were shrunk below a tappable size to fit').toBeGreaterThan(
        50,
      );
    });
  }

  test('the game is listed on the home page and on the stats dashboard', async ({
    page,
  }) => {
    await page.goto('');
    const card = page.locator('a[href*="memory-match-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(/Memory Match/);

    await page.goto('stats.html');
    await expect(page.locator('text=Memory Match').first()).toBeVisible();
  });
});
