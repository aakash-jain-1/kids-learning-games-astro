import { test, expect, type Page } from '@playwright/test';

/**
 * CONTEXT.md §5 rule 8 — guided wrong-answer feedback — enforced across
 * every game that has wrong answers (added 2026-08-23, when the last nine
 * games adopted the rule).
 *
 * The rule: a wrong tap gets a 250ms kinesthetic shake, a **red tint**, a
 * short error tone from `playWrong()`, and a spoken correction that ends by
 * revealing the right answer. Rounds are never failed and no score is shown.
 *
 * This suite exists because the rule had drifted for five months without
 * anyone noticing. It shipped in August 2026, five games adopted it, and the
 * other nine kept the *previous* rule (shake only, "NO colour shift") —
 * including a comment in each stylesheet asserting that no colour shift was
 * correct. Nothing failed, because every per-game spec only asserted the
 * shake class its own game had always added.
 *
 * So the assertions here are deliberately **cross-game and behavioural**:
 *
 *   - The red is measured from **rendered pixels**, not from a CSS value.
 *     The games do not agree on how to tint — most redden the border and
 *     the fill, Where's Teddy layers a wash over the whole scene because its
 *     tiles have no border to speak of — and a test that asserted
 *     `border-color` would have been asserting one implementation rather
 *     than the rule. What the rule actually says is that the option looks
 *     red, so that is what gets measured.
 *   - The tone is read from the **Web Audio graph**, by recording the
 *     frequency of every oscillator the page starts. `playWrong()` is
 *     220Hz; that is the only way to observe it from outside, and it means
 *     the test tracks the sound a child actually hears rather than the
 *     presence of a function call.
 *   - A correct tap is checked too, and must *not* produce 220Hz. Without
 *     that, a game that played the error tone on every tap would pass.
 *
 * Games with no wrong answer are deliberately absent: the browse decks and
 * card sets (every tap is valid), Days Parade (exploration), and Memory
 * Match, where a non-match is the mechanic rather than a mistake — see the
 * exception recorded under §5 rule 8.
 */

/** `playWrong()` — tone(220, 0.3) in src/lib/audio.ts. */
const WRONG_HZ = 220;
/** `playCorrect()` — tone(880, 0.15). */
const CORRECT_HZ = 880;

/**
 * How much redder the option has to get, in mean channel terms: red minus
 * the average of green and blue, across the whole option.
 *
 * Measured across all 14 games the day the bar was set: 17.7 (Magnitude
 * Comparison) to 41.6 (Pattern Sequences) in light mode, and 41.6 to 58.5 in
 * dark, where the fill steps up to 0.3. So 6 sits well under the weakest real
 * tint while still being far above the 0 an unchanged option scores — and
 * comfortably above what a different emoji font on CI can move, since the
 * glyph is identical in both screenshots and cancels out of the difference.
 *
 * For scale, the bug this suite was written during scored **-22.6**: the tint
 * had replaced the tile's white background rather than layering over it, so
 * the option became a window onto a teal page gradient and got measurably
 * *less* red on a wrong tap.
 */
const MIN_REDNESS_SHIFT = 6;

interface GameSpec {
  readonly slug: string;
  /** Tappable answer options. */
  readonly option: string;
  /** Class the game adds to a wrongly-tapped option. */
  readonly wrongClass: string;
  /**
   * Multi-select games clear the wrong state after a beat instead of
   * holding it for the round, so the class is only observable briefly.
   */
  readonly transient?: boolean;
}

const GAMES: readonly GameSpec[] = [
  // The five original adopters (2026-08-17).
  { slug: 'animal-sounds', option: '.as-tile', wrongClass: 'as-tile--wrong' },
  { slug: 'feeling-friends', option: '.ff-tile', wrongClass: 'ff-tile--wrong' },
  { slug: 'opposites-friends', option: '.of-tile', wrongClass: 'of-tile--wrong' },
  { slug: 'rhyme-time', option: '.rt-tile', wrongClass: 'rt-tile--wrong' },
  { slug: 'wheres-teddy', option: '.wt-scene', wrongClass: 'wt-scene--wrong' },
  // The nine that finished the migration (2026-08-23).
  { slug: 'counting-friends', option: '.cf-opt', wrongClass: 'cf-opt--wrong' },
  { slug: 'magnitude-comparison', option: '.mf-group', wrongClass: 'mf-group--wrong' },
  { slug: 'number-friends', option: '.nf-group', wrongClass: 'nf-group--wrong' },
  { slug: 'letter-friends', option: '.lf-tile', wrongClass: 'lf-tile--wrong' },
  { slug: 'sound-friends', option: '.sf-tile', wrongClass: 'sf-tile--wrong' },
  { slug: 'week-friends', option: '.week-opt', wrongClass: 'week-opt--wrong' },
  { slug: 'pattern-sequences', option: '.ps-opt', wrongClass: 'ps-opt--wrong' },
  { slug: 'number-bond-pop', option: '.nbp-opt', wrongClass: 'nbp-opt--wrong' },
  {
    slug: 'sorting-friends',
    option: '.sort-tile',
    wrongClass: 'sort-tile--wrong',
    transient: true,
  },
];

/**
 * Record the frequency of every oscillator the page starts, and every phrase
 * it speaks.
 *
 * The oscillator is hooked at `start()` rather than at creation because
 * `audio.ts` sets `frequency.value` after `createOscillator()` returns.
 * Speech is stubbed rather than observed so `onEnd` resolves promptly — a real
 * headless browser has no voices, and the games then wait out a watchdog.
 */
const HOOK = `
  (() => {
    const w = window;
    w.__tones = [];
    w.__spoke = [];
    const fake = {
      speaking: false, pending: false, cancel() {}, getVoices: () => [],
      speak(u) {
        w.__spoke.push(String((u && u.text) || ''));
        setTimeout(() => { try { u.onend && u.onend(new Event('end')); } catch (e) {} }, 25);
      },
    };
    Object.defineProperty(w, 'speechSynthesis', { get: () => fake, configurable: true });
    const Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) return;
    const orig = Ctor.prototype.createOscillator;
    Ctor.prototype.createOscillator = function () {
      const osc = orig.call(this);
      const start = osc.start.bind(osc);
      osc.start = (...args) => {
        w.__tones.push(Math.round(osc.frequency.value));
        return start(...args);
      };
      return osc;
    };
  })();
`;

const openGame = async (page: Page, slug: string): Promise<void> => {
  await page.addInitScript(HOOK);
  await page.goto(`games/${slug}-game.html`);
  await page.evaluate(() => {
    localStorage.clear();
    // Sound ON — the error tone is the thing under test. autoSpeak stays off
    // so nothing narrates before the first tap.
    localStorage.setItem(
      'kids_settings_v1',
      JSON.stringify({ dark: false, sound: true, autoSpeak: false, fontSize: 'medium' }),
    );
  });
  await page.reload();
  // Every option animates `border-color` and shakes. Both would make a
  // before/after pixel comparison depend on when the screenshot landed.
  await page.addStyleTag({
    content: '* { transition: none !important; animation: none !important; }',
  });
  await page.waitForTimeout(300);

  // Spend the "first tap asks the question" gesture on inert chrome, so the
  // taps this suite makes are judged as answers. A child does the same thing —
  // their first tap asks, and every tap after it is an answer. Without this,
  // the first tap here is swallowed and no game ever reports a wrong answer.
  await page.locator('h1').first().click();
  await settleSpeech(page);
};

/**
 * Wait until the page has stopped talking.
 *
 * The gesture above makes the game speak its intro, but it does so
 * *asynchronously* — Animal Sounds plays the animal clip first and narrates
 * after it. This used to be a flat `waitForTimeout(150)`, which raced: when
 * the intro landed after `tapUntilWrong` had cleared the log it was captured
 * as the response to the tap, and "the correction opens with…" then asserted
 * against "Listen! Who makes that sound?". The suite passed or failed on how
 * fast the machine was — it broke on an unrelated stylesheet change that moved
 * first paint by a few milliseconds.
 */
const settleSpeech = async (page: Page): Promise<void> => {
  let last = -1;
  for (let i = 0; i < 25; i++) {
    const n = await page.evaluate(
      () => (window as unknown as { __spoke: string[] }).__spoke.length,
    );
    if (n === last) return;
    last = n;
    await page.waitForTimeout(120);
  }
};

const tones = (page: Page): Promise<number[]> =>
  page.evaluate(() => (window as unknown as { __tones: number[] }).__tones ?? []);

/**
 * Mean `red - (green + blue) / 2` over a screenshot of one option.
 *
 * The buffer is round-tripped through a canvas in the page rather than
 * decoded in Node, because this repo has no PNG decoder on the test side —
 * same approach as the contrast suites.
 */
const redness = async (page: Page, option: string, index: number): Promise<number> => {
  const shot = await page.locator(option).nth(index).screenshot();
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
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! < 8) continue;
      sum += data[i]! - (data[i + 1]! + data[i + 2]!) / 2;
      n++;
    }
    return n === 0 ? 0 : sum / n;
  }, shot.toString('base64'));
};

/**
 * Tap options until one of them is judged wrong, reloading between attempts
 * because a game disables its options once a round is answered. Returns the
 * index that was wrong, or null if every option was accepted.
 *
 * Deliberately does not encode which answer is correct for each game — that
 * is per-game knowledge the per-game specs already own, and duplicating it
 * here would make this suite break every time a generator changed.
 */
const tapUntilWrong = async (page: Page, spec: GameSpec): Promise<number | null> => {
  const count = await page.locator(spec.option).count();
  expect(count, `${spec.slug} rendered no options`).toBeGreaterThan(1);

  for (let i = 0; i < count; i++) {
    if (i > 0) await openGame(page, spec.slug);

    // Drop anything said by the intro, so what's captured is the response to
    // this tap and nothing else.
    await page.evaluate(() => {
      (window as unknown as { __spoke: string[] }).__spoke.length = 0;
    });
    await page.locator(spec.option).nth(i).click();

    // Read immediately: the multi-select games drop the class after ~450ms.
    const wrong = await page.evaluate(
      ({ option, wrongClass, index }) => {
        const el = document.querySelectorAll(option)[index] as HTMLElement | undefined;
        return Boolean(el?.classList.contains(wrongClass));
      },
      { option: spec.option, wrongClass: spec.wrongClass, index: i },
    );

    if (wrong) return i;
  }
  return null;
};

/**
 * The words a wrong tap must open with, before any explanation.
 *
 * Kept as a literal rather than imported from `@/data/preschool-narration` on
 * purpose: importing it would assert that the games agree with each other,
 * which they would even if the phrase quietly became "Hmm!" again. The point
 * is that a child is *told* they were wrong, so the expected words are written
 * out here where changing them is a visible decision.
 */
const WRONG_LEAD = 'Not that one.';

test.describe('§5 rule 8 — a wrong tap is corrected, in every game that has one', () => {
  for (const spec of GAMES) {
    test(`${spec.slug}: a wrong tap sounds the error tone`, async ({ page }) => {
      await openGame(page, spec.slug);

      const idx = await tapUntilWrong(page, spec);
      expect(idx, `${spec.slug}: no option was ever treated as wrong`).not.toBeNull();

      const played = await tones(page);
      expect(
        played,
        `${spec.slug}: no ${WRONG_HZ}Hz error tone — playWrong() is not wired into the wrong branch`,
      ).toContain(WRONG_HZ);
    });

    /**
     * The verification judgment, in words.
     *
     * Every game used to open its correction with "Hmm!", and two went
     * straight into teaching. A red tint and a tone are the only other signals
     * that anything was wrong, and neither is language: a three-year-old hears
     * "Hmm! Let's count them together" as the game thinking, then being
     * helpful. Reviews of corrective feedback with 3-11 year olds find the
     * explicit right/wrong judgment in ~85% of studied conditions, paired with
     * the correct answer — these games had the second half and not the first.
     */
    test(`${spec.slug}: a wrong tap says so, out loud`, async ({ page }) => {
      await openGame(page, spec.slug);

      const idx = await tapUntilWrong(page, spec);
      expect(idx, `${spec.slug}: no option was ever treated as wrong`).not.toBeNull();

      const spoke = await page.evaluate(
        () => (window as unknown as { __spoke: string[] }).__spoke.slice(),
      );
      expect(spoke.length, `${spec.slug}: a wrong tap said nothing at all`).toBeGreaterThan(0);

      expect(
        spoke[0],
        `${spec.slug}: the correction opens with "${spoke[0] ?? ''}" — a child is taught at ` +
          `without first being told the answer was wrong`,
      ).toContain(WRONG_LEAD);
    });

    /**
     * Measured by applying the class rather than by playing a round, so the
     * multi-select games — which drop the class after ~450ms — get the same
     * assertion as the rest instead of a weaker one. What the tap flow does
     * with the class is the test above; this one is only about whether the
     * state is visibly red.
     */
    test(`${spec.slug}: the wrong option renders visibly red`, async ({ page }) => {
      await openGame(page, spec.slug);

      const before = await redness(page, spec.option, 0);
      await page.evaluate(
        ({ option, wrongClass }) =>
          document.querySelector(option)?.classList.add(wrongClass),
        { option: spec.option, wrongClass: spec.wrongClass },
      );
      const after = await redness(page, spec.option, 0);

      const shift = after - before;
      expect(
        shift,
        `${spec.slug}: the wrong state shifts redness by only ${shift.toFixed(1)}, so a child sees no red tint`,
      ).toBeGreaterThan(MIN_REDNESS_SHIFT);
    });
  }

  /**
   * The negative control. Every assertion above would still pass if a game
   * played the error tone on every tap, or tinted every option red.
   */
  test('a correct tap plays the celebration tone and never the error tone', async ({
    page,
  }) => {
    // Letter Friends is the cheapest game to answer correctly on purpose:
    // the target letter is on the stage and each tile carries its own.
    await openGame(page, 'letter-friends');

    const target = (await page.locator('#lfTargetGlyph').textContent())?.trim() ?? '';
    expect(target).toBeTruthy();

    const correctIdx = await page.evaluate((letter: string) => {
      const tiles = Array.from(document.querySelectorAll<HTMLElement>('.lf-tile'));
      return tiles.findIndex((t) => t.dataset.letter === letter);
    }, target);
    expect(correctIdx, 'could not find the correct tile').toBeGreaterThanOrEqual(0);

    await page.locator('.lf-tile').nth(correctIdx).click();
    await page.waitForTimeout(200);

    const played = await tones(page);
    expect(played, 'a correct tap played no celebration tone').toContain(CORRECT_HZ);
    expect(
      played,
      'the error tone fired on a CORRECT answer, so the tone proves nothing',
    ).not.toContain(WRONG_HZ);
  });

  /**
   * Memory Match is the one game where a "wrong-looking" tap is not a wrong
   * answer, so the rule must NOT be applied. Pinning it here keeps the
   * exception deliberate rather than something a later sweep quietly
   * "fixes".
   */
  test('memory match is exempt: a non-match gets no error tone and no red', async ({
    page,
  }) => {
    await openGame(page, 'memory-match');

    const [a, b] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.mm-card'));
      const first = cards[0]!;
      const other = cards.find((c) => c.dataset.animal !== first.dataset.animal)!;
      return [Number(first.dataset.slot), Number(other.dataset.slot)];
    });

    await page.locator(`.mm-card[data-slot="${a}"]`).click();
    await page.locator(`.mm-card[data-slot="${b}"]`).click();
    await page.waitForTimeout(250);

    const played = await tones(page);
    expect(
      played,
      'Memory Match played the error tone for a non-match, which is not a wrong answer',
    ).not.toContain(WRONG_HZ);
    await expect(page.locator('.mm-card--wrong')).toHaveCount(0);
  });
});
