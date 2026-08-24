import { defineConfig, devices } from '@playwright/test';
import { cpus } from 'node:os';

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
// or any other deployed instance instead of the local preview server.
// When this env var is set, we skip spawning the local preview entirely.
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
  // CI used to be single-worker, on the reasoning that it was deterministic
  // and a small runner had little to gain from fanning out. That stopped
  // being true as the suite grew, and the failure was total rather than
  // gradual: measured 2026-08-24, the 456 tests are **26 minutes of serial
  // test time** (3.6 min wall at 8 workers on a 20-core box). The workflow
  // allows 15 minutes for install, browsers, build *and* tests, so every run
  // hit the wall and GitHub reported it as "cancelled after 15m" — which
  // reads like an infrastructure hiccup rather than what it was, the suite
  // outgrowing its budget. The deploy gate is the same job, so nothing
  // shipped either.
  //
  // Four is deliberate and not just "more": it is the concurrency ceiling
  // the CDN paragraph below arrives at from the opposite direction, and a
  // GitHub-hosted `ubuntu-latest` runner is 4 vCPU. Retries are still 2, so
  // a genuinely flaky test costs 3x its own duration and nothing else's.
  //
  // Locally this used to be `undefined`, i.e. Playwright's default of half
  // the machine's cores — 10 on a 20-core box. That is too many, because a
  // worker is not CPU-bound here: every game page pulls its Fluent 3D
  // artwork from the jsDelivr CDN, and specs navigate with the default
  // `waitUntil: 'load'`, which waits for those images. Past roughly four
  // concurrent browsers the CDN starts throttling, `load` never fires, and
  // tests fail on navigation timeout while showing a fully rendered page —
  // a confusing failure that looks like a bug in whichever game drew the
  // short straw. Animal Sounds' full-run walk (27 rounds x 3 tiles) made it
  // reproducible: 21 failures at 10 workers, all in specs it never touched.
  //
  // Four is also just faster in wall-clock terms (1.9m vs 5.7m), since the
  // extra workers were mostly queueing on the same throttled CDN.
  //
  // **That reasoning was over-applied, and the correction is worth keeping.**
  // On 2026-08-23 this was lowered again to 2, on the same shape of evidence:
  // 4 workers gave 4 failures in 11.7m, 2 gave 0 in 8.7m. Both runs were taken
  // on a machine quietly buried under leftover browsers and preview servers
  // from a day of throwaway harness scripts, so the measurement was
  // confounded — worker count was not the variable, ambient load was. Measured
  // again the next day on a quiet 20-core box, all green: 8 workers 2.6m,
  // 6 workers 2.9m, 2 workers 7.1m. The cap of 2 was costing 4.5 minutes a run
  // and buying nothing.
  //
  // So: scale with the machine, but keep a ceiling, because the CDN ceiling
  // above is real even if it is higher than 4. Half the cores capped at 8 —
  // 8 on this box, 2 on a 4-core laptop, never enough to thrash a small one.
  // If you ever see navigation timeouts on fully-rendered pages, check the
  // machine is otherwise idle *before* reaching for this number.
  workers: process.env.CI ? 4 : Math.min(8, Math.max(2, Math.ceil(cpus().length / 2))),
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
    // Allow self-signed certificates so the suite can optionally run
    // against an external HTTPS deploy that serves a non-public cert.
    // Harmless for the local HTTP preview and for CI's real cert.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      // CI (Linux runners) uses Playwright's bundled Chromium, installed
      // via `npm run test:install`. On Windows the bundled-Chromium
      // *extraction* can stall hard (Defender / third-party AV scanning
      // the unzip of thousands of files — the download itself is fine),
      // so `PW_CHANNEL=chrome` opts into the locally-installed Google
      // Chrome instead, which needs no bundled download at all. Unset in
      // CI, so CI keeps using bundled Chromium.
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
