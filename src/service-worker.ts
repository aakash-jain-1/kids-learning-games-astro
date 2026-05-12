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

import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

// Precache everything the build emits (workbox rewrites __WB_MANIFEST at build time).
// `precacheAndRoute(__WB_MANIFEST)` ALSO registers a route that serves any
// precached entry from cache when the request URL matches — this is what
// actually serves every game page, the home page, the CSS bundles, and the
// 4 redirect HTMLs from cache. No extra navigation route is needed for the
// happy path.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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

// Offline fallback: only fires when ALL other handlers (precache + the two
// `registerRoute` blocks above + the implicit network fetch) fail. For a
// document request, return the precached offline page; for everything else,
// return a network error so the browser falls back to its default offline
// UI for that resource type.
//
// Critically NOT a `registerRoute(new NavigationRoute(handler))` pattern —
// `NavigationRoute` matches *every* navigation (online or offline), so
// pairing it with `createHandlerBoundToURL('offline')` would intercept
// every page load and serve the offline page even when online. That's the
// SPA app-shell pattern, not the offline-fallback pattern, and it broke
// every page on `https://aakash-jain-1.github.io/kids-learning-games-astro/`
// the moment the SW started installing successfully on 2026-05-12 (the
// pre-Phase-2 SW had `createHandlerBoundToURL('/kids-learning-games/offline.html')`
// which was a `non-precached-url` and threw at SW module-load → SW install
// failed silently → no SW intercepting → every nav went straight to the
// network → bug masked. Phase 2's URL fix let the SW install, surfacing
// the latent NavigationRoute bug for everyone with a fresh PWA install
// or browser SW update poll). `setCatchHandler` is the right primitive
// for "if everything else fails, serve this" — it's documented as the
// offline-fallback pattern in Workbox's official recipes.
//
// Same two precache-key subtleties as before — `matchPrecache('offline')`
// (no leading slash, no `.html`) because `@vite-pwa/astro` strips the
// extension on HTML files when injecting the precache manifest, and
// `matchPrecache` resolves the bare key against the precached entries
// regardless of `<base>`.
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await matchPrecache('offline')) ?? Response.error();
  }
  return Response.error();
});
