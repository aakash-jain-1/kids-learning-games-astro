import { test, expect, type Page } from '@playwright/test';

/**
 * StoryLayout page background: dark mode, and the per-round scene (added
 * 2026-08-22).
 *
 * Two bugs with one shape, both live for months across ten games, and neither
 * visible to the type checker or to any assertion about CSS values.
 *
 * 1. **Dark mode never darkened the page.** A theme's dark block re-tinted its
 *    cards but never redefined `--st-bg`, so `body` kept resolving it to the
 *    *light* gradient while every token around it flipped to near-white. The
 *    result was white-on-pale everywhere — titles at 1.03-1.16:1, tile labels
 *    invisible.
 *
 * 2. **The per-round scene never painted.** The six `data-scene` gradients are
 *    declared on the `.X-stage` element but were read by a `background` on
 *    `body`. Custom properties inherit *downwards*, so an ancestor can never
 *    see a property written on a descendant: the stage rendered a flat
 *    translucent white and the artwork simply never appeared.
 *
 * Both are checked from rendered pixels, because both were invisible to
 * everything else. In particular the scene check works by *changing*
 * `data-scene` and requiring the stage to look different — an assertion that
 * the gradients exist in the stylesheet would have passed the whole time they
 * were unreachable.
 */

/** Themes whose page is a StoryLayout surface with a `data-scene` stage. */
const SCENE_GAMES = [
  'animal-sounds',
  'counting-friends',
  'feeling-friends',
  'letter-friends',
  'magnitude-comparison',
  'number-bond-pop',
  'number-friends',
  'opposites-friends',
  'pattern-sequences',
  'rhyme-time',
  'sorting-friends',
  'sound-friends',
  'week-friends',
] as const;

/** Every StoryLayout game, including the two without per-round scenes. */
const STORY_GAMES = [...SCENE_GAMES, 'days-parade'] as const;

/**
 * Mean relative luminance of a strip down the far-left page margin. The shell
 * is a centred max-width column, so at 1200px wide this samples the page
 * background itself rather than any card.
 */
const pageLuminance = async (page: Page): Promise<number> => {
  const png = (
    await page.screenshot({ clip: { x: 0, y: 220, width: 48, height: 380 } })
  ).toString('base64');

  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const ch = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };

    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum +=
        0.2126 * ch(data[i]!) + 0.7152 * ch(data[i + 1]!) + 0.0722 * ch(data[i + 2]!);
      n += 1;
    }
    return sum / n;
  }, png);
};

/** Mean RGB of a screenshot buffer. */
const meanColour = async (page: Page, png: string): Promise<number[]> =>
  page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum[0]! += data[i]!;
      sum[1]! += data[i + 1]!;
      sum[2]! += data[i + 2]!;
      n += 1;
    }
    return sum.map((v) => v / n);
  }, png);

const setMode = async (page: Page, dark: boolean): Promise<void> => {
  await page.evaluate((d) => {
    localStorage.setItem(
      'kids_settings_v1',
      JSON.stringify({ dark: d, sound: false, autoSpeak: false, fontSize: 'medium' }),
    );
  }, dark);
  await page.reload();
};

test.use({ viewport: { width: 1200, height: 800 } });

test.describe('StoryLayout page background', () => {
  // Each of these walks all 13 story games in a single test and takes ~20s of
  // the default 30s budget on its own, so it tips over the moment the machine
  // is busy with other workers. Observed failing on a `page.goto` mid-run
  // while passing in 20s when run alone.
  test.beforeEach(() => test.slow());

  test('dark mode actually darkens the page on every story game', async ({ page }) => {
    const tooLight: string[] = [];

    for (const game of STORY_GAMES) {
      await page.goto(`games/${game}-game.html`);
      await setMode(page, true);
      await page.waitForTimeout(150);

      const lum = await pageLuminance(page);
      // 0.15 is comfortably above any of the dark gradients in use (all land
      // under 0.03) and comfortably below every pale light-mode tint (all
      // over 0.6), so this does not need re-tuning per theme.
      if (lum > 0.15) tooLight.push(`${game}: page luminance ${lum.toFixed(3)}`);
    }

    expect(
      tooLight,
      'These themes set body.dark-mode but never redefine --st-bg, so the page ' +
        `stays pale while their text goes near-white:\n  ${tooLight.join('\n  ')}`,
    ).toEqual([]);
  });

  test('light mode keeps the page light', async ({ page }) => {
    const tooDark: string[] = [];

    for (const game of STORY_GAMES) {
      await page.goto(`games/${game}-game.html`);
      await setMode(page, false);
      await page.waitForTimeout(150);

      const lum = await pageLuminance(page);
      if (lum < 0.3) tooDark.push(`${game}: page luminance ${lum.toFixed(3)}`);
    }

    expect(
      tooDark,
      `Light mode should not paint a dark page:\n  ${tooDark.join('\n  ')}`,
    ).toEqual([]);
  });

  test('the per-round scene gradient actually reaches the stage', async ({ page }) => {
    const dead: string[] = [];

    for (const game of SCENE_GAMES) {
      await page.goto(`games/${game}-game.html`);

      const stage = page.locator('[data-scene]').first();
      await expect(stage, `${game} should render a stage with data-scene`).toBeVisible();

      // Two scenes every preschool theme declares. If the stage is not
      // reading `--st-bg` from its own `data-scene` rule, both render the
      // same flat panel.
      //
      // Sampled from a patch inside the stage's own padding, above any card,
      // so this compares *background* and not content. Comparing whole-stage
      // screenshots looks stricter but is useless: a single pixel of
      // antialiasing anywhere makes two buffers differ, which passed this
      // check even with the bug deliberately reintroduced.
      const swatches: number[][] = [];
      for (const scene of ['garden', 'sea']) {
        await stage.evaluate((el, s) => {
          (el as HTMLElement).dataset.scene = s;
        }, scene);
        await page.waitForTimeout(150);

        const box = (await stage.boundingBox())!;
        const png = (
          await page.screenshot({
            clip: { x: box.x + 6, y: box.y + 6, width: 12, height: 12 },
          })
        ).toString('base64');

        swatches.push(await meanColour(page, png));
      }

      const [a, b] = swatches as [number[], number[]];
      const delta = Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));
      if (delta < 8) {
        dead.push(
          `${game}: 'garden' and 'sea' paint the same background ` +
            `(rgb(${a.map(Math.round)}) vs rgb(${b.map(Math.round)}))`,
        );
      }
    }

    expect(
      dead,
      'The scene gradients are declared on .X-stage but something upstream is ' +
        `reading --st-bg elsewhere, so they never paint:\n  ${dead.join('\n  ')}`,
    ).toEqual([]);
  });
});
