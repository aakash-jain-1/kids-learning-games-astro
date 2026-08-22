import { test, expect, type Page } from '@playwright/test';

/**
 * Page-title legibility and disabled-control affordance (added 2026-08-22).
 *
 * Two defects, one cause: shared chrome that assumes a dark page.
 *
 * 1. `story.css` defaults `--st-title-color` to white with a soft shadow,
 *    which is right for the deep-gradient themes it was written against.
 *    Eleven themes later shipped a *pale* page and kept the white title:
 *    measured 1.10:1 on Sorting Friends and 1.12:1 on Letter Friends, i.e.
 *    white-on-white. The grid `colors` theme had the same bug.
 *
 * 2. Eleven games rendered `<button disabled>` with the full accent fill at
 *    `opacity: 1`, so "Next round" looked tappable for the whole time it was
 *    not — the one control a child aims at most.
 *
 * This is a sibling of `ctrl-pills.spec.ts` and measures pixels for the same
 * reason: asserting the CSS value would only restate the stylesheet and would
 * have passed throughout the entire period both bugs existed. The failure mode
 * is a *relationship* between the ink and whatever a theme paints behind it.
 *
 * The background is taken as the modal (most common) colour inside the title's
 * own box rather than a pixel sampled beside it, so a theme that puts the
 * heading on a card or a gradient is still measured against what is actually
 * behind the glyphs.
 *
 * Both modes are checked. Dark mode is not redundant: several StoryLayout
 * themes keep a light page while `body.dark-mode` is set (CONTEXT.md §7), so
 * "dark mode" and "dark backdrop" are different things here — a fix keyed off
 * the mode flag would pass a mode-blind test while still being broken.
 */

/**
 * WCAG AA for large text. Page titles are >= 1.6em and bold, which is the
 * large-text bar; the pills next to them are held to 4.5 in `ctrl-pills`.
 */
const MIN_CONTRAST = 3;

const relLum = ([r, g, b]: readonly number[]): number => {
  const ch = (v: number): number => {
    const s = v! / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r!) + 0.7152 * ch(g!) + 0.0722 * ch(b!);
};

const contrast = (a: readonly number[], b: readonly number[]): number => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((m, n) => n - m) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** The dominant colour inside `png`, i.e. what the ink sits on. */
const modalColour = async (page: Page, png: string): Promise<number[]> =>
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

    const tally = new Map<number, number>();
    for (let i = 0; i < data.length; i += 4) {
      // Quantise to 4 bits per channel so a subtle gradient still resolves
      // to one dominant bucket instead of thousands of near-identical ones.
      const key =
        ((data[i]! >> 4) << 8) | ((data[i + 1]! >> 4) << 4) | (data[i + 2]! >> 4);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }

    let best = 0;
    let bestKey = 0;
    for (const [key, n] of tally) {
      if (n > best) {
        best = n;
        bestKey = key;
      }
    }
    // Middle of the winning bucket.
    return [
      (((bestKey >> 8) & 0xf) << 4) + 8,
      (((bestKey >> 4) & 0xf) << 4) + 8,
      ((bestKey & 0xf) << 4) + 8,
    ];
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

/**
 * Every game page, read off the home page rather than hard-coded, so adding a
 * game opts it into these checks automatically (CONTEXT.md: don't let game
 * lists drift from the real source).
 */
const gamePaths = async (page: Page): Promise<string[]> => {
  await page.goto('');
  const hrefs = await page.locator('a[href*="-game"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
  );
  const seen = [...new Set(hrefs)]
    .map((h) => h.split('/').pop() ?? '')
    .filter(Boolean)
    .sort();
  expect(seen.length, 'home page should link to every game').toBeGreaterThan(20);
  return seen;
};

test.describe('page titles stay legible and disabled controls look disabled', () => {
  test('every game title clears the large-text contrast floor in both modes', async ({
    page,
  }) => {
    const games = await gamePaths(page);
    const failures: string[] = [];
    let measured = 0;

    for (const game of games) {
      await page.goto(`games/${game}`);

      // The four CardMachineLayout games (Dinosaurs, Flashcards, Solar
      // System, Weather) have no page-title heading — the card itself is
      // the header — so there is nothing to measure on them.
      if ((await page.locator('h1').count()) === 0) continue;

      for (const dark of [false, true]) {
        await setMode(page, dark);

        const title = page.locator('h1').first();
        await expect(title).toBeVisible();
        measured += 1;

        const ink = await title.evaluate((el) => getComputedStyle(el).color);
        const fg = ink.match(/\d+/g)!.slice(0, 3).map(Number);
        const bg = await modalColour(page, (await title.screenshot()).toString('base64'));
        const ratio = contrast(fg, bg);

        if (ratio < MIN_CONTRAST) {
          failures.push(
            `${game} (${dark ? 'dark' : 'light'}): ${ratio.toFixed(2)}:1 — ` +
              `rgb(${fg}) on rgb(${bg})`,
          );
        }
      }
    }

    // Guard against the check quietly degrading to measuring nothing if a
    // future refactor changes the heading element.
    expect(measured, 'should have measured a title on most games').toBeGreaterThan(40);

    expect(
      failures,
      `Page titles below ${MIN_CONTRAST}:1 — the heading is not readable ` +
        `against the page behind it:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });

  test('no game renders a disabled control at full strength', async ({ page }) => {
    const games = await gamePaths(page);
    const failures: string[] = [];

    for (const game of games) {
      await page.goto(`games/${game}`);

      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll('button')]
          .filter((b) => b.disabled && b.offsetParent !== null)
          .map((b) => {
            const cs = getComputedStyle(b);
            return {
              label: (b.textContent ?? '').trim().slice(0, 24),
              opacity: Number(cs.opacity),
              filter: cs.filter,
            };
          })
          // A disabled control must be visibly weaker than its enabled self.
          // Full opacity with no filter is the exact bug: the accent fill
          // reads as "tap me" while the button ignores taps.
          .filter((b) => b.opacity === 1 && b.filter === 'none'),
      );

      for (const o of offenders) {
        failures.push(`${game}: "${o.label}" is disabled but renders at full opacity`);
      }
    }

    expect(
      failures,
      `Disabled controls that still look tappable:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });
});
