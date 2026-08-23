import { test, expect, type Page } from '@playwright/test';

/**
 * A feedback state must TINT an option, not hollow it out.
 *
 * Added 2026-08-23, after the same one-line mistake was found in twelve
 * places across two days. Every tint token in these games is translucent by
 * design (0.16–0.22), so writing
 *
 *     background: var(--x-tile-fill-correct);
 *
 * does not tint the tile — it *replaces* the tile's surface with a 22%-opaque
 * wash, and the option becomes a window onto the page gradient behind it.
 * Measured, the tiles sat at 0.93 alpha and dropped to about 0.33.
 *
 * What that looks like in play is worse than it sounds, because the "feedback
 * colour" the child sees is then whatever the page gradient happens to be
 * doing at that point on the board. In Animal Sounds the board sits over a
 * teal-to-sand gradient, so a *wrongly* tapped tile came out teal at the top
 * of the board and sandy at the bottom, while its border and ✗ stayed red.
 * The picture on the tile also lost the surface it was meant to sit on.
 *
 * The correct shape layers the tint over the option's own background:
 *
 *     background:
 *       linear-gradient(var(--tint), var(--tint)),
 *       var(--x-tile-bg);
 *
 * This suite measures the rendered alpha rather than reading the stylesheet,
 * because the property that matters is "can you see through the option", and
 * a game is free to reach it however it likes. Games whose option surface is
 * *deliberately* translucent (Pattern Sequences and friends sit near 0.35)
 * pass without being special-cased: the bar is relative to each option's own
 * resting alpha, so what is asserted is that a state never makes an option
 * more see-through than it already was.
 */

interface GameSpec {
  readonly slug: string;
  readonly option: string;
  /** Class prefix — states are `<prefix>--correct` and so on. */
  readonly prefix: string;
}

const GAMES: readonly GameSpec[] = [
  { slug: 'animal-sounds', option: '.as-tile', prefix: 'as-tile' },
  { slug: 'feeling-friends', option: '.ff-tile', prefix: 'ff-tile' },
  { slug: 'opposites-friends', option: '.of-tile', prefix: 'of-tile' },
  { slug: 'rhyme-time', option: '.rt-tile', prefix: 'rt-tile' },
  { slug: 'letter-friends', option: '.lf-tile', prefix: 'lf-tile' },
  { slug: 'sound-friends', option: '.sf-tile', prefix: 'sf-tile' },
  { slug: 'week-friends', option: '.week-opt', prefix: 'week-opt' },
  { slug: 'pattern-sequences', option: '.ps-opt', prefix: 'ps-opt' },
  { slug: 'counting-friends', option: '.cf-opt', prefix: 'cf-opt' },
  { slug: 'magnitude-comparison', option: '.mf-group', prefix: 'mf-group' },
  { slug: 'number-friends', option: '.nf-group', prefix: 'nf-group' },
  { slug: 'number-bond-pop', option: '.nbp-opt', prefix: 'nbp-opt' },
];

const STATES = ['correct', 'reveal', 'wrong'] as const;

/**
 * Alpha is measured in absolute terms, so the tolerance only has to absorb
 * antialiasing on the rounded corners. The bug it guards against moved the
 * alpha by 0.56–0.66, so there is no need to sit close to the noise floor.
 */
const MAX_ALPHA_DROP = 0.05;

/**
 * Neutralise everything *behind* the option so `omitBackground` yields the
 * option's own coverage rather than its ancestors'. Inline and `important`
 * because the themes set these from several rules.
 */
const stripAncestors = (page: Page, option: string): Promise<void> =>
  page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`no element for ${sel}`);
    for (let p = el.parentElement; p; p = p.parentElement) {
      p.style.setProperty('background', 'transparent', 'important');
      p.style.setProperty('box-shadow', 'none', 'important');
    }
  }, option);

/** Mean alpha (0–1) over a transparent-backed screenshot of the option. */
const meanAlpha = async (page: Page, option: string): Promise<number> => {
  const shot = await page.locator(option).first().screenshot({ omitBackground: true });
  return page.evaluate(async (b64: string) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0);
    const { data } = g.getImageData(0, 0, c.width, c.height);
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i]!;
    return sum / (data.length / 4) / 255;
  }, shot.toString('base64'));
};

/** Mean RGB, to prove a state class actually changed the rendering. */
const meanRgb = async (page: Page, option: string): Promise<number> => {
  const shot = await page.locator(option).first().screenshot();
  return page.evaluate(async (b64: string) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0);
    const { data } = g.getImageData(0, 0, c.width, c.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    }
    return sum / (data.length / 4);
  }, shot.toString('base64'));
};

const setClass = (page: Page, option: string, cls: string, on: boolean): Promise<void> =>
  page.evaluate(
    ({ sel, c, add }) => {
      const el = document.querySelector(sel)!;
      el.classList.toggle(c, add);
    },
    { sel: option, c: cls, add: on },
  );

test.describe('feedback states tint the option without hollowing it out', () => {
  for (const spec of GAMES) {
    test(`${spec.slug}: no feedback state makes the option see-through`, async ({
      page,
    }) => {
      await page.goto(`games/${spec.slug}-game.html`);
      // The states animate (bounce, shake, an infinite pulse ring on
      // `--reveal`); without this the screenshot lands at an arbitrary point
      // in a transform and the alpha wanders.
      await page.addStyleTag({
        content: '*{transition:none!important;animation:none!important}',
      });
      await expect(page.locator(spec.option).first()).toBeVisible();
      await stripAncestors(page, spec.option);

      const baseAlpha = await meanAlpha(page, spec.option);
      const baseRgb = await meanRgb(page, spec.option);
      expect(
        baseAlpha,
        `${spec.slug}: the option is invisible before any state is applied, so this test would prove nothing`,
      ).toBeGreaterThan(0.2);

      for (const state of STATES) {
        const cls = `${spec.prefix}--${state}`;
        await setClass(page, spec.option, cls, true);
        const alpha = await meanAlpha(page, spec.option);
        const rgb = await meanRgb(page, spec.option);
        await setClass(page, spec.option, cls, false);

        // Guards against the table drifting out of step with the markup: a
        // class the game no longer uses would change nothing and sail
        // through the alpha check.
        expect(
          Math.abs(rgb - baseRgb),
          `${spec.slug}: applying .${cls} changed nothing, so the class name in this spec is probably stale`,
        ).toBeGreaterThan(1);

        expect(
          alpha,
          `${spec.slug}: .${cls} drops the option's alpha from ${baseAlpha.toFixed(2)} to ${alpha.toFixed(2)} — ` +
            `the tint replaced the option's surface instead of layering over it, so the page shows through`,
        ).toBeGreaterThan(baseAlpha - MAX_ALPHA_DROP);
      }
    });
  }
});
