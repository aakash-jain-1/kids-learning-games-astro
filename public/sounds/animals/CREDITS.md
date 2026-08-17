# Animal Sounds — audio credits

Real animal recordings used as the listening prompts in the **Animal Sounds**
game (`src/pages/games/animal-sounds-game.astro`). Added 2026-08-17, replacing
the earlier text-to-speech reading of the onomatopoeia ("a robot voice saying
*moo*" is not a cow, and the game's whole skill is auditory recognition).

Two of the fourteen clips are `CC BY` / `CC BY-SA` and **legally require the
attribution below**; the rest are CC0 or public domain and are credited as a
courtesy. Keep this file shipped alongside the audio.

## Mastering

Every clip was put through the same chain so no round is louder or longer than
another (see `PROGRESS.md` for the reasoning):

- silence trimmed off both ends, then capped at **2.5 s** — one call, not a
  field recording
- **mono, 44.1 kHz, MP3 128 kbps**
- **RMS-normalised to −18 dBFS**, so perceived loudness is consistent
- limiter at **−3 dBFS**, leaving headroom for lossy-encode overshoot
- 20 ms fade-in / 80 ms fade-out, so there is no click on play

Derivative works: the trimmed/normalised versions of the two `CC BY-SA` clips
remain under `CC BY-SA`; the share-alike term applies to those audio files, not
to this repository's code.

## Clips

| Animal | License | Credit | Source |
| --- | --- | --- | --- |
| bee | **CC BY 3.0** | Free Sounds Library, user *Spanac* | [Bee buzzing sound (animal noises).opus](https://commons.wikimedia.org/wiki/File:Bee_buzzing_sound_(animal_noises).opus) |
| duck | **CC BY-SA 4.0** | Marie-Lan Taÿ Pamart | [Anas platyrhynchos – Mallard XC518422.mp3](https://commons.wikimedia.org/wiki/File:Anas_platyrhynchos_-_Mallard_XC518422.mp3) |
| cat | CC0 | freemaster2 | [Meow of a Siamese cat.wav](https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav) |
| elephant | CC0 | தகவலுழவன் | [Elephant voice – trumpeting.ogg](https://commons.wikimedia.org/wiki/File:Elephant_voice_-_trumpeting.ogg) |
| pig | CC0 | [Foleyhaven](https://freesound.org/people/Foleyhaven/) | [618483 foleyhaven piglet-squeal-01.flac](https://commons.wikimedia.org/wiki/File:618483_foleyhaven_piglet-squeal-01.flac) |
| chicken | Public domain | alys | [Hen announcing shes lain an egg.ogg](https://commons.wikimedia.org/wiki/File:Hen_announcing_shes_lain_an_egg.ogg) |
| wolf | Public domain | — | [Wolf howls.ogg](https://commons.wikimedia.org/wiki/File:Wolf_howls.ogg) |
| cow | CC0 | Joseph Sardin | [BigSoundBank #2383](https://bigsoundbank.com/cow-moos-3-s2383.html) |
| dog | CC0 | Joseph Sardin | [BigSoundBank #2955](https://bigsoundbank.com/barking-dog-3-s2955.html) |
| horse | CC0 | Joseph Sardin | [BigSoundBank #284](https://bigsoundbank.com/neighing-of-a-horse-1-s0284.html) |
| rooster | CC0 | Joseph Sardin | [BigSoundBank #283](https://bigsoundbank.com/rooster-song-s0283.html) |
| sheep | CC0 | Joseph Sardin | [BigSoundBank #2343](https://bigsoundbank.com/sheep-1-s2343.html) |
| owl | CC0 | Joseph Sardin | [BigSoundBank #3459](https://bigsoundbank.com/tawny-owl-3-s3459.html) |
| frog | CC0 | Joseph Sardin | [BigSoundBank #819](https://bigsoundbank.com/one-frog-s0819.html) |

## Animals still without a recording

`lion`, `monkey`, `snake` and `turkey` have **no clip yet**, so they never appear
as a round's *prompt* — they are still offered as picture options, and the
guided correction still teaches their call by voice ("that's the lion, the lion
says roar"). Reasons:

- **lion, snake** — nothing usable found. Every CC0 "hiss" hit was a steam
  train; the lion recordings found were either unavailable or not CC-compatible.
- **monkey, turkey** — candidates identified on Wikimedia Commons (a chimpanzee
  pant-hoot, CC BY 4.0; a wild turkey gobble, CC BY-SA 3.0) but the download was
  rate-limited (HTTP 429) and never completed.

To add one later: drop a mastered `<id>.mp3` in this folder and add the id to
`CLIP_BACKED_IDS` in `src/data/animal-sounds.ts`. It re-enters the prompt
rotation automatically.
