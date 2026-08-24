import { test, expect } from '@playwright/test';
import { passChapterBreak } from './helpers';

/**
 * Letter Friends — preschool-LITERACY uppercase-letter recognition
 * smoke suite (T-letters, 2026-05-25).
 *
 * Sister suite to numberfriends.spec.ts. Same shape, different game
 * contract: a target uppercase letter appears at the top with its
 * picture mnemonic ("A is for Apple"), three letter tiles appear
 * below — one with the target letter, two with non-confusable
 * distractors — the answer is "tap the tile that matches the target
 * letter". We assert:
 *
 *   - SSR renders header, scene, target card with a letter glyph and
 *     mnemonic, three tiles each with a letter glyph + word + emoji,
 *     non-empty caption.
 *   - Next button is gated on an answer.
 *   - Tapping any tile eventually enables Next + bumps `rounds`.
 *   - Tapping the matching tile lights `lf-tile--correct` and
 *     counts toward `correctFirstTry`.
 *   - Tapping a non-matching tile triggers the 250ms shake
 *     immediately, then reveals `lf-tile--reveal` on the correct
 *     tile after the errorless rerun completes (no
 *     `correctFirstTry` bump).
 *   - The home page links to the new game.
 *   - The /stats page picks up Letter Friends in the
 *     `preschool-literacy` family section.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback,
 * which makes round progression deterministic in headless Chromium
 * (where speechSynthesis often never fires onend).
 *
 * Home-card test uses an `href`-based selector from the start
 * (rather than `hasText`) — same fix that the sibling suites
 * adopted — Letter Friends's description references "Number Friends"
 * explicitly so a hasText filter would overmatch.
 */

const STATS_KEY = 'letter_friends_stats_v1';

/**
 * The alphabet, spelled out rather than imported from
 * `src/data/letterfriends.ts`.
 *
 * Deliberate duplication: importing the tier lists would let the same typo
 * satisfy both the game and its test. Written out here, the spec is an
 * independent statement of what "every letter" means, so dropping `Q` from
 * a tier fails instead of silently shortening the run.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

test.describe('letter friends (preschool letter recognition)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/letter-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, target card with a letter + mnemonic, three tiles with distinct letters + emoji, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Letter Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="letterfriends"]')).toHaveCount(1);

    await expect(page.locator('.lf-title')).toContainText(/Letter Friends/);
    await expect(page.locator('#lfProgressText')).toContainText(
      new RegExp(`^\\s*1\\s*/\\s*${ALPHABET.length}\\s*$`),
    );

    const stage = page.locator('#lfStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden']).toContain(scene);
    await expect(page.locator('#lfCaption')).not.toBeEmpty();

    // Target card has a letter glyph + a picture-mnemonic ("X is for
    // ...") with an emoji. The glyph is what the child has to match.
    const target = page.locator('#lfTarget');
    await expect(target).toBeVisible();
    const targetLetter = (await page.locator('#lfTargetGlyph').textContent())?.trim() ?? '';
    expect(targetLetter).toMatch(/^[A-Z]$/);
    // The mnemonic phrase must include the target letter and an
    // "is for" connector — locks the dual-coding pattern (letter +
    // word) in the SSR.
    const mnemonicText = await page.locator('#lfTargetMnemonic').textContent();
    expect(mnemonicText).toContain(`${targetLetter} is for`);

    // Three letter tiles, each with a letter glyph + word + emoji.
    // Tile letters must be distinct (otherwise the match wouldn't be
    // unique) and one must equal the target.
    await expect(page.locator('.lf-tile')).toHaveCount(3);
    const tileLetters: string[] = [];
    for (let i = 0; i < 3; i++) {
      const letter = await page.locator(`#lfTile${i}`).getAttribute('data-letter');
      expect(letter ?? '').toMatch(/^[A-Z]$/);
      tileLetters.push(letter ?? '');
      // Each tile must show a letter glyph and a word and an emoji
      // (the dual-coding contract).
      await expect(page.locator(`#lfTile${i} .lf-tile-glyph`)).toContainText(letter ?? '');
      await expect(page.locator(`#lfTile${i} .lf-tile-word`)).not.toBeEmpty();
      await expect(page.locator(`#lfTile${i} .lf-tile-emoji`)).not.toBeEmpty();
    }
    expect(new Set(tileLetters).size).toBe(3);
    expect(tileLetters.filter((l) => l === targetLetter).length).toBe(1);

    // All three tiles are buttons (the whole tile is the answer button).
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#lfTile${i}`)).toHaveCount(1);
    }
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#lfNextBtn')).toBeDisabled();
  });

  /**
   * The point of run mode (2026-08-22): a sitting asks for **all 26
   * letters**, not 8 sampled ones.
   *
   * Length alone would not catch the bug this is really guarding. The page
   * hands the SSR'd round 0 to a freshly generated run, and if that handoff
   * drops the run's first entry — which the old session code did — instead
   * of the entry matching the SSR'd *letter*, then one letter is asked twice
   * and another never, while the run keeps exactly the right length. Only
   * comparing the set of targets sees it.
   */
  test('a full run asks for every letter of the alphabet exactly once', async ({ page }) => {
    test.setTimeout(180_000);

    const seen: string[] = [];

    for (let round = 1; round <= ALPHABET.length; round++) {
      await expect(page.locator('#lfProgressText')).toContainText(
        new RegExp(`^\\s*${round}\\s*/\\s*${ALPHABET.length}\\s*$`),
      );

      const target = (await page.locator('#lfStage').getAttribute('data-target'))?.trim() ?? '';
      expect(target, `round ${round} has no target`).not.toBe('');
      seen.push(target);

      let correctIdx = -1;
      for (let i = 0; i < 3; i++) {
        if ((await page.locator(`#lfTile${i}`).getAttribute('data-letter')) === target) {
          correctIdx = i;
          break;
        }
      }
      expect(correctIdx, `round ${round}: no tile shows "${target}"`).toBeGreaterThanOrEqual(0);
      await page.locator(`#lfTile${correctIdx}`).click();
      await expect(page.locator('#lfNextBtn')).toBeEnabled();
      await page.locator('#lfNextBtn').click();
      await passChapterBreak(page);
    }

    const duplicates = seen.filter((l, i) => seen.indexOf(l) !== i);
    expect(duplicates, `asked more than once: ${duplicates.join(', ')}`).toEqual([]);

    const missing = ALPHABET.filter((l) => !seen.includes(l));
    expect(missing, `a full run never asked for: ${missing.join(', ')}`).toEqual([]);

    // Tier order is the curriculum: SATPIN first, the rare letters last.
    // Without this, a run could cover all 26 in a shuffle that opens on Z.
    expect(
      seen.slice(0, 6).sort(),
      'the run should open on the tier-1 SATPIN letters',
    ).toEqual(['A', 'I', 'N', 'P', 'S', 'T']);
    expect(
      seen.slice(-7).sort(),
      'the run should close on the tier-4 rare letters',
    ).toEqual(['J', 'Q', 'V', 'W', 'X', 'Y', 'Z']);

    await expect(page.locator('#lfDone')).toHaveClass(/lf-done--show/);
    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { sessions: number; rounds: number; correctFirstTry: number })
        : { sessions: 0, rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.sessions).toBe(1);
    expect(stats.rounds).toBe(ALPHABET.length);
    expect(stats.correctFirstTry).toBe(ALPHABET.length);
  });

  test('tapping any tile eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#lfTile0').click();

    // The wrong-answer path here is shorter than Number Friends's
    // (it's a 3-phase narration: rerun → rerunDoneWrong → 350ms pause
    // → rerunDoneRight + reveal, no per-item count phases). At
    // silent-mode pacing (600ms per narration) that's roughly
    // 600 + 600 + 350 + 600 ≈ 2.2s. 12s timeout buffers headless
    // variance comfortably.
    await expect(page.locator('#lfNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the matching tile lights the correct state and counts toward first-try stats', async ({ page }) => {
    const targetLetter = (await page.locator('#lfTargetGlyph').textContent())?.trim() ?? '';

    // Find which tile has data-letter === target.
    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const letter = await page.locator(`#lfTile${i}`).getAttribute('data-letter');
      if (letter === targetLetter) {
        correctIdx = i;
        break;
      }
    }
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#lfTile${correctIdx}`).click();

    await expect(page.locator(`#lfTile${correctIdx}`)).toHaveClass(
      /lf-tile--correct/,
    );
    await expect(page.locator('#lfNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping a non-matching tile triggers shake + reveals the correct tile without bumping first-try', async ({ page }) => {
    const targetLetter = (await page.locator('#lfTargetGlyph').textContent())?.trim() ?? '';

    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const letter = await page.locator(`#lfTile${i}`).getAttribute('data-letter');
      if (letter === targetLetter) {
        correctIdx = i;
        break;
      }
    }
    // Without this the search failing is silent: `correctIdx` stays -1,
    // `wrongIdx` becomes 0, and the test still taps a tile that is wrong — so
    // it passes while no longer knowing which tile it tapped or why.
    expect(correctIdx, 'no tile shows the target letter').toBeGreaterThanOrEqual(0);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#lfTile${wrongIdx}`).click();

    // Age-safe wrong-tap kinesthetic feedback: the tapped wrong tile
    // gets a 250ms `lf-tile--wrong` shake immediately on tap, before
    // the errorless rerun narration starts. Assert this BEFORE
    // waiting for the long reveal chain — the class is removed on
    // the next round render (`renderRound` calls `classList.remove`).
    await expect(page.locator(`#lfTile${wrongIdx}`)).toHaveClass(
      /lf-tile--wrong/,
      { timeout: 1_000 },
    );

    // After the rerun chain (rerun → rerunDoneWrong → pause →
    // rerunDoneRight) the correct tile lights up with the reveal
    // class. ~2.2s worst case in silent mode + headless variance →
    // 12s timeout.
    await expect(page.locator(`#lfTile${correctIdx}`)).toHaveClass(
      /lf-tile--reveal/,
      { timeout: 12_000 },
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
    // href-based selector — the Letter Friends home card description
    // references "Number Friends" so a hasText filter would
    // overmatch. Same fix the sibling suites adopted.
    const card = page.locator('a.home-card[href*="letter-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Letter Friends');
  });

  test('stats page lists Letter Friends in the preschool-literacy family section', async ({ page }) => {
    await page.goto('stats.html');

    // The family section exists and holds Letter Friends. It deliberately
    // does NOT assert how many siblings share the section: that count grew
    // 1 → 2 → 3 (Sound Friends 2026-06-06, Rhyme Time 2026-08-22) and
    // failed this Letter Friends suite each time for a reason that had
    // nothing to do with Letter Friends. `stats.spec.ts` asserts the exact
    // registry contents and order via `EXPECTED_GAME_IDS`, which is where a
    // miscounted family actually belongs.
    const literacySection = page.locator(
      '.stats-section[data-family="preschool-literacy"]',
    );
    await expect(literacySection).toHaveCount(1);

    const card = literacySection.locator(
      '.stats-card[data-game-id="letter-friends"]',
    );
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Letter Friends');

    // Card has the expected 4 metric rows (sessions / rounds /
    // first-try / last played) — confirms the
    // `preschoolStatsEntry` factory ran for this family too.
    await expect(card.locator('.stats-row')).toHaveCount(4);

    // Family-color border tint applied (decorative, but a visible
    // signal that the family wiring landed end-to-end).
    await expect(card).toHaveAttribute('data-family', 'preschool-literacy');
  });
});
