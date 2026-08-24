import { test, expect } from '@playwright/test';
import { passChapterBreak } from './helpers';

/**
 * Animal Sounds — preschool SCIENCE / listening smoke suite
 * (added 2026-08-17, converted from sessions to a full run 2026-08-22).
 *
 * The round prompt is an animal CALL — a real recording, with the
 * onomatopoeia shown as text alongside it — and the three tiles are animal
 * PICTURES, so the answer is "tap the animal that makes this sound".
 *
 * ── What changed on 2026-08-22 ─────────────────────────────────────
 *
 * The game no longer deals a fixed 8-round session sampled with replacement.
 * One play is now a **run**: every clip-backed animal exactly once, ordered
 * easiest tier first. That makes two properties testable that previously
 * weren't even true — the run visits the whole pool, and it never repeats an
 * animal — and both are asserted below by walking a complete run.
 *
 * `EXPECTED_RUN` is declared here rather than imported from
 * `@/data/animal-sounds`, following the same convention as stats.spec.ts:
 * importing would make the test restate whatever the source says and pass
 * unconditionally. Declared independently, adding or dropping a clip fails
 * here and forces the change to be deliberate.
 *
 * We assert:
 *
 *   - SSR renders header, scene, the sound-prompt card, three animal
 *     tiles each with a distinct animal + emoji + name, and a non-empty
 *     caption. The stage's `data-target` (the answer animal id) matches
 *     exactly one tile's `data-animal`.
 *   - The progress pill counts out of the full pool, not 8.
 *   - A full run visits every clip-backed animal exactly once — including
 *     across the SSR handoff, which is where a naive `.slice(1)` would
 *     silently duplicate the first animal and drop another.
 *   - Next is gated on an answer.
 *   - Tapping any tile eventually enables Next + bumps `rounds`.
 *   - Tapping the matching tile lights `as-tile--correct` and counts
 *     toward `correctFirstTry`.
 *   - Tapping a non-matching tile immediately applies `as-tile--wrong`
 *     (the 250ms shake + red tint from the 2026-08-17 feedback change),
 *     then reveals `as-tile--reveal` on the correct tile once the guided
 *     correction finishes, without bumping `correctFirstTry`.
 *   - The prompt card itself is tappable (replays the call).
 *   - Every clip in the run is served as audio from the expected path.
 *   - The home page links to the game.
 *   - /stats lists Animal Sounds in the preschool-cognitive section.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it
 * forces narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so
 * the correction chain resolves deterministically in headless Chromium,
 * where `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'animal_sounds_stats_v1';

/**
 * Every animal with a recording, i.e. every animal a run must visit. Snake
 * is deliberately absent — it is still a picture option, but no genuine hiss
 * exists on Commons, so it can never be a prompt (see CREDITS.md).
 */
const EXPECTED_RUN: readonly string[] = [
  // tier 1 — barnyard
  'cow', 'dog', 'cat', 'pig', 'sheep', 'duck', 'goat',
  // tier 2 — farm extras + yard/garden
  'horse', 'chicken', 'rooster', 'frog', 'bee', 'turkey',
  'donkey', 'goose', 'crow', 'cricket', 'dove',
  // tier 3 — wild
  'lion', 'elephant', 'monkey', 'wolf', 'owl', 'bear',
  'tiger', 'peacock', 'seagull',
];

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
    await expect(page.locator('#asProgressText')).toContainText(
      new RegExp(`^\\s*1\\s*/\\s*${EXPECTED_RUN.length}\\s*$`),
    );

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

  /**
   * The whole point of dropping sessions: one play covers the entire pool,
   * and no animal comes up twice.
   *
   * The duplicate half of this is not hypothetical. The page keeps the
   * SSR-rendered round 0 and appends a freshly generated run, and the
   * obvious way to join them — `[ssrRound, ...generateRun().slice(1)]`,
   * which is what the old session code did — drops whichever animal
   * happened to be generated first and leaves the SSR'd one still sitting
   * later in the list. The result is one animal twice, another never, and a
   * run that still has exactly the right *length*. Only checking the set of
   * targets catches it.
   */
  test('a full run visits every clip-backed animal exactly once', async ({ page }) => {
    test.setTimeout(180_000);

    const seen: string[] = [];

    for (let round = 1; round <= EXPECTED_RUN.length; round++) {
      await expect(page.locator('#asProgressText')).toContainText(
        new RegExp(`^\\s*${round}\\s*/\\s*${EXPECTED_RUN.length}\\s*$`),
      );

      const target =
        (await page.locator('#asStage').getAttribute('data-target'))?.trim() ?? '';
      expect(target, `round ${round} has no target`).not.toBe('');
      seen.push(target);

      const correctIdx = await findCorrectIdx(page);
      expect(correctIdx, `round ${round}: no tile matches "${target}"`).toBeGreaterThanOrEqual(0);
      await page.locator(`#asTile${correctIdx}`).click();
      await expect(page.locator('#asNextBtn')).toBeEnabled();
      await page.locator('#asNextBtn').click();
      await passChapterBreak(page);
    }

    const duplicates = seen.filter((a, i) => seen.indexOf(a) !== i);
    expect(duplicates, `these animals came up more than once: ${duplicates.join(', ')}`).toEqual([]);

    const missing = EXPECTED_RUN.filter((a) => !seen.includes(a));
    expect(missing, `a full run never played: ${missing.join(', ')}`).toEqual([]);

    const unexpected = seen.filter((a) => !EXPECTED_RUN.includes(a));
    expect(unexpected, `not clip-backed, so can't be a prompt: ${unexpected.join(', ')}`).toEqual([]);

    // Finishing the run is what records it; rounds counted all the way.
    await expect(page.locator('#asDone')).toHaveClass(/as-done--show/);
    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { sessions: number; rounds: number; correctFirstTry: number })
        : { sessions: 0, rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.sessions).toBe(1);
    expect(stats.rounds).toBe(EXPECTED_RUN.length);
    expect(stats.correctFirstTry).toBe(EXPECTED_RUN.length);
  });

  /**
   * Every prompt in the pool has to actually be served. The existing clip
   * test only sees whatever the current run preloads, which after the
   * rolling-preload change is the first few files rather than all of them —
   * so a mastering slip on a tier-3 animal would go unnoticed until a child
   * reached it.
   */
  /**
   * A 27-round run used to ask the identical question 27 times.
   *
   * Found by playing the whole game through and reading the transcript back
   * rather than by any test: one distinct prompt for the longest sit in the
   * app, where Where's Teddy manages 25 across 25 rounds. It stayed invisible
   * because nothing was *broken* — the sentence is perfectly good, a child
   * just hears it for the twenty-seventh time.
   *
   * The sameness had a real cause worth preserving: while a recording is
   * playing, the prompt cannot name the animal or pronounce its call without
   * handing over the answer, so the phrasings are all deliberately plain and
   * animal-agnostic. This asserts they rotate, not what they say.
   */
  test('the prompt does not repeat itself round after round', async ({ page }) => {
    test.setTimeout(180_000);

    // Two things had to be arranged before this measured anything, both found
    // by pinning the prompt to a constant and watching the test still pass:
    //
    //  1. The caption only carries the prompt once the round has *asked* it,
    //     so the prompt card gets tapped first — that is `onReplay`, which
    //     calls `speakIntro` and writes the string it speaks. Read cold, the
    //     caption still holds the previous round's text, which varies by
    //     animal regardless.
    //  2. Sound has to be ON, and playback has to succeed. There are two
    //     phrasings: with a clip the prompt must not name the animal or say
    //     its call, and without one the voice *is* the call ("Moo! Who says
    //     moo?"). The suite's default is `sound: false`, so every reading came
    //     back as the second — which varies per animal however the first is
    //     written. The repetition being fixed here only ever existed on the
    //     clip path, which is the one a child with sound on hears.
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        setTimeout(() => this.dispatchEvent(new Event('ended')), 10);
        return Promise.resolve();
      };
    });
    await page.evaluate(() => {
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: true, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();

    const seen: string[] = [];
    const ROUNDS = 12;
    for (let round = 1; round <= ROUNDS; round++) {
      await page.locator('#asPrompt').click();
      await page.waitForTimeout(120);
      const caption = (await page.locator('#asCaption').textContent())?.trim() ?? '';
      if (caption) seen.push(caption);

      const correctIdx = await findCorrectIdx(page);
      await page.locator(`#asTile${correctIdx}`).click();
      await expect(page.locator('#asNextBtn')).toBeEnabled();
      await page.locator('#asNextBtn').click();
      await passChapterBreak(page);
    }

    const distinct = new Set(seen);
    expect(
      distinct.size,
      `${ROUNDS} rounds asked the same question ${seen.length} times: ` +
        `"${seen[0]}". A run is 27 rounds — that is the sentence a child hears ` +
        `every single time.`,
    ).toBeGreaterThan(2);
  });

  test('every animal in the run has a real clip served as audio', async ({ page }) => {
    for (const animal of EXPECTED_RUN) {
      const res = await page.request.get(`sounds/animals/${animal}.mp3`);
      expect(res.status(), `${animal}.mp3 is missing`).toBe(200);
      expect(
        res.headers()['content-type'] ?? '',
        `${animal}.mp3 is not served as audio`,
      ).toContain('audio');
      expect(
        (await res.body()).byteLength,
        `${animal}.mp3 is too small to be a real recording`,
      ).toBeGreaterThan(2000);
    }
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
   *
   * The HTTP cache has to be disabled first: `beforeEach` already loads this
   * page twice, so by the third load the preload is usually a memory-cache hit
   * that never reaches the network and fires no `response` event. Without this
   * the assertion below passes or fails depending on cache timing.
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

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

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

  /**
   * Companion to the test above, and the half that can't flake: assert the
   * asset really is deployed at the path the game asks for, independently of
   * whether the browser happens to hit the network on this load. `cow` is in
   * tier 1, so it's always in the clip set.
   */
  test('a vendored clip is served as audio at the expected relative path', async ({
    page,
  }) => {
    const res = await page.request.get('sounds/animals/cow.mp3');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('audio');
    expect((await res.body()).byteLength).toBeGreaterThan(1000);
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
