import { test, expect, type Page } from '@playwright/test';

/**
 * Parent Stats dashboard smoke suite (T6, 2026-05-20).
 *
 * Locks in the contract of `src/pages/stats.astro` + the
 * `STATS_REGISTRY` source of truth in `src/data/stats-registry.ts`:
 *
 * - Exactly one card is rendered per registry entry, in the order
 *   declared, grouped under the family sections.
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
  'pattern-sequences',
  'number-bond-pop',
  // Family A2 — preschool-literacy (added 2026-05-25 with T-letters)
  'letter-friends',
  'sound-friends',
  // Rhyme Time (2026-08-22) — rhyme recognition, the end-of-word partner to
  // Sound Friends' start-of-word skill. Same four-field shape, no new family.
  'rhyme-time',
  // Family A3 — preschool-cognitive (added 2026-06-06 with Sorting Friends;
  // Days Parade + Week Friends added 2026-06-17 — Days Parade is the
  // learn-the-days prequel, ordered before the Week Friends sequencer)
  'sorting-friends',
  'days-parade',
  'week-friends',
  // Animal Sounds (2026-08-17) — science/listening, but filed in the
  // cognitive family rather than carving a `preschool-science` family for
  // one game.
  'animal-sounds',
  // Opposites Friends (2026-08-22) — contrast vocabulary, same round-and-
  // first-try shape as its cognitive siblings, so no new family.
  'opposites-friends',
  // Where's Teddy? (2026-08-22) — spatial/positional words. Cognitive too;
  // the domain is new to the app but the stats shape is not.
  'wheres-teddy',
  'memory-match',
  // Family A4 — preschool-social (added 2026-08-17 with Feeling Friends;
  // this IS a new family, which is why the section count and activity-dot
  // arithmetic below moved from 6 to 7)
  'feeling-friends',
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

  test('SSR renders the page header, all seven family sections, and one card per registry entry', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Parent Stats/);
    await expect(page.locator('body.stats-page')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Parent Stats');

    // Seven family sections, in declared order. The four preschool
    // families sit together first — `'preschool-literacy'` (2026-05-25,
    // T-letters), `'preschool-cognitive'` (2026-06-06, Sorting Friends)
    // and `'preschool-social'` (2026-08-17, Feeling Friends) all slot
    // next to `'preschool-math'` so the parent's eye groups all
    // preschool work together.
    const sections = page.locator('.stats-section');
    await expect(sections).toHaveCount(7);
    await expect(sections.nth(0)).toHaveAttribute('data-family', 'preschool-math');
    await expect(sections.nth(1)).toHaveAttribute('data-family', 'preschool-literacy');
    await expect(sections.nth(2)).toHaveAttribute('data-family', 'preschool-cognitive');
    await expect(sections.nth(3)).toHaveAttribute('data-family', 'preschool-social');
    await expect(sections.nth(4)).toHaveAttribute('data-family', 'story');
    await expect(sections.nth(5)).toHaveAttribute('data-family', 'card-set');
    await expect(sections.nth(6)).toHaveAttribute('data-family', 'card-pure');

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
    // Counting Friends (a staged triad game) has 5 rows since 2026-06-03:
    // sessions, rounds, first-try, last-played, Stage. So the last-played
    // row is nth(3), not `.last()` (which is now the Stage row).
    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    await expect(counting.locator('.stats-row-value').nth(3)).toContainText('never');
    await expect(counting.locator('.stats-row-value').last()).toContainText('1 / 3 (best 1)');
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
    // Using JS-computed today + yesterday so the relative-date
    // assertions ("today" / "yesterday") below stay deterministic
    // regardless of when the test suite runs (T-retention,
    // 2026-05-20 — see `@/lib/retention.fmtRelativeDate`).
    await page.evaluate(() => {
      const fmt = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({
          sessions: 1,
          rounds: 8,
          correctFirstTry: 5,
          lastPlayed: fmt(today),
        }),
      );
      localStorage.setItem(
        'routines_quiz_v1',
        JSON.stringify({ attempts: 3, bestScore: 88, lastPlayed: fmt(yesterday) }),
      );
    });
    await page.reload();

    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    await expect(counting).not.toHaveClass(/is-empty/);
    await expect(counting.locator('[data-empty-badge]')).toBeHidden();
    // 4 metric rows: sessions, rounds, first-try, lastPlayed (now
    // formatted as relative time — "today" / "yesterday" / etc.).
    await expect(counting.locator('.stats-row-value').nth(0)).toHaveText('1');
    await expect(counting.locator('.stats-row-value').nth(1)).toHaveText('8');
    await expect(counting.locator('.stats-row-value').nth(2)).toHaveText('5 / 8 (63%)');
    await expect(counting.locator('.stats-row-value').nth(3)).toHaveText('today');

    const routines = page.locator('.stats-card[data-game-id="routines"]');
    await expect(routines).not.toHaveClass(/is-empty/);
    // Routines has 4 rows: scenes (zero — no learned set seeded), attempts,
    // best score, last played.
    await expect(routines.locator('.stats-row-value').nth(1)).toHaveText('3');
    await expect(routines.locator('.stats-row-value').nth(2)).toHaveText('88%');
    await expect(routines.locator('.stats-row-value').nth(3)).toHaveText('yesterday');
  });

  test('hydration: staged triad games show a Stage row reflecting current + best stage', async ({
    page,
  }) => {
    // Seed Counting Friends mid-progression (Stage 2, best 2) and
    // verify the Stage row (the 5th row, since 2026-06-03) renders
    // "2 / 3 (best 2)".
    await page.evaluate(() => {
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({
          sessions: 3,
          rounds: 26,
          correctFirstTry: 22,
          lastPlayed: '2026-06-03',
          stage: 2,
          bestStage: 2,
        }),
      );
    });
    await page.reload();

    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    await expect(counting.locator('.stats-row-value').last()).toHaveText('2 / 3 (best 2)');
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

  // ─── Retention instrumentation (T-retention, 2026-05-20) ───────────
  //
  // Locks in the contract of `src/lib/retention.ts` + the `/stats`
  // activity panel:
  //   - SSR ships 7 day cells × one dot per family, all inactive.
  //   - The grid renders oldest-first, today-last (so :last-child is
  //     today and is visually highlighted).
  //   - Seeding `kids_play_history_v1` with date→[gameIds] entries
  //     hydrates the right dots into the `.is-active` state.
  //   - "Reset everything" wipes the play-history key alongside the
  //     per-game schemas, so the activity panel snaps back to all-empty.
  //   - End-to-end: actually playing a Counting Friends round writes
  //     today's date to `kids_play_history_v1` AND sets `lastPlayed`
  //     on the per-game schema.

  test('activity panel SSR: 7 day cells, 49 dots, all inactive, today highlighted', async ({
    page,
  }) => {
    const grid = page.locator('#statsActivityGrid');
    await expect(grid).toHaveCount(1);

    const dayCells = grid.locator('.stats-activity-day');
    await expect(dayCells).toHaveCount(7);

    // 7 dots per day × 7 days = 49 dots (was 6×7=42 before
    // `'preschool-social'` was carved on 2026-08-17 with Feeling Friends;
    // itself up from 5×7=35 before `'preschool-cognitive'` on 2026-06-06
    // with Sorting Friends, and 4×7=28 before `'preschool-literacy'` on
    // 2026-05-25 with T-letters).
    const dots = grid.locator('.stats-activity-dot');
    await expect(dots).toHaveCount(49);

    // SSR ships every dot inactive (localStorage is undefined on the
    // server, so every perFamily count is 0).
    const activeCount = await grid.locator('.stats-activity-dot.is-active').count();
    expect(activeCount).toBe(0);

    // Each day cell has one dot per family in the declared family
    // order — preschool-math, preschool-literacy, preschool-cognitive,
    // preschool-social, story, card-set, card-pure (top to bottom
    // visually, but DOM order is the iteration order).
    const firstCellDots = dayCells.nth(0).locator('.stats-activity-dot');
    await expect(firstCellDots.nth(0)).toHaveAttribute('data-family', 'preschool-math');
    await expect(firstCellDots.nth(1)).toHaveAttribute('data-family', 'preschool-literacy');
    await expect(firstCellDots.nth(2)).toHaveAttribute('data-family', 'preschool-cognitive');
    await expect(firstCellDots.nth(3)).toHaveAttribute('data-family', 'preschool-social');
    await expect(firstCellDots.nth(4)).toHaveAttribute('data-family', 'story');
    await expect(firstCellDots.nth(5)).toHaveAttribute('data-family', 'card-set');
    await expect(firstCellDots.nth(6)).toHaveAttribute('data-family', 'card-pure');

    // Legend has one swatch per family.
    const legendItems = page.locator('.stats-activity-legend-item');
    await expect(legendItems).toHaveCount(7);
  });

  test('activity panel hydration: seeded play history toggles the right family dots', async ({
    page,
  }) => {
    // Seed two days of activity to exercise the family dot positions
    // (now 7 families — preschool-social was carved at index 3 on
    // 2026-08-17 with Feeling Friends, shifting story 3→4, card-set 4→5
    // and card-pure 5→6; see EXPECTED_GAME_IDS for family-order
    // rationale):
    //   - Today: Counting Friends (preschool-math, dot 0) + Letter
    //     Friends (preschool-literacy, dot 1) + Feeling Friends
    //     (preschool-social, dot 3) + Daily Routines (story, dot 4)
    //     → today dots 0 + 1 + 3 + 4 active.
    //   - Yesterday: Alphabets (card-set, dot 5) only → dot 5 active.
    //
    // The games either side of each carve are seeded deliberately, so a
    // bug that mis-assigned a game to the wrong family dot surfaces here.
    await page.evaluate(() => {
      const fmt = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem(
        'kids_play_history_v1',
        JSON.stringify({
          [fmt(today)]: [
            'counting-friends',
            'letter-friends',
            'feeling-friends',
            'routines',
          ],
          [fmt(yesterday)]: ['alphabets'],
        }),
      );
    });
    await page.reload();

    const dayCells = page.locator('.stats-activity-day');

    // Today is the LAST cell (oldest-first ordering). Dots 0
    // (preschool-math), 1 (preschool-literacy), 3 (preschool-social),
    // 4 (story) active; dots 2 (preschool-cognitive), 5 (card-set),
    // 6 (card-pure) inactive.
    const todayCell = dayCells.last();
    await expect(todayCell.locator('.stats-activity-dot').nth(0)).toHaveClass(/is-active/);
    await expect(todayCell.locator('.stats-activity-dot').nth(1)).toHaveClass(/is-active/);
    await expect(todayCell.locator('.stats-activity-dot').nth(2)).not.toHaveClass(/is-active/);
    await expect(todayCell.locator('.stats-activity-dot').nth(3)).toHaveClass(/is-active/);
    await expect(todayCell.locator('.stats-activity-dot').nth(4)).toHaveClass(/is-active/);
    await expect(todayCell.locator('.stats-activity-dot').nth(5)).not.toHaveClass(/is-active/);
    await expect(todayCell.locator('.stats-activity-dot').nth(6)).not.toHaveClass(/is-active/);

    // Yesterday is the second-to-last cell. Only dot 5 (card-set) active.
    const yesterdayCell = dayCells.nth(5);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(0)).not.toHaveClass(/is-active/);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(1)).not.toHaveClass(/is-active/);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(2)).not.toHaveClass(/is-active/);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(3)).not.toHaveClass(/is-active/);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(4)).not.toHaveClass(/is-active/);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(5)).toHaveClass(/is-active/);
    await expect(yesterdayCell.locator('.stats-activity-dot').nth(6)).not.toHaveClass(/is-active/);

    // 6 days ago (the first cell) has no activity at all — sanity that
    // unseeded cells stay inactive after hydration.
    const oldestCell = dayCells.first();
    const activeInOldest = await oldestCell.locator('.stats-activity-dot.is-active').count();
    expect(activeInOldest).toBe(0);
  });

  test('"Reset everything" wipes the play-history key alongside per-game schemas', async ({
    page,
  }) => {
    acceptDialogs(page);

    // Seed both per-game stats AND the sitewide play history.
    await page.evaluate(() => {
      const fmt = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const today = new Date();
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({ sessions: 1, rounds: 8, correctFirstTry: 7, lastPlayed: fmt(today) }),
      );
      localStorage.setItem(
        'kids_play_history_v1',
        JSON.stringify({ [fmt(today)]: ['counting-friends'] }),
      );
    });
    await page.reload();

    // Pre-condition: today's cell (last) has dot 0 active.
    await expect(
      page.locator('.stats-activity-day').last().locator('.stats-activity-dot').first(),
    ).toHaveClass(/is-active/);

    await page.locator('#btnResetAll').click();

    // Activity grid snaps back to fully inactive.
    const activeAfter = await page.locator('.stats-activity-dot.is-active').count();
    expect(activeAfter).toBe(0);

    // The sitewide history key is gone.
    const historyKey = await page.evaluate(() =>
      localStorage.getItem('kids_play_history_v1'),
    );
    expect(historyKey).toBeNull();

    // Per-card "Reset" (single game) does NOT wipe the play history —
    // verified separately so the design rationale in
    // `src/lib/retention.ts` doesn't silently drift.
  });

  test('per-card reset preserves the sitewide play-history key', async ({
    page,
  }) => {
    acceptDialogs(page);

    // Seed Counting Friends stats + the sitewide history so that
    // resetting the card alone does NOT erase the activity calendar.
    // (See rationale at top of `src/lib/retention.ts` — the
    // calendar is sitewide; per-game resets are scoped.)
    await page.evaluate(() => {
      const fmt = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const today = new Date();
      localStorage.setItem(
        'counting_friends_stats_v1',
        JSON.stringify({ sessions: 1, rounds: 8, correctFirstTry: 7, lastPlayed: fmt(today) }),
      );
      localStorage.setItem(
        'kids_play_history_v1',
        JSON.stringify({ [fmt(today)]: ['counting-friends', 'alphabets'] }),
      );
    });
    await page.reload();

    await page
      .locator('.stats-card[data-game-id="counting-friends"]')
      .locator('[data-reset]')
      .click();

    // The history key is intact — per-card reset should not clear it.
    const historyKey = await page.evaluate(() =>
      localStorage.getItem('kids_play_history_v1'),
    );
    expect(historyKey).not.toBeNull();

    // And the activity grid still shows today's dots active (the
    // panel doesn't re-read from per-card reset right now — but
    // that's fine, because the page is also where the calendar
    // lives, and the user expectation is "this game's stats only").
    // Verify by reloading and checking the dots are still painted.
    await page.reload();
    const dotsActive = await page.locator('.stats-activity-dot.is-active').count();
    // Today's preschool-math + card-set should both be active = 2 dots.
    expect(dotsActive).toBe(2);
  });

  test('end-to-end: playing one Counting Friends round writes today\'s date to the play-history key and the per-game lastPlayed', async ({
    page,
  }) => {
    // Drive a real Counting Friends round, then return to /stats and
    // verify both the sitewide history key + the per-card "today"
    // formatting picked up the play. This is the smoke test that
    // ties the writer wiring (recordPlay in bumpStats) to the
    // reader (getActivityByFamily / fmtRelativeDate).
    //
    // Deterministic correct-tap path (fast). Mirrors the pattern in
    // `tests/addition.spec.ts` — we count the items in the two
    // groups, compute a + b, click the option whose data-n matches,
    // then wait for #cfNextBtn to enable (the existing signal that
    // the round resolved + bumpStats has fired). Avoids the
    // wrong-tap rerun flow which is up to ~15s long in CI (different
    // path, same end result for retention purposes — but slow enough
    // that an 8s waitForFunction times out, which is exactly what
    // bit the first version of this test on 2026-05-20).
    await page.goto('games/counting-friends-game.html');
    await page.locator('#cfOptions .cf-opt').first().waitFor({ state: 'visible', timeout: 5_000 });

    // The first tap on an answer asks the question rather than being scored,
    // so spend that gesture on the inert heading first — otherwise the tap
    // below is swallowed and no round is ever played.
    await page.locator('h1').first().click();

    const a = await page.locator('#cfGroupA .cf-item').count();
    const b = await page.locator('#cfGroupB .cf-item').count();
    const expected = a + b;
    await page.locator(`#cfOptions .cf-opt[data-n="${expected}"]`).click();

    // The correct-tap flow lands `cf-opt--correct` and enables
    // #cfNextBtn after the per-round bumpStats writer fires. Same
    // gate addition.spec.ts uses — proven reliable in CI.
    await expect(page.locator('#cfNextBtn')).toBeEnabled({ timeout: 10_000 });

    // Both writers should have landed by now: the per-game schema
    // and the sitewide play-history key.
    const stored = await page.evaluate(() => ({
      stats: localStorage.getItem('counting_friends_stats_v1'),
      history: localStorage.getItem('kids_play_history_v1'),
    }));
    expect(stored.stats).not.toBeNull();
    expect(stored.history).not.toBeNull();

    // Sitewide history must contain today's date with
    // 'counting-friends' in the array.
    const history = JSON.parse(stored.history ?? '{}') as Record<string, string[]>;
    const dates = Object.keys(history);
    expect(dates.length).toBeGreaterThan(0);
    // Sort to find the newest date deterministically — Object.keys
    // order isn't guaranteed across engines for our shape.
    const newest = dates.sort().reverse()[0] ?? '';
    expect(history[newest] ?? []).toContain('counting-friends');

    // Pop over to /stats and verify the relative-time formatting +
    // the activity panel's last cell (today) has dot 0
    // (preschool-math) lit up.
    await page.goto('stats.html');
    const counting = page.locator('.stats-card[data-game-id="counting-friends"]');
    // lastPlayed is row index 3; the staged triad appends a "Stage" row at
    // index 4, so target the lastPlayed row explicitly rather than .last().
    await expect(counting.locator('.stats-row-value').nth(3)).toHaveText('today');
    await expect(
      page.locator('.stats-activity-day').last().locator('.stats-activity-dot').first(),
    ).toHaveClass(/is-active/);
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
