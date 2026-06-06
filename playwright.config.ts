import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Astro POC.
 *
 * Runs the production build (`astro preview`) — not the dev server.
 * Tests assert the SSR'd markup that ships to GH Pages, plus the
 * client-side `mountQuiz` + `progress.ts` LocalStorage writes that
 * back the Quiz / Stats panels across all 13 games.
 *
 * The base URL has the Astro `base: '/kids-learning-games-astro'`
 * baked in so test specs can `await page.goto('/games/<game>')`
 * without repeating the prefix.
 *
 * Track 2 of post-migration polish — see
 * `PROGRESS.md` → "Rough order of payoff" → item 4 (Add tests).
 */

const BASE = '/kids-learning-games-astro';
const PORT = Number(process.env.PORT ?? 4321);
// Use 127.0.0.1 explicitly (not `localhost`) so the URL Playwright
// polls during webServer startup matches the IPv4 address the
// `astro preview --host 127.0.0.1` step actually binds to. On macOS
// `localhost` can resolve to ::1 (IPv6) first, which leaves the
// webServer health check hanging until timeout.
//
// Trailing slash matters: tests use relative paths like
// `page.goto('games/dinosaurs-game.html')` (no leading slash) so
// `new URL(path, baseURL)` resolves under the Astro `base` prefix.
// Without the trailing slash on `baseURL`, the spec leading-slash
// path would resolve to the host root and miss the prefix entirely.
const LOCAL_URL = `http://127.0.0.1:${PORT}${BASE}/`;
// `PLAYWRIGHT_BASE_URL` lets a developer point the suite at the live
// GitHub Pages deploy (`https://aakash-jain-1.github.io/kids-learning-games-astro`)
// or any other deployed instance — useful when local HTTP is blocked
// by a corporate proxy (e.g. Zscaler intercepts every port on this
// repo's primary dev box, so `npm test` against `127.0.0.1` returns
// 403 from the proxy before reaching Astro). When this env var is
// set, we skip spawning the local preview server entirely.
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const EXTERNAL_BASE_URL = externalBaseUrl
  ? externalBaseUrl.endsWith('/')
    ? externalBaseUrl
    : `${externalBaseUrl}/`
  : undefined;
const BASE_URL = EXTERNAL_BASE_URL ?? LOCAL_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The smoke suites run quickly (one chromium browser, ~13 game pages
  // worth of light DOM assertions). One worker keeps the LocalStorage
  // writes per-test deterministic and avoids any "preview server can
  // only serve one page at a time"-class issues observed during
  // initial bring-up.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    // Skip Astro's PWA service-worker registration by default so each
    // test starts with a clean cache. The SW interferes with Playwright's
    // "fresh page" assumption — install events can race with test
    // navigations, and the precache cache layer makes assertions about
    // "did the page actually re-fetch?" non-deterministic.
    //
    // Per-file override: `tests/sw.spec.ts` (T8, shipped 2026-05-18)
    // opts back IN to `serviceWorkers: 'allow'` via `test.use({})` so
    // that suite can actually exercise the SW lifecycle (install →
    // activate → take control → precache hits → setCatchHandler
    // offline-fallback path). Every OTHER tests/*.spec.ts inherits
    // the block default below, which is correct for those suites
    // (their assertions are about page content + LocalStorage writes
    // that should be deterministic regardless of SW state).
    serviceWorkers: 'block',
    // Allow self-signed certificates so the suite can run against the
    // live GitHub Pages deploy on machines behind a TLS-MitM corporate
    // proxy (Zscaler signs every cert on this dev box's outbound HTTPS).
    // CI doesn't have this and serves a real cert on the local preview
    // anyway, so this is a safe no-op there.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      // `PW_CHANNEL=chrome` opts into the locally-installed Google Chrome
      // instead of Playwright's bundled chromium. Useful on dev boxes where
      // a corporate proxy (Zscaler) blocks/stalls the `playwright install`
      // browser download. Unset in CI, so CI keeps using bundled chromium.
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],

  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
