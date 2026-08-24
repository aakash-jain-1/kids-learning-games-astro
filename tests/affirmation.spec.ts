import { test, expect } from '@playwright/test';
import { passChapterBreak } from './helpers';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Being right does not always sound the same (added 2026-08-23).
 *
 * Found by playing all 14 games that have a wrong answer end to end and reading
 * back every line spoken, in order. **"Yes" opened 96 of them — 17.6% of all
 * speech in the app**, half as common again as the next word. The arithmetic
 * settled it: in the recognition games, the count of "Yes" lines plus the count
 * of wrong taps came to exactly the round count (Animal Sounds 12 + 15 = 27,
 * Where's Teddy 17 + 8 = 25, Feeling Friends 8 + 12 = 20). Not most correct
 * answers — every one, in every game, for a run of up to 27 rounds.
 *
 * `RIGHT_LEADS` in `@/data/preschool-narration` now holds four, chosen by
 * seeding off something the round already contains. See that file for why they
 * all have to be unambiguous verifications and why none of them may describe
 * the child.
 *
 * Two tests, because either alone would be weak. The source scan is precise
 * about the regression that actually happened — someone writes `Yes!` into a
 * new game's narration and it is never seen again — but proves nothing about
 * what a child hears. The playthrough proves the rotation reaches speech but
 * only for the game it plays.
 */

const AFFIRMATIONS = ['Yes!', "That's it!", 'You got it!', "That's right!"];

test.describe('being right does not always sound the same', () => {
  test('no game hard-codes the word it says when the child is right', () => {
    const dir = 'src/data';
    const offenders: string[] = [];

    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue;
      const src = readFileSync(join(dir, file), 'utf8');

      src.split(/\r?\n/).forEach((line, i) => {
        // Only narration fields, and only the value — a doc comment showing
        // "Yes! Five!" as an example output is still accurate, since "Yes!" is
        // one of the four.
        if (!/^\s*correct(Item)?:/.test(line)) return;
        const hit = AFFIRMATIONS.find((a) => line.includes('`' + a + ' '));
        if (hit) {
          offenders.push(`${file}:${i + 1} opens with a fixed "${hit}"`);
        }
      });
    }

    expect(
      offenders,
      'A correct answer should draw its opening words from RIGHT_LEADS, or ' +
        'every round of a 27-round run greets the child identically:\n  ' +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  test('a run is not narrated with the same affirmation every time', async ({ page }) => {
    test.setTimeout(180_000);

    // Where's Teddy is the case to play: 25 rounds, and it was the worst of
    // them, saying "Yes!" on all 17 of its correct answers.
    await page.addInitScript(() => {
      const w = window as unknown as { __spoke: string[] };
      w.__spoke = [];
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
          w.__spoke.push(String(u?.text ?? ''));
          // Asynchronously: firing `onend` inside `speak` re-enters the
          // controller's own callback chain and deadlocks the round.
          setTimeout(() => {
            u.onstart?.(new Event('start') as SpeechSynthesisEvent);
            u.onend?.(new Event('end') as SpeechSynthesisEvent);
          }, 15);
        },
      };
      Object.defineProperty(window, 'speechSynthesis', {
        value: stub,
        configurable: true,
      });
    });

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

    const spokenCount = (): Promise<number> =>
      page.evaluate(() => (window as unknown as { __spoke: string[] }).__spoke.length);

    const nextBtn = page.locator('#wtNextBtn');
    const ROUNDS = 12;
    const leads: string[] = [];

    for (let r = 0; r < ROUNDS; r++) {
      // The round states its own answer: the stage carries the relation being
      // asked for and each scene carries the one it shows. Answering correctly
      // on purpose keeps the test about the affirmation and nothing else.
      const correctIdx = await page.evaluate(() => {
        const target = document.getElementById('wtStage')?.dataset.target;
        const scenes = Array.from(document.querySelectorAll<HTMLElement>('.wt-scene'));
        return scenes.findIndex((s) => s.dataset.rel === target);
      });
      expect(
        correctIdx,
        `round ${r + 1}: no scene shows the relation the prompt asked for`,
      ).toBeGreaterThanOrEqual(0);

      const before = await spokenCount();
      await page.locator('.wt-scene').nth(correctIdx).click();
      // A correct answer is what enables "Next round", so this waits on the
      // game agreeing that the tap was right. Every wait here is a real state
      // transition: the first cut slept 400ms per tap and gave up on a round
      // that had not repainted yet, which measured how loaded the machine was
      // and starved this sample down to a couple of lines under a full run.
      await expect(nextBtn).toBeEnabled({ timeout: 15_000 });

      const said = await page.evaluate(
        (n) => (window as unknown as { __spoke: string[] }).__spoke.slice(n),
        before,
      );
      const lead = said.map((line) => AFFIRMATIONS.find((a) => line.startsWith(a))).find(Boolean);
      expect(
        lead,
        `round ${r + 1}: a correct answer opened with none of the four ` +
          `affirmations. It said ${JSON.stringify(said)}`,
      ).toBeTruthy();
      leads.push(lead as string);

      await nextBtn.click();
      // Round 7 of Where's Teddy ends a chapter, and until the break is
      // dismissed the next round has not started — so Next never goes
      // disabled and the round boundary below never arrives.
      await passChapterBreak(page);
      await expect(nextBtn).toBeDisabled({ timeout: 15_000 });
    }

    // One affirmation per round, every round, so a short sample now means a
    // broken test rather than a slow machine.
    expect(leads, 'the playthrough did not reach every round').toHaveLength(ROUNDS);

    expect(
      new Set(leads).size,
      `all ${leads.length} correct answers were greeted with "${leads[0]}". ` +
        `A full run here is 25 rounds.`,
    ).toBeGreaterThan(1);
  });
});
