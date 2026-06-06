# Roadmap

Candidate games and enhancements for the actual end user — a 3-year-old —
grounded in recognized early-learning domains (Illinois / Ohio / South
Carolina Early Learning Standards + NAEYC). This is the forward-looking
"what next?" list; **shipped** work lives in [PROGRESS.md](PROGRESS.md)
and the bootstrap context in [CONTEXT.md](CONTEXT.md).

> Append-only intent: when a candidate ships, mark it Done with the ship
> date and a link to its PROGRESS.md changelog entry rather than deleting
> it, so the "why did we pick this next?" trail survives.

## Domain coverage snapshot (as of 2026-06-06)

| Domain | Coverage | Games |
|---|---|---|
| Mathematics | Strong (5) | Counting Friends, More Friends, Number Friends, Pattern Sequences, Number Bond Pop |
| Literacy — letter recognition | Partial (1) | Letter Friends (uppercase recognition only) |
| Literacy — phonological awareness (sounds, rhyme) | Partial (1) | Sound Friends (beginning sounds; rhyme still open) |
| Cognitive — sorting / categorization | None | — (core age-3 pre-math skill) |
| Social-emotional (emotions / empathy) | None | — |
| Science / world knowledge | Card decks only | Animals, Birds, Dinosaurs, Solar System, Weather (browse, not interactive game) |

## Candidate games (ranked by payoff for the 3yo)

All reuse the existing `StoryLayout` + errorless-feedback + audio-narration
pattern unless noted, and should follow the project's research-first build
ethos (survey the golden standards before designing).

| # | Game | Domain | Core skill / mechanic | Status |
|---|---|---|---|---|
| A | **Sound Friends** | Literacy (phonics) | Beginning sounds — "Apple starts with /a/", tap the letter. Builds on Letter Friends + alphabet mnemonics; SATPIN-tiered. | **Done 2026-06-06** ([PROGRESS.md](PROGRESS.md)) |
| B | **Sorting Friends** | Cognitive | Single-attribute categorization — "which ones live in the sea?" Tap all items in a category (habitats, fruit vs veg, big vs small). Most knowledge-rich; fills the biggest gap. | **Queued (next)** |
| C | **Animal Sounds** | Science / listening | "Who says moo?" Tap the animal that makes the sound. Reuses animal data; joyful + world knowledge. | Queued |
| D | **Rhyme Time** | Literacy (phonological awareness) | "What rhymes with cat? hat / dog / sun." Audio-first; recognition emerges at 3, production ~4. | Queued |
| E | **Feeling Friends** | Social-emotional | "Show me happy" — tap the face / read a feeling. Opens the SEL domain (currently empty). | Queued |
| F | **Memory Match** | Cognitive (working memory) | Flip cards to find matching pairs. New mechanic; reuses any card deck (animals / shapes / colors). | Queued |

## Parked / enhancements

- **T9 — recorded MP3 narration** for the preschool-math games: replace
  Web Speech with a warm human voice. Tier A scope locked (13 phrases).
  Blocked on the user's recording session; ~30-45 min agent integration
  once the MP3s land in `src/assets/narration/shared/`.
- **Letter Friends v2** — lowercase letters + letter sounds. Deepen
  literacy after v1 retention is validated on `/stats` (overlaps with
  Sound Friends — sequence them so they reinforce rather than duplicate).
- **Accessibility pass** — broaden the audience (keyboard, ARIA, contrast).
