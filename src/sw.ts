/// <reference lib="webworker" />
// Custom service worker.
// Workbox only injects the precache manifest (the __WB_MANIFEST placeholder),
// everything else is standard Service Worker code we control explicitly.
// Fixes audit H3 (GitHub API rate limit) by giving it a 1-hour SWR cache,
// fixes H4 (manual cache versioning) via Workbox's auto-revisioning of precache.

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
const offlineFallback = createHandlerBoundToURL('/kids-learning-games/offline.html');
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
