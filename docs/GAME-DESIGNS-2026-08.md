# Game designs — August 2026 arc (six games: 2 shipped, 4 queued)

> **Status: APPROVED. Build in progress — 2 of 6 shipped.** Keep the count in
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
> - §3 **Opposites Friends** — the `flashcards.ts` Strong/Light pair bug it
>   depends on (**Q3**) is **fixed**: Weak + Heavy authored, 10 clean pairs.
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

Game count goes **23 → 29**.

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

---

## 7. Proposed build sequence

Ordered by ascending risk, so early wins de-risk the later ones.

| # | Game | Content cost | Main risk | Status |
|---|---|---|---|---|
| 1 | **Animal Sounds** | Curate 16 from existing | None — pure reuse | Shipped 2026-08-17. The "pure reuse" call was wrong: the raw `sound` fields collide, and spoken onomatopoeia isn't a listening game, so it needed a curated pool *and* 17 vendored recordings. |
| 2 | **Feeling Friends** | ~12 vignettes | New stats family plumbing | Shipped 2026-08-17. Family plumbing was the easy half; the real cost was the face assets. |
| 3 | **Opposites Friends** | 2 cards (bug fix) | Touches shipped Flashcards content | Next. The content bug is already fixed. |
| 4 | **Rhyme Time** | Restructure 10 pairs | Distractors must not accidentally rhyme | |
| 5 | **Where's Teddy?** | 5 prepositions × 5 pairs | "Behind" may not read visually | |
| 6 | **Memory Match** | Curate 8 | Errorless tension; new mechanic | |

Each game ships as its own commit with its own Playwright spec, keeping the suite
green (baseline was 148 tests in 17 files on 2026-08-17; **170 in 19** after the
first two games).

---

## 8. Open questions blocking the build

> **Q1–Q4 are answered** (see the status block at the top); they are kept here
> for the reasoning, not as open work. **Q5 and Q6 are still open**, and Q6 got
> narrower: indigo `#6366f1` is now taken by `preschool-social`, so a future
> family has to be distinct from *seven* dots, and cyan `#06b6d4` sits close to
> the teal `#14b8a6` already used by `preschool-cognitive`.

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

**Q6 — Palette.** Six families already claim green, pink, teal, blue, amber,
purple. New families need visibly distinct dots on the `/stats` activity chart;
indigo `#6366f1` (social) and cyan `#06b6d4` (science) are proposed but the
palette is getting crowded.
