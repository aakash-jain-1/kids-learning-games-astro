import { test, expect, type Page } from '@playwright/test';

/**
 * An unfinished run is picked up where it was left.
 *
 * §5 rule 11 made a run cover every item, which is what makes "finished" mean
 * something. Playing the games end to end on 2026-08-23 showed what whole
 * costs: 25 rounds of Where's Teddy is ~7 minutes of narration before the child
 * looks, decides and taps. A 3-4 year old often doesn't finish that in one
 * sitting — and reloading dropped them back at 1/25 every time, so on the
 * longest games the completion screen was arguably unreachable and `sessions`
 * ("Full runs finished" on the dashboard) stayed at zero forever.
 *
 * Three things are asserted per game, because each failed differently in
 * development:
 *
 *   1. a partial run resumes
 *   2. Reset still means start over — it is a plain `location.reload()`, so it
 *      would otherwise have reloaded straight back into round 18 of 27, which
 *      is "Start over?" answered with "no"
 *   3. a finished run does NOT resume, or Play Again would land on the last
 *      round of a run the child already saw through
 *
 * The control at the bottom clears the stored run before reloading and asserts
 * the game *does* start over, so the resume assertions can't pass just because
 * a page failed to advance in the first place.
 */

interface Game {
  readonly slug: string;
  readonly option: string;
  readonly total: number;
}

const GAMES: readonly Game[] = [
  { slug: 'animal-sounds', option: '.as-tile', total: 27 },
  { slug: 'letter-friends', option: '.lf-tile', total: 26 },
  { slug: 'sound-friends', option: '.sf-tile', total: 26 },
  { slug: 'rhyme-time', option: '.rt-tile', total: 18 },
  { slug: 'feeling-friends', option: '.ff-tile', total: 20 },
  { slug: 'opposites-friends', option: '.of-tile', total: 20 },
  { slug: 'week-friends', option: '.week-opt', total: 6 },
  { slug: 'wheres-teddy', option: '.wt-scene', total: 25 },
];

const PROGRESS = '[id$="ProgressText"]';

/** Speech resolves instantly, so a round costs about a second instead of ten. */
const QUIET = `
  (() => {
    const fake = { speaking:false, pending:false, cancel(){}, getVoices:()=>[],
      speak(u){ setTimeout(()=>{ try { u.onend && u.onend(new Event('end')); } catch (e) {} }, 20); } };
    Object.defineProperty(window, 'speechSynthesis', { get: () => fake, configurable: true });
  })();
`;

const open = async (page: Page, game: Game): Promise<void> => {
  await page.addInitScript(QUIET);
  await page.goto(`games/${game.slug}-game.html`);
  await page.evaluate(() =>
    localStorage.setItem(
      'kids_settings_v1',
      JSON.stringify({ dark: false, sound: true, autoSpeak: true, fontSize: 'medium' }),
    ),
  );
  await page.reload();
  await expect(page.locator(game.option).first()).toBeVisible();
  // Spend the "first tap asks the question" gesture (§5 rule 13) on inert
  // chrome, so the taps below are answers.
  await page.locator('h1').first().click();
};

const progress = (page: Page): Promise<string> =>
  page
    .locator(PROGRESS)
    .first()
    .textContent()
    .then((s) => (s ?? '').trim());

/**
 * Answer the current round however it will accept, then take Next.
 *
 * Which option is correct is per-game knowledge this suite deliberately
 * doesn't own; every option is tried until the round resolves, which is also
 * what a child does.
 */
const playRound = async (page: Page, game: Game): Promise<void> => {
  const count = await page.locator(game.option).count();
  const next = page.locator('[id$="NextBtn"]').first();

  for (let i = 0; i < count; i++) {
    await page.locator(game.option).nth(i).click({ timeout: 5000 }).catch(() => {});
    for (let waited = 0; waited < 40; waited++) {
      if (await next.isEnabled().catch(() => false)) {
        await next.click({ timeout: 5000 });
        return;
      }
      await page.waitForTimeout(250);
    }
  }
  throw new Error(`${game.slug}: a round never resolved, so nothing could be saved`);
};

test.describe('an unfinished run is resumed, not restarted', () => {
  for (const game of GAMES) {
    test(`${game.slug}: comes back where the child left off`, async ({ page }) => {
      await open(page, game);
      for (let r = 0; r < 3; r++) await playRound(page, game);

      const before = await progress(page);
      expect(before, `${game.slug}: played 3 rounds but progress did not move`).toBe(
        `4 / ${game.total}`,
      );

      await page.reload();
      await expect(page.locator(game.option).first()).toBeVisible();

      expect(
        await progress(page),
        `${game.slug}: reloading threw the run away and sent the child back to the start`,
      ).toBe(before);
    });

    test(`${game.slug}: Reset still starts the run over`, async ({ page }) => {
      await open(page, game);
      for (let r = 0; r < 3; r++) await playRound(page, game);

      await page.locator('#btnReset').click();
      await page.locator('#resetConfirmBtn').click();
      await expect(page.locator(game.option).first()).toBeVisible();

      expect(
        await progress(page),
        `${game.slug}: Reset reloaded straight back into the saved run, so "Start over?" did not`,
      ).toBe(`1 / ${game.total}`);
    });
  }

  /**
   * Week Friends only — six rounds is the one run cheap enough to play to the
   * end in a test, and the behaviour is shared code.
   */
  test('week-friends: a finished run does not resume', async ({ page }) => {
    const game = GAMES.find((g) => g.slug === 'week-friends')!;
    await open(page, game);
    for (let r = 0; r < game.total; r++) await playRound(page, game);

    await expect(page.locator('.week-done-card')).toBeVisible();

    await page.reload();
    await expect(page.locator(game.option).first()).toBeVisible();
    expect(
      await progress(page),
      'a completed run was resumed, so the child lands on the last round of a run they finished',
    ).toBe(`1 / ${game.total}`);
  });

  /**
   * The control. Everything above would also pass if these pages simply never
   * reset their progress on reload.
   */
  test('control: with the stored run removed, the game does start over', async ({ page }) => {
    const game = GAMES.find((g) => g.slug === 'wheres-teddy')!;
    await open(page, game);
    for (let r = 0; r < 3; r++) await playRound(page, game);
    expect(await progress(page)).toBe(`4 / ${game.total}`);

    await page.evaluate(() => localStorage.removeItem('wheres_teddy_run_v1'));
    await page.reload();
    await expect(page.locator(game.option).first()).toBeVisible();

    expect(
      await progress(page),
      'the game resumed with no stored run, so the assertions above prove nothing',
    ).toBe(`1 / ${game.total}`);
  });
});
