import { test, expect } from '@playwright/test';

/**
 * Feeling Friends — preschool SOCIAL-EMOTIONAL smoke suite
 * (added 2026-08-17).
 *
 * Sister suite to letterfriends.spec.ts / animal-sounds.spec.ts. Same
 * session grammar (prompt card on top, three tiles below, 8 rounds), new
 * skill: read a face, and later infer a feeling from a situation. We assert:
 *
 *   - SSR renders header, scene, the prompt card, three face tiles each
 *     with a distinct feeling + a Fluent 3D image, and a non-empty caption.
 *     The stage's `data-target` matches exactly one tile's `data-feeling`.
 *   - Next is gated on an answer.
 *   - Tapping any tile eventually enables Next + bumps `rounds`.
 *   - Tapping the matching face lights `ff-tile--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping a non-matching face immediately applies `ff-tile--wrong`
 *     (the 250ms shake + red tint from the 2026-08-17 feedback change),
 *     then reveals `ff-tile--reveal` on the right face once the guided
 *     correction finishes, without bumping `correctFirstTry`.
 *   - Round 1 is a `label` round (one big word) — the tier ladder puts the
 *     situational vignettes at rounds 7-8, which is what makes this game
 *     more than a relabelled Letter Friends.
 *   - The prompt card is tappable (repeats the question).
 *   - The home page links to the new game.
 *   - /stats lists Feeling Friends under its own `preschool-social` family.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it forces
 * narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so the
 * correction chain resolves deterministically in headless Chromium, where
 * `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'feeling_friends_stats_v1';

/** The eight feelings in the pool — the tile ids must come from this set. */
const FEELINGS = [
  'happy',
  'sad',
  'angry',
  'scared',
  'sleepy',
  'excited',
  'love',
  'caring',
];

/** Resolve the index of the tile whose feeling matches `data-target`. */
const findCorrectIdx = async (page: import('@playwright/test').Page): Promise<number> => {
  const target =
    (await page.locator('#ffStage').getAttribute('data-target'))?.trim() ?? '';
  for (let i = 0; i < 3; i++) {
    const feeling = await page.locator(`#ffTile${i}`).getAttribute('data-feeling');
    if (feeling === target) return i;
  }
  return -1;
};

test.describe('feeling friends (preschool social-emotional — show me happy)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/feeling-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a prompt, three distinct face tiles, and a caption', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Feeling Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="feelingfriends"]')).toHaveCount(1);

    await expect(page.locator('.ff-title')).toContainText(/Feeling Friends/);
    await expect(page.locator('#ffProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#ffStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#ffCaption')).not.toBeEmpty();

    await expect(page.locator('#ffPrompt')).toBeVisible();
    await expect(page.locator('#ffPromptText')).not.toBeEmpty();

    const targetFeeling = (await stage.getAttribute('data-target'))?.trim() ?? '';
    expect(FEELINGS).toContain(targetFeeling);

    // Three face tiles, each carrying a Fluent 3D image + a name. Feelings
    // must be distinct and exactly one must equal the target.
    await expect(page.locator('.ff-tile')).toHaveCount(3);
    const tileFeelings: string[] = [];
    for (let i = 0; i < 3; i++) {
      const feeling = await page.locator(`#ffTile${i}`).getAttribute('data-feeling');
      expect(FEELINGS).toContain(feeling ?? '');
      tileFeelings.push(feeling ?? '');
      // The face is an <img>, not an emoji span — the whole point of this
      // game is that the picture carries the question, and platform emoji
      // fonts disagree too much about faces to be trusted with it.
      await expect(page.locator(`#ffTile${i} img.ff-tile-img`)).toHaveCount(1);
      await expect(page.locator(`#ffTile${i} .ff-tile-name`)).not.toBeEmpty();
      await expect(page.locator(`button#ffTile${i}`)).toHaveCount(1);
    }
    expect(new Set(tileFeelings).size).toBe(3);
    expect(tileFeelings.filter((f) => f === targetFeeling).length).toBe(1);
  });

  /**
   * The tier ladder is the pedagogy: rounds 1-3 name a feeling from a word,
   * 4-6 do the same with the subtler faces, and only rounds 7-8 ask the
   * child to infer a feeling from a situation. Round 1 being a `label`
   * round is what stops the game opening on its hardest question.
   */
  test('round 1 is a label round, so the prompt is a single feeling word', async ({
    page,
  }) => {
    await expect(page.locator('#ffStage')).toHaveAttribute('data-kind', 'label');

    const promptText = (await page.locator('#ffPromptText').textContent())?.trim() ?? '';
    // A label prompt is one capitalised word ("Happy"); a vignette is a
    // whole sentence ending in a full stop.
    expect(promptText).toMatch(/^[A-Z][a-z]+$/);
    expect(promptText.toLowerCase()).toBe(
      (await page.locator('#ffStage').getAttribute('data-target'))?.trim(),
    );
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#ffNextBtn')).toBeDisabled();
  });

  test('tapping any tile eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#ffTile0').click();

    // Wrong-answer path is the 3-phase correction (rerun → wrongIs →
    // 350ms pause → reveal). At silent-mode pacing (600ms per phrase)
    // that's roughly 600 + 600 + 350 + 600 ≈ 2.2s. 12s buffers headless
    // variance comfortably.
    await expect(page.locator('#ffNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the matching face lights the correct state and counts toward first-try stats', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#ffTile${correctIdx}`).click();

    await expect(page.locator(`#ffTile${correctIdx}`)).toHaveClass(/ff-tile--correct/);
    await expect(page.locator('#ffNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping the wrong face applies the red wrong state, then reveals the right one without bumping first-try', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#ffTile${wrongIdx}`).click();

    // Wrong-tap feedback (rule revised 2026-08-17): the tapped tile gets
    // `ff-tile--wrong` immediately — 250ms shake plus the red tint and the
    // ✗ badge — before the spoken correction starts. Assert it BEFORE
    // waiting on the long reveal chain, since the class is only cleared on
    // the next round render.
    await expect(page.locator(`#ffTile${wrongIdx}`)).toHaveClass(/ff-tile--wrong/, {
      timeout: 1_000,
    });

    // The red tint is a real computed style, not just a class name — this
    // is the assertion that would catch the CSS being dropped. It must be a
    // retrying `toHaveCSS`, not a one-shot getComputedStyle read: the tile
    // transitions border-color over 180ms, so a single read lands on an
    // interpolated colour.
    await expect(page.locator(`#ffTile${wrongIdx}`)).toHaveCSS(
      'border-top-color',
      'rgb(226, 61, 90)',
    );

    // After the correction chain the right face lights up.
    await expect(page.locator(`#ffTile${correctIdx}`)).toHaveClass(/ff-tile--reveal/, {
      timeout: 12_000,
    });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { correctFirstTry: number }) : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  /**
   * The guided correction is the part of this game that had to be written
   * carefully: feelings are a domain where "wrong" lands hard, so the
   * script names what the child tapped and points at visual evidence, and
   * never says no / wrong / try again. The caption mirrors the narration
   * verbatim, so it's the assertable surface for that rule.
   */
  test('the spoken correction names the tapped face and never says "wrong"', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;
    const tapped =
      (await page.locator(`#ffTile${wrongIdx}`).getAttribute('data-feeling')) ?? '';
    const target =
      (await page.locator('#ffStage').getAttribute('data-target')) ?? '';

    // Collect every caption the round writes. Accumulated in-page rather
    // than streamed out over `exposeFunction`, so the read below can't race
    // ahead of an in-flight IPC message.
    await page.evaluate(() => {
      const el = document.getElementById('ffCaption');
      if (!el) return;
      const log: string[] = [];
      (window as unknown as { __ffCaptions: string[] }).__ffCaptions = log;
      new MutationObserver(() => log.push(el.textContent ?? '')).observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });

    await page.locator(`#ffTile${wrongIdx}`).click();
    await expect(page.locator(`#ffTile${correctIdx}`)).toHaveClass(/ff-tile--reveal/, {
      timeout: 12_000,
    });

    const script = (
      await page.evaluate(
        () => (window as unknown as { __ffCaptions: string[] }).__ffCaptions.join(' '),
      )
    ).toLowerCase();

    // Names the face that was actually tapped, and the one we were after.
    expect(script).toContain(tapped);
    expect(script).toContain(target);
    // And never scolds.
    expect(script).not.toMatch(/\bwrong\b|\bno\b|\btry again\b/);
  });

  /**
   * The faces are vendored under `public/images/feelings/` rather than pulled
   * from jsDelivr, because here the picture *is* the question — see that
   * directory's CREDITS.md. Two things can silently break that and leave a
   * playable-looking game with emoji fallbacks in place of the question: a
   * base-path concat bug (the `/kids-learning-games-astroimages/…` shape that
   * shipped in the audio layer the same day) and a missing file. Assert the
   * URL shape and that the bytes are really served.
   */
  test('the face images are vendored under the base path and really served', async ({
    page,
  }) => {
    const srcs = await page
      .locator('.ff-tile img.ff-tile-img')
      .evaluateAll((els) => els.map((el) => (el as HTMLImageElement).getAttribute('src') ?? ''));
    expect(srcs).toHaveLength(3);
    for (const src of srcs) {
      expect(src, `face must sit under the base path: ${src}`).toMatch(
        /^\/kids-learning-games-astro\/images\/feelings\/[a-z]+\.png$/,
      );
    }

    // `happy` is in tier 1, so it's always in the pool.
    const res = await page.request.get('images/feelings/happy.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('image/png');
    expect((await res.body()).byteLength).toBeGreaterThan(1000);
  });

  /**
   * The faces have to be on screen for the round to be answerable, so no image
   * on this page may come from a third party, and `load` must not be waiting
   * on one. Regression guard for 2026-08-17, when an upstream folder rename
   * turned every jsDelivr Fluent path into an 8-44 second miss and this page's
   * `load` event stopped firing at all.
   *
   * Only images are checked: `BuildInfo.astro` calls the GitHub API on every
   * page of the site, which is unrelated to whether the round is playable.
   */
  test('no image on the page comes from a third party, and load fires fast', async ({
    page,
  }) => {
    const remoteImages: string[] = [];
    page.on('request', (r) => {
      const url = r.url();
      if (
        r.resourceType() === 'image' &&
        /^https?:\/\//.test(url) &&
        !url.startsWith('http://127.0.0.1:')
      ) {
        remoteImages.push(url);
      }
    });

    // A tight `load` budget is half the assertion: locally this page loads in
    // ~150ms, so 10s only trips if something is being waited on.
    await page.goto('games/feeling-friends-game.html', {
      waitUntil: 'load',
      timeout: 10_000,
    });
    await expect(page.locator('.ff-tile')).toHaveCount(3);

    expect(
      remoteImages,
      `every face must be served locally, got: ${remoteImages.join(', ')}`,
    ).toEqual([]);
  });

  test('the prompt card is a button so the question can be repeated', async ({ page }) => {
    const prompt = page.locator('button#ffPrompt');
    await expect(prompt).toHaveCount(1);

    const before = await page.locator('#ffPromptText').textContent();
    await prompt.click();
    // Repeating must not change the round or advance anything.
    await expect(page.locator('#ffPromptText')).toHaveText(before ?? '');
    await expect(page.locator('#ffNextBtn')).toBeDisabled();
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="feeling-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Feeling Friends');
  });

  test('stats page lists Feeling Friends in its own preschool-social family section', async ({
    page,
  }) => {
    await page.goto('stats.html');

    const socialSection = page.locator('.stats-section[data-family="preschool-social"]');
    await expect(socialSection).toHaveCount(1);

    const card = socialSection.locator('.stats-card[data-game-id="feeling-friends"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Feeling Friends');

    // Card has the expected 4 metric rows (sessions / rounds / first-try /
    // last played).
    await expect(card.locator('.stats-row')).toHaveCount(4);

    await expect(card).toHaveAttribute('data-family', 'preschool-social');

    // Feeling Friends is the only game in the family today, so this is also
    // the assertion that the new section isn't accidentally collecting
    // siblings from preschool-cognitive.
    await expect(socialSection.locator('.stats-card')).toHaveCount(1);
  });
});
