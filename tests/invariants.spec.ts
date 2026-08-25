import { test, expect, type Page } from '@playwright/test';

/**
 * Cross-game invariants that were true but untested.
 *
 * Added 2026-08-23 after a sweep prompted by §5 rule 8, which had drifted for
 * five months. The post-mortem on that was not "someone forgot" — it was that
 * the rule had been **restated in a comment at every site that implemented
 * it**, so each file looked self-evidently correct, while the only tests were
 * per-game specs asserting the behaviour their own game already had. Nothing
 * compared games to each other, so nine of them kept the superseded rule and
 * no signal ever fired.
 *
 * The sweep looked for the same signature elsewhere: a rule asserted in many
 * per-game files with no cross-game test behind it. Three came up, and — good
 * news — all three were actually being honoured:
 *
 *   1. "Speak only if the user has sound enabled" (14 files)
 *   2. "Every animation has a reduced-motion fallback" (12 files)
 *   3. "SSR a deterministic first round so the page never paints blank" (14)
 *
 * They are pinned here because "true today with nothing holding it" is
 * precisely the state rule 8 was in.
 *
 * One finding worth keeping from the sweep: the reduced-motion rule is NOT
 * held by the twelve stylesheets that claim it. Each enumerates its animated
 * selectors by name, and seven of those lists had gone stale — none mentions
 * its own `--wrong` shake. Motion is actually stopped by a single catch-all in
 * `global.css` that neutralises `animation-duration` for `*`. The per-game
 * blocks are decoration that reads like enforcement, which is the same
 * illusion that hid rule 8. The test below therefore checks the *behaviour*
 * (does anything move) rather than any stylesheet's opinion about it.
 *
 * Each block here was checked against a deliberately broken page before being
 * committed — mute against a page with sound on, motion against an injected
 * 3s animation, SSR against the option count — because a green assertion
 * about something that was already true is the easiest kind of test to write
 * and the easiest kind to write wrong.
 */

interface Game {
  readonly slug: string;
  /** Tappable options, also used as the "did SSR render a round" probe. */
  readonly option: string;
}

const GAMES: readonly Game[] = [
  { slug: 'animal-sounds', option: '.as-tile' },
  { slug: 'feeling-friends', option: '.ff-tile' },
  { slug: 'opposites-friends', option: '.of-tile' },
  { slug: 'rhyme-time', option: '.rt-tile' },
  { slug: 'letter-friends', option: '.lf-tile' },
  { slug: 'sound-friends', option: '.sf-tile' },
  { slug: 'week-friends', option: '.week-opt' },
  { slug: 'pattern-sequences', option: '.ps-opt' },
  { slug: 'counting-friends', option: '.cf-opt' },
  { slug: 'magnitude-comparison', option: '.mf-group' },
  { slug: 'number-friends', option: '.nf-group' },
  { slug: 'number-bond-pop', option: '.nbp-opt' },
  { slug: 'sorting-friends', option: '.sort-tile' },
  { slug: 'wheres-teddy', option: '.wt-scene' },
  { slug: 'memory-match', option: '.mm-card' },
];

/**
 * Record every utterance and every oscillator the page starts.
 *
 * Speech is hooked at `speechSynthesis.speak` and audio at `oscillator.start`
 * — the two places a child actually hears something — rather than at the
 * `narrate()` / `playTap()` wrappers, which are per-game code and are exactly
 * what the gate could be missing from.
 */
const HOOK = `
  (() => {
    window.__spoke = [];
    window.__tones = [];
    const s = window.speechSynthesis;
    if (s) {
      const orig = s.speak.bind(s);
      s.speak = (u) => { window.__spoke.push(String((u && u.text) || '')); return orig(u); };
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      const oc = Ctor.prototype.createOscillator;
      Ctor.prototype.createOscillator = function () {
        const osc = oc.call(this);
        const st = osc.start.bind(osc);
        osc.start = (...a) => { window.__tones.push(Math.round(osc.frequency.value)); return st(...a); };
        return osc;
      };
    }
  })();
`;

interface Heard {
  readonly spoke: number;
  readonly tones: number[];
}

const playWithSound = async (page: Page, game: Game, sound: boolean): Promise<Heard> => {
  await page.addInitScript(HOOK);
  await page.goto(`games/${game.slug}-game.html`);
  await page.evaluate((snd: boolean) => {
    localStorage.setItem(
      'kids_settings_v1',
      // autoSpeak ON deliberately: it is the setting most likely to talk over
      // a mute, since it narrates without being asked.
      JSON.stringify({ dark: false, sound: snd, autoSpeak: true, fontSize: 'medium' }),
    );
  }, sound);
  await page.reload();
  await page.waitForTimeout(400);

  const count = await page.locator(game.option).count();
  for (let i = 0; i < Math.min(count, 2); i++) {
    const opt = page.locator(game.option).nth(i);
    // Skip what the game has already switched off. Answering disables the
    // whole row in most of these games, so the second option here is never
    // clickable — and this used to click it anyway, wait out the full 5s
    // actionability timeout, and swallow the error. That was 5 seconds per
    // game, 14 games, for no assertion: a third of this file's runtime spent
    // proving that a disabled button is disabled. Measured 2026-08-24 while
    // working out why CI had outgrown its budget.
    if (!(await opt.isEnabled())) continue;
    await opt.click({ timeout: 5000 });
    await page.waitForTimeout(400);
  }

  return page.evaluate(() => ({
    spoke: (window as unknown as { __spoke: string[] }).__spoke.length,
    tones: (window as unknown as { __tones: number[] }).__tones.slice(),
  }));
};

test.describe('muting the app actually mutes it', () => {
  for (const game of GAMES) {
    test(`${game.slug}: says nothing and plays nothing when sound is off`, async ({
      page,
    }) => {
      const heard = await playWithSound(page, game, false);

      expect(
        heard.spoke,
        `${game.slug} narrated ${heard.spoke} time(s) with sound off`,
      ).toBe(0);
      expect(
        heard.tones,
        `${game.slug} played tone(s) ${heard.tones.join(', ')} with sound off`,
      ).toEqual([]);
    });
  }

  /**
   * Without this the whole block above passes on a browser that simply never
   * speaks — which is every headless CI runner, since they have no system TTS
   * voice. The hooks sit at `speechSynthesis.speak`, which is called
   * regardless of whether a voice exists to render it, so this stays
   * meaningful on CI.
   */
  test('control: the same hooks DO fire when sound is on', async ({ page }) => {
    const heard = await playWithSound(page, GAMES[0]!, true);

    expect(
      heard.spoke,
      'nothing was spoken even with sound ON, so the mute assertions above prove nothing',
    ).toBeGreaterThan(0);
    expect(
      heard.tones.length,
      'no tone was played even with sound ON, so the mute assertions above prove nothing',
    ).toBeGreaterThan(0);
  });
});

test.describe('reduced motion is honoured', () => {
  for (const game of GAMES) {
    test(`${game.slug}: nothing animates under prefers-reduced-motion`, async ({
      page,
    }) => {
      // Set on the page rather than via `test.use({ reducedMotion })`: at
      // describe level that was silently not applied here, and every game
      // "failed" while the standalone check said they were all fine. The
      // matchMedia guard below is what caught it, and is why it stays.
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // The footer fetches a commit SHA from the GitHub API and rewrites its
      // own text when it lands, which reflows it. That is asynchronous
      // content, not motion, but it is indistinguishable from motion to the
      // "did anything move" check below — and on CI it arrived mid-measure
      // and failed three games. Blocked rather than exempted by selector, so
      // the check stays general and stops depending on the network.
      await page.route(/api\.github\.com/, (r) => r.abort());

      await page.goto(`games/${game.slug}-game.html`);
      await expect(page.locator(game.option).first()).toBeVisible();
      await page.waitForLoadState('load').catch(() => {});
      // Let any remaining first-paint settling finish before the baseline.
      await page.waitForTimeout(400);

      expect(
        await page.evaluate(
          () => matchMedia('(prefers-reduced-motion: reduce)').matches,
        ),
        'reduced motion is not being emulated, so this test would prove nothing',
      ).toBe(true);

      // Put the round into its most animated state — the feedback classes are
      // where the shakes, bounces and infinite pulse rings live.
      await page.evaluate((sel: string) => {
        const els = document.querySelectorAll(sel);
        const base = sel.replace('.', '');
        els[0]?.classList.add(`${base}--correct`);
        els[1]?.classList.add(`${base}--wrong`);
        els[2]?.classList.add(`${base}--reveal`);
      }, game.option);

      const moving = await page.evaluate(async () => {
        const nodes = [...document.querySelectorAll<HTMLElement>('*')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });

        // A named animation is not itself a violation: the reset in
        // global.css leaves `animation-name` in place and collapses the
        // duration instead. Only a duration long enough to be perceived is.
        const longRunning = nodes
          .filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.animationName === 'none') return false;
            const d = cs.animationDuration;
            const ms = d.endsWith('ms') ? parseFloat(d) : parseFloat(d) * 1000;
            return ms > 1;
          })
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);

        // Sampled over two consecutive intervals, and only elements that
        // moved in BOTH count. An animation keeps moving; a one-off reflow
        // moves once. That distinction matters because the footer rewrites
        // its own text when a GitHub fetch lands, and on CI that arrived
        // mid-measurement and failed three games for a layout shift that has
        // nothing to do with motion.
        const box = (el: Element): string => {
          const r = el.getBoundingClientRect();
          return `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)}`;
        };
        const name = (el: Element): string =>
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`;

        const a = nodes.map(box);
        await new Promise((r) => setTimeout(r, 250));
        const b = nodes.map(box);
        await new Promise((r) => setTimeout(r, 250));
        const c = nodes.map(box);

        const shifted = nodes
          .filter((_, i) => a[i] !== b[i] && b[i] !== c[i])
          .map(name);

        return { longRunning, shifted: [...new Set(shifted)] };
      }, );

      expect(
        moving.longRunning,
        `${game.slug}: still running a perceptible animation under reduced motion`,
      ).toEqual([]);
      expect(
        moving.shifted,
        `${game.slug}: element(s) moved on screen under reduced motion`,
      ).toEqual([]);
    });
  }
});

test.describe('a game renders its first round without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const game of GAMES) {
    test(`${game.slug}: SSRs a playable round, not a blank shell`, async ({ page }) => {
      await page.goto(`games/${game.slug}-game.html`);

      // Two options is the floor: one game (More Friends) compares a pair, the
      // rest offer three or more.
      await expect(
        page.locator(game.option),
        `${game.slug} SSR'd no options, so the page paints blank until JS lands`,
      ).not.toHaveCount(0);
      expect(await page.locator(game.option).count()).toBeGreaterThanOrEqual(2);

      await expect(page.locator('h1')).toBeVisible();
    });
  }
});

/**
 * The opening question is asked before the child has to answer it.
 *
 * Browsers block speech until a gesture, so the intro is deferred to the first
 * tap. That deferral used to skip the intro whenever the tap landed on any
 * interactive control — sound reasoning for a replay button, wrong for an
 * answer tile, and an answer tile is exactly what a child taps first. Measured
 * across nine games on 2026-08-23, the question was never spoken at all: the
 * first words a child heard were "Hmm! Let's listen again."
 *
 * So the first tap on an answer is now swallowed and asks the question instead.
 * The pair of assertions below is deliberate:
 *
 *   sound ON  — the tap must NOT be judged, and something must be said or played
 *   sound OFF — the tap MUST be judged, because nothing would be said and
 *               swallowing it would just lose the child a tap
 *
 * The muted case is also the control: it proves the "was it judged" detector
 * actually fires, so the sound-on assertion is not vacuously green.
 */
test.describe('the first tap asks the question instead of being judged', () => {
  const LISTEN = `
    (() => {
      window.__spoke = []; window.__played = [];
      const fake = { speaking:false, pending:false, cancel(){}, getVoices:()=>[],
        speak(u){ window.__spoke.push(String((u&&u.text)||''));
          setTimeout(()=>{try{u.onend&&u.onend(new Event('end'))}catch(e){}},30); } };
      Object.defineProperty(window,'speechSynthesis',{get:()=>fake,configurable:true});
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.__played.push(this.currentSrc || this.src || 'clip');
        return play.call(this);
      };
    })();
  `;

  const firstTap = async (
    page: Page,
    game: Game,
    sound: boolean,
  ): Promise<{ classChanged: boolean; heard: number }> => {
    await page.addInitScript(LISTEN);
    await page.goto(`games/${game.slug}-game.html`);
    await page.evaluate(
      (snd: boolean) =>
        localStorage.setItem(
          'kids_settings_v1',
          JSON.stringify({ dark: false, sound: snd, autoSpeak: true, fontSize: 'medium' }),
        ),
      sound,
    );
    await page.reload();

    const option = page.locator(game.option).first();
    await expect(option).toBeVisible();

    // Watched rather than sampled before/after: multi-select games (Sorting
    // Friends) show their feedback and clear it again inside the window, so
    // comparing the two ends says "nothing happened" when plenty did. A
    // re-render that replaces the element counts too.
    await page.evaluate((sel: string) => {
      const el = document.querySelector(sel)!;
      const w = window as unknown as { __touched: boolean; __watch: Element };
      w.__touched = false;
      w.__watch = el;
      new MutationObserver(() => {
        w.__touched = true;
      }).observe(el, { attributes: true, attributeFilter: ['class', 'disabled'] });
    }, game.option);

    await option.click();
    await page.waitForTimeout(900);

    return {
      classChanged: await page.evaluate(() => {
        const w = window as unknown as { __touched: boolean; __watch: Element };
        return w.__touched || !document.contains(w.__watch);
      }),
      heard: await page.evaluate(
        () =>
          (window as unknown as { __spoke: string[] }).__spoke.length +
          (window as unknown as { __played: string[] }).__played.length,
      ),
    };
  };

  for (const game of GAMES) {
    test(`${game.slug}: the very first tap is not scored as an answer`, async ({ page }) => {
      const r = await firstTap(page, game, true);
      expect(
        r.classChanged,
        `${game.slug}: the first tap was judged as an answer, but the question had not been ` +
          `spoken yet — a pre-reader is guessing at something nobody asked`,
      ).toBe(false);
      expect(
        r.heard,
        `${game.slug}: the first tap was swallowed but nothing was asked, so the child got ` +
          `silence and a tap that did nothing`,
      ).toBeGreaterThan(0);
    });
  }

  for (const game of GAMES) {
    test(`${game.slug}: with sound off the first tap still counts`, async ({ page }) => {
      const r = await firstTap(page, game, false);
      expect(
        r.classChanged,
        `${game.slug}: the first tap was swallowed with sound off, so it bought the child ` +
          `nothing — there was no question to hear`,
      ).toBe(true);
    });
  }
});
