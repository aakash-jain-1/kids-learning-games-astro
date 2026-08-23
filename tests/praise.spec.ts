import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Completion screens praise the doing, not the doer (CONTEXT.md §5 rule 14).
 *
 * Nine games used to end on a title: "Letter champion!", "Counting champion!",
 * "Sorting champion!", "You're a rhyming star!", "Geometric genius!", "What a
 * memory!". They were copy-pasted from one another with the game's noun swapped
 * in — the same drift shape as rules 8 and 12, in prose instead of CSS, and
 * with nothing holding it. The rationale for banning them (Kamins & Dweck 1999,
 * Cimpian et al. 2007 on four-year-olds specifically) is in
 * `src/data/preschool-narration.ts`.
 *
 * Why two checks. Roughly half the praise in this app is in SSR markup and half
 * is assigned from script on the last round — the four staged maths games each
 * write their own title, and the quiz `messages` blocks only ever appear after
 * a quiz. A DOM-only test would pass while `doneTitle.textContent = 'Counting
 * champion!'` sat two hundred lines below the heading it overwrites, and
 * reaching those strings for real would mean playing 27 rounds per game.
 */

/**
 * Mirrors `PERSON_PRAISE_WORDS` in `src/data/preschool-narration.ts`, restated
 * rather than imported for the same reason `wrong-answer.spec.ts` restates
 * `WRONG_LEAD`: the specs run against the built site and don't share its
 * module resolution. Keep the two lists in step.
 */
const BANNED = [
  'champion',
  'genius',
  'superstar',
  'star',
  'smart',
  'clever',
  'brilliant',
  'what a memory',
];

/** Which banned word `text` uses, if any. Whole words only, so "start" is fine. */
const banHit = (text: string): string | null =>
  BANNED.find((w) => new RegExp(`\\b${w}\\b`, 'i').test(text)) ?? null;

/**
 * Every game page, read off the home page rather than hard-coded, so adding a
 * game opts it into this check automatically (CONTEXT.md: don't let game lists
 * drift from the real source).
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

test.describe('winning is described, not the winner', () => {
  test('no completion screen in the markup hands out a title', async ({ page }) => {
    const games = await gamePaths(page);
    const failures: string[] = [];
    let scanned = 0;

    for (const game of games) {
      await page.goto(`games/${game}`);

      // Done cards ship in the SSR markup and are hidden until the run ends,
      // so their wording is readable without playing anything. Leaf elements
      // only: an ancestor would repeat its children's text as one blob.
      const texts = await page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter((el) => {
            const cls = typeof el.className === 'string' ? el.className : '';
            return /done|result|finish|complete/i.test(`${el.id} ${cls}`);
          })
          .filter((el) => el.children.length === 0)
          .map((el) => (el.textContent ?? '').trim())
          .filter(Boolean),
      );

      scanned += texts.length;
      for (const text of texts) {
        const hit = banHit(text);
        if (hit) failures.push(`${game}: "${text}" — "${hit}" labels the child`);
      }
    }

    // Guard against the scan quietly finding nothing if the done-card naming
    // convention changes.
    expect(scanned, 'should have read text on most games').toBeGreaterThan(20);

    expect(
      failures,
      'Completion screens that praise who the child is rather than what they ' +
        `did:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });

  test('no game writes one from script on the final round', () => {
    const dir = join('src', 'pages', 'games');
    const failures: string[] = [];
    let scanned = 0;

    for (const file of readdirSync(dir).filter((f) => f.endsWith('.astro'))) {
      const src = readFileSync(join(dir, file), 'utf8')
        // Comments quote the banned words to explain the rule; only strings
        // a child can actually hear or read are in scope.
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

      // The three places praise is written from script: a title or message
      // assigned on the last round, the quiz result `messages` block, and the
      // spoken completion line.
      const literals =
        src.match(
          /(?:textContent\s*=\s*|narrate\(|perfect:\s*|great:\s*)(['"`])(?:\\.|(?!\1).)*\1/g,
        ) ?? [];

      scanned += literals.length;
      for (const literal of literals) {
        const hit = banHit(literal);
        if (hit) failures.push(`${file}: ${literal.trim()} — "${hit}" labels the child`);
      }
    }

    expect(scanned, 'should have found praise strings to read').toBeGreaterThan(30);

    expect(
      failures,
      `Praise assigned from script that labels the child:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });
});
