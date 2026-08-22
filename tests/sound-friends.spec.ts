import { test, expect } from '@playwright/test';

/**
 * Sound Friends — preschool-LITERACY beginning-sounds smoke suite
 * (added 2026-06-06).
 *
 * Sister suite to letterfriends.spec.ts. Same shape, deeper contract:
 * a PICTURE appears at the top (emoji + word, e.g. "apple"); three
 * PLAIN letter tiles appear below — one with the letter the word starts
 * with, two with non-confusable distractors — the answer is "tap the
 * letter the picture starts with". We assert:
 *
 *   - SSR renders header, scene, a picture target card (emoji + word),
 *     three plain letter tiles each with a distinct letter glyph (and
 *     NO word/emoji — the deliberate no-shortcut design), a non-empty
 *     caption. The stage's data-target (the answer letter) matches
 *     exactly one tile.
 *   - Next button is gated on an answer.
 *   - Tapping any tile eventually enables Next + bumps `rounds`.
 *   - Tapping the matching tile lights `sf-tile--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping a non-matching tile triggers the 250ms shake immediately,
 *     then reveals `sf-tile--reveal` on the correct tile after the
 *     errorless rerun completes (no `correctFirstTry` bump).
 *   - A full run asks for all 26 starting sounds, once each, in tier
 *     order (added 2026-08-22 with the switch from 8-round sessions).
 *   - The home page links to the new game.
 *   - The /stats page picks up Sound Friends in the preschool-literacy
 *     family section.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so
 * round progression is deterministic in headless Chromium.
 */

const STATS_KEY = 'sound_friends_stats_v1';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * The SATPIN tiers, spelled out rather than imported from the data
 * module: a typo there should fail this suite, not be ratified by it.
 */
const TIER_1 = ['S', 'A', 'T', 'P', 'I', 'N'];
const TIER_4 = ['J', 'V', 'W', 'X', 'Y', 'Z', 'Q'];

test.describe('sound friends (preschool beginning sounds)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/sound-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a picture target card, three plain distinct letter tiles, and a caption', async ({ page }) => {
    await expect(page).toHaveTitle(/Sound Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="soundfriends"]')).toHaveCount(1);

    await expect(page.locator('.sf-title')).toContainText(/Sound Friends/);
    await expect(page.locator('#sfProgressText')).toContainText(
      new RegExp(`^\\s*1\\s*/\\s*${ALPHABET.length}\\s*$`),
    );

    const stage = page.locator('#sfStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#sfCaption')).not.toBeEmpty();

    // Target card is a PICTURE (emoji + word) — the prompt the child
    // must find the starting letter for. The answer letter lives on the
    // stage's data-target.
    const target = page.locator('#sfTarget');
    await expect(target).toBeVisible();
    await expect(page.locator('#sfTargetEmoji')).not.toBeEmpty();
    await expect(page.locator('#sfTargetWord')).not.toBeEmpty();

    const targetLetter = (await stage.getAttribute('data-target'))?.trim() ?? '';
    expect(targetLetter).toMatch(/^[A-Z]$/);

    // Three plain letter tiles, each with ONLY a letter glyph (no
    // word/emoji — the deliberate no-shortcut design). Tile letters
    // must be distinct and exactly one must equal the target.
    await expect(page.locator('.sf-tile')).toHaveCount(3);
    const tileLetters: string[] = [];
    for (let i = 0; i < 3; i++) {
      const letter = await page.locator(`#sfTile${i}`).getAttribute('data-letter');
      expect(letter ?? '').toMatch(/^[A-Z]$/);
      tileLetters.push(letter ?? '');
      await expect(page.locator(`#sfTile${i} .sf-tile-glyph`)).toContainText(letter ?? '');
      // No mnemonic word/emoji on the tile (unlike Letter Friends).
      await expect(page.locator(`#sfTile${i} .sf-tile-word`)).toHaveCount(0);
      await expect(page.locator(`#sfTile${i} .sf-tile-emoji`)).toHaveCount(0);
    }
    expect(new Set(tileLetters).size).toBe(3);
    expect(tileLetters.filter((l) => l === targetLetter).length).toBe(1);

    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#sfTile${i}`)).toHaveCount(1);
    }
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#sfNextBtn')).toBeDisabled();
  });

  test('tapping any tile eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#sfTile0').click();

    // Wrong-answer path is the 3-phase narration (rerun →
    // rerunDoneWrong → 350ms pause → rerunDoneRight + reveal). At
    // silent-mode pacing (600ms per narration) that's roughly
    // 600 + 600 + 350 + 600 ≈ 2.2s. 12s timeout buffers headless
    // variance comfortably.
    await expect(page.locator('#sfNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the matching tile lights the correct state and counts toward first-try stats', async ({ page }) => {
    const targetLetter =
      (await page.locator('#sfStage').getAttribute('data-target'))?.trim() ?? '';

    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const letter = await page.locator(`#sfTile${i}`).getAttribute('data-letter');
      if (letter === targetLetter) {
        correctIdx = i;
        break;
      }
    }
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#sfTile${correctIdx}`).click();

    await expect(page.locator(`#sfTile${correctIdx}`)).toHaveClass(
      /sf-tile--correct/,
    );
    await expect(page.locator('#sfNextBtn')).toBeEnabled();

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
    const targetLetter =
      (await page.locator('#sfStage').getAttribute('data-target'))?.trim() ?? '';

    let correctIdx = -1;
    for (let i = 0; i < 3; i++) {
      const letter = await page.locator(`#sfTile${i}`).getAttribute('data-letter');
      if (letter === targetLetter) {
        correctIdx = i;
        break;
      }
    }
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#sfTile${wrongIdx}`).click();

    // Age-safe wrong-tap kinesthetic feedback: the tapped wrong tile
    // gets a 250ms `sf-tile--wrong` shake immediately on tap, before
    // the errorless rerun narration starts. Assert this BEFORE waiting
    // for the long reveal chain — the class is removed on the next
    // round render.
    await expect(page.locator(`#sfTile${wrongIdx}`)).toHaveClass(
      /sf-tile--wrong/,
      { timeout: 1_000 },
    );

    // After the rerun chain the correct tile lights up with the reveal
    // class. ~2.2s worst case in silent mode + headless variance →
    // 12s timeout.
    await expect(page.locator(`#sfTile${correctIdx}`)).toHaveClass(
      /sf-tile--reveal/,
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

  test('a full run asks for every letter of the alphabet exactly once', async ({ page }) => {
    test.setTimeout(180_000);

    const asked: string[] = [];

    for (let round = 1; round <= ALPHABET.length; round++) {
      await expect(page.locator('#sfProgressText')).toContainText(
        new RegExp(`^\\s*${round}\\s*/\\s*${ALPHABET.length}\\s*$`),
      );

      const target =
        (await page.locator('#sfStage').getAttribute('data-target'))?.trim() ?? '';
      expect(target, `round ${round} has no target letter`).toMatch(/^[A-Z]$/);
      asked.push(target);

      let correctIdx = -1;
      for (let i = 0; i < 3; i++) {
        if ((await page.locator(`#sfTile${i}`).getAttribute('data-letter')) === target) {
          correctIdx = i;
          break;
        }
      }
      expect(correctIdx, `round ${round} (${target}) has no matching tile`).toBeGreaterThanOrEqual(0);

      await page.locator(`#sfTile${correctIdx}`).click();
      await expect(page.locator('#sfNextBtn')).toBeEnabled();
      await page.locator('#sfNextBtn').click();
    }

    const duplicates = asked.filter((l, i) => asked.indexOf(l) !== i);
    expect(duplicates, `asked twice: ${duplicates.join(', ')}`).toEqual([]);

    const missing = ALPHABET.filter((l) => !asked.includes(l));
    expect(missing, `never asked for: ${missing.join(', ')}`).toEqual([]);

    // Tier order: the run opens on the high-utility Jolly Phonics set and
    // closes on the rare letters. Checked at the boundaries rather than
    // per-round, since letters shuffle within a tier.
    const opening = asked.slice(0, TIER_1.length);
    expect(opening.slice().sort(), 'a run should open on the SATPIN letters').toEqual(
      TIER_1.slice().sort(),
    );
    const closing = asked.slice(-TIER_4.length);
    expect(closing.slice().sort(), 'a run should close on the rare letters').toEqual(
      TIER_4.slice().sort(),
    );

    await expect(page.locator('#sfDone')).toHaveClass(/sf-done--show/);

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

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="sound-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Sound Friends');
  });

  test('stats page lists Sound Friends in the preschool-literacy family section', async ({ page }) => {
    await page.goto('stats.html');

    const literacySection = page.locator(
      '.stats-section[data-family="preschool-literacy"]',
    );
    await expect(literacySection).toHaveCount(1);

    const card = literacySection.locator(
      '.stats-card[data-game-id="sound-friends"]',
    );
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Sound Friends');

    // Card has the expected 4 metric rows (sessions / rounds /
    // first-try / last played).
    await expect(card.locator('.stats-row')).toHaveCount(4);

    await expect(card).toHaveAttribute('data-family', 'preschool-literacy');
  });
});
