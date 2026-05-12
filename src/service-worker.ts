/// <reference lib="webworker" />
// Custom service worker.
// Workbox only injects the precache manifest (the __WB_MANIFEST placeholder),
// everything else is standard Service Worker code we control explicitly.
// Fixes audit H3 (GitHub API rate limit) by giving it a 1-hour SWR cache,
// fixes H4 (manual cache versioning) via Workbox's auto-revisioning of precache.
//
// Output URL: `<base>/service-worker.js`. Renamed from `sw.js` 2026-05-12 at
// the Track 4 (cut-over plan) groundwork commit so the filename aligns with
// the vanilla repo's hand-rolled `service-worker.js`. When the cut-over
// flips `astro.config.mjs`'s `base` from `/kids-learning-games-astro` to
// `/kids-learning-games`, an existing vanilla PWA install registered at
// `https://aakash-jain-1.github.io/kids-learning-games/service-worker.js`
// will see *new bytes* at the *same URL* — the browser's standard SW
// update flow takes over (skipWaiting + clients.claim), Workbox replaces
// the vanilla SW, and `cleanupOutdatedCaches()` (below) purges the
// vanilla `kids-learning-games-v24` cache. No special unregister dance
// required; the filename match does all the work.
// Existing Astro PWA installs registered at `…/sw.js` (pre-rename) are
// migrated by the same mechanism the moment they next call
// `register('service-worker.js', { scope: <base>/ })` from a page —
// the SW spec replaces the registration's scriptURL when the new
// register call lands within the same scope.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

// Precache everything the build emits (workbox rewrites __WB_MANIFEST at build time).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation fallback: if the user is offline and hits an uncached page,
// serve the pre-cached offline page.
//
// Two subtleties baked in here:
//   1. Bare `'offline'` (no leading slash, no `.html`) is resolved by
//      `createHandlerBoundToURL` via `new URL('offline', self.location.href)`
//      — `self.location` in the SW is `<base>/service-worker.js`, so this
//      yields `<base>/offline` regardless of what `<base>` is. Stays
//      correct across the staging URL (`/kids-learning-games-astro/`) and
//      the post-cut-over URL (`/kids-learning-games/`), with no
//      `BASE_URL` trailing-slash gymnastics.
//   2. No `.html` because `@vite-pwa/astro` strips the extension on HTML
//      files before injecting the precache manifest — `__WB_MANIFEST`
//      lists this as `{ url: "offline" }`. Passing `offline.html` here
//      would miss the precache lookup and `createHandlerBoundToURL`
//      would throw `non-precached-url` at module-load time, taking the
//      whole SW install with it (which is what the previous hardcoded
//      `/kids-learning-games/offline.html` was silently doing on
//      staging — Playwright blocks SWs so the failure was never
//      surfaced in tests).
const offlineFallback = createHandlerBoundToURL('offline');
registerRoute(new NavigationRoute(offlineFallback));

// GitHub API: 1-hour stale-while-revalidate.
// Replaces the 14 ad-hoc localStorage-cached fetches in the old codebase.
registerRoute(
  ({ url }) => url.origin === 'https://api.github.com',
  new StaleWhileRevalidate({
    cacheName: 'github-api',
    plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 60 * 60 })],
  }),
);

// Remote images (Iconify, Fluent UI CDN): long-lived cache.
registerRoute(
  ({ url }) =>
    url.hostname === 'api.iconify.design' ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname.endsWith('iconify.design'),
  new CacheFirst({
    cacheName: 'remote-images',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);
