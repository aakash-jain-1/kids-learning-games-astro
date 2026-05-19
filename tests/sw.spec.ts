import { test, expect } from '@playwright/test';

/**
 * Service-worker smoke suite (T8) — runs with `serviceWorkers: 'allow'`
 * to actually install the SW and exercise its behaviour. The other
 * Playwright suites (`addition.spec.ts`, `comparison.spec.ts`,
 * `numberfriends.spec.ts`, the layout suites) all use the global
 * `serviceWorkers: 'block'` setting in `playwright.config.ts`, which
 * is correct for *those* tests — they assert page content + per-game
 * LocalStorage writes that should be deterministic regardless of SW
 * state. THIS suite is the inverse: every assertion is *about* the SW.
 *
 * Why T8 was filed (2026-05-12, hotfix `fce0380`):
 *
 * On 2026-05-12 the morning Phase-2 SW-install fix unmasked a latent
 * bug — the previous `service-worker.ts` had registered a
 * `NavigationRoute(createHandlerBoundToURL('offline'))`, which is
 * the "SPA app-shell" pattern (intercept every navigation and serve
 * a single shell). Used together with the offline-fallback handler
 * URL, this meant the offline page was served on EVERY navigation
 * once the SW was installed — online OR offline — and the entire
 * site looked like a permanent offline page to anyone whose SW had
 * just updated. The bug went undetected because the existing
 * Playwright suite blocks SWs (the right call for those tests, but
 * it leaves the SW behaviour itself untested by the consolidated
 * deploy gate). T8 closes that gap.
 *
 * What this suite asserts:
 *
 *   1. **SW installs and takes control** on a fresh visit. If the
 *      SW silently fails to install, every subsequent assertion in
 *      this suite would still pass against the network — so we
 *      assert installation explicitly.
 *
 *   2. **Workbox precache cache exists** after SW activation.
 *      Catches "SW installs but precache manifest is empty / errors"
 *      regressions (e.g. a build-time `injectManifest.globPatterns`
 *      misconfiguration that produces a zero-entry manifest).
 *
 *   3. **Online navigation serves the real page, NOT the offline
 *      fallback** (the explicit May-12 regression). Visit the home
 *      page, then a real game; assert the game's actual content
 *      renders and the offline-page marker ("You're Offline") is
 *      absent from the DOM.
 *
 *   4. **The offline page is precached with the expected content.**
 *      Walk the Workbox precache cache, find the entry whose URL
 *      contains "offline", read its body; assert the offline-page
 *      content markers are present. This is the *precondition* for
 *      `setCatchHandler`'s offline-fallback path — if this entry is
 *      missing or has the wrong bytes, the offline-fallback path
 *      would silently return an unhelpful empty response in
 *      production. Two earlier iterations of this test tried to
 *      trigger `setCatchHandler` directly via `page.goto` under
 *      `setOffline(true)` (Iteration 1, commit `4c692cf`) and via
 *      `fetch(url, { mode: 'navigate' })` (Iteration 2, commit
 *      `a3e11aa`); both failed in CI for different reasons (lifecycle
 *      quirks, then `mode: 'navigate'` not constructible from page
 *      JS). The precondition assertion below is the third iteration
 *      and trades "directly observe setCatchHandler firing" for
 *      reliability — see the per-test comment for the full ADR.
 *
 *   5. **Offline + cached URL: plain `fetch()` returns the real page
 *      from precache** (precache works without network — the actual
 *      offline-PWA promise). Visit a game online so it's precached,
 *      flip offline, fetch the game's URL again; assert the real
 *      page's content. Plain `fetch()` here works because
 *      `precacheAndRoute` matches on URL not destination.
 *
 * Test isolation: Playwright spawns a fresh browser context per test
 * by default. With `serviceWorkers: 'allow'`, the SW state (registration,
 * caches, IDB) lives in the context's storage, not in the browser
 * session — so each test starts with a clean SW slate by construction,
 * no explicit `unregister()` cleanup needed (and a beforeEach cleanup
 * would actually introduce a race: `unregister()` removes the
 * registration but the existing controller stays until next navigation,
 * so a `waitForFunction(!controller)` could hang if the SW wins the
 * install race before the cleanup script lands).
 *
 * Why this suite is a separate file rather than added to an existing
 * one: the global `serviceWorkers: 'block'` config sets the default
 * for the whole `tests/` tree; this file flips it via `test.use({})`,
 * which is per-file scope. Mixing SW-allow tests into an SW-block
 * file would either require interleaved `test.use({})` calls (fragile
 * — easy to accidentally pollute later tests with the wrong setting)
 * or duplicate the file's tests across two files. Cleaner to give
 * SW-aware tests their own module, named for what they cover.
 */

test.use({ serviceWorkers: 'allow' });

const SW_READY_TIMEOUT_MS = 15_000;

test.describe('service worker (T8)', () => {

  /**
   * Wait until a service worker is registered AND has taken control
   * of the current page. `navigator.serviceWorker.ready` resolves once
   * a registration is active for the current scope; `.controller`
   * starts non-null after `clients.claim()` lands. Both are needed
   * because the SW only intercepts requests once it's the controller.
   */
  const waitForSWControl = async (page: import('@playwright/test').Page): Promise<void> => {
    await page.waitForFunction(
      async () => {
        try {
          await navigator.serviceWorker.ready;
          return navigator.serviceWorker.controller !== null;
        } catch {
          return false;
        }
      },
      null,
      { timeout: SW_READY_TIMEOUT_MS },
    );
  };

  test('SW installs, takes control, and populates a non-empty precache', async ({ page }) => {
    await page.goto('');
    await waitForSWControl(page);

    // The SW should be controlling the page now.
    const controllerInfo = await page.evaluate(() => ({
      hasController: navigator.serviceWorker.controller !== null,
      scriptURL: navigator.serviceWorker.controller?.scriptURL ?? null,
    }));
    expect(controllerInfo.hasController).toBe(true);
    // The script URL should resolve under the Astro base prefix and end
    // in service-worker.js (renamed from sw.js on 2026-05-12).
    expect(controllerInfo.scriptURL).toMatch(/\/kids-learning-games-astro\/service-worker\.js$/);

    // Workbox creates a `workbox-precache-v2-...` cache on install.
    // Assert at least one precache cache exists AND has a non-trivial
    // number of entries (catches "manifest empty" regressions where
    // SW installs cleanly but precaches nothing).
    const precacheStats = await page.evaluate(async () => {
      const keys = await caches.keys();
      const precacheKey = keys.find((k) => k.includes('precache'));
      if (!precacheKey) return { precacheKey: null, entryCount: 0, allKeys: keys };
      const cache = await caches.open(precacheKey);
      const entries = await cache.keys();
      return { precacheKey, entryCount: entries.length, allKeys: keys };
    });
    expect(precacheStats.precacheKey).not.toBeNull();
    // The build precache currently has 70+ entries; assert ≥20 to leave
    // headroom for normal growth/shrinkage without falsely failing.
    expect(precacheStats.entryCount).toBeGreaterThanOrEqual(20);
  });

  test('online navigation serves the real page, NOT the offline fallback (regression test for the 2026-05-12 NavigationRoute bug)', async ({ page }) => {
    await page.goto('');
    await waitForSWControl(page);

    // Reload so this navigation actually goes through the SW (the
    // initial goto can race with SW install on some browsers).
    await page.reload();

    // Home page must NOT be the offline fallback.
    await expect(page).not.toHaveTitle(/Offline/);
    await expect(page.locator('body')).not.toContainText("You're Offline");

    // Navigate to a real game; same assertion. We use Counting Friends
    // because it's small + always-fresh in the precache (page-specific
    // JS chunk + addition.css are precached as separate entries).
    await page.goto('games/counting-friends-game.html');
    await expect(page).toHaveTitle(/Counting Friends/);
    await expect(page.locator('.cf-title')).toContainText('Counting Friends');
    await expect(page.locator('body')).not.toContainText("You're Offline");

    // And a second game to lock the pattern in across multiple pages
    // (the May-12 bug specifically affected EVERY navigation, not just
    // one path).
    await page.goto('games/number-friends-game.html');
    await expect(page).toHaveTitle(/Number Friends/);
    await expect(page.locator('.nf-title')).toContainText('Number Friends');
    await expect(page.locator('body')).not.toContainText("You're Offline");
  });

  /**
   * History of the offline-mode test design — and why these two tests
   * landed at "verify the precondition" rather than "trigger the
   * production behaviour":
   *
   * Iteration 1 (commit `4c692cf`) used `page.goto(url)` under
   * `context.setOffline(true)` and asserted page content. Both
   * offline tests failed in CI in 3-4s. Hypothesised navigation-
   * lifecycle interaction with SW-served responses under offline.
   *
   * Iteration 2 (commit `a3e11aa`) rewrote both tests to use
   * `page.evaluate(() => fetch(url, { mode: 'navigate' }))` to
   * sidestep the navigation lifecycle. Both tests failed faster
   * with a deterministic spec-compliant error: "TypeError: Cannot
   * construct a Request with a RequestInit whose mode member is
   * set as 'navigate'." `mode: 'navigate'` is reserved for
   * user-agent-initiated navigations and is not constructible from
   * page JS. The Iteration-1 hypothesis was wrong — the issue
   * wasn't navigation lifecycle, but that the underlying SW code
   * paths these tests target need a request with
   * `request.destination === 'document'`, which page-context JS
   * cannot synthesise via `fetch()`.
   *
   * Three options at this point:
   *
   * (A) Use a hidden iframe — its navigation produces a real
   * document-destined request. Adds iframe-lifecycle handling +
   * `onload` / `onerror` race management in headless Chromium, all
   * of which is its own flake surface. Faithful but expensive in
   * complexity-per-coverage.
   *
   * (B) Drop tests 4 + 5 entirely. Lose two positive-contract tests
   * but keep the May-12 NavigationRoute regression test (test 3,
   * "online navigation never serves the offline fallback") which
   * is the actual T8 motivation. Cheapest fix, maximally reliable.
   *
   * (C) Test the *precondition* rather than the *firing*. For each
   * production behaviour the failed tests targeted, find an
   * equivalent assertion that doesn't require synthesising a
   * document-destined request from page JS:
   *
   *   - "setCatchHandler returns the offline page on document
   *     fallback" → verify the offline page is precached AND has
   *     the expected fallback content (so when setCatchHandler
   *     does fire, it has the right bytes to return).
   *   - "precache works without network" → use plain `fetch(url)`
   *     (no mode) on a precached URL while offline. Plain fetch's
   *     destination is `''` not `'document'`, but `precacheAndRoute`
   *     matches on URL not destination, so the precache hit serves
   *     the real page bytes regardless. This tests the actual
   *     precache-without-network path.
   *
   * Picked option C. Rationale:
   *
   *   - Option A's complexity-per-coverage was net-negative — the
   *     iframe approach has its own established flake patterns in
   *     headless Chromium (timing on `onload` + cross-origin checks
   *     + iframe-lifecycle teardown), and I can't validate it
   *     locally on this dev box (Zscaler proxy intercepts every
   *     port, blocks `astro preview`). Two iterations of CI-only
   *     debugging already established that "I think this should
   *     work" doesn't survive Chromium without local validation.
   *   - Option B would have been correct if test 3 (the May-12
   *     regression test) were the only piece of value. But the
   *     "offline page is precached + has the right content"
   *     assertion is genuinely useful — it catches a class of
   *     regression where someone refactors the SW or the build's
   *     precache filter and silently strips the offline page from
   *     the manifest. That class would not be caught by tests 1-3.
   *   - Option C buys back most of the coverage of A/the original
   *     plan, with B's reliability profile. The semantic gap from
   *     the original plan: we don't directly observe `setCatchHandler`
   *     *firing*. But we observe (1) it's correctly wired
   *     (`service-worker.ts` source-level), (2) the offline page
   *     it would return is correctly precached and has the right
   *     bytes (test 4 below), and (3) online navigations don't
   *     accidentally trigger it (test 3 above). The May-12
   *     NavigationRoute bug — the actual reason T8 exists — is
   *     covered by test 3. The "uncached + offline → offline page
   *     is the *exact* response served" assertion is the one piece
   *     of the original plan we don't directly cover anymore, and
   *     that's an acceptable trade given the iteration-2 evidence
   *     that the direct version isn't reliable from page JS.
   *
   * If the iframe approach (option A) becomes valuable later — e.g.
   * if a setCatchHandler regression slips past the precondition
   * test — that's the natural carve trigger. The current test
   * structure leaves that follow-up cleanly addable as a 6th test
   * without churning the existing ones.
   */

  test('offline page is precached and contains the expected fallback content (precondition for setCatchHandler offline-fallback path)', async ({ page }) => {
    await page.goto('');
    await waitForSWControl(page);

    // Walk every Workbox cache, find the precache, look for the
    // offline-page entry, read its body. The offline page is keyed
    // as "offline" (no leading slash, no .html) by @vite-pwa/astro's
    // HTML-key stripping convention — same convention `service-worker.ts`
    // relies on when calling `matchPrecache('offline')` in its
    // `setCatchHandler`. If this entry is missing or has the wrong
    // content, the offline-fallback path would silently return an
    // unhelpful empty response in production.
    const result = await page.evaluate(async () => {
      const cacheKeys = await caches.keys();
      const precacheKey = cacheKeys.find((k) => k.includes('precache'));
      if (!precacheKey) return { found: false, reason: 'no precache cache' };
      const cache = await caches.open(precacheKey);
      const entries = await cache.keys();
      // Look for any precache entry whose URL contains "offline" —
      // exact key transform may evolve across @vite-pwa/astro versions
      // but the substring will stay stable.
      const offlineEntry = entries.find((req) => req.url.includes('offline'));
      if (!offlineEntry) return { found: false, reason: 'no offline entry in precache' };
      const response = await cache.match(offlineEntry);
      if (!response) return { found: false, reason: 'cache.match returned null' };
      const text = await response.text();
      return { found: true, url: offlineEntry.url, length: text.length, snippet: text.slice(0, 1500) };
    });

    expect(result.found).toBe(true);
    expect(result.url).toContain('offline');
    // Same content markers the original Iteration-1 test checked for —
    // catches "offline page exists in precache but has wrong bytes"
    // regressions (e.g. someone replaces the file but it ends up empty).
    expect(result.snippet).toContain('Offline');
    expect(result.snippet).toContain("You're Offline");
  });

  test('offline + cached URL: plain fetch returns the real page from precache (the offline-PWA promise)', async ({ page, context }) => {
    await page.goto('');
    await waitForSWControl(page);
    // Belt-and-braces: drive one online navigation through the SW so
    // the precache route handler has materialised the entry into
    // an addressable response. `precacheAndRoute` populates the
    // precache during install and `waitForSWControl` waits past
    // activate, so the precache should already be fully populated —
    // but the extra navigation makes the test self-contained against
    // any future Workbox version that defers entry materialisation
    // until first request.
    await page.goto('games/counting-friends-game.html');
    await expect(page.locator('.cf-title')).toContainText('Counting Friends');

    await context.setOffline(true);

    // Plain fetch (no `mode`) — destination is `''` not `'document'`
    // but that doesn't matter for `precacheAndRoute`, which matches
    // by URL alone. The precache hit serves the real page bytes
    // regardless of destination. This is the assertion that
    // *precache works without network* — the actual offline-PWA
    // promise users care about — and the assertion most likely to
    // regress if precacheAndRoute is misconfigured (e.g. base-URL
    // resolution drift, manifest globPatterns regression).
    //
    // Critically, we pass an ABSOLUTE URL with the Astro base prefix
    // baked in. The previous page.goto already navigated the page
    // to `<base>/games/counting-friends-game.html`, so a relative
    // fetch like `'games/counting-friends-game.html'` would resolve
    // against the current page's URL and produce
    // `<base>/games/games/counting-friends-game.html` (double
    // `games/`) — a precache miss which then falls through to
    // network → fails offline → not the test we're trying to run.
    // Absolute path with the literal `/kids-learning-games-astro/`
    // prefix is the safest form and matches the precache key
    // resolution path exactly. If `BASE` ever flips in
    // `astro.config.mjs`, this string needs to flip too — flagged
    // here so a future grep for `kids-learning-games-astro` finds
    // it during a hypothetical rebrand.
    const result = await page.evaluate(async () => {
      try {
        const r = await fetch('/kids-learning-games-astro/games/counting-friends-game.html');
        const text = await r.text();
        return { ok: r.ok, status: r.status, length: text.length, snippet: text.slice(0, 4000) };
      } catch (e) {
        return { error: String(e) };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.snippet).toContain('Counting Friends');
    expect(result.snippet).not.toContain("You're Offline");
  });
});
