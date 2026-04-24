// Shared Fluent UI 3D emoji CDN constant.
//
// Both Flashcards and Weather (and future games) use Microsoft's Fluent UI
// Emoji pack as their card visuals. The images are served from jsDelivr's
// GitHub-mirror endpoint, and runtime-cached by the service worker (see
// `src/sw.ts`). Composing a full URL is always `${FLUENT_IMG_BASE}${card.img}`.
//
// Asset paths inside the pack contain spaces (e.g. "Cloud with rain/3D/…"),
// which jsDelivr serves correctly when URL-encoded in the browser. Data
// files store the unencoded path; consumers rely on the browser's automatic
// encoding when assigning to `<img>.src`.

export const FLUENT_IMG_BASE =
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';
