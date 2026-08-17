import { test, expect } from '@playwright/test';

/**
 * Animal Sounds — preschool SCIENCE / listening smoke suite
 * (added 2026-08-17).
 *
 * Sister suite to sound-friends.spec.ts. Same session grammar, inverted
 * prompt: the round prompt is an animal CALL — a real recording, with the
 * onomatopoeia shown as text alongside it — and the three tiles are animal
 * PICTURES, so the answer is "tap the animal that makes this sound". We
 * assert:
 *
 *   - SSR renders header, scene, the sound-prompt card, three animal
 *     tiles each with a distinct animal + emoji + name, and a non-empty
 *     caption. The stage's `data-target` (the answer animal id) matches
 *     exactly one tile's `data-animal`.
 *   - Next is gated on an answer.
 *   - Tapping any tile eventually enables Next + bumps `rounds`.
 *   - Tapping the matching tile lights `as-tile--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping a non-matching tile immediately applies `as-tile--wrong`
 *     (the 250ms shake + red tint from the 2026-08-17 feedback change),
 *     then reveals `as-tile--reveal` on the correct tile once the guided
 *     correction finishes, without bumping `correctFirstTry`.
 *   - The prompt card itself is tappable (replays the call).
 *   - The home page links to the new game.
 *   - /stats lists Animal Sounds in the preschool-cognitive section.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so
 * the correction chain resolves deterministically in headless Chromium,
 * where `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'animal_sounds_stats_v1';

/** Resolve the index of the tile whose animal matches `data-target`. */
const findCorrectIdx = async (page: import('@playwright/test').Page): Promise<number> => {
  const target =
    (await page.locator('#asStage').getAttribute('data-target'))?.trim() ?? '';
  for (let i = 0; i < 3; i++) {
    const animal = await page.locator(`#asTile${i}`).getAttribute('data-animal');
    if (animal === target) return i;
  }
  return -1;
};

test.describe('animal sounds (preschool listening — who says moo?)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/animal-sounds-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a sound prompt, three distinct animal tiles, and a caption', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Animal Sounds/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="animalsounds"]')).toHaveCount(1);

    await expect(page.locator('.as-title')).toContainText(/Animal Sounds/);
    await expect(page.locator('#asProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#asStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#asCaption')).not.toBeEmpty();

    // The prompt is the CALL as text (plus a speaker glyph) — the child
    // must find the animal that makes it. The answer lives on the
    // stage's data-target.
    await expect(page.locator('#asPrompt')).toBeVisible();
    await expect(page.locator('#asPromptSound')).not.toBeEmpty();

    const targetAnimal = (await stage.getAttribute('data-target'))?.trim() ?? '';
    expect(targetAnimal).toMatch(/^[a-z]+$/);

    // Three animal tiles, each carrying an emoji face + a name. Animals
    // must be distinct and exactly one must equal the target.
    await expect(page.locator('.as-tile')).toHaveCount(3);
    const tileAnimals: string[] = [];
    for (let i = 0; i < 3; i++) {
      const animal = await page.locator(`#asTile${i}`).getAttribute('data-animal');
      expect(animal ?? '').toMatch(/^[a-z]+$/);
      tileAnimals.push(animal ?? '');
      await expect(page.locator(`#asTile${i} .as-tile-emoji`)).not.toBeEmpty();
      await expect(page.locator(`#asTile${i} .as-tile-name`)).not.toBeEmpty();
      await expect(page.locator(`button#asTile${i}`)).toHaveCount(1);
    }
    expect(new Set(tileAnimals).size).toBe(3);
    expect(tileAnimals.filter((a) => a === targetAnimal).length).toBe(1);
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#asNextBtn')).toBeDisabled();
  });

  test('tapping any tile eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#asTile0').click();

    // Wrong-answer path is the 3-phase correction (rerun → wrongIs →
    // 350ms pause → reveal). At silent-mode pacing (600ms per phrase)
    // that's roughly 600 + 600 + 350 + 600 ≈ 2.2s. 12s buffers headless
    // variance comfortably.
    await expect(page.locator('#asNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the animal that makes the sound lights the correct state and counts toward first-try stats', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#asTile${correctIdx}`).click();

    await expect(page.locator(`#asTile${correctIdx}`)).toHaveClass(/as-tile--correct/);
    await expect(page.locator('#asNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping the wrong animal applies the red wrong state, then reveals the right one without bumping first-try', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#asTile${wrongIdx}`).click();

    // Wrong-tap feedback (rule revised 2026-08-17): the tapped tile gets
    // `as-tile--wrong` immediately — 250ms shake plus the red tint and
    // the ✗ badge — before the spoken correction starts. Assert it
    // BEFORE waiting on the long reveal chain, since the class is only
    // cleared on the next round render.
    await expect(page.locator(`#asTile${wrongIdx}`)).toHaveClass(/as-tile--wrong/, {
      timeout: 1_000,
    });

    // The red tint is a real computed style, not just a class name — this
    // is the assertion that would catch the CSS being dropped. It must be
    // a retrying `toHaveCSS`, not a one-shot getComputedStyle read: the
    // tile transitions border-color over 180ms, so a single read lands on
    // an interpolated colour.
    await expect(page.locator(`#asTile${wrongIdx}`)).toHaveCSS(
      'border-top-color',
      'rgb(226, 61, 90)',
    );

    // After the correction chain the correct tile lights up.
    await expect(page.locator(`#asTile${correctIdx}`)).toHaveClass(/as-tile--reveal/, {
      timeout: 12_000,
    });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { correctFirstTry: number }) : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  /**
   * The prompt is a real recording from `public/sounds/animals/` (added
   * 2026-08-17), and `playClip` deliberately falls back to speech when a clip
   * can't be played — which means a broken clip URL is *silent*: the game
   * still works, just with a robot voice saying "moo". That is exactly how a
   * base-path bug (`/kids-learning-games-astrosounds/...`) shipped, so assert
   * the requests themselves rather than trusting playback.
   *
   * This runs even with `sound: false`, because the page preloads its clips
   * regardless of the sound setting.
   */
  test('the animal call clips are requested from the correct path and served', async ({
    page,
  }) => {
    const clipResponses: { url: string; status: number; type: string }[] = [];
    page.on('response', (r) => {
      if (r.url().includes('.mp3')) {
        clipResponses.push({
          url: r.url(),
          status: r.status(),
          type: r.headers()['content-type'] ?? '',
        });
      }
    });

    await page.goto('games/animal-sounds-game.html');
    await expect
      .poll(() => clipResponses.length, { timeout: 10_000 })
      .toBeGreaterThan(0);

    for (const r of clipResponses) {
      expect(r.url, `clip must sit under /sounds/animals/: ${r.url}`).toContain(
        '/sounds/animals/',
      );
      expect(r.status, `clip must be served, got ${r.status} for ${r.url}`).toBeLessThan(400);
      expect(r.type, `clip must be audio, got "${r.type}"`).toContain('audio');
    }
  });

  test('the prompt card is a button so the call can be replayed', async ({ page }) => {
    const prompt = page.locator('button#asPrompt');
    await expect(prompt).toHaveCount(1);

    const before = await page.locator('#asPromptSound').textContent();
    await prompt.click();
    // Replaying must not change the round or advance anything.
    await expect(page.locator('#asPromptSound')).toHaveText(before ?? '');
    await expect(page.locator('#asNextBtn')).toBeDisabled();
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="animal-sounds-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Animal Sounds');
  });

  test('stats page lists Animal Sounds in the preschool-cognitive family section', async ({
    page,
  }) => {
    await page.goto('stats.html');

    const cognitiveSection = page.locator(
      '.stats-section[data-family="preschool-cognitive"]',
    );
    await expect(cognitiveSection).toHaveCount(1);

    const card = cognitiveSection.locator('.stats-card[data-game-id="animal-sounds"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Animal Sounds');

    // Card has the expected 4 metric rows (sessions / rounds /
    // first-try / last played).
    await expect(card.locator('.stats-row')).toHaveCount(4);

    await expect(card).toHaveAttribute('data-family', 'preschool-cognitive');
  });
});
