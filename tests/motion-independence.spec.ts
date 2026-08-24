import { test, expect, type Page } from '@playwright/test';

/**
 * State a child needs is never carried by animation alone (added 2026-08-23).
 *
 * The quiz's wrong-answer mark was the first instance found:
 * `.quiz-opt--wrong` set an `animation` and nothing else, and `global.css`
 * cuts animation to 0.01ms under `prefers-reduced-motion`, so the mark on the
 * tapped button rendered as nothing. Sweeping the stylesheets for the shape —
 * selectors whose *union* of declarations across every rule is animation-only —
 * turned up 26 candidates, of which most were decorative `.pop`/`.flash` on
 * card art that changes anyway.
 *
 * Six were not decorative. Every guided walk-through in the app does this:
 *
 *     item.classList.add('week-card--pulse');
 *     narrate(day, { onEnd: () => item.classList.remove('week-card--pulse') });
 *
 * The class is on screen for exactly as long as the word is being spoken, so
 * it is the thing pairing a word a pre-reader cannot read with the card it
 * belongs to. That pairing *is* the lesson. Three of the six (Counting, Number
 * and More Friends) also add a static `--counted` ring and were fine; three
 * (Week Friends, Days Parade, Pattern Sequences) were animation-only and went
 * completely blank with motion off.
 *
 * The three that were already correct are kept here as controls rather than
 * dropped: if they ever stop showing a difference, this spec is measuring
 * nothing and the other three would pass for the wrong reason.
 */

/** A state class, the element it lands on, and whether it must be visible. */
interface Case {
  game: string;
  item: string;
  classes: string[];
  what: string;
}

const CASES: Case[] = [
  {
    game: 'week-friends-game',
    item: '.week-card',
    classes: ['week-card--pulse'],
    what: 'the day being sung',
  },
  {
    game: 'days-parade-game',
    item: '.dp-card',
    classes: ['dp-card--singing'],
    what: 'the day being sung',
  },
  {
    game: 'pattern-sequences-game',
    item: '.ps-circle',
    classes: ['ps-circle--pulse'],
    what: 'the circle being named',
  },
  // Controls — these paired their pulse with a static ring from the start.
  {
    game: 'counting-friends-game',
    item: '.cf-item',
    classes: ['cf-counted', 'cf-pulse'],
    what: 'the item being counted',
  },
  {
    game: 'number-friends-game',
    item: '.nf-item',
    classes: ['nf-item--counted', 'nf-item--pulse'],
    what: 'the item being counted',
  },
  {
    game: 'magnitude-comparison-game',
    item: '.mf-item',
    classes: ['mf-item--counted', 'mf-item--pulse'],
    what: 'the item being counted',
  },
];

/** Properties that still render once animations are cut to 0.01ms. */
const STATIC_PROPS = [
  'outlineStyle',
  'outlineColor',
  'outlineWidth',
  'backgroundColor',
  'backgroundImage',
  'borderColor',
  'borderWidth',
  'color',
  'opacity',
  'filter',
  'boxShadow',
] as const;

/**
 * What changes on one element when the state class is applied.
 *
 * Compared against *itself*, not against a sibling: the items are not
 * interchangeable — Tuesday is a different colour from Monday, and the
 * pattern circles differ by design — so a sibling comparison reports the
 * palette rather than the state. (The quiz spec does the opposite, for the
 * opposite reason: there the options are identical and the whole row dims
 * together while the feedback window is open.)
 */
const applyAndDiff = async (page: Page, c: Case): Promise<string[]> =>
  page.evaluate(
    async ({ item, classes, props }) => {
      const el = document.querySelector(item);
      if (!el) return ['__MISSING__'];
      const read = (): Record<string, string> => {
        const cs = getComputedStyle(el);
        return Object.fromEntries(
          props.map((p) => [p, cs[p as keyof CSSStyleDeclaration] as string]),
        );
      };
      const before = read();
      el.classList.add(...classes);
      await new Promise((r) => setTimeout(r, 160));
      const after = read();
      el.classList.remove(...classes);
      return props.filter((p) => before[p] !== after[p]);
    },
    { item: c.item, classes: c.classes, props: STATIC_PROPS as unknown as string[] },
  );

test.describe('a child who asked for less motion still sees what is happening', () => {
  test('every guided walk-through marks its current item without animating', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      'reduced motion must be emulated, or this test proves nothing',
    ).toBe(true);

    const failures: string[] = [];

    for (const c of CASES) {
      await page.goto(`games/${c.game}`);
      await expect(page.locator(c.item).first()).toBeVisible();

      const changed = await applyAndDiff(page, c);
      if (changed[0] === '__MISSING__') {
        failures.push(`${c.game}: no ${c.item} rendered — the case needs updating`);
        continue;
      }
      if (!changed.length) {
        failures.push(
          `${c.game}: "${c.what}" (${c.classes.join(' ')}) renders nothing with ` +
            `motion off — the child cannot tell which one is being spoken about`,
        );
      }
    }

    expect(
      failures,
      `State that only exists as movement:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });

  test('the same marks are visible when motion is allowed', async ({ page }) => {
    // The control direction: with animation on, every one of these must also
    // read. A fix that somehow only applied under the reduced-motion media
    // query would pass the test above and be wrong.
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const failures: string[] = [];
    for (const c of CASES) {
      await page.goto(`games/${c.game}`);
      await expect(page.locator(c.item).first()).toBeVisible();
      const changed = await applyAndDiff(page, c);
      if (!changed.length || changed[0] === '__MISSING__') {
        failures.push(`${c.game}: "${c.what}" renders nothing even with motion allowed`);
      }
    }

    expect(failures, `Invisible state:\n  ${failures.join('\n  ')}`).toEqual([]);
  });
});
