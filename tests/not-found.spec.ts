import { test, expect } from '@playwright/test';

/**
 * 404 page smoke suite.
 *
 * Asserts the friendly 404 page (T7 — `src/pages/404.astro`,
 * shipped 2026-05-18) renders the expected fallback content and
 * the home-link href resolves under the Astro `base` prefix
 * (`/kids-learning-games-astro/`). Without this suite the 404
 * port could silently regress (e.g. the inline gradient styles
 * could be deleted, the BASE_URL template-literal could be
 * hardcoded) and only manifest when a user actually mistypes a
 * URL on the live site — which doesn't happen often enough for
 * casual deploy verification to catch it.
 *
 * Test scope deliberately limited to direct navigation:
 *   1. **Direct navigation to `404.html`** — verifies the page bytes
 *      shipped in `dist/404.html` are correct (status 200, content
 *      marker present, home-link targets the BASE root).
 *
 * NOT tested here: the "navigate to a missing path → falls back to
 * 404.html content" behaviour. That's a property of the *static
 * hosting layer* (GitHub Pages in production, vite/astro-preview in
 * CI), not of our code. GH Pages does fall back, but `astro preview`
 * historically has varied — vite preview in static mode emits its
 * own bare 404 response without serving the user's `dist/404.html`.
 * Asserting the fallback against `astro preview` would couple this
 * suite to upstream Astro/Vite preview behaviour and risk a flaky
 * CI failure that blocks the deploy gate without indicating any
 * actual regression in our build. Verifying that `dist/404.html`
 * exists with the right content + that GH Pages serves it on the
 * live deploy (manually verified post-ship, then implicitly verified
 * forever by the `Deploy to GitHub Pages` badge) is the right level
 * of test coverage.
 *
 * Status code on the direct test:
 *   - Both GH Pages and `astro preview` return HTTP 200 when the
 *     path is `/404.html` directly (it's a real, served file).
 *
 * No `sound: false` or LocalStorage shim needed here — the 404
 * page deliberately does not import any audio / speech /
 * achievements primitives, and the only LocalStorage read is the
 * FOUC-safe dark-mode pre-paint script which is fault-tolerant by
 * construction.
 */

test.describe('404 not-found page (T7)', () => {
  test('direct navigation to 404.html renders the friendly Go Home page', async ({ page }) => {
    const response = await page.goto('404.html');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Page Not Found/);
    await expect(page.locator('h1')).toContainText('Page Not Found');
    await expect(page.locator('p')).toContainText("Oops! This page doesn't exist");

    // The Go Home link must target the Astro BASE root with a
    // trailing slash. We verify by reading the rendered href and
    // asserting it equals `/kids-learning-games-astro/` — resilient
    // against either the local-preview baseURL
    // (`http://127.0.0.1:4321/kids-learning-games-astro/`) or the
    // live GH Pages baseURL when running with PLAYWRIGHT_BASE_URL
    // pointed at the deploy.
    const home = page.locator('a.home');
    await expect(home).toHaveCount(1);
    const homeHref = await home.getAttribute('href');
    expect(homeHref).toBe('/kids-learning-games-astro/');
    await expect(home).toContainText(/Go Home/);
  });
});
