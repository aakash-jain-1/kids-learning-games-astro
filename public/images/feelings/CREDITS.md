# Feeling Friends — face credits

The eight faces used as the answer tiles in the **Feeling Friends** game
(`src/pages/games/feeling-friends-game.astro`). Added 2026-08-17.

All eight are from **[Microsoft Fluent UI Emoji](https://github.com/microsoft/fluentui-emoji)**,
`assets/<name>/3D/<name>_3d.png`, **MIT licensed** — the same pack the rest of
the site uses through the jsDelivr CDN (`src/data/fluent.ts`). Copied verbatim;
no re-encoding, no resizing.

## Why these are vendored when every other game streams from the CDN

Everywhere else on the site a Fluent image is *decoration on a labelled card* —
the word "Cow" is printed under it, so a child can still play when the image
doesn't arrive. Here the face **is** the question, three of them are on screen
at once, and there is nothing else to read the round from. Two consequences,
both learned on the day this game shipped:

1. **A CDN miss makes the page unplayable, not just plainer — and a miss is one
   wrong capital letter away.** Upstream folders are sentence case
   (`Grinning face`, `Star-struck`) and jsDelivr is case-sensitive, so the
   title-cased guesses this game was first written with (`Grinning Face`)
   all 404'd. Misses don't fail fast either: under a burst they took
   **8–44 seconds** to answer, so `load` sat waiting on three dead requests and
   the round had nothing tappable on it. (The paths already in
   `src/data/*.ts` are correct and serve 200 — this was never a sitewide
   breakage. But a hardcoded remote path that can only be validated by
   requesting it is a bad dependency for a tile whose *picture is the question*.)
2. **Offline-first only worked from the second visit.** The service worker
   runtime-caches jsDelivr, so a first visit on a plane got no faces at all.
   Vendored files are precached with the app shell instead.

356 KB total. If more games ever need faces, move these to a shared
`public/images/emoji/` directory rather than copying them again.

## Faces

The pick is per-feeling, not per-deck: `src/data/flashcards.ts` names the card
and supplies the coping line, but the *picture* was chosen for how it reads to a
3-year-old at tile size.

| Feeling | Emoji | Fluent asset | Note |
| --- | --- | --- | --- |
| happy | 😀 | `Grinning face` | Wide open smile. |
| sad | 😢 | `Crying face` | One big blue tear on the cheek. |
| angry | 😡 | `Pouting face` | Red face, eyebrows angled down. Not `Angry face` (😠), which is pale and much subtler. |
| scared | 😨 | `Fearful face` | Wide eyes, big round mouth, blue forehead. |
| sleepy | 😴 | `Sleeping face` | Closed eyes + big Zzz. **Deliberately not `Sleepy face` (😪)**, whose blue drool blob sits exactly where the crying face's tear does — two blue blobs is a confusion a forced-choice game shouldn't ask a 3yo to resolve. |
| excited | 🤩 | `Star-struck` | Star eyes. |
| love | 😍 | `Smiling face with heart-eyes` | Heart eyes. |
| caring | 🤗 | `Hugging face` | Open hands, rosy cheeks. |

Each face's spoken cue in `src/data/feeling-friends.ts` describes what is
actually in *these* images ("there is a big tear on the cheek"), because the
guided correction points the child at visual evidence. If a face is swapped,
re-check the cue against the new picture.
