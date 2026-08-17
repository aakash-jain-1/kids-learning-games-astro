// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
// Deployed to GitHub Pages at:
//   https://aakash-jain-1.github.io/kids-learning-games-astro/
// Keeping this separate from the vanilla `kids-learning-games` repo so the
// POC can run live in parallel without touching the existing PWA scope.
//
// Cut-over plan (Track 4, see PROGRESS.md / SESSION-HANDOFF.md): Phase 3
// flips `BASE` to `/kids-learning-games` and reroutes the deploy pipeline
// to push to the vanilla repo's GH Pages branch. This file plus
// `src/service-worker.ts` (renamed from `sw.ts` 2026-05-12) plus the
// `redirects` block below carry that without extra moving parts —
// Phase 3 is a one-line `BASE` flip plus a CI deploy-target swap, no
// other source edits.
const SITE = 'https://aakash-jain-1.github.io';
const BASE = '/kids-learning-games-astro';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  build: {
    format: 'file',
  },
  // Permanent aliases for the 4 vanilla URLs whose filenames diverged in
  // the Astro port: `alphabet-game.html` (singular) → `alphabets-game.html`,
  // `birds.html` → `birds-game.html`, `daily-routines.html` →
  // `daily-routines-game.html`, `hindi-alphabets.html` → `hindi-game.html`.
  // Astro emits a tiny redirect HTML at each of the legacy paths at build
  // time, so any vanilla bookmark, vanilla SW precache hit, or external
  // inbound link continues to land on the right page after the cut-over.
  //
  // Keys are site-root *route* paths — Astro auto-prepends `base` when
  // emitting the redirect file, AND `build.format: 'file'` appends the
  // `.html` extension at emit time, so omit the `.html` here (writing it
  // would produce `alphabet-game.html.html`).
  //
  // Values must be literal absolute URLs that already include `base`,
  // because Astro injects them verbatim into the redirect HTML's
  // `<meta http-equiv="refresh">` and `<a href>` (it does *not*
  // auto-prefix `base` on destinations the way it does on sources). The
  // template-literal `${BASE}` keeps both source and destination in sync
  // when `BASE` flips at cut-over time — Phase 3's only edit to this file
  // is the `BASE` constant, and these four redirects re-resolve correctly
  // without further work.
  redirects: {
    '/games/alphabet-game': `${BASE}/games/alphabets-game.html`,
    '/games/birds': `${BASE}/games/birds-game.html`,
    '/games/daily-routines': `${BASE}/games/daily-routines-game.html`,
    '/games/hindi-alphabets': `${BASE}/games/hindi-game.html`,
  },
  integrations: [
    AstroPWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      // Output URL is `<base>/service-worker.js`. The filename matches the
      // vanilla repo's hand-rolled `service-worker.js` so the cut-over is
      // a transparent SW replacement at the same URL — see
      // `src/service-worker.ts` header for the full handoff rationale.
      filename: 'service-worker.ts',
      registerType: 'autoUpdate',
      includeAssets: ['assets/icon-192.svg', 'assets/icon-512.svg'],
      manifest: {
        name: 'Kids Learning Games (Astro POC) - Educational Fun for Children',
        short_name: 'Kids Games (Astro)',
        description:
          'Astro + TypeScript + Workbox rewrite of Kids Learning Games. Fun educational games for kids — Flashcards, Dinosaurs, and more. Interactive learning with quizzes, achievements and audio.',
        theme_color: '#667eea',
        background_color: '#667eea',
        display: 'standalone',
        orientation: 'any',
        scope: `${BASE}/`,
        start_url: `${BASE}/`,
        categories: ['education', 'entertainment', 'kids', 'games'],
        icons: [
          { src: 'assets/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'assets/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'assets/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // `mp3` covers the vendored animal calls in `public/sounds/animals/`
        // (added 2026-08-17). Animal Sounds is a listening game, so without
        // them precached it has nothing to play offline — see
        // `public/sounds/animals/CREDITS.md`. The whole set is ~450KB.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,mp3}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
