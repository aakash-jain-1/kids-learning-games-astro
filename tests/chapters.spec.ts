import { test, expect } from '@playwright/test';
import {
  chapterSizes,
  chapterEnds,
  chapterOf,
  breakLead,
  BREAK_LEADS,
  CHAPTER_TARGET,
  MIN_ROUNDS_FOR_CHAPTERS,
} from '../src/lib/chapters';

/**
 * Chapters exist so a long run has somewhere to stop (`lib/chapters.ts`).
 *
 * The property that matters most is the one §5 rule 11 bought and this feature
 * must not spend: **a run still covers every item.** Chapters are allowed to
 * change when the child is asked to continue; they are not allowed to change
 * what is asked. So the first test here is coverage, not cosmetics.
 */

/** Rounds in a full run, per game, as of 2026-08-24. */
const TOTALS: Record<string, number> = {
  'animal-sounds': 27,
  'letter-friends': 26,
  'sound-friends': 26,
  'wheres-teddy': 25,
  'opposites-friends': 20,
  'feeling-friends': 20,
  'rhyme-time': 18,
  // Short runs, listed so a game that grows past the threshold shows up here
  // as a plan change rather than silently sprouting breaks.
  'sorting-friends': 8,
  'week-friends': 6,
};

test.describe('chapter plans', () => {
  for (const [game, total] of Object.entries(TOTALS)) {
    test(`${game}: chapters add up to the whole run`, () => {
      const sizes = chapterSizes(total);
      expect(sizes.reduce((a, b) => a + b, 0), 'chapters must cover every round').toBe(total);
      expect(sizes.every((n) => n > 0), 'no empty chapter').toBe(true);
    });

    test(`${game}: every round belongs to exactly one chapter`, () => {
      const sizes = chapterSizes(total);
      const seen = new Map<number, number>();
      for (let r = 0; r < total; r++) {
        const { n, of } = chapterOf(r, total);
        expect(of).toBe(sizes.length);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(sizes.length);
        seen.set(n, (seen.get(n) ?? 0) + 1);
      }
      expect([...seen.keys()].sort((a, b) => a - b)).toEqual(
        sizes.map((_, i) => i + 1),
      );
      expect(sizes.map((_, i) => seen.get(i + 1))).toEqual(sizes);
    });
  }

  /**
   * Playing all seven games end to end (2026-08-25) found the break saying one
   * sentence 19 times a sweep, which is the opposite of a reward. These guard
   * the fix at the level the defect actually had: not "the string is right" but
   * "a child does not hear the same thing twice in a row".
   */
  test('no run says the same thing at two breaks running', () => {
    for (const [game, total] of Object.entries(TOTALS)) {
      const chapters = chapterSizes(total).length;
      if (chapters < 2) continue;
      const sizes = chapterSizes(total);

      let roundsDone = 0;
      const heard: string[] = [];
      for (let c = 1; c < chapters; c++) {
        roundsDone += sizes[c - 1]!;
        heard.push(breakLead(c, roundsDone));
      }
      // Compare with the count masked out. The bug this replaces *did* produce
      // different strings — "That's 7!" then "That's 13!" — and a plain
      // inequality check would have passed against it happily. What a child
      // hears repeat is the sentence, not the number inside it.
      const shape = (s: string): string => s.replace(/\d+/g, 'N');
      for (let i = 1; i < heard.length; i++) {
        expect(
          shape(heard[i]!),
          `${game}: break ${i + 1} is the same sentence as break ${i}`,
        ).not.toBe(shape(heard[i - 1]!));
      }
      // Every break still says how many rounds are done — the rotation varies
      // the wrapper, never drops the count.
      roundsDone = 0;
      for (let c = 1; c < chapters; c++) {
        roundsDone += sizes[c - 1]!;
        expect(heard[c - 1]).toContain(String(roundsDone));
      }
    }
  });

  test('the leads are distinct, so rotating actually rotates', () => {
    const rendered = BREAK_LEADS.map((f) => f(7));
    expect(new Set(rendered).size, 'two leads render the same text').toBe(BREAK_LEADS.length);
  });

  test('long runs are cut into sittings, short ones are left alone', () => {
    for (const [game, total] of Object.entries(TOTALS)) {
      const sizes = chapterSizes(total);
      if (total < MIN_ROUNDS_FOR_CHAPTERS) {
        expect(sizes, `${game} is already a sitting`).toEqual([total]);
        expect(chapterEnds(total).size, `${game} needs no breaks`).toBe(0);
      } else {
        expect(sizes.length, `${game} should be split`).toBeGreaterThan(1);
      }
    }
  });

  test('no chapter is far off the target length', () => {
    // The number that matters to a 3-4 year old: a chapter is one to two
    // minutes of narration. A 3-round chapter feels like nothing was done and
    // a 10-round one is the problem chapters were added to solve.
    for (const [game, total] of Object.entries(TOTALS)) {
      if (total < MIN_ROUNDS_FOR_CHAPTERS) continue;
      for (const size of chapterSizes(total)) {
        expect(size, `${game} has a ${size}-round chapter`).toBeGreaterThanOrEqual(
          CHAPTER_TARGET - 1,
        );
        expect(size, `${game} has a ${size}-round chapter`).toBeLessThanOrEqual(
          CHAPTER_TARGET + 1,
        );
      }
    }
  });

  test('a run never breaks on its own last round', () => {
    // The completion screen owns the end of the run. A break there would put a
    // "keep going?" in front of the confetti.
    for (const total of Object.values(TOTALS)) {
      for (const end of chapterEnds(total)) {
        expect(end).toBeLessThan(total - 1);
        expect(end).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('the remainder is spent early, so a run never ends on a stub', () => {
    for (const total of Object.values(TOTALS)) {
      const sizes = chapterSizes(total);
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]!, `${total}: ${sizes.join('+')}`).toBeLessThanOrEqual(sizes[i - 1]!);
      }
    }
  });

  test('breaks fall exactly on the chapter boundaries', () => {
    // Ties `chapterEnds` (what the game asks) to `chapterSizes` (what the plan
    // says) so the two cannot drift apart.
    for (const total of Object.values(TOTALS)) {
      const sizes = chapterSizes(total);
      const expected: number[] = [];
      let seen = 0;
      for (let i = 0; i < sizes.length - 1; i++) {
        seen += sizes[i]!;
        expected.push(seen - 1);
      }
      expect([...chapterEnds(total)].sort((a, b) => a - b)).toEqual(expected);
    }
  });
});

/**
 * The plan being right on paper is half of it. These play the pilot — Where's
 * Teddy, 25 rounds, the longest sit in the app — and check the breaks land
 * where the plan says, that continuing loses nothing, and that a child who
 * stops *at* a break comes back to the next chapter rather than the last round
 * of the one they finished.
 */
test.describe('chapter breaks in play', () => {
  const TEDDY_TOTAL = 25;
  /** 1-based rounds after which Where's Teddy should pause: chapters 7+6+6+6. */
  const EXPECTED_BREAKS = [7, 13, 19];

  const stubSpeech = async (page: import('@playwright/test').Page): Promise<void> => {
    await page.addInitScript(() => {
      const stub = {
        speaking: false,
        pending: false,
        paused: false,
        cancel() {},
        pause() {},
        resume() {},
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
        speak(u: SpeechSynthesisUtterance) {
          // Async, or firing `onend` inside `speak` re-enters the controller's
          // own callback chain and deadlocks the round.
          setTimeout(() => {
            u.onstart?.(new Event('start') as SpeechSynthesisEvent);
            u.onend?.(new Event('end') as SpeechSynthesisEvent);
          }, 15);
        },
      };
      Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true });
    });
  };

  const openTeddy = async (page: import('@playwright/test').Page): Promise<void> => {
    await page.goto('games/wheres-teddy-game.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'kids_settings_v1',
        JSON.stringify({ dark: false, sound: true, autoSpeak: true, fontSize: 'medium' }),
      );
    });
    await page.reload();
    // Spend the "first tap asks the question" gesture on inert chrome, so the
    // scene taps below are judged as answers rather than swallowed.
    await page.locator('h1').first().click();
  };

  /** Answer the round correctly and press Next. The round states its own answer. */
  const playRound = async (page: import('@playwright/test').Page, r: number): Promise<void> => {
    const correctIdx = await page.evaluate(() => {
      const target = document.getElementById('wtStage')?.dataset.target;
      const scenes = Array.from(document.querySelectorAll<HTMLElement>('.wt-scene'));
      return scenes.findIndex((s) => s.dataset.rel === target);
    });
    expect(correctIdx, `round ${r}: no scene shows the relation asked for`).toBeGreaterThanOrEqual(
      0,
    );
    await page.locator('.wt-scene').nth(correctIdx).click();
    await expect(page.locator('#wtNextBtn')).toBeEnabled({ timeout: 15_000 });
    await page.locator('#wtNextBtn').click();
  };

  test('the pause lands exactly where the plan says, and nowhere else', async ({ page }) => {
    test.setTimeout(180_000);
    await stubSpeech(page);
    await openTeddy(page);

    const panel = page.locator('#stBreak');
    await expect(panel, 'a run does not open on a break').toBeHidden();
    // The panel is a real modal: while it is up the round behind it is inert,
    // so Next stops being focusable rather than staying tappable-looking.
    const nextBtn = page.locator('#wtNextBtn');

    const sawBreakAfter: number[] = [];

    for (let r = 1; r < TEDDY_TOTAL; r++) {
      await playRound(page, r);

      if (await panel.isVisible()) {
        sawBreakAfter.push(r);
        // The panel counts what was done, and the stars say how far in the run
        // that is — the pre-reader's half of the same message.
        const done = EXPECTED_BREAKS.indexOf(r) + 1;
        await expect(page.locator('#stBreakTitle')).toHaveText(breakLead(done, r));
        await expect(page.locator('#stBreakStars')).toHaveText(
          '★'.repeat(done) + '☆'.repeat(4 - done),
        );

        // Focus is inside the dialog, not left on the Next button behind it.
        await expect(page.locator('#stBreakGo')).toBeFocused();
        // `showModal` inertness is a top-layer property, not an attribute, so
        // the honest check is behavioural: the button behind cannot be given
        // focus even when asked directly.
        expect(
          await nextBtn.evaluate((el) => {
            (el as HTMLElement).focus();
            return document.activeElement === el;
          }),
          'the round behind the break cannot take focus',
        ).toBe(false);

        await page.locator('#stBreakGo').click();
        await expect(panel).toBeHidden();
        // Continuing resumes the run rather than restarting the round just
        // finished: the next round is r + 1, not r.
        await expect(page.locator('#wtProgressText')).toHaveText(`${r + 1} / ${TEDDY_TOTAL}`);
      }
    }

    expect(sawBreakAfter).toEqual(EXPECTED_BREAKS);
  });

  test('the last round finishes the run instead of pausing it', async ({ page }) => {
    test.setTimeout(180_000);
    await stubSpeech(page);
    await openTeddy(page);

    for (let r = 1; r <= TEDDY_TOTAL; r++) {
      await playRound(page, r);
      if (await page.locator('#stBreak').isVisible()) {
        await page.locator('#stBreakGo').click();
      }
    }

    await expect(page.locator('#wtDone')).toHaveClass(/wt-done--show/);
    await expect(page.locator('#stBreak'), 'no break in front of the confetti').toBeHidden();
  });

  test('stopping at a break comes back to the next chapter', async ({ page }) => {
    test.setTimeout(180_000);
    await stubSpeech(page);
    await openTeddy(page);

    for (let r = 1; r <= EXPECTED_BREAKS[0]!; r++) {
      await playRound(page, r);
    }
    await expect(page.locator('#stBreak')).toBeVisible();

    // The child puts the tablet down while the panel is up — the case the
    // panel exists to make safe.
    await page.reload();
    await page.locator('h1').first().click();

    await expect(page.locator('#stBreak'), 'a resumed run does not open on a break').toBeHidden();
    await expect(page.locator('#wtProgressText')).toHaveText(
      `${EXPECTED_BREAKS[0]! + 1} / ${TEDDY_TOTAL}`,
    );
  });
});
