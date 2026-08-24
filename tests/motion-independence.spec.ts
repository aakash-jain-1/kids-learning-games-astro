import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * The cases above are a hand-written list, which is the failure mode this
 * project keeps rediscovering: a rule restated per site drifts the moment
 * someone adds a site. This scan is the part that generalises — it reads the
 * stylesheets and finds the *shape* rather than the known instances, so a new
 * animation-only state class has to be justified here before it can ship.
 *
 * Every allowlisted selector states why motion-only is acceptable for it.
 * There are two honest reasons: the class carries no information (a pop on
 * artwork that is being swapped anyway — the child learns nothing from the
 * movement that the new picture doesn't already tell them), or a static
 * companion class is always applied in the same breath.
 */

/** Properties that produce no rendering once animations are cut to 0.01ms. */
const MOTION_ONLY = /^(animation|animation-.*|will-change|transition|transition-.*)$/;

const ALLOWED: Record<string, string> = {
  // ── Carries no information: entrance/attention flourish on artwork that is
  // itself being replaced. With motion off the child still sees the new card.
  '.card-emoji-big.pop': 'card art swap (card-machine)',
  '.card-img.pop': 'card art swap (card-machine)',
  '.card-num-text.pop': 'card art swap (card-machine)',
  '.gl-detail-image.pop': 'detail image swap (grid)',
  '.gl-shape-figure.gl-shape-figure--big.pop': 'detail shape swap (grid)',
  '.gl-shape-figure.gl-shape-figure--big.gl-shape-figure--diamond.pop':
    'detail shape swap (grid)',
  '.planet-art.pop': 'planet art swap (solar system)',
  '.planet-art.flash': 'planet art swap (solar system)',
  '.scrn-emoji.flash': 'screen content swap (card-machine)',
  '.scrn-img.flash': 'screen content swap (card-machine)',
  '.scrn-num.flash': 'screen content swap (card-machine)',
  '.dp-card--pop': 'card entrance (days parade); the card itself is the content',
  '.nbp-cell--pop': 'cell entrance (number bond pop)',
  '.gl-tile.just-tapped': 'tap acknowledgement; the detail panel opening is the real feedback',

  // ── Decorative background art, not tied to any game state.
  '.gl-shape.gl-shape--diamond': 'floating background shape (grid)',
  '.gl-shape:nth-child(1)': 'floating background shape stagger (grid)',
  '.gl-shape:nth-child(2)': 'floating background shape stagger (grid)',
  '.gl-shape:nth-child(3)': 'floating background shape stagger (grid)',
  '.gl-shape:nth-child(4)': 'floating background shape stagger (grid)',
  '.gl-shape:nth-child(5)': 'floating background shape stagger (grid)',

  // ── Real state, but a static companion class lands at the same moment, so
  // the item stays marked with motion off. Verified by the CASES above.
  '.cf-item.cf-pulse': 'always applied with `cf-counted`, which draws a static ring',
  '.nf-item.nf-item--pulse': 'always applied with `nf-item--counted`',
  '.mf-item.mf-item--pulse': 'always applied with `mf-item--counted`',
};

/** Every selector in the codebase, mapped to the union of its declarations. */
const scanSelectors = (): Map<string, { props: Set<string>; files: Set<string> }> => {
  const sources: [string, string][] = [];
  for (const f of readdirSync('src/styles')) {
    if (f.endsWith('.css'))
      sources.push([`src/styles/${f}`, readFileSync(join('src/styles', f), 'utf8')]);
  }
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.astro')) {
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
          sources.push([p, m[1]!]);
      }
    }
  };
  walk('src');

  const bySelector = new Map<string, { props: Set<string>; files: Set<string> }>();
  for (const [file, css] of sources) {
    // `@keyframes` bodies describe frames, not applied state, so their
    // declarations must not count as a selector's static styling.
    const clean = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

    for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectorList = m[1]!.trim();
      if (!selectorList || selectorList.startsWith('@')) continue;
      const props = m[2]!
        .split(';')
        .map((d) => d.split(':')[0]?.trim().toLowerCase())
        .filter(Boolean) as string[];
      if (!props.length) continue;

      for (const sel of selectorList.split(',')) {
        // The state class is the last compound: `body.dark-mode .x--wrong` is
        // a rule *about* `.x--wrong`, and both rules must be pooled.
        const key = sel.trim().split(/\s+/).pop();
        if (!key || !key.includes('.')) continue;
        if (!bySelector.has(key))
          bySelector.set(key, { props: new Set(), files: new Set() });
        const rec = bySelector.get(key)!;
        rec.files.add(file);
        for (const p of props) rec.props.add(p);
      }
    }
  }
  return bySelector;
};

test.describe('the rule generalises past the cases listed above', () => {
  test('no selector renders only when animation is allowed, unless justified', () => {
    const found = [...scanSelectors().entries()]
      .filter(([, r]) => [...r.props].some((p) => p.startsWith('animation')))
      .filter(([, r]) => [...r.props].every((p) => MOTION_ONLY.test(p)));

    const unjustified = found
      .filter(([sel]) => !(sel in ALLOWED))
      .map(([sel, r]) => `${sel}  (${[...r.files].join(', ')})`);

    // If the scan stops finding the known-decorative ones, its parsing broke
    // and the check above would pass by finding nothing at all.
    expect(
      found.length,
      'the scan should still be finding the allowlisted flourishes',
    ).toBeGreaterThan(15);

    expect(
      unjustified,
      'These selectors render nothing once animations are cut to 0.01ms, so ' +
        'whatever they signal is invisible to a child who asked for less ' +
        'motion. Give them a static form, or add them to ALLOWED with the ' +
        'reason they carry no information:\n  ' +
        unjustified.join('\n  '),
    ).toEqual([]);
  });

  test('every allowlist entry still exists', () => {
    // An allowlist that outlives the CSS it excuses is how a guard quietly
    // stops guarding: stale entries would mask a real regression if the same
    // class name came back.
    const present = new Set(scanSelectors().keys());
    const stale = Object.keys(ALLOWED).filter((sel) => !present.has(sel));

    expect(
      stale,
      `Allowlisted selectors that no longer exist — delete them:\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });
});
