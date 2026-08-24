import { test, expect, type Page } from '@playwright/test';

/**
 * Answering ends the round's script (added 2026-08-24).
 *
 * Every game narrates its round as a chain — Counting Friends does
 * `intro → gap → addition → gap → question`, each step scheduled from the
 * previous one's `onEnd`. The tap handlers all guard on `answered`, but the
 * continuations already in flight did not, so a child who answered while the
 * game was still talking heard the rest of the story arrive *after* their
 * correction:
 *
 *     [taps]  "Look! Two apples hang on a tree."
 *             "Not that one. Let's count them together!"
 *             "one"
 *             "Then two more apples come!"      <- leftover story beat
 *             "two"
 *             "How many apples in all?"         <- asked after it was answered
 *             "three" ... "four"
 *
 * Two games did it: Counting Friends and Magnitude Comparison. Both now carry
 * an `introRun` generation counter, bumped on every answer and every round
 * change, which each step checks before continuing.
 *
 * Found from a test flake rather than by playing — `wrong-answer.spec.ts` read
 * a leaked story beat as the correction and failed roughly one full run in
 * three. The flake was the app misbehaving, not the test.
 *
 * The tap lands as soon as the round has said its first line. A three-year-old
 * who already knows the answer taps the moment the options appear, so this is
 * ordinary use, not an edge case.
 */

/**
 * The games that narrate a round in more than one step, and so are the only
 * ones that *can* leak. Named rather than detected, so that flattening one of
 * these scripts fails loudly here instead of quietly turning its test into a
 * tautology. The other twelve say their round in a single line; their tests
 * below are cheap insurance against a chain being added later without a guard.
 */
const CHAINED = new Set(['counting-friends', 'magnitude-comparison']);

const GAMES: readonly (readonly [string, string])[] = [
  ['animal-sounds', '.as-tile'],
  ['feeling-friends', '.ff-tile'],
  ['opposites-friends', '.of-tile'],
  ['rhyme-time', '.rt-tile'],
  ['wheres-teddy', '.wt-scene'],
  ['counting-friends', '.cf-opt'],
  ['magnitude-comparison', '.mf-group'],
  ['number-friends', '.nf-group'],
  ['letter-friends', '.lf-tile'],
  ['sound-friends', '.sf-tile'],
  ['week-friends', '.week-opt'],
  ['pattern-sequences', '.ps-opt'],
  ['number-bond-pop', '.nbp-opt'],
  ['sorting-friends', '.sort-tile'],
];

const HOOK = `
  (() => {
    const w = window;
    w.__spoke = [];
    const fake = {
      speaking: false, pending: false, cancel() {}, getVoices: () => [],
      speak(u) {
        w.__spoke.push(String((u && u.text) || ''));
        setTimeout(() => { try { u.onend && u.onend(new Event('end')); } catch (e) {} }, 25);
      },
    };
    Object.defineProperty(w, 'speechSynthesis', { get: () => fake, configurable: true });
  })();
`;

const openGame = async (page: Page, slug: string): Promise<void> => {
  await page.addInitScript(HOOK);
  await page.goto(`games/${slug}-game.html`);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'kids_settings_v1',
      JSON.stringify({ dark: false, sound: true, autoSpeak: false, fontSize: 'medium' }),
    );
  });
  await page.reload();
};

const spoken = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __spoke: string[] }).__spoke.slice());

/**
 * Wait for the page to start talking and then stop.
 *
 * The quiet window has to be longer than the gaps *inside* a chain, or this
 * returns mid-story and measures nothing — the same mistake `settleSpeech` in
 * `wrong-answer.spec.ts` made. The widest observed gap is ~210ms (the guided
 * count), so 800ms of silence is the bar.
 *
 * The generous wait for the *first* line is for Animal Sounds, which plays the
 * animal's recording and narrates from its `onEnd`, so it stays silent for as
 * long as the call lasts.
 */
const spokenCount = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __spoke: string[] }).__spoke.length);

/**
 * Wait until the round has said its first line — the moment to answer over it.
 *
 * Tapping at a fixed delay instead is the very mistake this file was written
 * while chasing: 150ms raced Magnitude Comparison's second beat, which lands
 * about 175ms in, so on a quick run the script had already finished and the
 * test failed its own non-vacuity check. Anchoring to the script rather than
 * the clock puts the tap in the gap after line one on any machine.
 */
const waitForFirstLine = async (page: Page): Promise<void> => {
  for (let i = 0; i < 140 && (await spokenCount(page)) === 0; i++) {
    await page.waitForTimeout(50);
  }
};

const settle = async (page: Page): Promise<void> => {
  const len = (): Promise<number> => spokenCount(page);

  await waitForFirstLine(page);

  let last = -1;
  let quiet = 0;
  for (let i = 0; i < 60; i++) {
    const n = await len();
    quiet = n === last ? quiet + 1 : 0;
    if (quiet >= 4) return;
    last = n;
    await page.waitForTimeout(200);
  }
};

test.describe('answering ends the round, and the game stops telling its story', () => {
  for (const [slug, option] of GAMES) {
    test(`${slug}: nothing from the intro is spoken after the answer`, async ({ page }) => {
      test.slow();

      // What does the round say if nobody interrupts it?
      await openGame(page, slug);
      await page.locator('h1').first().click();
      await settle(page);
      const intro = await spoken(page);
      expect(intro.length, `${slug}: the round narrated nothing at all`).toBeGreaterThan(0);

      // Now answer while it is still talking.
      await openGame(page, slug);
      await page.locator('h1').first().click();
      await waitForFirstLine(page);
      const saidBeforeTap = await spokenCount(page);
      await page.evaluate(() => {
        (window as unknown as { __spoke: string[] }).__spoke.push('--- TAP ---');
      });
      await page
        .locator(option)
        .first()
        .click({ force: true })
        .catch(() => {});
      await settle(page);
      const seq = await spoken(page);

      if (CHAINED.has(slug)) {
        // Non-vacuity, for the games where a pass is supposed to mean
        // something: there must be a multi-step script, and the tap must land
        // partway through it. Either failing means this test has stopped
        // measuring the defect it exists for.
        expect(
          intro.length,
          `${slug} is listed as narrating in steps but said ${intro.length} line(s), ` +
            `so there is no longer a chain here to interrupt`,
        ).toBeGreaterThan(1);
        expect(
          saidBeforeTap,
          `${slug}: the script had already finished when the tap landed ` +
            `(${saidBeforeTap} of ${intro.length} lines), so nothing could have leaked`,
        ).toBeLessThan(intro.length);
      }

      const after = seq.slice(seq.indexOf('--- TAP ---') + 1);
      // The first intro line is excluded: it can legitimately still be in
      // flight when the tap lands. Anything later was scheduled and should
      // have been abandoned.
      const leaked = after.filter((line) => intro.slice(1).includes(line));

      expect(
        leaked,
        `${slug}: the child answered and the game carried on with the round's ` +
          `script, saying ${JSON.stringify(leaked)} afterwards. A leftover ` +
          `"question" beat asks them something they have already answered.`,
      ).toEqual([]);
    });
  }
});
