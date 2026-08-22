# Game designs — August 2026 arc (six games: 4 shipped, 2 queued)

> **Status: APPROVED. Build in progress — 5 of 6 shipped.** Keep the count in
> the title and in this line in step; they are the two places a reader checks
> first. A shipped game's section below is **frozen as the pre-build spec** —
> its [PROGRESS.md](../PROGRESS.md) entry is authoritative on what landed.
>
> - §1 **Animal Sounds** — **shipped 2026-08-17**; superseded by its
>   [PROGRESS.md](../PROGRESS.md) entry, which is authoritative on what actually
>   landed (the built pool ended at 18 curated calls with explicit
>   sound-collision groups, and the prompts became real recordings rather than
>   spoken onomatopoeia).
> - §2 **Feeling Friends** — **shipped 2026-08-17**, built as designed (8
>   feelings, 8 rounds, 3/3/2 tiers, vignettes on tier 3). Two deviations, both
>   in its `PROGRESS.md` entry: the faces are **vendored** to
>   `public/images/feelings/` instead of streaming from jsDelivr, and the theme
>   defines a real dark-mode background, which the sibling themes do not.
> - §3 **Opposites Friends** — **shipped 2026-08-22**, built as designed on the
>   10 clean pairs the **Q3** fix unlocked. Three things it added beyond the
>   spec below, all in its `PROGRESS.md` entry: rounds ask **both directions**
>   (big→small and small→big) so the child learns the relation rather than a
>   fixed answer card; the deck's Big/Small emoji (🔆/🔅, brightness symbols)
>   are **overridden locally** to 🐘/🐜 because here the picture has to carry
>   the concept; and distractors obey declared **meaning-collision groups**
>   (`big/heavy/strong`, `small/light/weak`) so no wrong tap is defensible,
>   with tier 3 drawing its two distractors *as a pair* for difficulty.
> - §4 **Rhyme Time** — **shipped 2026-08-22**, built as designed except that
>   the pool is **nine pairs, not ten**. Three things in its
>   [PROGRESS.md](../PROGRESS.md) entry are authoritative: **bow–snow was
>   dropped** on top of the four un-picturable pairs, because `bow` is a
>   homograph the child only ever *hears* and a voice reading /baʊ/ would
>   present a false rhyme aloud; the shared rime is **shown but never spoken**
>   (synthesis can't be trusted to pick the right vowel for a bare rime), so
>   the script demonstrates with both whole words and a chip carries the
>   letters; and tier 3 **picks its direction** as well as its distractor, so
>   the target always has an onset twin available to trap with (`ring` is
>   never the tier-3 target — it has none).
> - **Q1–Q4 all resolved** by the user on 2026-08-17: new `preschool-social`
>   family only for Feeling Friends with Animal Sounds under
>   `preschool-cognitive` (Q1); Feeling Friends scoped as tiers 1–2 recognition
>   plus tier 3 situational vignettes (Q2); both content bugs fixed in the shared
>   decks (Q3, Q4).
>
> Design plan for the six games chosen on 2026-08-17. Ranked candidates and
> domain rationale live in [ROADMAP.md](../ROADMAP.md); shipped work goes to
> [PROGRESS.md](../PROGRESS.md). This file is the pre-build spec — once a game
> ships, its section here is superseded by its `PROGRESS.md` entry.

---

## 0. What every game inherits (no per-game reinvention)

All six reuse `StoryLayout.astro` with a new `theme` key, per the "reuse a
shared layout" north-star rule. None needs a new layout.

Per game, the shippable unit is:

| Artifact | Path |
|---|---|
| Data + session generator | `src/data/<game>.ts` |
| Themed CSS | `src/styles/<game>.css`, scoped `body.story[data-theme='<key>']` |
| Page + controller island | `src/pages/games/<game>-game.astro` |
| Theme key | append to the `theme` union in `src/layouts/StoryLayout.astro` + its dark-mode block |
| Home card | entry in the `games` array in `src/pages/index.astro` |
| Global nav link | `src/components/GameNav.astro` — **skipped**: its hardcoded list already omits the last five ships (Number Bond Pop, Sound Friends, Sorting Friends, Week Friends, Days Parade), so adding only the new games would deepen the drift. Tracked as a separate cleanup. |
| Dashboard card | entry in `src/data/stats-registry.ts` |
| Test | `tests/<game>.spec.ts` + bump `EXPECTED_GAME_IDS` in `tests/stats.spec.ts` |
| Docs | `PROGRESS.md` changelog entry, `CONTEXT.md` count/list, `ROADMAP.md` mark Done |

Shared behaviour every game must honour:

- **Guided wrong-answer feedback (revised 2026-08-17).** A wrong tap gets a
  250ms kinesthetic shake, a **red error tint**, a short **error tone** via the
  previously-unused `playWrong()` in `@/lib/audio`, and a spoken correction that
  ends by revealing the right answer. Rounds are still never failed and no score
  is shown. This replaces the original "no red / no buzzer" errorless rule at the
  user's request; the 23 pre-existing games still use shake-only feedback, so
  retrofitting them is an open follow-up.
- **SSR round 0** via `generateSession(() => 0.42)[0]!` so the page never paints
  blank; the controller reads round 0 back out of the DOM to avoid a kickoff race.
- **Speech never auto-starts** — first `pointerdown`/`keydown` kicks it off.
- **`recordPlay('<id>')`** with the id matching the stats-registry entry exactly.
- Reuse `@/lib/audio`, `@/lib/speech`, `@/lib/settings`, `@/lib/achievements`,
  `@/lib/preschool-themes`, `@/lib/progress`, `@/lib/retention`.

Game count goes **23 → 29** across the arc (at **26** as of 2026-08-22).

---

## 1. Animal Sounds — "Who says moo?"

**Domain:** science / world knowledge + auditory discrimination.
**Why it's first:** turns five browse-only science decks into an actual game, and
the content already exists.

### Mechanic

Sound-first forced choice, three options. Sibling of Sound Friends (which asks
picture → letter); this asks sound → animal.

1. Prompt speaks and displays the sound: **"Who says *Moo*?"**
2. Three animal tiles (big emoji + name).
3. Tap the animal. Correct → the animal celebrates, speaks its name + fact.
4. Wrong → shake, then a guided teach: *"That's the cat. The cat says meow.
   Listen again — moo!"* then reveal the right tile. Round ends taught, Next enables.

Direction is **sound → animal only**, never animal → sound: the sounds are text
strings and the target user is a pre-reader, so asking them to pick a written
"Moo!" from three written options would test reading, not listening.

### Content — reuse, but curated

`src/data/animals.ts` (37 cards) and `src/data/birds.ts` (15 cards) already carry
a dedicated `sound` field of onomatopoeia, deliberately split from the emoji so
speech synthesis reads it cleanly.

**The problem: the raw `sound` fields are NOT usable as-is.** A forced-choice
game needs each sound to identify exactly one animal, and many don't:

| Collision | Animals sharing it |
|---|---|
| `Growl!` | Bear, Tiger |
| `Grunt!` | Koala, Yak |
| `Snap!` | Alligator, Turtle |
| `Hiss!` | Iguana, Snake |
| `Honk!` | Penguin, Swan, Flamingo |

Cross-file near-duplicates also exist because both decks contain the same animal
with different strings: Duck (`Quack Quack!` / `Quack!`), Chicken (`Cluck Cluck!`
/ `Cluck!`), Owl (`Hoot Hoot!` / `Hoot!`).

A second group is textual description rather than onomatopoeia and would be
meaningless as a prompt: `Sing!`, `Float!`, `Busy!`, `Flutter!`, `Squirt!`,
`Whooosh!`, `Blub Blub!`, `Hum!`, `Chirp!` (on Panda), `Bray!` (on Zebra),
`Boom!` (on Ostrich).

**Design response:** the game does not consume `ALL_CARDS` wholesale. It defines
an explicit curated pool in `src/data/animal-sounds.ts`, importing name/emoji/img
/fact from the existing decks and pinning the canonical sound per animal. This
leaves the shipped Animals and Birds games completely untouched.

Curated pool (16, all iconic and unambiguous for age 3):

Cow *Moo*, Dog *Woof Woof*, Cat *Meow*, Pig *Oink Oink*, Sheep *Baa*,
Horse *Neigh*, Lion *Roar*, Elephant *Trumpet*, Duck *Quack Quack*,
Chicken *Cluck Cluck*, Rooster *Cock-a-doodle-doo*, Owl *Hoot Hoot*,
Wolf *Howl*, Monkey *Ooh Ooh Ah Ah*, Snake *Hiss*, Turkey *Gobble*.

**Gap worth closing:** the two most iconic toddler sounds — **Bee** (*Buzz*) and
**Frog** (*Ribbit*) — are absent from `animals.ts`. Both exist in the Flashcards
decks (Bee in `insects`, Frog in `animals`) but without a `sound` field. See open
question **Q4**.

Distractor rule: never place two animals sharing a canonical sound in the same
round, and prefer distractors from a *different* group (mammal vs bird) at easy
tiers, same group at the hardest tier.

### Session, storage, theme

- 8 rounds, 3 tiers: farm animals → wild animals → same-group confusions.
- No stage system (sibling of Sound Friends, not the math triad).
- Storage `animal_sounds_stats_v1` = `{ sessions, rounds, correctFirstTry, lastPlayed }`.
- Theme key `animalsounds`; accent sky `#0ea5e9`.
- Stats family: see open question **Q1**.

---

## 2. Feeling Friends — emotions

**Domain:** social-emotional. This is the only domain with **zero** coverage today.

### Mechanic

Two round shapes, tiered within one 8-round session:

- **Tiers 1–2 (label → face).** *"Show me happy."* Three faces, tap the match.
  Structurally identical to Letter Friends, so it is low-risk.
- **Tier 3 (situation → feeling).** *"Her ice cream fell on the ground. How does
  she feel?"* Three faces, tap the feeling. This is the real SEL skill —
  inferring emotion from context — and it needs authored vignettes.

After a correct tap the game speaks the emotion's **coping line**, which is
already authored in the deck ("When you feel angry, take a deep breath and count
to five!"). That turns recognition into regulation and is pure reuse.

Wrong taps must never shame. *"That's the sleepy face. Look at this one — the
mouth is smiling. That's happy!"*

### Content

`src/data/flashcards.ts` deck `emotions` holds **15** emotions, each with a
Fluent UI 3D face PNG, an emoji fallback, and a coping fact: Happy, Sad, Angry,
Surprised, Scared, Love, Thinking, Sleepy, Confused, Laughing, Worried,
Disappointed, Caring, Excited, Bored.

Fifteen is too many for a three-year-old and several are too abstract
(Disappointed, Confused, Worried, Bored). Proposed **core 6**: Happy, Sad, Angry,
Scared, Sleepy, Excited — the set every preschool SEL curriculum starts with.
Love and Caring join at tier 3 if we want 8.

To author: **~12 one-line situational vignettes** (2 per core emotion), written
so the emotion is unambiguous and the situation is familiar to a 3-year-old.

### Session, storage, theme

- 8 rounds, 3 tiers as above. No stages.
- Storage `feeling_friends_stats_v1`, standard four-field shape.
- Theme key `feelingfriends`; accent indigo `#6366f1`.
- Stats family: **new `preschool-social`** — see **Q1**.

---

## 3. Opposites Friends

**Domain:** cognitive / vocabulary. Cheap win off existing content.

### Mechanic

*"The elephant is **big**. Which one is **small**?"* Target card on the left,
three option cards. Tap the opposite. Wrong → shake + *"That one is big too.
Small means little — look for the tiny one!"*

### Content — and a content bug to fix first

`flashcards.ts` deck `opposites` has 18 cards intended as 9 pairs: Up/Down,
Big/Small, Hot/Cold, Day/Night, Fast/Slow, **Strong/Light**, Happy/Sad,
Loud/Quiet, New/Old.

**The sixth pair is wrong.** Cards 11 and 12 are `Strong` ("An elephant is
strong") and `Light` ("A feather is light — it floats gently in the air"). Those
are not opposites: *Strong* pairs with *Weak*, and *Light* (weight) pairs with
*Heavy*. As shipped, the Flashcards deck teaches a false pairing. Fixing it means
authoring two new cards (Weak, Heavy) to yield **10 clean pairs**. See **Q3**.

Note the deliberate overlap with Sorting Friends, which already sorts by
big/small. Opposites Friends generalises the same contrast to nine more
dimensions, so they reinforce rather than duplicate.

### Session, storage, theme

- 8 rounds drawn from 10 pairs, both directions (big→small and small→big).
- Storage `opposites_friends_stats_v1`. No stages.
- Theme key `oppositesfriends`; accent `#f59e0b`-adjacent warm tone, final pick at build.
- Stats family: `preschool-cognitive` (no new family).

---

## 4. Rhyme Time

**Domain:** literacy / phonological awareness. Closes the rhyme gap next to
Sound Friends (beginning sounds).

### Mechanic

Audio-first, because rhyme is a sound skill and the child cannot read:

1. Speak and show the target: **"Cat."**
2. Speak the question: **"What rhymes with *cat*?"**
3. Three picture options; speak each aloud as it is shown.
4. Tap. Wrong → *"Sun doesn't rhyme with cat. Listen: cat… hat. They both end
   with 'at'!"* then guided reveal.

Only rhyme **recognition** is targeted (emerges around age 3); production is a
4-year-old skill and is out of scope.

### Content — restructure required

`flashcards.ts` deck `rhyming` has 14 cards, but each encodes the pair as a
single display string in `n` — `"Cat – Hat"` — with one emoji for the pair. A
forced-choice game needs each *word* to be an independently pictured item, so the
data must be restructured into a typed `RHYME_FAMILIES` in `src/data/rhyme-time.ts`
with an emoji per word.

Filtering the 14 to pairs where **both** words are cleanly picturable:

cat–hat, dog–log, bee–tree, mouse–house, star–car, moon–spoon, cake–lake,
king–ring, book–cook, bow–snow → **10 pairs**, enough for an 8-round session.

Dropped as un-picturable: sheep–sleep, song–long, sun–fun, frog–bog.

Distractors are drawn from other rhyme families, and must not accidentally rhyme
with the target.

### Session, storage, theme

- 8 rounds, 3 tiers (distractors get phonetically closer at tier 3).
- Storage `rhyme_time_stats_v1`. No stages.
- Theme key `rhymetime`; accent reuses the literacy pink `#ef476f` family.
- Stats family: `preschool-literacy`.

---

## 5. Where's Teddy? — spatial / positional words

**Domain:** spatial reasoning + positional language. Currently **zero** coverage,
and it is an explicit early-math and language standard.

### Mechanic

Three mini-scenes side by side. Each shows the *same two objects* in a *different*
spatial relation. Prompt: **"Which teddy is UNDER the box?"** Tap the scene.

Showing the same objects in all three scenes is the point: the child cannot win
by recognising objects, only by reading the *relation*.

Wrong → shake + *"That teddy is ON TOP of the box. Under means below. Look
again!"*

### Content — all new, but tiny

Five prepositions: **in, on, under, behind, next to**. Roughly five object pairs:
teddy+box, cat+chair, ball+table, bird+tree, duck+pond. All rendered with emoji
plus CSS transforms — **no new art assets**.

**Known risk:** "behind" is hard to render convincingly with flat emoji; it needs
z-index plus partial occlusion and may read as "next to". Mitigation: tiers 1–2
use only **in / on / under** (visually unambiguous), and **behind / next to**
appear only at tier 3, with scale-down plus overlap to imply depth. If it still
reads badly in review, drop to three prepositions and keep the game.

> **Shipped 2026-08-22 — how the risk actually landed.** All five prepositions
> shipped; the three-preposition fallback was not needed. The risk was
> mispredicted in an instructive way: `behind` does not collide with **next
> to** (they are easy to tell apart — one is beside the landmark, the other is
> cut by it). It collides with **in**, because a teddy inside a box and a teddy
> behind a box are both "an emoji whose bottom is hidden". The fix is cheaper
> than dropping a preposition: those two are simply never offered as options in
> the same round, which costs one distractor and nothing else.
>
> Two other corrections to the plan above. The **tiering** is `in / on / under`
> → `next to` → `behind`, i.e. `next to` moved *earlier* than tier 3 once it
> turned out to be the easiest of the five to draw. And the **pairs** changed:
> a landmark has to be an open container with a visible interior or `in` isn't
> drawable, which cut chair, table and tree — the set is teddy+box, cat+basket,
> ball+bucket, mouse+hat, puppy+bathtub. The duck+pond pair became puppy+bathtub
> because a white duck on a white tub vanished in the `in` scene.
>
> The real difficulty was not conceptual but **metric**: `on` and `behind` are
> positioned as a share of tile height, and the five landmarks top out anywhere
> from 48% (a sun hat is nearly all brim) to 59% (a box, a basket, a tub). A
> single offset left the mouse floating above its hat and left `behind` barely
> occluding it. The offsets are per-pair, measured from the rendered pixels
> rather than guessed, and `tests/wheres-teddy.spec.ts` re-measures them.

### Session, storage, theme

- 8 rounds, 3 tiers as above.
- Storage `wheres_teddy_stats_v1`. No stages.
- Theme key `wheresteddy`.
- Stats family: `preschool-cognitive`.

---

## 6. Memory Match

**Domain:** cognitive / working memory. New mechanic; content already exists.

### The design tension to resolve first

Every other game here is **errorless** — a wrong tap is impossible to "lose" by.
Classic memory is built on the opposite: a non-match *is* a miss, and the whole
game is failing until you remember. This is the one proposal that fights the
project's north-star rule, so the mechanic is deliberately softened:

- **No timer, no move counter, no score shown.**
- A non-match is framed as information, not failure: the two cards stay face-up
  ~1.2s (long enough to encode) with a warm *"Not a pair yet — remember where
  they are!"*, then flip back with no shake and no sound penalty.
- A match pops, confettis, and speaks the item name.
- `correctFirstTry` counts pairs matched without that pair having been flipped
  and missed earlier — so the metric stays meaningful without surfacing failure.
- Board is small enough that success is near-guaranteed: **3 pairs (6 cards)**.

### Content

Any existing deck works. Proposal: a curated 8-item pool of highly recognisable
animals sourced from `animals.ts` emoji, matched on `name`. A deck picker
(animals / shapes / colors) is a follow-up, not v1.

### Progression

Board grows 3 pairs → 4 pairs → 6 pairs. This *looks* like the staged
preschool-math games but does not fit `preschool-stages.ts`, whose `StageMeta`
is `{ rounds, maxN, frameSize, allThemes }` — `maxN` and `frameSize` are
meaningless for a memory board. See **Q5**.

### Storage, theme

- Storage `memory_match_stats_v1`; "rounds" = boards completed, plus pairs found.
- Theme key `memorymatch`.
- Stats family: `preschool-cognitive`.

### What actually shipped (2026-08-23)

> The softened mechanic above shipped as written, and the reasoning got
> sharper in the process: a non-match isn't a *softened* wrong answer, it
> isn't a wrong answer at all, which is now an explicit exception under
> CONTEXT.md §5 rule 8.
>
> Three corrections to the plan. The **pool grew 8 → 13**, because 3 + 4 + 6
> pairs is 13 and that lets a run deal every animal exactly once (see Q5).
> **`rounds` counts pairs found**, not boards completed — boards are derivable
> (three per run) and pairs are what makes `correctFirstTry / rounds` mean
> something. And `correctFirstTry` shipped as *"matched without either card
> having been turned over and missed earlier"*, i.e. found by remembering
> rather than by elimination.
>
> The real difficulty was not the mechanic but **fitting the board on a
> screen**. Sized by width alone, the twelve-card board pushed its bottom row
> under the fold on a phone, and a child memorising positions cannot scroll to
> see the rest of it — so that is a broken mechanic, not a layout blemish.
> Cards are now sized by whichever axis runs out first, and the spec asserts
> at three viewports that nothing falls below the fold.
>
> Two smaller ones, both found by looking at a screenshot rather than by a
> test: the animal emoji rendered at a quarter of the card (`.mm-card` is a
> `<button>`, buttons don't inherit font-size, so `em` resolved against the
> UA's ~13px default), and the spoken lines said "A elephant", "fishs" and
> "butterflys" — plural and article are now per-animal literals in the data.

---

## 7. Proposed build sequence

Ordered by ascending risk, so early wins de-risk the later ones.

| # | Game | Content cost | Main risk | Status |
|---|---|---|---|---|
| 1 | **Animal Sounds** | Curate 16 from existing | None — pure reuse | Shipped 2026-08-17. The "pure reuse" call was wrong: the raw `sound` fields collide, and spoken onomatopoeia isn't a listening game, so it needed a curated pool *and* 17 vendored recordings. |
| 2 | **Feeling Friends** | ~12 vignettes | New stats family plumbing | Shipped 2026-08-17. Family plumbing was the easy half; the real cost was the face assets. |
| 3 | **Opposites Friends** | 2 cards (bug fix) | Touches shipped Flashcards content | Shipped 2026-08-22. The Flashcards risk never materialised — it reads the deck rather than editing it, and pins the two unusable emoji locally instead. |
| 4 | **Rhyme Time** | Restructure 10 pairs | Distractors must not accidentally rhyme | Shipped 2026-08-22. The named risk was cheap to retire — unique rimes per family plus a load-time assertion make a rhyming distractor unrepresentable. The unforeseen one was **pronunciation**: a bare rime, and the homograph `bow`, both mislead by ear, which cost one pair. |
| 5 | **Where's Teddy?** | 5 prepositions × 5 pairs | "Behind" may not read visually | **Shipped 2026-08-22.** The risk was real but the fallback wasn't needed — see §5. |
| 6 | **Memory Match** | Curate 8 | Errorless tension; new mechanic | **Shipped 2026-08-23.** Both named risks were real and both were cheap. The errorless tension resolved by noticing a non-match isn't a wrong answer at all, so rule 8 simply doesn't apply. The pool grew 8 → 13 so a run could deal it exactly once. The unforeseen risk was **layout**: a twelve-card board sized by width alone puts its bottom row under the fold, and a child memorising positions can't scroll. |

Each game ships as its own commit with its own Playwright spec, keeping the suite
green (baseline was 148 tests in 17 files on 2026-08-17; 170 in 19 after the
first two games; 181 in 20 after Opposites Friends; **193 in 21** after Rhyme
Time — 12 added, plus a stale card-count assertion removed from the Letter
Friends suite).

---

## 8. Open questions blocking the build

> **Q1–Q5 are answered** (see the status block at the top, and the answer
> inline under Q5); they are kept here for the reasoning, not as open work.
> **Only Q6 is still open**, and it got narrower: indigo `#6366f1` is now taken
> by `preschool-social`, so a future family has to be distinct from *seven*
> dots, and cyan `#06b6d4` sits close to the teal `#14b8a6` already used by
> `preschool-cognitive`. Nothing currently planned is blocked on it.

**Q1 — Stats families.** Feeling Friends clearly needs a new `preschool-social`
family. Animal Sounds is science/listening, which fits no existing family well.
Adding a family means touching the `StatsFamily` union, `FAMILY_LABELS`,
`FAMILY_COLORS`, `FAMILY_SIZES`, and the family-count assertion in
`tests/stats.spec.ts`. Options: (a) add both `preschool-social` and
`preschool-science` → 8 families; (b) add only `preschool-social` and file Animal
Sounds under `preschool-cognitive` → 7 families.

**Q2 — Feeling Friends scope.** Ship label→face recognition only (simpler, safer),
or include the tier-3 situation vignettes (real SEL value, more authoring)?

**Q3 — The `opposites` Strong/Light bug.** Fix it by authoring Weak + Heavy,
which edits content the shipped Flashcards game renders? Or leave Flashcards
alone and define correct pairs privately inside `opposites-friends.ts`?

**Q4 — Bee and Frog.** Add `sound` data for them so Animal Sounds can use the two
most iconic toddler sounds? That means either extending `animals.ts` (touching the
shipped Animals game's deck) or defining them locally in `animal-sounds.ts`.

**Q5 — Memory Match progression.** Bespoke board-size progression, or bend
`preschool-stages.ts` to cover it?

> **Answered 2026-08-23: neither.** The growth is the shape of **one run** —
> a sitting plays all three boards back to back, 3 → 4 → 6 pairs, and nothing
> about difficulty is persisted.
>
> It fell out of §5 rule 11 once someone noticed that **3 + 4 + 6 = 13**, so a
> run can deal every animal in the pool exactly once and finish. That also
> removes what made the question hard: `StageMeta` is
> `{ rounds, maxN, frameSize, allThemes }`, of which `maxN` and `frameSize`
> are meaningless for a memory board, and widening a three-consumer shared
> module to carry two dead fields for a fourth consumer makes it worse for
> the three using it properly.
>
> Growing inside a sitting is also better pedagogy than growing across them.
> A stage the child has to re-earn depends on what happened last time, which
> a 3-year-old doesn't remember and a parent can't see; three boards in a row
> ramp while she is already warmed up, and every play ends on the hardest
> board she can do.
>
> Generalised into CONTEXT.md §5 rule 11: **before adding stage state, check
> whether the ramp fits inside a run.**

**Q6 — Palette.** Six families already claim green, pink, teal, blue, amber,
purple. New families need visibly distinct dots on the `/stats` activity chart;
indigo `#6366f1` (social) and cyan `#06b6d4` (science) are proposed but the
palette is getting crowded.
