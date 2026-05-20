# T9 Phrase Script — what to read aloud during recording

> **What this is**: the literal phrases to record for T9 (pre-recorded
> MP3 narration replacing Web Speech) in the preschool-math triad.
>
> **How it's organised**: two tiers. **Tier A is the MVP recording
> session** (~13 phrases, ~5 min of actual speaking, ~30 min including
> retakes). **Tier B is the optional follow-up** if the 3yo lands well
> on Tier A and you want fuller coverage. **Don't try to do all of
> Tier B in one session** — it's combinatorial and will burn you out.
> Tier A first; Tier B (or skip Tier B entirely) later.
>
> **For the recording walkthrough** (room setup, mic positioning,
> Audacity post-processing, etc.) see `docs/T9-RECORDING-GUIDE.md`.

## Tier A — MVP recording session (~13 phrases, do this first)

These phrases get spoken **hundreds of times in a few play sessions**.
Highest impact per minute of recording. The integration plan
(`src/lib/speech.ts → narrate()`) will look up each `narrate(text)`
call by exact string match and play the MP3 if found, falling back
to Web Speech for everything else. So Tier A immediately makes the
3yo hear *your* voice for every count and every "Let's count them
together" — the most-spoken phrases in the entire app — without
needing concatenation logic.

| Key (filename) | Read this exactly | Where it plays in the games |
|---|---|---|
| `shared-count-1.mp3` | **one** | Counting Friends + More Friends + Number Friends — guided count cadence (every wrong-tap rerun, every "tap to count" interaction) |
| `shared-count-2.mp3` | **two** | All three games — count cadence |
| `shared-count-3.mp3` | **three** | All three games — count cadence |
| `shared-count-4.mp3` | **four** | All three games — count cadence |
| `shared-count-5.mp3` | **five** | All three games — count cadence |
| `shared-count-6.mp3` | **six** | Number Friends — sizes can go up to 6 |
| `shared-count-7.mp3` | **seven** | Number Friends — rare; sizes can go up to 7 in edge cases |
| `shared-count-8.mp3` | **eight** | Future-proof; not currently played but trivial to record while you're in the booth |
| `shared-count-9.mp3` | **nine** | Future-proof |
| `shared-count-10.mp3` | **ten** | Future-proof |
| `shared-lets-count.mp3` | **Let's count them together!** | Counting Friends + More Friends — every wrong-tap rerun |
| `shared-hmm-lets-count.mp3` | **Hmm! Let's count them together.** | Number Friends — every wrong-tap rerun (the "Hmm!" softens the cue for the numeral-recognition mechanic) |
| `shared-look.mp3` | **Look!** | All three games — universal round-intro opener |

**That's 13 phrases.** Total speaking time: ~5 minutes. Plan ~30 min
in the booth allowing for 2–3 takes per phrase + the head/tail
silence padding.

### How to read each one (delivery notes — read these once before recording)

- **Numbers 1–10** — speak each one **separately, with a clear
  short fall in pitch at the end** (the "kindergarten-teacher count"
  cadence: "*one* … *two* … *three*"). Don't run them together. Don't
  rush. Each number should land like a small celebration.
- **"Let's count them together!"** — bright, inviting, a touch of
  excitement. Picture saying this to your 3yo when they tap the
  wrong answer and you want to make them feel safe trying again.
  **Not** corrective, **not** flat. About the same pace you'd say
  "Let's go for a walk!"
- **"Hmm! Let's count them together."** — the "Hmm!" is a gentle,
  curious sound — not a disappointed one. Like you noticed
  something interesting. Pause briefly, then "Let's count them
  together." This phrase plays specifically on Number Friends's
  wrong-tap path.
- **"Look!"** — bright, attention-grabbing, slightly higher pitch
  than your normal voice. This is the "I want you to see this"
  cue.

---

## Tier B — Optional follow-up session (~30+ phrases, do this LATER if Tier A lands well)

Don't do these in the same session as Tier A. Wait until you've
shipped Tier A, observed the 3yo's reaction over a few play
sessions, and decided you want fuller voice coverage. Tier B
fills in the celebration phrases, theme intros, and session-
complete narrations.

### B.1 — Universal celebration / wrap-up phrases

| Key | Read this | Played |
|---|---|---|
| `shared-yes.mp3` | **Yes!** | All correct-tap celebrations |
| `shared-yes-thats-right.mp3` | **Yes! That's right!** | (alternative correct-tap cue, optional) |
| `shared-wow.mp3` | **Wow!** | Session-complete celebrations |
| `shared-great-job.mp3` | **Great job!** | Session-complete celebrations |

### B.2 — Theme-specific intros (one per theme — keep them short)

These run on every round-intro narration ("Look! Two ducks are
swimming." etc.). For Tier B, just record a SHORT generic intro
per theme — don't try to cover all (a, b) variations.

| Key | Read this | Played |
|---|---|---|
| `theme-pond-intro.mp3` | **Look at the ducks!** | Counting Friends / More Friends / Number Friends — pond theme |
| `theme-orchard-intro.mp3` | **Look at the apples!** | Orchard theme |
| `theme-sea-intro.mp3` | **Look at the fish!** | Sea theme |
| `theme-garden-intro.mp3` | **Look at the bees!** | Garden theme |

### B.3 — Number Friends "Find {N}" prompts

The full inventory is 4 targets × 4 themes = 16 prompts. Recommend
recording the 4 most-common (target=3 for each theme) first.

| Key | Read this | Played |
|---|---|---|
| `nf-find-3-pond.mp3` | **Find three ducks!** | NF, target=3, pond theme |
| `nf-find-3-orchard.mp3` | **Find three apples!** | NF, target=3, orchard |
| `nf-find-3-sea.mp3` | **Find three fish!** | NF, target=3, sea |
| `nf-find-3-garden.mp3` | **Find three bees!** | NF, target=3, garden |

(Defer target=2/4/5 variants until B.3 itself feels worth completing.)

### B.4 — Session-complete celebrations (one per game)

| Key | Read this | Played |
|---|---|---|
| `cf-session-complete.mp3` | **Wow! You counted with eight groups of friends today! Great job!** | Counting Friends — when 8 rounds finish |
| `mf-session-complete.mp3` | **Wow! You compared eight groups of friends today! Great job!** | More Friends |
| `nf-session-complete.mp3` | **Wow! You found eight number friends today! Great job!** | Number Friends |

### B.5 — Common (a, b, sum) celebrations for Counting Friends

The full inventory is 4 themes × 10 (a, b) combos = 40 phrases.
**Skip this entire subsection unless you really want full
voice coverage.** Web Speech for these is honestly fine; the
celebration phrase plays once per round and the kid is already
looking at the green pulse on the correct option.

If you do want to record these, prioritise the most-played sums:

- Sum=3 cases: (1,2), (2,1) — "Yes! Three apples! One and two
  make three." × 4 themes = 8 phrases
- Sum=4 cases: (1,3), (3,1), (2,2) — × 4 themes = 12 phrases
- Sum=5 cases: (1,4), (4,1), (2,3), (3,2) — × 4 themes = 16 phrases

Total Tier B.5: 36 phrases. Honestly: skip. Web Speech is
adequate for the celebration phrase that plays once per round.

---

## Total scope summary

| Scope | Phrases | Recording time | Coverage |
|---|---|---|---|
| **Tier A (recommended for v1)** | **13** | **~30 min including takes** | Count cadence + 2 most-spoken constant phrases — covers ~80% of perceived parent-voice exposure in a typical play session |
| Tier A + B.1 + B.2 + B.4 | 24 | ~60 min | Adds celebration cues + theme intros + session-complete; covers ~90% of perceived exposure |
| Tier A + all of B (except B.5) | 28 | ~75 min | Adds Number Friends "Find {N}" prompts; covers ~95% of perceived exposure |
| Tier A + all of B including B.5 | 64 | ~3 hr | Full voice coverage; Web Speech only fires for unusual phrase variants the registry doesn't have |

**Strong recommendation: do Tier A only for v1.** Ship it. See how
your 3yo reacts. Decide whether B is worth a follow-up session
based on that reaction — not on completionist instinct.

## After recording — file naming + drop location

When you've trimmed and exported your MP3s, name them exactly as the
"Key (filename)" column above (e.g. `shared-count-1.mp3`,
`shared-lets-count.mp3`) and drop them into:

```
src/assets/narration/
├── shared/
│   ├── shared-count-1.mp3
│   ├── shared-count-2.mp3
│   ├── ... (count-3 through count-10)
│   ├── shared-lets-count.mp3
│   ├── shared-hmm-lets-count.mp3
│   └── shared-look.mp3
├── cf/        (created during Tier B if you do session-complete)
├── mf/
└── nf/
```

The integration commit (which I'll write when you ping me with
"recordings are ready") will scan this folder, build the registry
import statements automatically, and wire up `narrate()`.
