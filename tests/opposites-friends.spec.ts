import { test, expect } from '@playwright/test';

/**
 * Opposites Friends — preschool COGNITIVE (contrast vocabulary) smoke suite
 * (added 2026-08-22).
 *
 * Sister suite to letterfriends.spec.ts / feeling-friends.spec.ts. Same
 * round grammar (prompt card on top, three cards below), new
 * skill: holding two contrasting words against each other. We assert:
 *
 *   - SSR renders header, scene, the prompt card, three distinct word cards,
 *     and a non-empty caption. `data-answer` matches exactly one card.
 *   - The round is a *real* opposite pair — `data-answer` is the partner of
 *     `data-target` — and the target word is never itself on offer.
 *   - No card in a round is a near-synonym of the answer. This is the rule
 *     that keeps a "wrong" tap from being defensible: asked the opposite of
 *     *big*, a child tapping *light* is not really mistaken, so `light` must
 *     not be in the tray at all.
 *   - Next is gated on an answer.
 *   - Tapping any card eventually enables Next + bumps `rounds`.
 *   - Tapping the opposite lights `of-tile--correct` and counts toward
 *     `correctFirstTry`.
 *   - Tapping another card immediately applies `of-tile--wrong` (the 250ms
 *     shake + red tint from the 2026-08-17 feedback rule), then reveals
 *     `of-tile--reveal` on the right card, without bumping `correctFirstTry`.
 *   - A full 8-round session holds those invariants every round and records
 *     a completed session.
 *   - The home page links to the game, and /stats files it under
 *     preschool-cognitive.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it forces
 * narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so the
 * correction chain resolves deterministically in headless Chromium, where
 * `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'opposites_friends_stats_v1';

/** The ten pairs. Declared independently of the app so a data edit that
 *  breaks a pairing fails here rather than teaching a child a false one. */
const PARTNER: Readonly<Record<string, string>> = {
  up: 'down', down: 'up',
  big: 'small', small: 'big',
  hot: 'cold', cold: 'hot',
  day: 'night', night: 'day',
  fast: 'slow', slow: 'fast',
  strong: 'weak', weak: 'strong',
  heavy: 'light', light: 'heavy',
  happy: 'sad', sad: 'happy',
  loud: 'quiet', quiet: 'loud',
  new: 'old', old: 'new',
};

/**
 * Every question a full run should ask: each word once as the target, with
 * its opposite as the answer. `PARTNER` already lists both ends of all ten
 * pairs, so this is exactly 20 — the run length — with no second source of
 * truth to keep in step.
 */
const ALL_QUESTIONS = Object.entries(PARTNER).map(([target, answer]) => `${target}->${answer}`);
const RUN_LENGTH = ALL_QUESTIONS.length;

/**
 * Words that crowd each other's meaning for a 3-year-old. Two of these may
 * never share a round — see the header note on defensible wrong taps.
 */
const COLLISIONS: readonly (readonly string[])[] = [
  ['big', 'heavy', 'strong'],
  ['small', 'light', 'weak'],
];

const collidesWith = (word: string): string[] =>
  COLLISIONS.filter((g) => g.includes(word))
    .flat()
    .filter((w) => w !== word);

interface RoundShape {
  target: string;
  answer: string;
  tiles: string[];
}

const readRound = async (page: import('@playwright/test').Page): Promise<RoundShape> => {
  const stage = page.locator('#ofStage');
  const target = (await stage.getAttribute('data-target'))?.trim() ?? '';
  const answer = (await stage.getAttribute('data-answer'))?.trim() ?? '';
  const tiles: string[] = [];
  for (let i = 0; i < 3; i++) {
    tiles.push((await page.locator(`#ofTile${i}`).getAttribute('data-word')) ?? '');
  }
  return { target, answer, tiles };
};

/** Assert everything that must be true of any round, in any session. */
const expectRoundIsWellFormed = (round: RoundShape): void => {
  const { target, answer, tiles } = round;

  expect(Object.keys(PARTNER), `unknown target word "${target}"`).toContain(target);
  expect(
    answer,
    `the answer must be the target's real opposite (${target} → ${PARTNER[target]})`,
  ).toBe(PARTNER[target]);

  expect(new Set(tiles).size, `cards must be distinct: ${tiles.join(', ')}`).toBe(3);
  expect(tiles.filter((w) => w === answer).length, 'exactly one card is the answer').toBe(1);
  expect(tiles, 'the target word must not also be on offer').not.toContain(target);

  // No card may be a near-synonym of either end of the pair being asked
  // about, or a wrong tap would be defensible.
  for (const banned of [...collidesWith(answer), ...collidesWith(target)]) {
    if (banned === answer || banned === target) continue;
    expect(tiles, `"${banned}" crowds the meaning of "${answer}" — not a fair card`).not.toContain(
      banned,
    );
  }
};

/** Resolve the index of the card holding the round's answer. */
const findCorrectIdx = async (page: import('@playwright/test').Page): Promise<number> => {
  const { answer, tiles } = await readRound(page);
  return tiles.indexOf(answer);
};

test.describe('opposites friends (preschool cognitive — find the opposite)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/opposites-friends-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a prompt, three distinct word cards, and a caption', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Opposites Friends/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="oppositesfriends"]')).toHaveCount(1);

    await expect(page.locator('.of-title')).toContainText(/Opposites Friends/);
    await expect(page.locator('#ofProgressText')).toContainText(
      new RegExp(`^\\s*1\\s*/\\s*${RUN_LENGTH}\\s*$`),
    );

    const stage = page.locator('#ofStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#ofCaption')).not.toBeEmpty();

    await expect(page.locator('#ofPrompt')).toBeVisible();
    await expect(page.locator('#ofPromptText')).not.toBeEmpty();
    await expect(page.locator('#ofPromptEmoji')).not.toBeEmpty();

    await expect(page.locator('.of-tile')).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#ofTile${i}`)).toHaveCount(1);
      await expect(page.locator(`#ofTile${i} .of-tile-emoji`)).not.toBeEmpty();
      await expect(page.locator(`#ofTile${i} .of-tile-name`)).not.toBeEmpty();
    }

    expectRoundIsWellFormed(await readRound(page));
  });

  /**
   * The prompt card shows the target word, and the visible text must agree
   * with the `data-target` the controller validates against — the SSR /
   * hydration mismatch this guards is exactly the kickoff race that bit
   * Counting Friends on 2026-05-15.
   */
  test('the prompt word matches the round the controller is playing', async ({ page }) => {
    const promptText = (await page.locator('#ofPromptText').textContent())?.trim() ?? '';
    expect(promptText).toMatch(/^[A-Z][a-z]+$/);
    expect(promptText.toLowerCase()).toBe(
      (await page.locator('#ofStage').getAttribute('data-target'))?.trim(),
    );
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#ofNextBtn')).toBeDisabled();
  });

  test('tapping any card eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#ofTile0').click();

    // Wrong-answer path is the 3-phase correction (rerun → wrongIs → 350ms
    // pause → reveal). At silent-mode pacing (600ms per phrase) that's
    // roughly 600 + 600 + 350 + 600 ≈ 2.2s. 12s buffers headless variance.
    await expect(page.locator('#ofNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the opposite lights the correct state and counts toward first-try stats', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#ofTile${correctIdx}`).click();

    await expect(page.locator(`#ofTile${correctIdx}`)).toHaveClass(/of-tile--correct/);
    await expect(page.locator('#ofNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping another card applies the red wrong state, then reveals the right one without bumping first-try', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#ofTile${wrongIdx}`).click();

    // Wrong-tap feedback (rule revised 2026-08-17): the tapped card gets
    // `of-tile--wrong` immediately — 250ms shake plus the red tint and the
    // ✗ badge — before the spoken correction starts. Assert it BEFORE
    // waiting on the long reveal chain, since the class is only cleared on
    // the next round render.
    await expect(page.locator(`#ofTile${wrongIdx}`)).toHaveClass(/of-tile--wrong/, {
      timeout: 1_000,
    });

    // The red tint is a real computed style, not just a class name — this is
    // the assertion that would catch the CSS being dropped. It must be a
    // retrying `toHaveCSS`, not a one-shot getComputedStyle read: the card
    // transitions border-color over 180ms, so a single read lands on an
    // interpolated colour.
    await expect(page.locator(`#ofTile${wrongIdx}`)).toHaveCSS(
      'border-top-color',
      'rgb(226, 61, 90)',
    );

    await expect(page.locator(`#ofTile${correctIdx}`)).toHaveClass(/of-tile--reveal/, {
      timeout: 12_000,
    });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { correctFirstTry: number }) : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  /**
   * The correction has to teach the *rule* rather than just point at the
   * answer, and it must never scold — the caption mirrors the narration
   * verbatim, so it's the assertable surface for both.
   */
  test('the spoken correction names the tapped word and never says "wrong"', async ({ page }) => {
    const correctIdx = await findCorrectIdx(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;
    const tapped = (await page.locator(`#ofTile${wrongIdx}`).getAttribute('data-word')) ?? '';
    const answer = (await page.locator('#ofStage').getAttribute('data-answer')) ?? '';

    // Collect every caption the round writes. Accumulated in-page rather
    // than streamed out over `exposeFunction`, so the read below can't race
    // ahead of an in-flight IPC message.
    await page.evaluate(() => {
      const el = document.getElementById('ofCaption');
      if (!el) return;
      const log: string[] = [];
      (window as unknown as { __ofCaptions: string[] }).__ofCaptions = log;
      new MutationObserver(() => log.push(el.textContent ?? '')).observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });

    await page.locator(`#ofTile${wrongIdx}`).click();
    await expect(page.locator(`#ofTile${correctIdx}`)).toHaveClass(/of-tile--reveal/, {
      timeout: 12_000,
    });

    const script = (
      await page.evaluate(
        () => (window as unknown as { __ofCaptions: string[] }).__ofCaptions.join(' '),
      )
    ).toLowerCase();

    expect(script).toContain(tapped);
    expect(script).toContain(answer);
    expect(script).toContain('opposite');
    expect(script).not.toMatch(/\bwrong\b|\bno\b|\btry again\b/);
  });

  /**
   * The invariants above are asserted on round 1, which is SSR'd and
   * therefore deterministic. This walks a whole *randomised* run so the
   * generator itself is under test — the pairing, the collision ban and the
   * "target isn't on offer" rule have to hold on every round, not just the
   * seeded one.
   *
   * Run mode (2026-08-22) adds the coverage claim: 20 rounds, every pair
   * asked in **both** directions. Asking both ways was always the pedagogy —
   * it's what stops a child learning "the small card is the answer" instead
   * of the relation — but the old session picked one direction per pair, so
   * within a sitting the relation was only ever demonstrated one way.
   */
  test('a full run asks every pair in both directions, well formed throughout', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const asked: string[] = [];

    for (let round = 1; round <= RUN_LENGTH; round++) {
      await expect(page.locator('#ofProgressText')).toContainText(
        new RegExp(`^\\s*${round}\\s*/\\s*${RUN_LENGTH}\\s*$`),
      );
      const shown = await readRound(page);
      expectRoundIsWellFormed(shown);
      asked.push(`${shown.target}->${shown.answer}`);

      const correctIdx = await findCorrectIdx(page);
      expect(correctIdx).toBeGreaterThanOrEqual(0);
      await page.locator(`#ofTile${correctIdx}`).click();
      await expect(page.locator('#ofNextBtn')).toBeEnabled();
      await page.locator('#ofNextBtn').click();
    }

    expect(asked.slice().sort(), 'a run should ask each pair both ways, once each').toEqual(
      ALL_QUESTIONS.slice().sort(),
    );

    // The two directions of one pair must not be adjacent: "which one is
    // small?" straight after "which one is big?" is answerable by pointing
    // at the card you just ignored, without engaging with either word.
    const backToBack = asked.filter((q, i) => {
      if (i === 0) return false;
      const pairOf = (s: string): string => s.split('->').sort().join('/');
      return pairOf(q) === pairOf(asked[i - 1]!);
    });
    expect(backToBack, `these were asked twice in a row: ${backToBack.join(', ')}`).toEqual([]);

    await expect(page.locator('#ofDone')).toHaveClass(/of-done--show/);

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { sessions: number; rounds: number; correctFirstTry: number })
        : { sessions: 0, rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.sessions).toBe(1);
    expect(stats.rounds).toBe(RUN_LENGTH);
    expect(stats.correctFirstTry).toBe(RUN_LENGTH);
  });

  test('the prompt card is a button so the question can be repeated', async ({ page }) => {
    const prompt = page.locator('button#ofPrompt');
    await expect(prompt).toHaveCount(1);

    const before = await page.locator('#ofPromptText').textContent();
    await prompt.click();
    // Repeating must not change the round or advance anything.
    await expect(page.locator('#ofPromptText')).toHaveText(before ?? '');
    await expect(page.locator('#ofNextBtn')).toBeDisabled();
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="opposites-friends-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Opposites Friends');
  });

  test('stats page lists Opposites Friends under preschool-cognitive', async ({ page }) => {
    await page.goto('stats.html');

    const section = page.locator('.stats-section[data-family="preschool-cognitive"]');
    await expect(section).toHaveCount(1);

    const card = section.locator('.stats-card[data-game-id="opposites-friends"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Opposites Friends');
    await expect(card).toHaveAttribute('data-family', 'preschool-cognitive');

    // Sessions / rounds / first-try / last played.
    await expect(card.locator('.stats-row')).toHaveCount(4);
  });
});
