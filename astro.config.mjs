// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
// Deployed to GitHub Pages at:
//   https://aakash-jain-1.github.io/kids-learning-games-astro/
// Keeping this separate from the vanilla `kids-learning-games` repo so the
// POC can run live in parallel without touching the existing PWA scope.
const SITE = 'https://aakash-jain-1.github.io';
const BASE = '/kids-learning-games-astro';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  build: {
    format: 'file',
  },
  integrations: [
    AstroPWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
