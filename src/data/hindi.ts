/**
 * Data for the Hindi game — the seventh GridLayout port.
 *
 * Foundational-set pedagogy: 48 Hindi varnamala letters (12 vowels +
 * 36 consonants) shown as a scannable Devanagari grid. Tap a tile to
 * see the example word, transliteration, English meaning, picture,
 * and a kid-friendly fact. Mirrors the Alphabets layout exactly —
 * same single-column flow, same `--capped` deck, same image+pill
 * detail-card payload — with three extras:
 *
 *   1. The tile face renders the *Devanagari character*, not the
 *      Latin letter. The same `e` emoji-fallback channel still
 *      fires if the Fluent UI PNG fails to load.
 *   2. Each card carries a `word` (Hindi word in Devanagari, e.g.
 *      `अनार`) plus `trans` (its romanised transliteration, e.g.
 *      `Anar`) so the detail card can show both. Speech reads the
 *      letter and word in `hi-IN`; the English fact stays in the
 *      default voice.
 *   3. Filter pills are bilingual — `स्वर Vowels` /
 *      `व्यंजन Consonants` — to give kids a soft introduction to
 *      the Hindi labels themselves while still being parent-readable.
 *
 * Layout decision (settled at port time): we collapse vanilla
 * `hindi-alphabets.html`'s two stacked grids (vowels above
 * consonants, both with `<h3>` section headings) into a single
 * filter-able deck. Rationale: the 3-pill filter is a clearer
 * affordance than vanilla's "scroll past 12 vowels to find
 * consonants" pattern, ships zero new layout primitives, and
 * matches the Alphabets shape verbatim. A sectioned-grid variant
 * was the alternative — kept on the shelf, see PROGRESS.md if
 * pedagogical signal ever demands it.
 *
 * Fields:
 *   - `letter` — Devanagari character (e.g. `अ`, `क्ष`); rendered
 *     big on the grid tile + at the top of the detail card.
 *   - `pron`   — short romanised pronunciation hint (e.g. `a`,
 *     `kha`, `ksha`); shown as a small italic helper line for
 *     non-Hindi-reading parents.
 *   - `word`   — Hindi word in Devanagari that starts with this
 *     letter (e.g. `अनार`).
 *   - `trans`  — romanised transliteration of `word` (e.g. `Anar`).
 *   - `n`      — English meaning of `word` (e.g. `Pomegranate`);
 *     drives the image alt text and is the conceptual subject of
 *     the picture.
 *   - `f`      — kid-friendly fun fact in English; read aloud
 *     after the Hindi letter+word, also shown on screen.
 *   - `e`      — plain emoji fallback if the PNG fails (related
 *     to `n`, not `letter`).
 *   - `img`    — relative fluentui-emoji path (see
 *     `FLUENT_IMG_BASE` in `@/data/fluent`).
 *   - `type`   — `'vowel' | 'consonant'`, drives the filter pill
 *     and meaning-pill colour.
 *   - `label`  — bilingual pill text (`स्वर Vowel` /
 *     `व्यंजन Consonant`).
 *
 * Image source note: vanilla used `img.icons8.com` JPGs/PNGs (a
 * mix of "color" and "emoji" packs). Per the Astro-repo migration
 * principle (Fluent UI 3D PNGs as the single image CDN, already
 * runtime-cached `CacheFirst` in `src/sw.ts`), all 48 entries are
 * re-sourced against `cdn.jsdelivr.net/gh/microsoft/fluentui-emoji`.
 * All unique image paths verified 200 OK at port time.
 *
 * Substitutions (Q → Crown precedent — closest kid-friendly
 * Fluent stand-in when the literal target isn't packed):
 *
 *   - Pomegranate (अ Anar)     → Cherries      (red clustered fruit;
 *                                              `Pomegranate` not packed)
 *   - Tamarind (इ Imli)        → Lemon         (sour fruit family)
 *   - Sugarcane (ई Eekh)       → Herb          (tall green plant)
 *   - Wool (ऊ Oon)             → Ewe (sheep)   (source of wool)
 *   - One (ए Ek)               → Keycap 1      (numeric keycap glyph)
 *   - Mortar (ओ Okhli)         → Bowl + spoon  (kitchen-tool family;
 *                                              `Cooking pot` not packed)
 *   - Woman (औ Aurat)          → Sari          (culturally on-point —
 *                                              traditional Indian dress;
 *                                              `Woman` is in the "human
 *                                              emoji" 403-class along
 *                                              with `Princess`)
 *   - Visarga / Ah (अः)        → Lotus         (sacred Indian symbol)
 *   - Pigeon (क Kabootar)      → Dove          (closest cousin)
 *   - Nga / Nya (ङ, ञ Nasal)   → Musical notes (vanilla precedent)
 *   - Craftsman (ठ Thathera)   → Hammer+wrench (craftsman's tools;
 *                                              `Construction worker`
 *                                              not packed — same
 *                                              human-emoji 403-class)
 *   - Ganit / Mathematics (ण)  → Abacus        (calc tool)
 *   - Thaila / Bag (थ)         → Backpack      (closest Fluent bag)
 *   - Tap / Faucet (न Nal)     → Potable water (water-stream emoji)
 *   - Phal / Fruit (फ)         → Red apple     (canonical fruit)
 *   - Yagya / Ritual (य)       → Fire          (central element)
 *   - Rath / Chariot (र)       → Wheel         (defining feature)
 *   - Laddu / Sweet (ल)        → Doughnut      (closest round sweet)
 *   - Shatkone / Hexagon (ष)   → Sparkles      (no hexagon emoji)
 *   - Kshatriya / Warrior (क्ष) → Crossed swords (warrior signifier)
 *
 * Vanilla quirks preserved (with notes):
 *   - `अः` (Visarga) and `ङ`/`ञ` (Nasal sounds) are not really
 *     "letters with example words" in any natural sense — vanilla
 *     reused the script char as both letter and word. We keep that
 *     for parity but pick more meaningful substitute imagery.
 *   - Several consonants share romanised pronunciations (`त`/`ट`
 *     both `ta`; `थ`/`ठ` both `tha`; `ण`/`न` both `na`). That's
 *     the dental/retroflex distinction — preserved verbatim from
 *     vanilla.
 *
 * Consumers compose the full image URL as
 * `${FLUENT_IMG_BASE}${card.img}` — import `FLUENT_IMG_BASE` from
 * `@/data/fluent` directly.
 */

export type LetterType = 'vowel' | 'consonant';

export interface HindiCard {
  /** Devanagari character (e.g. `अ`, `क्ष`) — rendered big on tile + detail */
  letter: string;
  /** Short romanised pronunciation hint (e.g. `a`, `kha`, `ksha`) */
  pron: string;
  /** Hindi word in Devanagari starting with `letter` (e.g. `अनार`) */
  word: string;
  /** Romanised transliteration of `word` (e.g. `Anar`) */
  trans: string;
  /** English meaning of `word` — image subject + alt text */
  n: string;
  /** Fun fact in English, read aloud after the Hindi letter+word */
  f: string;
  /** Plain emoji fallback if the PNG fails (related to `n`) */
  e: string;
  /** Relative fluentui-emoji path (see `FLUENT_IMG_BASE`) */
  img: string;
  /** Vowel vs consonant — drives filter pill + meaning-pill colour */
  type: LetterType;
  /** Bilingual pill text (`स्वर Vowel` / `व्यंजन Consonant`) */
  label: string;
}

const VOWEL_LABEL = '\u0938\u094D\u0935\u0930 Vowel'; // "स्वर Vowel"
const CONSONANT_LABEL = '\u0935\u094D\u092F\u0902\u091C\u0928 Consonant'; // "व्यंजन Consonant"

// Helper to declare a card without re-typing `type` + `label` for every entry.
const v = (
  letter: string,
  pron: string,
  word: string,
  trans: string,
  n: string,
  img: string,
  e: string,
  f: string,
): HindiCard => ({
  letter, pron, word, trans, n, f, img, e,
  type: 'vowel',
  label: VOWEL_LABEL,
});

const c = (
  letter: string,
  pron: string,
  word: string,
  trans: string,
  n: string,
  img: string,
  e: string,
  f: string,
): HindiCard => ({
  letter, pron, word, trans, n, f, img, e,
  type: 'consonant',
  label: CONSONANT_LABEL,
});

export const ALL_CARDS: readonly HindiCard[] = [
  // -- Vowels (स्वर) -- 12 entries
  v('\u0905', 'a',   '\u0905\u0928\u093E\u0930',                 'Anar',    'Pomegranate',
    'Cherries/3D/cherries_3d.png',                                          '\u{1F352}',
    'Pomegranates are juicy red fruits with hundreds of shiny ruby seeds!'),
  v('\u0906', 'aa',  '\u0906\u092E',                              'Aam',     'Mango',
    'Mango/3D/mango_3d.png',                                                '\u{1F96D}',
    'Mango is the king of fruits — sweet, juicy, and loved across India!'),
  v('\u0907', 'i',   '\u0907\u092E\u0932\u0940',                 'Imli',    'Tamarind',
    'Lemon/3D/lemon_3d.png',                                                '\u{1F34B}',
    'Tamarind is a tangy, sticky fruit that gives Indian dishes their zing!'),
  v('\u0908', 'ee',  '\u0908\u0916',                              'Eekh',    'Sugarcane',
    'Herb/3D/herb_3d.png',                                                  '\u{1F33F}',
    'Sugarcane is a tall green plant that gives us sweet sugar and juice!'),
  v('\u0909', 'u',   '\u0909\u0932\u094D\u0932\u0942',           'Ullu',    'Owl',
    'Owl/3D/owl_3d.png',                                                    '\u{1F989}',
    'Owls are wise night birds that can turn their heads almost all the way around!'),
  v('\u090A', 'oo',  '\u090A\u0928',                              'Oon',     'Wool',
    'Ewe/3D/ewe_3d.png',                                                    '\u{1F411}',
    'Wool comes from sheep and keeps us warm in winter!'),
  v('\u090F', 'e',   '\u090F\u0915',                              'Ek',      'One',
    'Keycap%201/3D/keycap_1_3d.png',                                        '\u{0031}\u{FE0F}\u{20E3}',
    'One is the very first counting number — count along: ek, do, teen!'),
  v('\u0910', 'ai',  '\u0910\u0928\u0915',                       'Ainak',   'Glasses',
    'Glasses/3D/glasses_3d.png',                                            '\u{1F453}',
    'Glasses help us see clearly when our eyes need a little extra help!'),
  v('\u0913', 'o',   '\u0913\u0916\u0932\u0940',                 'Okhli',   'Mortar',
    'Bowl%20with%20spoon/3D/bowl_with_spoon_3d.png',                        '\u{1F963}',
    'A mortar is a stone bowl used to grind spices in Indian kitchens!'),
  v('\u0914', 'au',  '\u0914\u0930\u0924',                       'Aurat',   'Woman',
    'Sari/3D/sari_3d.png',                                                  '\u{1FA7B}',
    'Aurat means woman — and the sari is a beautiful Indian outfit they wear!'),
  v('\u0905\u0902', 'an', '\u0905\u0902\u0917\u0942\u0930',      'Angoor',  'Grapes',
    'Grapes/3D/grapes_3d.png',                                              '\u{1F347}',
    'Grapes grow in juicy bunches — purple, green, and so sweet!'),
  v('\u0905\u0903', 'ah', '\u0905\u0903',                         'Ah',      'Visarga',
    'Lotus/3D/lotus_3d.png',                                                '\u{1FAB7}',
    'Visarga is a special breath sound that ends some Sanskrit words!'),

  // -- Consonants (व्यंजन) -- 36 entries
  c('\u0915', 'ka',  '\u0915\u092C\u0942\u0924\u0930',           'Kabootar','Pigeon',
    'Dove/3D/dove_3d.png',                                                  '\u{1F54A}',
    'Pigeons are gentle birds that coo softly and live in city parks!'),
  c('\u0916', 'kha', '\u0916\u0930\u0917\u094B\u0936',           'Khargosh','Rabbit',
    'Rabbit%20face/3D/rabbit_face_3d.png',                                  '\u{1F430}',
    'Rabbits hop on long back legs and love to nibble carrots!'),
  c('\u0917', 'ga',  '\u0917\u093E\u092F',                       'Gaay',    'Cow',
    'Cow%20face/3D/cow_face_3d.png',                                        '\u{1F42E}',
    'Cows are gentle animals that give us fresh milk every day!'),
  c('\u0918', 'gha', '\u0918\u0930',                              'Ghar',    'House',
    'House/3D/house_3d.png',                                                '\u{1F3E0}',
    'A house is where our family lives, eats, and sleeps together!'),
  c('\u0919', 'nga', '\u0919',                                    'Nga',     'Nasal sound',
    'Musical%20notes/3D/musical_notes_3d.png',                              '\u{1F3B6}',
    'Nga is a special humming sound made through the nose!'),
  c('\u091A', 'cha', '\u091A\u092E\u094D\u092E\u091A',           'Chammach','Spoon',
    'Spoon/3D/spoon_3d.png',                                                '\u{1F944}',
    'A spoon helps us scoop up our favourite foods like dal and rice!'),
  c('\u091B', 'chha','\u091B\u0924\u0930\u0940',                 'Chhatri', 'Umbrella',
    'Umbrella%20with%20rain%20drops/3D/umbrella_with_rain_drops_3d.png',    '\u2614',
    'An umbrella keeps us dry when monsoon rains pour down!'),
  c('\u091C', 'ja',  '\u091C\u0939\u093E\u091C',                 'Jahaaz',  'Ship',
    'Ship/3D/ship_3d.png',                                                  '\u{1F6A2}',
    'Ships sail across the wide blue ocean to faraway lands!'),
  c('\u091D', 'jha', '\u091D\u0902\u0921\u093E',                 'Jhanda',  'Flag',
    'Triangular%20flag/3D/triangular_flag_3d.png',                          '\u{1F6A9}',
    'A flag is a symbol of a country — India\u2019s flag is saffron, white, and green!'),
  c('\u091E', 'nya', '\u091E',                                    'Nya',     'Nasal sound',
    'Musical%20notes/3D/musical_notes_3d.png',                              '\u{1F3B6}',
    'Nya is another special nasal sound, similar to the \u201Cny\u201D in canyon!'),
  c('\u091F', 'ta',  '\u091F\u092E\u093E\u091F\u0930',           'Tamatar', 'Tomato',
    'Tomato/3D/tomato_3d.png',                                              '\u{1F345}',
    'Tomatoes are juicy red fruits we use in curries and salads!'),
  c('\u0920', 'tha', '\u0920\u0920\u0947\u0930\u093E',           'Thathera','Craftsman',
    'Hammer%20and%20wrench/3D/hammer_and_wrench_3d.png',                    '\u{1F6E0}\uFE0F',
    'A craftsman makes beautiful things with their skilful hands and tools!'),
  c('\u0921', 'da',  '\u0921\u092E\u0930\u0942',                 'Damru',   'Drum',
    'Drum/3D/drum_3d.png',                                                  '\u{1F941}',
    'A damru is a tiny two-headed drum — twirl it and it makes music!'),
  c('\u0922', 'dha', '\u0922\u094B\u0932',                       'Dhol',    'Dhol drum',
    'Long%20drum/3D/long_drum_3d.png',                                      '\u{1FA98}',
    'A dhol is a big two-sided drum — its loud beat starts every Indian celebration!'),
  c('\u0923', 'na',  '\u0917\u0923\u093F\u0924',                 'Ganit',   'Mathematics',
    'Abacus/3D/abacus_3d.png',                                              '\u{1F9EE}',
    'Mathematics helps us count, add, and solve fun puzzles!'),
  c('\u0924', 'ta',  '\u0924\u0930\u092C\u0942\u091C',           'Tarbooj', 'Watermelon',
    'Watermelon/3D/watermelon_3d.png',                                      '\u{1F349}',
    'Watermelon is a big sweet fruit that is mostly cooling water inside!'),
  c('\u0925', 'tha', '\u0925\u0948\u0932\u093E',                 'Thaila',  'Bag',
    'Backpack/3D/backpack_3d.png',                                          '\u{1F392}',
    'A bag carries our books, lunch, and all our school supplies!'),
  c('\u0926', 'da',  '\u0926\u0930\u0935\u093E\u091C\u093E',     'Darwaza', 'Door',
    'Door/3D/door_3d.png',                                                  '\u{1F6AA}',
    'A door welcomes us home when we come back from a long day!'),
  c('\u0927', 'dha', '\u0927\u0928\u0941\u0937',                 'Dhanush', 'Bow',
    'Bow%20and%20arrow/3D/bow_and_arrow_3d.png',                            '\u{1F3F9}',
    'A bow and arrow is an ancient weapon used by heroes in old stories!'),
  c('\u0928', 'na',  '\u0928\u0932',                              'Nal',     'Tap',
    'Potable%20water/3D/potable_water_3d.png',                              '\u{1F6B0}',
    'A tap gives us fresh water to drink, wash, and cook with!'),
  c('\u092A', 'pa',  '\u092A\u0924\u0902\u0917',                 'Patang',  'Kite',
    'Kite/3D/kite_3d.png',                                                  '\u{1FA81}',
    'Kites soar high in the sky on windy days — fly them on Makar Sankranti!'),
  c('\u092B', 'pha', '\u092B\u0932',                              'Phal',    'Fruit',
    'Red%20apple/3D/red_apple_3d.png',                                      '\u{1F34E}',
    'Fruits are nature\u2019s sweet snacks — apples, mangoes, grapes, and more!'),
  c('\u092C', 'ba',  '\u092C\u0915\u0930\u0940',                 'Bakri',   'Goat',
    'Goat/3D/goat_3d.png',                                                  '\u{1F410}',
    'Goats are friendly animals that love to climb and nibble leaves!'),
  c('\u092D', 'bha', '\u092D\u093E\u0932\u0942',                 'Bhaalu',  'Bear',
    'Bear/3D/bear_3d.png',                                                  '\u{1F43B}',
    'Bears are big and strong — they love honey and sleep through winter!'),
  c('\u092E', 'ma',  '\u092E\u091B\u0932\u0940',                 'Machhli', 'Fish',
    'Fish/3D/fish_3d.png',                                                  '\u{1F41F}',
    'Fish swim in rivers, ponds, and the wide blue sea!'),
  c('\u092F', 'ya',  '\u092F\u091C\u094D\u091E',                 'Yagya',   'Ritual fire',
    'Fire/3D/fire_3d.png',                                                  '\u{1F525}',
    'A yagya is a sacred fire ritual where people offer prayers!'),
  c('\u0930', 'ra',  '\u0930\u0925',                              'Rath',    'Chariot',
    'Wheel/3D/wheel_3d.png',                                                '\u{1F6DE}',
    'A chariot is a wooden cart pulled by horses — heroes rode them in old tales!'),
  c('\u0932', 'la',  '\u0932\u0921\u094D\u0921\u0942',           'Laddu',   'Sweet',
    'Doughnut/3D/doughnut_3d.png',                                          '\u{1F369}',
    'Laddu is a round Indian sweet made of flour, sugar, and ghee — yum!'),
  c('\u0935', 'va',  '\u0935\u093E\u0928\u0930',                 'Vanar',   'Monkey',
    'Monkey%20face/3D/monkey_face_3d.png',                                  '\u{1F435}',
    'Monkeys are clever climbers that love bananas and swinging from trees!'),
  c('\u0936', 'sha', '\u0936\u0947\u0930',                       'Sher',    'Lion',
    'Lion/3D/lion_3d.png',                                                  '\u{1F981}',
    'The lion is the king of the jungle — its mighty roar can be heard for miles!'),
  c('\u0937', 'sha', '\u0937\u091F\u094D\u0915\u094B\u0923',     'Shatkone','Hexagon',
    'Sparkles/3D/sparkles_3d.png',                                          '\u2728',
    'Shatkone is a six-pointed star — a sparkling shape used in Indian art!'),
  c('\u0938', 'sa',  '\u0938\u0947\u092C',                       'Seb',     'Apple',
    'Red%20apple/3D/red_apple_3d.png',                                      '\u{1F34E}',
    'Apples are crunchy and sweet — eat one a day to stay healthy!'),
  c('\u0939', 'ha',  '\u0939\u093E\u0925\u0940',                 'Haathi',  'Elephant',
    'Elephant/3D/elephant_3d.png',                                          '\u{1F418}',
    'Elephants are gentle giants with long trunks and great memories!'),
  c('\u0915\u094D\u0937', 'ksha', '\u0915\u094D\u0937\u0924\u094D\u0930\u093F\u092F', 'Kshatriya', 'Warrior',
    'Crossed%20swords/3D/crossed_swords_3d.png',                            '\u2694\uFE0F',
    'A kshatriya is a brave warrior who protects others from danger!'),
  c('\u0924\u094D\u0930', 'tra', '\u0924\u094D\u0930\u093F\u0936\u0942\u0932', 'Trishul', 'Trident',
    'Trident%20emblem/3D/trident_emblem_3d.png',                            '\u{1F531}',
    'A trident is a three-pointed spear — Lord Shiva carries one!'),
  c('\u091C\u094D\u091E', 'gya', '\u091C\u094D\u091E\u093E\u0928', 'Gyaan',  'Knowledge',
    'Brain/3D/brain_3d.png',                                                '\u{1F9E0}',
    'Knowledge is power — every book and lesson makes our minds stronger!'),
];

export interface HindiFilter {
  key: 'all' | LetterType;
  /** Bilingual filter label (e.g. `\u0938\u094D\u0935\u0930 Vowels`) */
  label: string;
}

export const FILTERS: readonly HindiFilter[] = [
  { key: 'all',       label: '\u{1F1EE}\u{1F1F3} All' },                       // 🇮🇳 All
  { key: 'vowel',     label: '\u0938\u094D\u0935\u0930 Vowels' },              // स्वर Vowels
  { key: 'consonant', label: '\u0935\u094D\u092F\u0902\u091C\u0928 Consonants' }, // व्यंजन Consonants
];
