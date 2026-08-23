import { test, expect, type Page } from '@playwright/test';

/**
 * A wrong quiz answer is marked on the button the child actually tapped, and
 * stays marked when animation is switched off (added 2026-08-23).
 *
 * `mountQuiz`'s feedback was designed in 2026-05-20 to be deliberately gentle:
 * no red, no desaturation, no buzzer, because shame-coded error feedback is
 * what that decision set out to avoid. That still stands, and this spec does
 * not challenge it — the quiz is the documented exemption to §5 rule 8, which
 * governs the preschool games' own answer loops.
 *
 * The defect was in the *carrier*. "No colour on wrong" had quietly become "no
 * static anything on wrong": `.quiz-opt--wrong` set an animation and nothing
 * else, and `global.css` cuts every animation to 0.01ms under
 * `prefers-reduced-motion`. Measured across four games, a wrong tap under
 * reduced motion left the tapped button pixel-identical to options the child
 * never touched — the only signal left was a green ring lighting up on a
 * *different* button, which is also roughly what a correct answer looks like.
 *
 * So the assertions are deliberately shaped around motion being off, and
 * around comparing the tapped button to its own untouched siblings rather than
 * to its earlier self: the whole option row dims while the feedback window is
 * open, and a change shared by every button says nothing about which one the
 * child picked.
 *
 * Hover and focus are cleared before measuring for the same reason. Playwright
 * parks the cursor on whatever it clicked, and the `:hover` lift alone made
 * this look fixed when it wasn't. A child on a tablet has no cursor.
 */

/** Properties that survive `prefers-reduced-motion`, i.e. everything but the shake. */
const STATIC_PROPS = [
  'outlineStyle',
  'outlineColor',
  'outlineWidth',
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'color',
  'opacity',
  'filter',
  'boxShadow',
  'textDecorationLine',
] as const;

interface OptionLook {
  state: '--wrong' | '--reveal' | '--correct' | 'untouched';
  style: Record<string, string>;
}

const readOptions = async (page: Page): Promise<OptionLook[]> =>
  page.evaluate((props) => {
    return [...document.querySelectorAll('.quiz-opt')].map((b) => {
      const cs = getComputedStyle(b);
      const style: Record<string, string> = {};
      for (const p of props) style[p] = cs[p as keyof CSSStyleDeclaration] as string;
      return {
        state: b.classList.contains('quiz-opt--wrong')
          ? '--wrong'
          : b.classList.contains('quiz-opt--reveal')
            ? '--reveal'
            : b.classList.contains('quiz-opt--correct')
              ? '--correct'
              : 'untouched',
        style,
      } as OptionLook;
    });
  }, STATIC_PROPS as unknown as string[]);

const differences = (a: OptionLook, b: OptionLook): string[] =>
  STATIC_PROPS.filter((p) => a.style[p] !== b.style[p]).map(
    (p) => `${p}: ${a.style[p]} vs ${b.style[p]}`,
  );

/** Open the quiz, however this game exposes it. Returns false if it has none. */
const openQuiz = async (page: Page, game: string): Promise<boolean> => {
  await page.goto(`games/${game}`);
  // Most games put the quiz behind the 🧠 pill; Woodcutter renders it inline
  // on the page and starts it on load (`GameControls quiz={false}`).
  if (await page.locator('#btnQuiz').count()) await page.locator('#btnQuiz').click();
  return page
    .waitForSelector('.quiz-opt', { timeout: 1200 })
    .then(() => true)
    .catch(() => false);
};

/**
 * Tap options until one of them lands on a wrong answer, and return what every
 * option looked like at that moment. Which index is correct isn't knowable from
 * the DOM, so this walks questions until it misses one.
 */
const tapUntilWrong = async (page: Page): Promise<OptionLook[] | null> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (!(await page.locator('.quiz-opt').count())) return null;
    const total = await page.locator('.quiz-opt').count();
    const pick = attempt % total;
    const btn = page.locator('.quiz-opt').nth(pick);

    await btn.click();
    await page.mouse.move(0, 0);
    await btn.evaluate((b: HTMLElement) => b.blur());

    const looks = await readOptions(page);
    if (looks[pick]?.state === '--wrong') return looks;

    // That one was right — let the quiz advance and try a different index.
    await page.waitForTimeout(650);
  }
  return null;
};

const gamePaths = async (page: Page): Promise<string[]> => {
  await page.goto('');
  const hrefs = await page.locator('a[href*="-game"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
  );
  const seen = [...new Set(hrefs)].map((h) => h.split('/').pop() ?? '').filter(Boolean);
  // Woodcutter's URL is `-story`, not `-game`, so the home-page sweep misses it
  // and it is the one quiz that isn't behind the pill. Named explicitly rather
  // than left out, because it is a `mountQuiz` consumer like the rest.
  return [...seen, 'woodcutter-story'].sort();
};

test.describe('a wrong quiz answer is marked on the button that was tapped', () => {
  test('the tapped option is distinguishable with animation switched off', async ({
    page,
  }) => {
    // Walks every game on the home page looking for a quiz, and misses its
    // way through several questions per game to land on a wrong answer.
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      'reduced motion should be emulated, or this test proves nothing',
    ).toBe(true);

    const failures: string[] = [];
    let checked = 0;

    for (const game of await gamePaths(page)) {
      if (!(await openQuiz(page, game))) continue;

      const looks = await tapUntilWrong(page);
      if (!looks) continue;

      const wrong = looks.find((o) => o.state === '--wrong')!;
      const untouched = looks.filter((o) => o.state === 'untouched');
      const reveal = looks.find((o) => o.state === '--reveal');
      if (!untouched.length) continue;
      checked += 1;

      // 1. The child's pick must not look like an option they ignored.
      if (!differences(wrong, untouched[0]!).length) {
        failures.push(
          `${game}: the tapped wrong option is identical to one the child ` +
            `never touched — nothing marks their choice`,
        );
      }

      // 2. "Yours" and "the right one" must not look the same either.
      if (reveal && !differences(wrong, reveal).length) {
        failures.push(
          `${game}: the wrong pick and the revealed answer render identically`,
        );
      }

      // 3. Control: two options the child ignored must match each other. If
      //    this ever fails, check 1 could pass on incidental per-button
      //    styling rather than on real feedback.
      if (untouched.length > 1) {
        const noise = differences(untouched[0]!, untouched[1]!);
        if (noise.length) {
          failures.push(
            `${game}: two untouched options already differ (${noise.join(', ')}) — ` +
              `the comparison above is not measuring feedback`,
          );
        }
      }
    }

    expect(checked, 'should have exercised the quiz in most games').toBeGreaterThanOrEqual(
      12,
    );

    expect(
      failures,
      `Quiz feedback that disappears when motion is off:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });

  test('the right answer ring is legible on the panel behind it', async ({ page }) => {
    // The reveal is the part that actually teaches, and on the white
    // light-mode panel the original green measured 2.28:1 — the faintest
    // mark on the screen. Non-text UI indicators want 3:1.
    const relLum = (rgb: number[]): number => {
      const ch = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(rgb[0]!) + 0.7152 * ch(rgb[1]!) + 0.0722 * ch(rgb[2]!);
    };
    const contrast = (a: number[], b: number[]): number => {
      const [hi, lo] = [relLum(a), relLum(b)].sort((m, n) => n - m) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const parse = (s: string): number[] => s.match(/\d+/g)!.slice(0, 3).map(Number);

    const failures: string[] = [];
    let checked = 0;

    for (const dark of [false, true]) {
      for (const game of ['colors-game', 'shapes-game', 'animals-game', 'hindi-game']) {
        await page.goto(`games/${game}`);
        await page.evaluate((d) => {
          localStorage.setItem(
            'kids_settings_v1',
            JSON.stringify({ dark: d, sound: false, autoSpeak: false, fontSize: 'medium' }),
          );
        }, dark);
        if (!(await openQuiz(page, game))) continue;

        const { ring, panel } = await page.evaluate(() => {
          const opt = document.querySelector('.quiz-opt')!;
          opt.classList.add('quiz-opt--reveal');
          const ringColour = getComputedStyle(opt).outlineColor;
          opt.classList.remove('quiz-opt--reveal');
          // The outline is drawn outside the button, so it sits on whatever
          // the modal panel paints, not on the button's own fill.
          let el: HTMLElement | null = opt.parentElement;
          while (el) {
            const c = getComputedStyle(el).backgroundColor;
            if (c && !c.includes('rgba(0, 0, 0, 0)')) return { ring: ringColour, panel: c };
            el = el.parentElement;
          }
          return { ring: ringColour, panel: 'rgb(255, 255, 255)' };
        });

        checked += 1;
        const ratio = contrast(parse(ring), parse(panel));
        if (ratio < 3) {
          failures.push(
            `${game} (${dark ? 'dark' : 'light'}): reveal ring ${ratio.toFixed(2)}:1 — ` +
              `${ring} on ${panel}`,
          );
        }
      }
    }

    expect(checked, 'should have measured a ring in both modes').toBeGreaterThanOrEqual(6);
    expect(
      failures,
      `The ring marking the right answer is too faint to see:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });
});
