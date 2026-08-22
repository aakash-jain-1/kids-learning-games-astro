import { test, expect } from '@playwright/test';

/**
 * Rhyme Time — preschool LITERACY (rhyme recognition) smoke suite
 * (added 2026-08-22).
 *
 * Sister suite to sound-friends.spec.ts / opposites-friends.spec.ts. Same
 * session grammar (prompt card on top, three cards below, 8 rounds), new
 * skill: hearing that two words end with the same sound. We assert:
 *
 *   - SSR renders header, scene, the prompt card, three distinct word cards,
 *     and a non-empty caption. `data-answer` matches exactly one card.
 *   - The answer really rhymes with the target, and — the invariant the
 *     whole game rests on — **neither distractor does**. A round with two
 *     rhyming cards has two right answers.
 *   - The target word is never itself on offer.
 *   - The rime chip stays hidden until the round is settled, then shows the
 *     shared ending of the pair being asked about.
 *   - The rime is NEVER spoken. The caption mirrors the narration verbatim,
 *     so it is the assertable surface for the rule: speech synthesis can't
 *     know which vowel a bare rime takes, and saying it wrong teaches the
 *     wrong sound at the exact moment the game is teaching the right one.
 *   - Next is gated on an answer.
 *   - Tapping the rhyme lights `rt-tile--correct` and counts toward
 *     `correctFirstTry`; tapping another card applies `rt-tile--wrong` (the
 *     250ms shake + red tint from the 2026-08-17 feedback rule) and then
 *     reveals `rt-tile--reveal`, without bumping `correctFirstTry`.
 *   - The last two rounds set the alliteration trap — a distractor that
 *     starts with the target's sound. That's the game's actual difficulty
 *     curve, so it's asserted rather than assumed.
 *   - The home page links to the game, and /stats files it under
 *     preschool-literacy.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it forces
 * narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so the
 * correction chain resolves deterministically in headless Chromium, where
 * `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'rhyme_time_stats_v1';

/**
 * The nine pairs, declared independently of the app so a data edit that
 * breaks a pairing fails here rather than teaching a child a false rhyme.
 * `bow`/`snow` is deliberately absent: `bow` is a homograph and the child
 * only ever hears it.
 */
const PARTNER: Readonly<Record<string, string>> = {
  cat: 'hat', hat: 'cat',
  dog: 'log', log: 'dog',
  bee: 'tree', tree: 'bee',
  mouse: 'house', house: 'mouse',
  star: 'car', car: 'star',
  moon: 'spoon', spoon: 'moon',
  cake: 'lake', lake: 'cake',
  king: 'ring', ring: 'king',
  book: 'cook', cook: 'book',
};

/** The shared ending each word carries. Two words rhyme iff these match. */
const RIME: Readonly<Record<string, string>> = {
  cat: 'at', hat: 'at',
  dog: 'og', log: 'og',
  bee: 'ee', tree: 'ee',
  mouse: 'ouse', house: 'ouse',
  star: 'ar', car: 'ar',
  moon: 'oon', spoon: 'oon',
  cake: 'ake', lake: 'ake',
  king: 'ing', ring: 'ing',
  book: 'ook', cook: 'ook',
};

/** Starting sound, as a phoneme rather than a letter — `king` and `cat`
 *  are both `k`. Used to assert the tier-3 alliteration trap. */
const ONSET: Readonly<Record<string, string>> = {
  cat: 'k', hat: 'h',
  dog: 'd', log: 'l',
  bee: 'b', tree: 't',
  mouse: 'm', house: 'h',
  star: 's', car: 'k',
  moon: 'm', spoon: 's',
  cake: 'k', lake: 'l',
  king: 'k', ring: 'r',
  book: 'b', cook: 'k',
};

interface RoundShape {
  target: string;
  answer: string;
  tiles: string[];
}

const readRound = async (page: import('@playwright/test').Page): Promise<RoundShape> => {
  const stage = page.locator('#rtStage');
  const target = (await stage.getAttribute('data-target'))?.trim() ?? '';
  const answer = (await stage.getAttribute('data-answer'))?.trim() ?? '';
  const tiles: string[] = [];
  for (let i = 0; i < 3; i++) {
    tiles.push((await page.locator(`#rtTile${i}`).getAttribute('data-word')) ?? '');
  }
  return { target, answer, tiles };
};

/** Assert everything that must be true of any round, in any session. */
const expectRoundIsWellFormed = (round: RoundShape): void => {
  const { target, answer, tiles } = round;

  expect(Object.keys(PARTNER), `unknown target word "${target}"`).toContain(target);
  expect(
    answer,
    `the answer must be the target's real rhyme (${target} → ${PARTNER[target]})`,
  ).toBe(PARTNER[target]);

  expect(new Set(tiles).size, `cards must be distinct: ${tiles.join(', ')}`).toBe(3);
  expect(tiles.filter((w) => w === answer).length, 'exactly one card is the answer').toBe(1);
  expect(tiles, 'the target word must not also be on offer').not.toContain(target);

  // The load-bearing one: a distractor that rhymes would give the round two
  // right answers, and the child would be told a correct tap was a miss.
  for (const word of tiles) {
    if (word === answer) continue;
    expect(
      RIME[word],
      `"${word}" rhymes with "${target}" — it can't be a distractor`,
    ).not.toBe(RIME[target]);
  }
};

/** Resolve the index of the card holding the round's answer. */
const findCorrectIdx = async (page: import('@playwright/test').Page): Promise<number> => {
  const { answer, tiles } = await readRound(page);
  return tiles.indexOf(answer);
};

/**
 * Record every caption the page writes from now on. Accumulated in-page
 * rather than streamed out over `exposeFunction`, so a later read can't race
 * ahead of an in-flight IPC message.
 */
const captureCaptions = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.evaluate(() => {
    const el = document.getElementById('rtCaption');
    if (!el) return;
    const log: string[] = [el.textContent ?? ''];
    (window as unknown as { __rtCaptions: string[] }).__rtCaptions = log;
    new MutationObserver(() => log.push(el.textContent ?? '')).observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
};

const readCaptions = async (page: import('@playwright/test').Page): Promise<string> =>
  (
    await page.evaluate(
      () => (window as unknown as { __rtCaptions: string[] }).__rtCaptions.join(' '),
    )
  ).toLowerCase();

test.describe('rhyme time (preschool literacy — find the rhyme)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/rhyme-time-game.html');
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
    await expect(page).toHaveTitle(/Rhyme Time/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="rhymetime"]')).toHaveCount(1);

    await expect(page.locator('.rt-title')).toContainText(/Rhyme Time/);
    await expect(page.locator('#rtProgressText')).toContainText(/^\s*1\s*\/\s*8\s*$/);

    const stage = page.locator('#rtStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#rtCaption')).not.toBeEmpty();

    await expect(page.locator('#rtPrompt')).toBeVisible();
    await expect(page.locator('#rtPromptText')).not.toBeEmpty();
    await expect(page.locator('#rtPromptEmoji')).not.toBeEmpty();

    await expect(page.locator('.rt-tile')).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#rtTile${i}`)).toHaveCount(1);
      await expect(page.locator(`#rtTile${i} .rt-tile-emoji`)).not.toBeEmpty();
      await expect(page.locator(`#rtTile${i} .rt-tile-name`)).not.toBeEmpty();
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
    const promptText = (await page.locator('#rtPromptText').textContent())?.trim() ?? '';
    expect(promptText).toMatch(/^[A-Z][a-z]+$/);
    expect(promptText.toLowerCase()).toBe(
      (await page.locator('#rtStage').getAttribute('data-target'))?.trim(),
    );
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#rtNextBtn')).toBeDisabled();
  });

  test('tapping any card eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#rtTile0').click();

    // Wrong-answer path is the 3-phase correction (rerun → wrongIs → 350ms
    // pause → reveal). At silent-mode pacing (600ms per phrase) that's
    // roughly 600 + 600 + 350 + 600 ≈ 2.2s. 12s buffers headless variance.
    await expect(page.locator('#rtNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the rhyme lights the correct state and counts toward first-try stats', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#rtTile${correctIdx}`).click();

    await expect(page.locator(`#rtTile${correctIdx}`)).toHaveClass(/rt-tile--correct/);
    await expect(page.locator('#rtNextBtn')).toBeEnabled();

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

    await page.locator(`#rtTile${wrongIdx}`).click();

    // Wrong-tap feedback (rule revised 2026-08-17): the tapped card gets
    // `rt-tile--wrong` immediately — 250ms shake plus the red tint and the
    // ✗ badge — before the spoken correction starts. Assert it BEFORE
    // waiting on the long reveal chain, since the class is only cleared on
    // the next round render.
    await expect(page.locator(`#rtTile${wrongIdx}`)).toHaveClass(/rt-tile--wrong/, {
      timeout: 1_000,
    });

    // The red tint is a real computed style, not just a class name — this is
    // the assertion that would catch the CSS being dropped. It must be a
    // retrying `toHaveCSS`, not a one-shot getComputedStyle read: the card
    // transitions border-color over 180ms, so a single read lands on an
    // interpolated colour.
    await expect(page.locator(`#rtTile${wrongIdx}`)).toHaveCSS(
      'border-top-color',
      'rgb(226, 61, 90)',
    );

    await expect(page.locator(`#rtTile${correctIdx}`)).toHaveClass(/rt-tile--reveal/, {
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
    const tapped = (await page.locator(`#rtTile${wrongIdx}`).getAttribute('data-word')) ?? '';
    const answer = (await page.locator('#rtStage').getAttribute('data-answer')) ?? '';

    await captureCaptions(page);
    await page.locator(`#rtTile${wrongIdx}`).click();
    await expect(page.locator(`#rtTile${correctIdx}`)).toHaveClass(/rt-tile--reveal/, {
      timeout: 12_000,
    });

    const script = await readCaptions(page);
    expect(script).toContain(tapped);
    expect(script).toContain(answer);
    expect(script).toContain('rhyme');
    expect(script).not.toMatch(/\bwrong\b|\bno\b|\btry again\b/);
  });

  /**
   * The rime is written, never spoken. A voice reading a bare "-ow" has no
   * way to know whether it's the vowel in *snow* or the one in *cow*, so
   * naming it aloud can teach the wrong sound in the exact moment the game
   * is teaching the right one. The spoken script demonstrates with the two
   * whole words instead; the chip carries the letters.
   */
  test('the shared ending is shown on a chip and never spoken', async ({ page }) => {
    const { target } = await readRound(page);
    const rime = RIME[target]!;

    const chip = page.locator('#rtRimeChip');
    await expect(chip, 'the ending is a hint, so it waits until the round settles').not.toBeVisible();

    await captureCaptions(page);
    const correctIdx = await findCorrectIdx(page);
    await page.locator(`#rtTile${correctIdx}`).click();

    await expect(chip).toBeVisible();
    await expect(page.locator('#rtRimeValue')).toHaveText(`-${rime}`);

    // Word-boundary match: "at" inside "cat" is the point of the game, a
    // bare "at" on its own is the thing that must never be uttered.
    const script = await readCaptions(page);
    expect(
      script,
      `the narration spoke the bare rime "${rime}" — it must only ever be shown`,
    ).not.toMatch(new RegExp(`\\b${rime}\\b`));
    expect(script, 'the chip form must not leak into speech').not.toContain(`-${rime}`);
  });

  /**
   * The invariants above are asserted on round 1, which is SSR'd and
   * therefore deterministic. This walks all eight rounds of a *randomised*
   * session so the generator itself is under test — the pairing and the
   * "no distractor rhymes" rule have to hold on every round, not just the
   * seeded one.
   *
   * Rounds 7 and 8 additionally carry the alliteration trap: a distractor
   * starting with the target's sound, so the round can only be won by
   * listening to the *end* of the word. That is the game's difficulty
   * curve, and a generator change that quietly dropped it would otherwise
   * leave every test passing.
   */
  test('every round of a full session is well formed, and finishing records a session', async ({
    page,
  }) => {
    for (let round = 1; round <= 8; round++) {
      await expect(page.locator('#rtProgressText')).toContainText(
        new RegExp(`^\\s*${round}\\s*/\\s*8\\s*$`),
      );

      const shape = await readRound(page);
      expectRoundIsWellFormed(shape);

      if (round >= 7) {
        const trap = shape.tiles.filter(
          (w) => w !== shape.answer && ONSET[w] === ONSET[shape.target],
        );
        expect(
          trap.length,
          `round ${round} should offer a word starting like "${shape.target}" ` +
            `(cards: ${shape.tiles.join(', ')})`,
        ).toBeGreaterThan(0);
      }

      const correctIdx = shape.tiles.indexOf(shape.answer);
      expect(correctIdx).toBeGreaterThanOrEqual(0);
      await page.locator(`#rtTile${correctIdx}`).click();
      await expect(page.locator('#rtNextBtn')).toBeEnabled();
      await page.locator('#rtNextBtn').click();
    }

    await expect(page.locator('#rtDone')).toHaveClass(/rt-done--show/);

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { sessions: number; rounds: number; correctFirstTry: number })
        : { sessions: 0, rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.sessions).toBe(1);
    expect(stats.rounds).toBe(8);
    expect(stats.correctFirstTry).toBe(8);
  });

  /**
   * This game is audio-first in a way its siblings aren't: the three
   * options are only ever *spoken*, and a 3yo can't read the labels. A
   * child who lost one of the words has to be able to get all three back.
   */
  test('the prompt card repeats the question including all three options', async ({ page }) => {
    const prompt = page.locator('button#rtPrompt');
    await expect(prompt).toHaveCount(1);

    const { tiles } = await readRound(page);
    const before = await page.locator('#rtPromptText').textContent();

    await captureCaptions(page);
    await prompt.click();

    const script = await readCaptions(page);
    for (const word of tiles) {
      expect(script, `the repeat dropped the option "${word}"`).toContain(word);
    }

    // Repeating must not change the round or advance anything.
    await expect(page.locator('#rtPromptText')).toHaveText(before ?? '');
    await expect(page.locator('#rtNextBtn')).toBeDisabled();
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="rhyme-time-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Rhyme Time');
  });

  test('stats page lists Rhyme Time under preschool-literacy', async ({ page }) => {
    await page.goto('stats.html');

    const section = page.locator('.stats-section[data-family="preschool-literacy"]');
    await expect(section).toHaveCount(1);

    const card = section.locator('.stats-card[data-game-id="rhyme-time"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Rhyme Time');
    await expect(card).toHaveAttribute('data-family', 'preschool-literacy');

    // Sessions / rounds / first-try / last played.
    await expect(card.locator('.stats-row')).toHaveCount(4);
  });
});
