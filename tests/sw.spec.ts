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
 *   4. **Offline navigation to an uncached URL DOES serve the
 *      offline fallback.** Install the SW online, flip the context
 *      offline, then navigate to a deliberately-missing path; assert
 *      the offline page renders. This exercises `setCatchHandler`
 *      and proves the offline-fallback path the May-12 hotfix
 *      replaced `NavigationRoute` with.
 *
 *   5. **Offline navigation to a CACHED URL serves the real page**
 *      (precache works without network). Visit a game online so it's
 *      precached, flip offline, navigate to it again; assert the
 *      game's content renders, not the offline page.
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

  test('offline navigation to an uncached URL serves the offline fallback', async ({ page, context }) => {
    // Install + activate the SW while online.
    await page.goto('');
    await waitForSWControl(page);

    // Flip the network off. Subsequent fetches return network errors.
    await context.setOffline(true);

    // Navigate to a path the precache deliberately doesn't cover. We
    // pick a `.html` path under the Astro base so the request is a
    // navigation (document destination) — that's the request shape
    // `setCatchHandler` branches on.
    await page.goto('xxx-uncached-route-for-sw-test.html', { waitUntil: 'load' });

    // The offline page is served. Assert by its content, not status,
    // because Workbox's offline fallback returns a 200 with the
    // precached offline page body (it's a real cache hit, just for a
    // different URL than the request).
    await expect(page).toHaveTitle(/Offline/);
    await expect(page.locator('h1')).toContainText("You're Offline");
  });

  test('offline navigation to a CACHED URL serves the real page (precache works without network)', async ({ page, context }) => {
    // Visit home + a game while online so both end up in the precache
    // route handler.
    await page.goto('');
    await waitForSWControl(page);
    await page.goto('games/counting-friends-game.html');
    await expect(page.locator('.cf-title')).toContainText('Counting Friends');

    // Flip offline. Re-navigating to the same game must still work
    // because the precache is the SW's primary serving strategy — this
    // is the actual offline-PWA promise.
    await context.setOffline(true);
    await page.goto('games/counting-friends-game.html');

    // The real page renders, not the offline fallback.
    await expect(page).toHaveTitle(/Counting Friends/);
    await expect(page.locator('.cf-title')).toContainText('Counting Friends');
    await expect(page.locator('body')).not.toContainText("You're Offline");
  });
});
