import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Control-pill legibility (added 2026-08-22).
 *
 * The Reset / Quiz / Stats / Settings pills are shared chrome — one
 * `.ctrl-pill` rule in `global.css`, rendered on all 27 games plus `/stats`
 * and the home hero. That rule was white text on a 10%-white fill, which is
 * fine on the near-black CardMachine panel it was designed against and
 * invisible on everything else: measured 1.07:1 on Rhyme Time and 1.13:1 on
 * Daily Routines, i.e. the controls were simply not there for the user.
 *
 * Why this test measures **pixels** rather than asserting the CSS values:
 * an assertion that `color` is `rgb(255,255,255)` only restates the
 * stylesheet and would have passed happily throughout the entire period the
 * bug existed. The failure mode is a *relationship* between the pill and
 * whatever a theme paints behind it, and only rendering resolves that. It is
 * also what makes this test useful to a future theme author: give a game a
 * pale header and this fails, without them having to know the pill exists.
 *
 * The metric is the contrast ratio between the darkest and lightest deciles
 * of the pill's own bounding box. Deciles rather than absolute min/max so a
 * few antialiased edge pixels can't manufacture a pass. A legible chip has a
 * label separated from its fill; an invisible one is near-uniform and lands
 * close to 1:1.
 *
 * Both modes are checked deliberately. Dark mode is not redundant here:
 * eleven StoryLayout themes still paint a *light* background while
 * `body.dark-mode` is set (CONTEXT.md §7), so "dark mode" and "dark backdrop"
 * are different things in this app, and a fix keyed off the mode flag would
 * pass a mode-blind test while still being broken on those pages.
 */

/** WCAG AA for normal text. The pills are 0.7em, so this is the right floor. */
const MIN_CONTRAST = 4.5;

/** One page per layout, plus the two non-game surfaces that render pills. */
const SURFACES: ReadonlyArray<{ name: string; path: string }> = [
  { name: 'GridLayout (Alphabets)', path: 'games/alphabets-game.html' },
  { name: 'CardMachineLayout (Dinosaurs)', path: 'games/dinosaurs-game.html' },
  { name: 'StoryLayout — story (Daily Routines)', path: 'games/daily-routines-game.html' },
  { name: 'StoryLayout — preschool (Rhyme Time)', path: 'games/rhyme-time-game.html' },
  { name: 'parent stats dashboard', path: 'stats.html' },
  { name: 'home hero', path: '' },
];

/**
 * Contrast ratio between the darkest and lightest deciles of `target` as
 * actually rendered. The PNG is decoded back to pixels inside the page —
 * a `data:` URL doesn't taint the canvas, so `getImageData` is allowed.
 */
const contrastWithin = async (page: Page, target: Locator): Promise<number> => {
  const png = (await target.screenshot()).toString('base64');
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

    const channel = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };

    const lums: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      lums.push(
        0.2126 * channel(data[i]!) +
          0.7152 * channel(data[i + 1]!) +
          0.0722 * channel(data[i + 2]!),
      );
    }
    lums.sort((a, b) => a - b);
    const at = (q: number): number => lums[Math.floor((lums.length - 1) * q)]!;
    const lo = at(0.08);
    const hi = at(0.92);
    return (hi + 0.05) / (lo + 0.05);
  }, png);
};

const setMode = async (page: Page, dark: boolean): Promise<void> => {
  await page.evaluate((d) => {
    localStorage.setItem(
      'kids_settings_v1',
      JSON.stringify({ dark: d, sound: false, autoSpeak: false, fontSize: 'medium' }),
    );
  }, dark);
  await page.reload();
};

test.describe('shared control pills stay legible on every surface', () => {
  for (const { name, path } of SURFACES) {
    test(`${name}: every pill clears ${MIN_CONTRAST}:1 in both modes`, async ({ page }) => {
      await page.goto(path);

      for (const dark of [false, true]) {
        await setMode(page, dark);

        const pills = page.locator('.ctrl-pill');
        const count = await pills.count();
        expect(count, 'the surface should render at least one control pill').toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const pill = pills.nth(i);
          await expect(pill).toBeVisible();
          const label = (await pill.textContent())?.trim() ?? `pill ${i}`;
          const ratio = await contrastWithin(page, pill);

          expect(
            ratio,
            `"${label}" measures ${ratio.toFixed(2)}:1 in ${dark ? 'dark' : 'light'} mode ` +
              `on ${name} — the label is not readable against its own fill`,
          ).toBeGreaterThanOrEqual(MIN_CONTRAST);
        }
      }
    });
  }
});
