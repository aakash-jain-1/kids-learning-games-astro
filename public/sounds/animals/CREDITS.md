# Animal Sounds — audio credits

Real animal recordings used as the listening prompts in the **Animal Sounds**
game (`src/pages/games/animal-sounds-game.astro`). Added 2026-08-17, replacing
the earlier text-to-speech reading of the onomatopoeia ("a robot voice saying
*moo*" is not a cow, and the game's whole skill is auditory recognition).

Eight of the twenty-seven clips are `CC BY` / `CC BY-SA` and **legally require
the attribution below**; the rest are CC0 or public domain and are credited as a
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

A **loudness levelling pass** (2026-08-22, when the set grew to 27) sits on top
of that chain. RMS normalisation turns out to be the wrong target for a set this
varied: it measures the whole file including the gaps, so a sparse call like the
crow's two caws reads as quiet even when each caw is at the ceiling, while a
continuous one like the cricket reads as correct while sounding much louder. The
clips were re-measured with **EBU R128 integrated loudness**, which gates the
gaps out and tracks what a listener actually hears, and everything above
−17 LUFS was attenuated to −18.

Attenuation only, never boost: pulling a clip *down* is a plain gain change,
whereas pushing one up would need a limiter to hold the −3 dBFS ceiling, and
limiting a transient like a bark by several dB flattens the attack that makes it
recognisable — in a game whose entire skill is auditory recognition that is the
wrong trade. So the four clips that sit *below* the band (`dog` −22.7, `duck`
−22.0, `dove` −19.7, `crow` −19.2 LUFS) are deliberately left alone; all four are
sparse or transient sounds whose peaks are already at the ceiling. The remaining
23 sit inside a 1.8 LU band, down from 7.6 LU across the set before the pass.

`lion`, `monkey` and `turkey` came from long field recordings (a 42 s roaring
*bout*, a 12 s pant-hoot, three gobbles over 10 s), so for those the 2.5 s cap
isn't enough on its own — the excerpt window was picked deliberately per clip:

- **lion** — the roar at 22.9 s, which is bracketed by ambience on both sides
  (so it's one complete roar) and needs less make-up gain than the busier
  passages, which matters because the source has a ~−27 dBFS ambience floor and
  make-up gain is also noise gain.
- **monkey** — the climax of the pant-hoot, the part that actually reads as
  "monkey" rather than the quiet panting that leads into it.
- **turkey** — the second of the three gobbles. The first starts at sample 0
  already at −0.3 dBFS, meaning its attack is truncated, and the rasp at the
  front of a gobble is what makes it a gobble.

Derivative works: the trimmed/normalised versions of the four `CC BY-SA` clips
(`duck`, `goose`, `crow`, `cricket`) remain under `CC BY-SA`; the share-alike
term applies to those audio files, not to this repository's code.

## Clips

| Animal | License | Credit | Source |
| --- | --- | --- | --- |
| bee | **CC BY 3.0** | Free Sounds Library, user *Spanac* | [Bee buzzing sound (animal noises).opus](https://commons.wikimedia.org/wiki/File:Bee_buzzing_sound_(animal_noises).opus) |
| duck | **CC BY-SA 4.0** | Marie-Lan Taÿ Pamart | [Anas platyrhynchos – Mallard XC518422.mp3](https://commons.wikimedia.org/wiki/File:Anas_platyrhynchos_-_Mallard_XC518422.mp3) |
| lion | **CC BY 4.0** | Jonathan Growcott, Alex Lobora, Andrew Markham, Charlotte E. Searle, Johan Wahlström, Matthew Wijers, Benno I. Simmons — from [Ecology & Evolution 10.1002/ece3.72474](https://onlinelibrary.wiley.com/doi/10.1002/ece3.72474) | [Lionroar.wav](https://commons.wikimedia.org/wiki/File:Lionroar.wav) |
| monkey | **CC BY 4.0** | Pawel Fedurek et al. (chimpanzee pant-hoot) | [Pant-hoot call made by a male chimpanzee.ogg](https://commons.wikimedia.org/wiki/File:Pant-hoot_call_made_by_a_male_chimpanzee.ogg) |
| bear | **CC BY 3.0** | Shizhao | [Bear growl.ogg](https://commons.wikimedia.org/wiki/File:Bear_growl.ogg) |
| cricket | **CC BY-SA 3.0** | Harald Süpfle | [Gryllus campestris 02 (HS).ogg](https://commons.wikimedia.org/wiki/File:Gryllus_campestris_02_(HS).ogg) |
| crow | **CC BY-SA 4.0** | Marie-Lan Taÿ Pamart, via [xeno-canto XC500631](https://www.xeno-canto.org/500631) | [Corvus corone – Carrion Crow XC500631.mp3](https://commons.wikimedia.org/wiki/File:Corvus_corone_-_Carrion_Crow_XC500631.mp3) |
| goose | **CC BY-SA 4.0** | Ryan Hodnett | [Greylag Goose (Anser anser) – Bærum, Norway 2021-04-03.mp3](https://commons.wikimedia.org/wiki/File:Greylag_Goose_(Anser_anser)_-_B%C3%A6rum,_Norway_2021-04-03.mp3) |
| turkey | Public domain | *bod*, via pdsounds.org | [Gobbler.ogg](https://commons.wikimedia.org/wiki/File:Gobbler.ogg) |
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
| donkey | CC0 | [Félix Blume](https://freesound.org/people/felix.blume/sounds/157763/) | [157763 felix-blume a-donkey-is-braying….wav](https://commons.wikimedia.org/wiki/File:157763_felix-blume_a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav) |
| tiger | CC0 | [schots](https://freesound.org/people/schots/sounds/439280/) | [439280 schots angry-tiger.wav](https://commons.wikimedia.org/wiki/File:439280_schots_angry-tiger.wav) |
| seagull | CC0 | Sonothèque ADVL, via [xeno-canto XC707075](https://xeno-canto.org/707075) | [XC707075 – European Herring Gull – Larus argentatus.mp3](https://commons.wikimedia.org/wiki/File:XC707075_-_European_Herring_Gull_-_Larus_argentatus.mp3) |
| goat | Public domain | *stephan*, via pdsounds.org | [Herd of goats bleating.ogg](https://commons.wikimedia.org/wiki/File:Herd_of_goats_bleating.ogg) |
| dove | Public domain | *mary905*, via pdsounds.org | [Dove cooing.ogg](https://commons.wikimedia.org/wiki/File:Dove_cooing.ogg) |
| peacock | Public domain | Ke4roh | [Pavo cristatus (call).ogg](https://commons.wikimedia.org/wiki/File:Pavo_cristatus_(call).ogg) |

## Animals still without a recording

Only **`snake`**. It is still offered as a picture option, but never as a
round's *prompt*, and the guided correction still teaches its call by voice
("that's the snake, the snake says hisss").

A genuine snake hiss does not appear to exist on Wikimedia Commons. Fifteen
species-specific and non-English search terms (`Python regius`, `Pituophis`,
`hognose`, `Naja`, `Natrix`, `serpent sifflement`, `Schlange zischen`, …) across
the whole audio namespace returned exactly one non-pronunciation result, and it
was a Finnish dialect recording. What keyword search *does* return is a trap:
Wiktionary and Lingua Libre pronunciation clips of humans **saying** the word
"hiss" or "rattle", plus baby-rattle toys and steam trains.

A rattlesnake rattle **is** available (`Rattlesnake.ogg`, public domain) but is
deliberately not used: it isn't the call the game teaches, and as a buzz it
would fall inside the existing `bee`/`snake` sound-collision group, so a child
tapping "bee" for it would be defensibly right.

To add one later: drop a mastered `<id>.mp3` in this folder and add the id to
`CLIP_BACKED_IDS` in `src/data/animal-sounds.ts`. It re-enters the prompt
rotation automatically.

## Candidates searched and rejected (2026-08-22)

Recorded so the next person expanding the pool doesn't re-run the same searches:

- **eagle** — the usable Commons recordings are of the *bald eagle*, whose real
  call is a thin chatter that almost nobody recognises; the screech the child has
  actually heard on television is a red-tailed hawk dubbed over eagle footage.
  Teaching either one is wrong: the honest clip fails recognition, the familiar
  clip is the wrong bird.
- **cuckoo**, **parrot** — the available recordings are distant field ambience
  with the call well below the birdsong and wind around it. Bringing the call up
  to the band brings the whole soundscape with it.
- **mouse** — no usable recording. Mouse vocalisation is largely ultrasonic, so
  what search returns is either inaudible or a squeak from a toy.

The general rule these share: **a clip is only worth adding if the animal is what
you hear first.** A technically-correct recording that a three-year-old cannot
pick out teaches nothing, and in a forced-choice game it actively punishes them.
