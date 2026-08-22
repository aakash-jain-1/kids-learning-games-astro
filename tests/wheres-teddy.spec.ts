import { test, expect, type Page } from '@playwright/test';

/**
 * Where's Teddy? — preschool COGNITIVE (spatial / positional words) smoke
 * suite (added 2026-08-22).
 *
 * Sister suite to opposites-friends.spec.ts. Same round grammar (prompt card
 * on top, three options below), new skill: reading a *relation* between two
 * things rather than recognising either thing.
 *
 * Three of the assertions here are specific to this game and are the ones
 * worth reading:
 *
 *   - **All three scenes show the same pair.** This is the whole mechanic. If
 *     the scenes ever held different objects the child could answer by
 *     recognising a picture, which is the shortcut the game exists to
 *     remove, and nothing else in the suite would notice.
 *   - **`in` and `behind` never share a round.** Flat emoji cannot draw those
 *     two distinguishably — a teddy inside a box and a teddy behind a box are
 *     both "an emoji whose bottom is hidden". Keeping them apart is what let
 *     the game ship five prepositions instead of the three the design doc was
 *     ready to fall back to, so it is load-bearing rather than cosmetic.
 *   - **A full run asks every relation about every pair**, 5 × 5 = 25, with no
 *     pair twice in a row (CONTEXT.md §5 rule 11). Back-to-back rounds on one
 *     pair are worse here than in the sibling games: within tier 1 a pair's
 *     three questions render the *identical three scenes* and only the prompt
 *     word changes, so a repeat looks to the child like the game failed to
 *     advance.
 *
 * Same `sound: false` localStorage shim as the sibling suites — it forces
 * narrate()'s silent-mode `setTimeout(onEnd, 600)` fallback so the correction
 * chain resolves deterministically in headless Chromium, where
 * `speechSynthesis.onend` often never fires.
 */

const STATS_KEY = 'wheres_teddy_stats_v1';

/** Declared independently of the app so a data edit shows up here. */
const PAIRS = ['teddy-box', 'cat-basket', 'ball-bucket', 'mouse-hat', 'puppy-tub'] as const;
const RELATIONS = ['in', 'on', 'under', 'nextTo', 'behind'] as const;

/** Every question a full run should ask: each relation about each pair. */
const ALL_QUESTIONS = PAIRS.flatMap((p) => RELATIONS.map((r) => `${p}:${r}`));
const RUN_LENGTH = ALL_QUESTIONS.length;

/** The one pairing flat emoji cannot draw distinguishably. */
const UNDRAWABLE_TOGETHER: readonly [string, string] = ['in', 'behind'];

interface RoundShape {
  pair: string;
  target: string;
  scenes: string[];
  scenePairs: string[];
}

const readRound = async (page: Page): Promise<RoundShape> => {
  const stage = page.locator('#wtStage');
  const pair = (await stage.getAttribute('data-pair'))?.trim() ?? '';
  const target = (await stage.getAttribute('data-target'))?.trim() ?? '';
  const scenes: string[] = [];
  const scenePairs: string[] = [];
  for (let i = 0; i < 3; i++) {
    const el = page.locator(`#wtScene${i}`);
    scenes.push((await el.getAttribute('data-rel')) ?? '');
    scenePairs.push((await el.getAttribute('data-pair')) ?? '');
  }
  return { pair, target, scenes, scenePairs };
};

/** Assert everything that must be true of any round, in any run. */
const expectRoundIsWellFormed = (round: RoundShape): void => {
  const { pair, target, scenes, scenePairs } = round;

  expect(PAIRS as readonly string[], `unknown pair "${pair}"`).toContain(pair);
  expect(RELATIONS as readonly string[], `unknown relation "${target}"`).toContain(target);

  expect(new Set(scenes).size, `scenes must be distinct: ${scenes.join(', ')}`).toBe(3);
  expect(
    scenes.filter((r) => r === target).length,
    'exactly one scene shows the relation being asked for',
  ).toBe(1);

  // The mechanic: same two objects everywhere, only the relation differs.
  expect(
    new Set(scenePairs).size,
    `all three scenes must show the same pair, got: ${scenePairs.join(', ')}`,
  ).toBe(1);
  expect(scenePairs[0], "the scenes' pair must match the round's").toBe(pair);

  const [a, b] = UNDRAWABLE_TOGETHER;
  expect(
    scenes.includes(a) && scenes.includes(b),
    `"${a}" and "${b}" cannot be told apart in flat emoji and must never share a round`,
  ).toBe(false);
};

/** Resolve the index of the scene showing the round's target relation. */
const findCorrectIdx = async (page: Page): Promise<number> => {
  const { target, scenes } = await readRound(page);
  return scenes.indexOf(target);
};

test.describe("where's teddy (preschool cognitive — spatial words)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('games/wheres-teddy-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: false, autoSpeak: false, fontSize: 'medium' }),
      );
    });
    await page.reload();
  });

  test('SSR renders header, scene, a prompt, three distinct mini-scenes, and a caption', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/Where's Teddy/);
    await expect(page.locator('body')).toHaveClass(/story/);
    await expect(page.locator('body[data-theme="wheresteddy"]')).toHaveCount(1);

    await expect(page.locator('.wt-title')).toContainText(/Where's Teddy/);
    await expect(page.locator('#wtProgressText')).toContainText(
      new RegExp(`^\\s*1\\s*/\\s*${RUN_LENGTH}\\s*$`),
    );

    const stage = page.locator('#wtStage');
    await expect(stage).toBeVisible();
    const scene = await stage.getAttribute('data-scene');
    expect(['pond', 'orchard', 'sea', 'garden', 'meadow', 'jungle']).toContain(scene);
    await expect(page.locator('#wtCaption')).not.toBeEmpty();

    await expect(page.locator('#wtPrompt')).toBeVisible();
    await expect(page.locator('#wtPromptWord')).not.toBeEmpty();
    await expect(page.locator('#wtPromptPair')).not.toBeEmpty();

    await expect(page.locator('.wt-scene')).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`button#wtScene${i}`)).toHaveCount(1);
      await expect(page.locator(`#wtScene${i} .wt-land`)).not.toBeEmpty();
      await expect(page.locator(`#wtScene${i} .wt-obj`)).not.toBeEmpty();
    }

    expectRoundIsWellFormed(await readRound(page));
  });

  /**
   * The prompt word must agree with the `data-target` the controller
   * validates against — the SSR / hydration mismatch this guards is exactly
   * the kickoff race that bit Counting Friends on 2026-05-15.
   */
  test('the prompt word matches the round the controller is playing', async ({ page }) => {
    const shown = (await page.locator('#wtPromptWord').textContent())?.trim() ?? '';
    const target = (await page.locator('#wtStage').getAttribute('data-target'))?.trim() ?? '';
    // 'nextTo' is spoken and printed as two words.
    const expected = target === 'nextTo' ? 'NEXT TO' : target.toUpperCase();
    expect(shown).toBe(expected);
  });

  test('next button is disabled until an answer is chosen', async ({ page }) => {
    await expect(page.locator('#wtNextBtn')).toBeDisabled();
  });

  test('tapping any scene eventually enables Next and persists round count', async ({ page }) => {
    await page.locator('#wtScene0').click();

    // Wrong-answer path is the 3-phase correction (rerun → wrongIs → 350ms
    // pause → reveal). At silent-mode pacing (600ms per phrase) that's
    // roughly 2.2s. 12s buffers headless variance.
    await expect(page.locator('#wtNextBtn')).toBeEnabled({ timeout: 12_000 });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { rounds: number }) : { rounds: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
  });

  test('tapping the right scene lights the correct state and counts toward first-try stats', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    expect(correctIdx).toBeGreaterThanOrEqual(0);

    await page.locator(`#wtScene${correctIdx}`).click();

    await expect(page.locator(`#wtScene${correctIdx}`)).toHaveClass(/wt-scene--correct/);
    await expect(page.locator('#wtNextBtn')).toBeEnabled();

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw
        ? (JSON.parse(raw) as { rounds: number; correctFirstTry: number })
        : { rounds: 0, correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.rounds).toBe(1);
    expect(stats.correctFirstTry).toBe(1);
  });

  test('tapping another scene applies the wrong state, then reveals the right one without bumping first-try', async ({
    page,
  }) => {
    const correctIdx = await findCorrectIdx(page);
    const wrongIdx = correctIdx === 0 ? 1 : 0;

    await page.locator(`#wtScene${wrongIdx}`).click();

    // Wrong-tap feedback (rule revised 2026-08-17): shake + red tint land
    // immediately, before the spoken correction starts.
    await expect(page.locator(`#wtScene${wrongIdx}`)).toHaveClass(/wt-scene--wrong/, {
      timeout: 1_000,
    });

    await expect(page.locator(`#wtScene${correctIdx}`)).toHaveClass(/wt-scene--reveal/, {
      timeout: 12_000,
    });

    const stats = await page.evaluate((k) => {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as { correctFirstTry: number }) : { correctFirstTry: 0 };
    }, STATS_KEY);
    expect(stats.correctFirstTry).toBe(0);
  });

  /**
   * The correction has to name the relation the child actually chose — "that
   * teddy is ON the box" — rather than just repeating the question, and it
   * must never scold. The caption mirrors the narration verbatim, so it is
   * the assertable surface for both.
   */
  test('the spoken correction names the relation tapped and never says "wrong"', async ({
    page,
  }) => {
    const { target, scenes } = await readRound(page);
    const correctIdx = scenes.indexOf(target);
    const wrongIdx = correctIdx === 0 ? 1 : 0;
    const tapped = scenes[wrongIdx]!;

    const spoken = (r: string): string => (r === 'nextTo' ? 'next to' : r);

    await page.evaluate(() => {
      const el = document.getElementById('wtCaption');
      if (!el) return;
      const log: string[] = [];
      (window as unknown as { __wtCaptions: string[] }).__wtCaptions = log;
      new MutationObserver(() => log.push(el.textContent ?? '')).observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });

    await page.locator(`#wtScene${wrongIdx}`).click();
    await expect(page.locator(`#wtScene${correctIdx}`)).toHaveClass(/wt-scene--reveal/, {
      timeout: 12_000,
    });

    const script = (
      await page.evaluate(
        () => (window as unknown as { __wtCaptions: string[] }).__wtCaptions.join(' '),
      )
    ).toLowerCase();

    expect(script).toContain(spoken(tapped));
    expect(script).toContain(spoken(target));
    expect(script).not.toMatch(/\bwrong\b|\bno\b|\btry again\b/);
  });

  /**
   * The invariants above are asserted on round 1, which is SSR'd and
   * therefore deterministic. This walks a whole *randomised* run so the
   * generator itself is under test.
   */
  test('a full run asks every relation about every pair, well formed throughout', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const asked: string[] = [];
    const pairOrder: string[] = [];

    for (let round = 1; round <= RUN_LENGTH; round++) {
      await expect(page.locator('#wtProgressText')).toContainText(
        new RegExp(`^\\s*${round}\\s*/\\s*${RUN_LENGTH}\\s*$`),
      );
      const shown = await readRound(page);
      expectRoundIsWellFormed(shown);
      asked.push(`${shown.pair}:${shown.target}`);
      pairOrder.push(shown.pair);

      const correctIdx = await findCorrectIdx(page);
      expect(correctIdx).toBeGreaterThanOrEqual(0);
      await page.locator(`#wtScene${correctIdx}`).click();
      await expect(page.locator('#wtNextBtn')).toBeEnabled();
      await page.locator('#wtNextBtn').click();
    }

    expect(
      asked.slice().sort(),
      'a run should ask each relation about each pair, once each',
    ).toEqual(ALL_QUESTIONS.slice().sort());

    const backToBack = pairOrder.filter((p, i) => i > 0 && p === pairOrder[i - 1]);
    expect(
      backToBack,
      `these pairs were asked twice in a row: ${backToBack.join(', ')}`,
    ).toEqual([]);

    // Difficulty ramps: the three core relations come first, `next to` is
    // introduced next, and `behind` — the one that needs occlusion read as
    // depth — is last.
    const behindAt = asked
      .map((q, i) => (q.endsWith(':behind') ? i : -1))
      .filter((i) => i >= 0);
    expect(behindAt, 'every pair should be asked about "behind" once').toHaveLength(
      PAIRS.length,
    );
    expect(
      Math.min(...behindAt),
      '"behind" belongs in the last tier, after every other relation',
    ).toBeGreaterThanOrEqual(RUN_LENGTH - PAIRS.length);

    await expect(page.locator('#wtDone')).toHaveClass(/wt-done--show/);

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
    const prompt = page.locator('button#wtPrompt');
    await expect(prompt).toHaveCount(1);

    const before = await page.locator('#wtPromptWord').textContent();
    await prompt.click();
    await expect(page.locator('#wtPromptWord')).toHaveText(before ?? '');
    await expect(page.locator('#wtNextBtn')).toBeDisabled();
  });

  /**
   * Whether a relation is legible is a *pixel* property, and nothing else in
   * this suite can see it: every assertion above passed while the mouse sat a
   * clear tenth of a tile above its hat (reading as "above", a preposition
   * the game never offers) and while `behind` left 84% of that same mouse
   * visible, making it all but identical to `on`.
   *
   * Both came from one cause. `on` and `behind` are positioned as a
   * percentage of tile height, but the five landmarks top out anywhere from
   * 48% (a sun hat is nearly all brim) to 59% (a box, a basket, a tub), so a
   * single offset cannot rest an object on all five or hide it behind all
   * five. The fix is the per-pair `--wt-on-y` / `--wt-behind-y` in the
   * stylesheet; this is what stops a sixth pair from being added without
   * them.
   *
   * The bands are deliberately loose, and sit midway between the tuned
   * values and the defect they replaced — `behind` shows ~45% of the object
   * when tuned and showed 84% when not; `on` sits ~1.5% *below* the
   * landmark's top when tuned and floated 10% above it when not. Emoji glyph
   * metrics differ between platforms (Segoe UI Emoji locally, Noto Color
   * Emoji on the Linux runner), so exact offsets are not portable; these
   * catch the class of defect rather than a tuning drift of a few percent.
   */
  test('every pair rests `on` its landmark and hides enough of it when `behind`', async ({
    page,
  }) => {
    const pairs: readonly (readonly [string, string, string])[] = [
      ['teddy-box', '🧸', '📦'],
      ['cat-basket', '🐱', '🧺'],
      ['ball-bucket', '⚽', '🪣'],
      ['mouse-hat', '🐭', '👒'],
      ['puppy-tub', '🐶', '🛁'],
    ];

    // The dashed floor and the object itself would both be found by the scan.
    await page.addStyleTag({
      content: `.wt-scene::after { display: none !important; }
                .wt-scene .wt-obj { visibility: hidden !important; }`,
    });

    for (const [pair, obj, land] of pairs) {
      await page.evaluate(
        ({ pair, obj, land }) => {
          const el = document.getElementById('wtScene0')!;
          el.dataset.pair = pair;
          el.dataset.rel = 'on';
          el.querySelector('.wt-obj')!.textContent = obj;
          el.querySelector('.wt-land')!.textContent = land;
        },
        { pair, obj, land },
      );

      // Emoji have no queryable bounding box, so find where the landmark's
      // ink actually starts: the first row whose centre columns differ from
      // the tile's own (vertically graded) background.
      const shot = await page.locator('#wtScene0').screenshot();
      const landTop = await page.evaluate(async (b64: string) => {
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
        const bmp = await createImageBitmap(blob);
        const c = document.createElement('canvas');
        c.width = bmp.width;
        c.height = bmp.height;
        const g = c.getContext('2d')!;
        g.drawImage(bmp, 0, 0);
        const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
        const at = (x: number, y: number): readonly number[] => {
          const i = (y * width + x) * 4;
          return [data[i]!, data[i + 1]!, data[i + 2]!];
        };
        const refX = Math.floor(width * 0.12);
        const x0 = Math.floor(width * 0.28);
        const x1 = Math.ceil(width * 0.72);
        // Skip the tile's border and rounded corners at both extremes.
        for (let y = 10; y < height - 10; y++) {
          let hits = 0;
          for (let x = x0; x < x1; x++) {
            const [r, gg, b] = at(x, y);
            const [br, bg, bb] = at(refX, y);
            if (Math.abs(r! - br!) + Math.abs(gg! - bg!) + Math.abs(b! - bb!) > 28) hits++;
          }
          if (hits >= 3) return ((height - y) / height) * 100;
        }
        return -1;
      }, shot.toString('base64'));

      expect(landTop, `could not find the ${pair} landmark's silhouette`).toBeGreaterThan(0);

      const geom = await page.evaluate((rel: string) => {
        const el = document.getElementById('wtScene0')!;
        el.dataset.rel = rel;
        const objEl = el.querySelector('.wt-obj') as HTMLElement;
        const o = objEl.getBoundingClientRect();
        const t = el.getBoundingClientRect();
        return {
          bottomPct: ((t.bottom - o.bottom) / t.height) * 100,
          heightPct: (o.height / t.height) * 100,
        };
      }, 'on');

      // `on` must make contact: the object's base may overlap the lid a
      // little, but must not hover above it.
      const float = geom.bottomPct - landTop;
      expect(
        float,
        `${pair}: "on" leaves the object floating ${float.toFixed(1)}% of the tile above the landmark — set --wt-on-y for this pair`,
      ).toBeLessThan(7);

      const behind = await page.evaluate((rel: string) => {
        const el = document.getElementById('wtScene0')!;
        el.dataset.rel = rel;
        const objEl = el.querySelector('.wt-obj') as HTMLElement;
        const o = objEl.getBoundingClientRect();
        const t = el.getBoundingClientRect();
        return {
          bottomPct: ((t.bottom - o.bottom) / t.height) * 100,
          heightPct: (o.height / t.height) * 100,
        };
      }, 'behind');

      // Occlusion is the only cue that says "behind", so a meaningful share
      // of the object has to actually be covered — and a meaningful share has
      // to remain, or it is not recognisable as the thing being asked about.
      const visible = (behind.bottomPct + behind.heightPct - landTop) / behind.heightPct;
      expect(
        visible,
        `${pair}: "behind" leaves ${(visible * 100).toFixed(0)}% of the object showing, so it reads the same as "on" — set --wt-behind-y for this pair`,
      ).toBeLessThan(0.65);
      expect(
        visible,
        `${pair}: "behind" hides all but ${(visible * 100).toFixed(0)}% of the object, leaving nothing to recognise`,
      ).toBeGreaterThan(0.2);
    }
  });

  test('home page links to the new game', async ({ page }) => {
    await page.goto('');
    const card = page.locator('a.home-card[href*="wheres-teddy-game"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Where's Teddy?");
  });

  test("stats page lists Where's Teddy under preschool-cognitive", async ({ page }) => {
    await page.goto('stats.html');

    const section = page.locator('.stats-section[data-family="preschool-cognitive"]');
    await expect(section).toHaveCount(1);

    const card = section.locator('.stats-card[data-game-id="wheres-teddy"]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Where's Teddy?");
    await expect(card).toHaveAttribute('data-family', 'preschool-cognitive');

    await expect(card.locator('.stats-row')).toHaveCount(4);
  });
});
