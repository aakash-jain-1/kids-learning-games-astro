import { expect, type Page, type Locator } from '@playwright/test';

/**
 * Shared smoke-test helpers across all three layout suites.
 *
 * The wiring shape these helpers assume is documented in
 * `src/lib/quiz.ts`:
 *  - The Quiz button has id `btnQuiz` (every game).
 *  - The overlay (card-machine + grid only) is `#quizOverlay`,
 *    toggled by adding/removing the `show` class. Story games
 *    use an inline `#quizBox` panel toggled via `[hidden]`.
 *  - Inside either container, `mountQuiz` writes a
 *    `.quiz-question` followed by N `.quiz-opt` buttons keyed
 *    by `data-i`. Clicking advances; on the last click the
 *    result panel `#quizResult` un-hides (no longer `[hidden]`)
 *    with `#quizResEmoji` + `#quizResText` populated.
 *  - LocalStorage write happens in `showResult` —
 *    `<gameId>_quiz_v1` holds `{ attempts, bestScore, lastPlayed }`.
 *  - Tiles + per-game progress on the 7 grid games + Routines
 *    use `kids_progress_v1:<gameId>` (a JSON array of learned
 *    item ids).
 */

/**
 * Click the very first quiz option (`data-i="0"`) repeatedly until
 * the result panel reveals — works for any quiz length without the
 * test having to know it. Returns once the result panel is visible
 * so the caller can assert against it.
 *
 * NB: clicking `data-i="0"` every time is intentional. The smoke
 * suite asserts that the wiring works end-to-end, not that the
 * quiz-correct logic produces a particular score.
 *
 * Feedback-aware (2026-05-20): `mountQuiz` now plays a 450ms (correct)
 * or 700ms (wrong) feedback animation before advancing — buttons are
 * disabled during that window. Between clicks we poll for either the
 * result panel to un-hide or a fresh enabled `.quiz-opt[data-i="0"]`
 * to render, which means the previous question's transition has
 * fully completed.
 */
export const answerQuizUntilResult = async (
  bodyEl: Locator,
  resultEl: Locator,
  maxClicks = 20,
): Promise<void> => {
  for (let i = 0; i < maxClicks; i++) {
    if (await resultEl.evaluate((el) => !el.hasAttribute('hidden'))) return;

    const firstOpt = bodyEl.locator('.quiz-opt[data-i="0"]:not([disabled])');
    // Wait until either the result panel reveals or a fresh enabled
    // first option exists — this rides through the per-tap feedback
    // animation without flake.
    let advanced = false;
    for (let waitMs = 0; waitMs < 3000; waitMs += 100) {
      if (await resultEl.evaluate((el) => !el.hasAttribute('hidden'))) return;
      if ((await firstOpt.count()) > 0) {
        advanced = true;
        break;
      }
      await firstOpt.page().waitForTimeout(100);
    }
    if (!advanced) {
      // Still not advanced after 3s. Either the result revealed in
      // the meantime (final check) or the quiz hung — story games
      // also hide the bodyEl via `display:none` when showing the
      // result panel, so re-check before giving up.
      if (await resultEl.evaluate((el) => !el.hasAttribute('hidden'))) return;
      throw new Error(
        `answerQuizUntilResult: feedback animation did not settle and result panel still hidden after ${i} clicks`,
      );
    }
    await firstOpt.first().click();
  }
  // Final check: did the last click reveal the result panel?
  // Allow up to 1s for the post-click feedback delay before the result
  // panel un-hides (the last-question advance still goes through the
  // 450/700ms feedback gate).
  for (let waitMs = 0; waitMs < 1500; waitMs += 100) {
    if (await resultEl.evaluate((el) => !el.hasAttribute('hidden'))) return;
    await resultEl.page().waitForTimeout(100);
  }
  throw new Error(
    `answerQuizUntilResult: exhausted ${maxClicks} clicks without revealing the result panel`,
  );
};

/**
 * Read and validate the persisted quiz state for `gameId`. Returns
 * the parsed shape so callers can do additional assertions (e.g.
 * `attempts >= 1` after running a quiz once).
 */
export const readQuizState = async (
  page: Page,
  gameId: string,
): Promise<{ attempts: number; bestScore: number; lastPlayed: string }> => {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    `${gameId}_quiz_v1`,
  );
  expect(raw, `expected localStorage["${gameId}_quiz_v1"] to be set`).not.toBeNull();
  const parsed = JSON.parse(raw!) as Partial<{
    attempts: number;
    bestScore: number;
    lastPlayed: string;
  }>;
  expect(typeof parsed.attempts, `attempts is a number`).toBe('number');
  expect(typeof parsed.bestScore, `bestScore is a number`).toBe('number');
  expect(typeof parsed.lastPlayed, `lastPlayed is a string`).toBe('string');
  expect(parsed.attempts!, 'attempts >= 1 after one quiz run').toBeGreaterThanOrEqual(1);
  expect(parsed.bestScore!, 'bestScore is a percentage 0..100').toBeGreaterThanOrEqual(0);
  expect(parsed.bestScore!, 'bestScore is a percentage 0..100').toBeLessThanOrEqual(100);
  // ISO date `YYYY-MM-DD` shape.
  expect(parsed.lastPlayed!, 'lastPlayed matches YYYY-MM-DD').toMatch(/^\d{4}-\d{2}-\d{2}$/);
  return parsed as { attempts: number; bestScore: number; lastPlayed: string };
};

/**
 * Read the `kids_progress_v1:<gameId>` learned-items array.
 * Used by grid + Routines tests to assert the per-tile / per-scene
 * persistence.
 */
export const readLearned = async (
  page: Page,
  gameId: string,
): Promise<readonly string[]> => {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    `kids_progress_v1:${gameId}`,
  );
  if (raw === null) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((v): v is string => typeof v === 'string');
};

/**
 * Card-machine + grid: the modal overlay opens by toggling `.show`.
 * Wait for it before interacting.
 */
export const expectModalOpen = async (overlay: Locator): Promise<void> => {
  await expect(overlay).toHaveClass(/(^|\s)show(\s|$)/);
};

/** Card-machine + grid: assert the modal is closed (no `.show`). */
export const expectModalClosed = async (overlay: Locator): Promise<void> => {
  await expect(overlay).not.toHaveClass(/(^|\s)show(\s|$)/);
};
