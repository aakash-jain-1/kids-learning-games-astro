import { test, expect, type Page } from '@playwright/test';

/**
 * Right and wrong never differ by hue alone (added 2026-08-23).
 *
 * Red-versus-green is the one pair a colour-blind eye cannot resolve, and
 * roughly one boy in twelve has some form of red-green deficiency. Measured
 * across all 14 games that have a wrong answer: a wrong option and a correct
 * one sit ~24 ΔE apart for normal colour vision, and under simulated
 * deuteranopia (Machado et al. 2009) that collapses to **under 7 in nine of
 * them** — near enough the same colour. Ten of the fourteen had no other
 * difference between the two states at all.
 *
 * The four original adopters already solved it: a `✗` badge in `::after` on
 * the wrong tile. The other ten now copy it. Rule 8 does give a wrong answer
 * three other channels — shake, error tone, spoken correction — but all three
 * are gone at once for a child with sound off and reduced motion, which is not
 * an exotic combination, and none of them mark *which tile on screen* was
 * which after the fact.
 *
 * ── Why it measures pixels, and which ones ──
 *
 * The obvious test — mean luminance difference between the two states — was
 * tried and rejected on evidence: suppressing the badge moved it from 1.89 to
 * 1.64 on Animal Sounds, because a small glyph barely shifts a whole-tile
 * average while the red and green tints already differ slightly in lightness.
 * It would have passed whether or not the fix existed.
 *
 * What discriminates is the *fraction of pixels that differ strongly* in
 * luminance. A hue-only change moves the whole surface a little; a mark drawn
 * on top moves a few pixels a lot. Measured, that reads 0.22–0.55% with the
 * badge and exactly 0.00% without it.
 *
 * Deliberately mechanism-agnostic: it asks "is there a difference that
 * survives losing hue", not "is there a ✗". Sorting Friends passes on
 * lightness alone, which is a perfectly good channel, and a future game could
 * use a border style or a shape instead without this needing to change.
 */

/** Luminance gap that counts as "drawn on top" rather than "tinted". */
const STRONG = 25;

/**
 * Percentage of pixels that differ strongly in luminance between two renders.
 * Threshold from measurement: 0.00% when only hue differs, 0.22% at the
 * smallest real mark, so 0.1% sits clear of both.
 */
const MIN_STRONG_PCT = 0.1;

interface Game {
  slug: string;
  option: string;
}

const GAMES: Game[] = [
  { slug: 'animal-sounds', option: '.as-tile' },
  { slug: 'feeling-friends', option: '.ff-tile' },
  { slug: 'opposites-friends', option: '.of-tile' },
  { slug: 'rhyme-time', option: '.rt-tile' },
  { slug: 'wheres-teddy', option: '.wt-scene' },
  { slug: 'counting-friends', option: '.cf-opt' },
  { slug: 'magnitude-comparison', option: '.mf-group' },
  { slug: 'number-friends', option: '.nf-group' },
  { slug: 'letter-friends', option: '.lf-tile' },
  { slug: 'sound-friends', option: '.sf-tile' },
  { slug: 'week-friends', option: '.week-opt' },
  { slug: 'pattern-sequences', option: '.ps-opt' },
  { slug: 'number-bond-pop', option: '.nbp-opt' },
  { slug: 'sorting-friends', option: '.sort-tile' },
];

const strongPct = (page: Page, a: string, b: string): Promise<number> =>
  page.evaluate(
    async ([b64a, b64b, strong]) => {
      const load = async (d: string): Promise<ImageData> => {
        const img = new Image();
        img.src = `data:image/png;base64,${d}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height);
      };
      const [ia, ib] = [await load(b64a as string), await load(b64b as string)];
      if (ia.width !== ib.width || ia.height !== ib.height) return -1;

      const lum = (d: Uint8ClampedArray, i: number): number =>
        0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;

      let hits = 0;
      for (let i = 0; i < ia.data.length; i += 4) {
        if (Math.abs(lum(ia.data, i) - lum(ib.data, i)) > (strong as number)) hits++;
      }
      return (hits / (ia.data.length / 4)) * 100;
    },
    [a, b, STRONG] as [string, string, number],
  );

/** Render one option in a given feedback state and return the PNG. */
const shoot = async (page: Page, g: Game, state: string | null): Promise<string> => {
  const el = page.locator(g.option).first();
  const cls = `${g.option.slice(1)}--${state}`;
  if (state) {
    await el.evaluate((n, c) => n.classList.add(c), cls);
    // Tints transition in; sampling early reads the pre-transition colour.
    await page.waitForTimeout(420);
  }
  const png = (await el.screenshot()).toString('base64');
  if (state) {
    await el.evaluate((n, c) => n.classList.remove(c), cls);
    await page.waitForTimeout(120);
  }
  return png;
};

test.describe('a colour-blind child can still tell right from wrong', () => {
  test('every wrong state differs from correct and reveal without using hue', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const failures: string[] = [];

    for (const g of GAMES) {
      await page.goto(`games/${g.slug}-game`);
      await expect(page.locator(g.option).first()).toBeVisible();

      const wrong = await shoot(page, g, 'wrong');
      for (const other of ['correct', 'reveal']) {
        const png = await shoot(page, g, other);
        const pct = await strongPct(page, wrong, png);

        if (pct < 0) {
          failures.push(`${g.slug}: ${other} render changed size, cannot compare`);
        } else if (pct < MIN_STRONG_PCT) {
          failures.push(
            `${g.slug}: wrong vs ${other} differ on ${pct.toFixed(2)}% of pixels ` +
              `once hue is discarded — the two states are the same picture in ` +
              `two colours`,
          );
        }
      }
    }

    expect(
      failures,
      `States a red-green colour-blind child cannot tell apart:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });

  test('the measure reads zero when nothing changed', async ({ page }) => {
    // Control. Without this, the check above could pass on rendering noise
    // or on a screenshot that silently captured the wrong element.
    await page.goto('games/animal-sounds-game');
    await expect(page.locator('.as-tile').first()).toBeVisible();

    const a = await shoot(page, GAMES[0]!, null);
    const b = await shoot(page, GAMES[0]!, null);

    expect(
      await strongPct(page, a, b),
      'two identical renders should share every pixel',
    ).toBeLessThan(MIN_STRONG_PCT);
  });
});
