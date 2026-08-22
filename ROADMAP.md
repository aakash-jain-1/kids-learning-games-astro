# Roadmap

Candidate games and enhancements for the actual end user — a 3-year-old —
grounded in recognized early-learning domains (Illinois / Ohio / South
Carolina Early Learning Standards + NAEYC). This is the forward-looking
"what next?" list; **shipped** work lives in [PROGRESS.md](PROGRESS.md)
and the bootstrap context in [CONTEXT.md](CONTEXT.md).

> Append-only intent: when a candidate ships, mark it Done with the ship
> date and a link to its PROGRESS.md changelog entry rather than deleting
> it, so the "why did we pick this next?" trail survives.

## Domain coverage snapshot (as of 2026-08-22)

| Domain | Coverage | Games |
|---|---|---|
| Mathematics | Strong (5) | Counting Friends, More Friends, Number Friends, Pattern Sequences, Number Bond Pop |
| Literacy — letter recognition | Partial (1) | Letter Friends (uppercase recognition only) |
| Literacy — phonological awareness (sounds, rhyme) | Good (2) | Sound Friends (beginning sounds), Rhyme Time (rhyme recognition — the end-of-word partner) |
| Cognitive — sorting / categorization | Partial (1) | Sorting Friends (single-attribute sort: habitat / kind / size) |
| Cognitive — contrast / vocabulary | Partial (1) | Opposites Friends (10 opposite pairs, asked both directions) |
| Cognitive — temporal sequencing (days / time) | Partial (2) | Days Parade (learn/meet all 7 days), Week Friends (days of the week — "what comes next?") |
| Social-emotional (emotions / empathy) | Partial (1) | Feeling Friends (name the feeling on a face; infer it from a situation) |
| Listening / auditory discrimination | Partial (1) | Animal Sounds (match a call to the animal that makes it) |
| Science / world knowledge | Card decks + 1 game | Animals, Birds, Dinosaurs, Solar System, Weather (browse, not interactive game); Animal Sounds |

## Candidate games (ranked by payoff for the 3yo)

All reuse the existing `StoryLayout` + guided-wrong-answer-feedback +
audio-narration pattern unless noted, and should follow the project's
research-first build ethos (survey the golden standards before designing).
Note the feedback rule changed on 2026-08-17 (red tint + error tone on a wrong
tap — see CONTEXT.md §5 rule 8); every game from C onward adopts it. The rank
letters below are the original payoff ranking; the **build order** is the
ascending-risk sequence in
[docs/GAME-DESIGNS-2026-08.md](docs/GAME-DESIGNS-2026-08.md) §7, which is why
Opposites Friends (I) went before Rhyme Time (D). **Where's Teddy? is next.**

| # | Game | Domain | Core skill / mechanic | Status |
|---|---|---|---|---|
| A | **Sound Friends** | Literacy (phonics) | Beginning sounds — "Apple starts with /a/", tap the letter. Builds on Letter Friends + alphabet mnemonics; SATPIN-tiered. | **Done 2026-06-06** ([PROGRESS.md](PROGRESS.md)) |
| B | **Sorting Friends** | Cognitive | Single-attribute categorization — "which ones live in the sea?" Tap all items in a category (habitat / kind / size). Most knowledge-rich; filled the biggest gap. | **Done 2026-06-06** ([PROGRESS.md](PROGRESS.md)) |
| C | **Animal Sounds** | Science / listening | "Who says moo?" Tap the animal that makes the sound. Reuses animal data; joyful + world knowledge. | **Done 2026-08-17** ([PROGRESS.md](PROGRESS.md)) |
| D | **Rhyme Time** | Literacy (phonological awareness) | "What rhymes with cat? hat / dog / star." Audio-first; recognition emerges at 3, production ~4. Shipped with the rime shown but never spoken (TTS can't be trusted with a bare rime), and a tier-3 distractor that shares the target's *first* sound so the round can only be won by listening to the end. | **Done 2026-08-22** ([PROGRESS.md](PROGRESS.md)) |
| E | **Feeling Friends** | Social-emotional | "Show me happy" — tap the face / read a feeling. Opened the SEL domain, and the `preschool-social` stats family with it. Built to the agreed scope: tiers 1–2 face recognition + tier 3 situational vignettes. | **Done 2026-08-17** ([PROGRESS.md](PROGRESS.md)) |
| J | **Where's Teddy?** | Language (spatial / positional words) | "Where is teddy? in / on / under / behind." Tap the picture where teddy is. Came from the 2026-08 design set rather than the original payoff ranking, which is why it has no earlier letter. | **Queued (next)** — designed, see [docs/GAME-DESIGNS-2026-08.md](docs/GAME-DESIGNS-2026-08.md) §5 |
| F | **Memory Match** | Cognitive (working memory) | Flip cards to find matching pairs. New mechanic; reuses any card deck (animals / shapes / colors). | Queued — designed, **blocked on Q5** (board progression) |
| I | **Opposites Friends** | Cognitive (contrast / vocabulary) | "Big — which one is small?" Tap the opposite. Generalises the More Friends contrast to 10 pairs, asked in both directions. Shipped with declared meaning-collision groups (`big/heavy/strong`, `small/light/weak`) so no wrong tap is ever defensible. | **Done 2026-08-22** ([PROGRESS.md](PROGRESS.md)) |
| G | **Week Friends** (Days of the Week) | Cognitive (temporal sequencing) | "What day comes next?" Run of days + "?" slot, tap the next day. Sunday-first like the song; errorless "let's sing the days" reveal. User-requested. | **Done 2026-06-17** ([PROGRESS.md](PROGRESS.md)) |
| H | **Days Parade** (Learn the Days) | Cognitive (temporal — foundation) | Meet/learn all 7 days first: tap each to hear it, "Sing the days" walk in order, "Today is…" badge, collect-them-all. The prequel to Week Friends (learn → then sequence). User-requested. | **Done 2026-06-17** ([PROGRESS.md](PROGRESS.md)) |

## Parked / enhancements

- **T9 — recorded MP3 narration** for the preschool-math games: replace
  Web Speech with a warm human voice. Tier A scope locked (13 phrases).
  Blocked on the user's recording session; ~30-45 min agent integration
  once the MP3s land in `src/assets/narration/shared/`.
- **Letter Friends v2** — lowercase letters + letter sounds. Deepen
  literacy after v1 retention is validated on `/stats` (overlaps with
  Sound Friends — sequence them so they reinforce rather than duplicate).
- **Accessibility pass** — broaden the audience (keyboard, ARIA, contrast).
