# T9 Recording Guide — step-by-step walkthrough

> **What this is**: end-to-end recording walkthrough for T9 (replacing
> Web Speech with pre-recorded MP3 narration in your own voice for the
> preschool-math triad).
>
> **Companion doc**: `docs/T9-PHRASE-SCRIPT.md` has the literal phrases
> to read aloud (~13 for Tier A MVP).
>
> **Estimated total time**: ~75 min for Tier A end-to-end (15 min
> setup + 30 min recording + 30 min post-processing). Integration into
> the codebase happens after — ping the next agent session with
> "recordings are ready" and they'll wire it in (~30–45 min of
> agent work).
>
> **Read this whole guide once before starting** — there are a few
> "set this up before you press record" gotchas that are easier to
> handle up-front than mid-session.

---

## Phase 0 — Decide your scope (1 min)

Open `docs/T9-PHRASE-SCRIPT.md`. **Plan to do Tier A only for your
first session.** It's 13 phrases and covers ~80% of the parent-voice
exposure your 3yo will perceive. Tier B can wait until you've seen
Tier A land.

Don't try to be a completionist. The perfect is the enemy of the
shipped.

---

## Phase 1 — Setup (~15 min)

### 1.1 — Pick a quiet room

In rough order of acoustic-friendliness:

1. **Bedroom with closed curtains and a bed** ✅ — soft furnishings
   absorb reflections. The bed is a giant absorber. Best DIY studio
   in any house.
2. **Walk-in closet with clothes hanging** ✅ — even better than a
   bedroom if you have one. Very dead acoustically.
3. **Living room with a sofa + rug** ⚠️ — adequate if the room is
   small and the curtains are heavy.
4. **Kitchen** ❌ — hard surfaces (tile, countertops, fridge) cause
   reflections.
5. **Bathroom** ❌ — same problem; tile reverb is brutal for voice.
6. **Open-plan main room** ❌ — too much reflection from walls.

If your only quiet space is suboptimal acoustically, hang a thick
blanket on the wall behind your recording position. Improvised but
effective.

### 1.2 — Pick your mic

In rough order of quality (any of these will work for Tier A):

| Option | Cost | Quality | Notes |
|---|---|---|---|
| **iPhone Voice Memos app** | Free (already on phone) | ⭐⭐⭐⭐ | Surprisingly good; records at 44.1 kHz mono M4A. Recent iPhones (XS or newer) are broadcast-adequate. **Recommended for v1** unless you happen to own a USB mic. |
| **Pixel / recent Android voice recorder** | Free | ⭐⭐⭐ | Quality varies more by device than iPhone. Hi-Q Recorder app on Android is more reliable than the stock app. |
| **MacBook built-in mic** | Free | ⭐⭐ | Picks up keyboard + fan noise. Works in a pinch. |
| **USB condenser mic** (Blue Yeti, Audio-Technica AT2020) | $80–150 | ⭐⭐⭐⭐⭐ | Tier above. Worth it if you'll record more than once or have one already. |
| **Lapel/lavalier mic** (Rode SmartLav+, plugs into phone) | $50 | ⭐⭐⭐⭐ | Great for hands-free, comparable to phone mic. |

**Recommendation for v1: iPhone Voice Memos.** Skip the gear research.

### 1.3 — Mic positioning (matters more than the mic itself)

- **Hold or position the phone ~6 inches (15 cm) from your mouth.**
  Closer = booming bass + plosives ("p", "b" pop). Farther = thin,
  echoey, room-noise-prone.
- **Off-axis** — angle the phone slightly to one side, not pointing
  directly into your mouth. This dodges plosives without losing
  level.
- **Above or below mouth height, not directly in front** — same
  reason. Aim the mic at your jaw or upper lip, not your front
  teeth.
- **Use a phone stand** if you have one (or a small box on the
  bed). Holding the phone introduces hand-handling noise.

### 1.4 — Test your setup

- Open Voice Memos (or your chosen recorder).
- Record yourself saying "one, two, three, four, five" at the
  position you plan to use.
- Play it back **on the device the 3yo actually uses** (iPad,
  parent's phone, etc., not the recording device — different
  speakers reveal different problems).
- If you hear: ✅ clear voice, no obvious hum/hiss, no echo, no
  distortion → proceed to Phase 2.
- If you hear: ❌ bass-heavy "boom" → move the phone slightly
  farther; ❌ plosive pops → angle more off-axis; ❌ echo / room
  ambience → move to a deader room or hang a blanket; ❌ background
  hum (fridge, AC, fan) → kill the source if possible, or wait for
  a quieter time of day.

### 1.5 — Open the phrase script on a second device

You'll be reading from `docs/T9-PHRASE-SCRIPT.md`. Open it on:

- Your laptop (browser tab pointing at GitHub or local preview).
- Or a second phone / tablet.
- **Don't** open it on the same phone you're recording with —
  you'll need to unlock it, which kills the recording.

If you're reading on your laptop, **mute the laptop mic and put
it 3+ feet away from your recording phone** so it doesn't pick up
keyboard or scroll-wheel noise.

---

## Phase 2 — Recording (~30 min for Tier A)

### 2.1 — One continuous take strategy (recommended)

Don't stop-start the recorder for each phrase. Press record once,
read through the whole phrase script with brief pauses between
phrases, stop record at the end. This:

- Captures your voice in **one consistent state** (mood, pitch,
  warmth all stay the same — voice tone drifts day-to-day and even
  hour-to-hour, so single-session is best).
- Avoids fiddling with the recorder mid-session (which kills momentum).
- Splitting in post-processing is easy with Audacity's silence
  detection.

### 2.2 — Multi-take strategy per phrase

For each phrase, **read it 2–3 times in a row** with a small pause
between takes. Use this rhythm:

```
[2-second pause]
"one"
[1-second pause]
"one"
[1-second pause]
"one"
[3-second pause — moves on to next phrase]
"two"
[1-second pause]
"two"
...
```

This way you can pick the best take in post. The 3-second pause
between phrases helps Audacity's auto-split detect phrase
boundaries.

### 2.3 — Reading delivery (the most important page of this guide)

You're recording for **your specific 3yo**. Channel "I'm reading
to my kid right now," not "I'm a professional voice actor."

- **Pace**: ~30% slower than your normal conversational speed.
  ~110–130 words per minute (kids' apps standard) vs adult-targeted
  ~150–170. Don't rush.
- **Pitch**: ~10–20% higher than your normal voice. Kids tune in to
  higher voices. Doesn't have to be cartoonish — just lift your
  natural register slightly. (If you're already a high-voiced
  speaker naturally, you don't need to lift much.)
- **Warmth**: smile while you speak. It changes the acoustics
  audibly. Kids' apps research consistently shows smile-while-
  speaking voices outperform neutral ones for engagement.
- **Energy**: each phrase should land as if it matters. "One" isn't
  a label — it's a small celebration. "Yes!" isn't acknowledgment —
  it's joy. Push your range further than feels normal; what feels
  like over-the-top to you sounds like baseline-warm to a 3yo.
- **Emotion mapping**:
  - Numbers (`one` through `ten`) → bright, slightly punchy,
    each one a tiny micro-celebration. Avoid sing-song "one … two …
    three"; each number should feel like its own word.
  - "Let's count them together!" → inviting, enthusiastic, no
    hint of correction. Picture saying it to your kid mid-tantrum
    when you want to make them feel safe.
  - "Hmm! Let's count them together." → curious "hmm" (like
    you noticed something interesting, NOT disappointed), pause,
    then warm invitation.
  - "Look!" → bright, attention-grabbing, slightly higher pitch.
- **Don't be self-conscious**. The first 2–3 phrases will feel
  weird to record. You'll find your rhythm by phrase 5–6. **Keep
  going** through the awkwardness; you can re-record specific
  phrases at the end if any feel really off.

### 2.4 — When to redo a take immediately vs. later

- ✅ **Redo immediately**: stumbled over the word, coughed,
  someone walked in, phone buzzed audibly.
- ❌ **Don't redo immediately for**: "I felt awkward". You'll feel
  awkward for the first few takes regardless. Listen back at the
  end of the session and decide what really needs redoing — most
  things you thought were "off" sound fine on playback.

### 2.5 — End-of-session listen-back

Before you stop the recorder, **scrub through the whole recording
once at 2× speed** (Voice Memos lets you do this). Mark any phrases
where you really need a re-take. Re-record only those, then stop.

### 2.6 — Transfer to your laptop

- iPhone → Mac: open the file in Voice Memos, tap "..." → Share →
  AirDrop → your Mac. File lands in `~/Downloads/Recording.m4a` or
  similar. (Or use iCloud, or email it to yourself.)
- Android → Mac: cable transfer, or Google Drive, or email.

---

## Phase 3 — Post-processing (~30 min for Tier A)

### 3.1 — Install Audacity (free, ~5 min)

```bash
# macOS via Homebrew (recommended):
brew install --cask audacity

# Or download from https://www.audacityteam.org/ and drag to /Applications.
```

Open Audacity once and accept the privacy prompts. Quit and reopen
to ensure mic permissions are settled (Audacity won't actually
record from the mic for our workflow, but the prompts are sticky).

### 3.2 — Import your recording

- Audacity → File → Import → Audio → select your `.m4a` file.
- It loads as a single waveform track. You'll see the silences
  between phrases as flat sections.

### 3.3 — Split into individual phrases

Two approaches:

**Approach A: Manual split (recommended for 13 phrases — faster
than automation for this scale)**

1. Click somewhere in the silence between phrase 1 and phrase 2.
2. Edit → Labels → Add Label at Selection (or `⌘+B`). A label
   marker appears.
3. Type the filename for the phrase that just ended (e.g.
   `shared-count-1`). Press Enter.
4. Repeat at every silence boundary, naming each segment for the
   phrase that came BEFORE the silence.
5. When all 13 segments are labeled: File → Export → Export
   Multiple → format MP3, channel Mono, bit rate 64 kbps, **uncheck**
   "Include audio before first label" (or check it if your first
   phrase had no preceding silence). Click Export.
6. Audacity creates 13 files named `shared-count-1.mp3`,
   `shared-count-2.mp3`, etc. in the export folder.

**Approach B: Auto-detect silences (better for Tier B's larger
inventory, optional for Tier A)**

1. Edit → Select → All (`⌘+A`).
2. Analyze → Sound Finder. Set: Treat audio below this level as
   silence: −36 dB. Min duration of silence: 0.8 sec. Click OK.
3. Audacity adds labels at every detected boundary. Rename each
   label to the phrase filename.
4. Export Multiple as in step A.5–6.

### 3.4 — Trim head/tail silence (≤50 ms padding)

For each exported MP3, you want ≤50 ms of silence before/after the
spoken word. Audacity's Export Multiple usually does this
automatically based on label boundaries, but verify on a sample:

- Open `shared-count-1.mp3` in Audacity.
- Zoom in on the start of the waveform (View → Zoom → Zoom In
  several times).
- The waveform should start within 50 ms of the very beginning of
  the file. If not, select the leading silence (drag in the
  waveform) and Edit → Delete.
- Same for the end.

### 3.5 — Loudness normalisation (target −16 LUFS)

This is the single most impactful post-processing step. It makes
all phrases sound the same volume on the 3yo's actual device.

**In Audacity (per-file):**

1. Open the MP3.
2. Effect → Loudness Normalization (or "Normalize" on older
   Audacity versions).
3. Target: **−16 LUFS**, treat as mono, dual mono normalize.
4. Click OK.
5. File → Export → Export as MP3 → overwrite the original.

**In ffmpeg (batch — much faster if you're comfortable on the
command line):**

```bash
cd src/assets/narration/shared
for f in *.mp3; do
  ffmpeg -y -i "$f" -filter:a "loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ar 44100 -ac 1 -b:a 64k "/tmp/$f"
  mv "/tmp/$f" "$f"
done
```

`I=-16` is the integrated loudness target (matches Spotify/YouTube
mobile-friendly standard). `TP=-1.5` caps true peaks 1.5 dB below
clipping (safety). `LRA=11` is a typical loudness range allowance.
`-ac 1` forces mono. `-b:a 64k` is the bitrate target.

If you don't have ffmpeg, install it: `brew install ffmpeg`.

### 3.6 — Verify each file

- Quick listen to each MP3 in Finder (spacebar to preview).
- Check: clear voice, no clipping (nothing sounds harsh/distorted),
  no audible hiss or hum at start/end.
- If any file sounds notably different in volume from the others,
  re-run normalisation on it specifically.
- **Listen on the 3yo's actual device** (the iPad/tablet/phone
  they'll play the games on) — speakers vary wildly. What sounds
  warm on your MacBook might sound boomy on a tablet.

### 3.7 — Drop into the repo

Move the 13 MP3 files into `src/assets/narration/shared/` (create
the folder if it doesn't exist). The exact paths to create:

```bash
cd "/Users/aakasjai/Documents/GIT Projects/Github_AJ/kids-learning-games-astro"
mkdir -p src/assets/narration/shared
mv ~/Downloads/shared-*.mp3 src/assets/narration/shared/
ls -la src/assets/narration/shared/
```

You should see all 13 files listed (`shared-count-1.mp3` through
`shared-count-10.mp3`, `shared-lets-count.mp3`,
`shared-hmm-lets-count.mp3`, `shared-look.mp3`).

---

## Phase 4 — Hand off to the next agent session for integration

Once the MP3s are in `src/assets/narration/shared/`, you don't need
to write any code. Open a new chat session and say:

> **"T9 recordings are ready. Wire them in."**

The agent will:

1. Read `docs/T9-PHRASE-SCRIPT.md` to understand the registry shape.
2. Create `src/lib/narration-assets.ts` — the registry mapping
   phrase keys to imported MP3 URLs.
3. Upgrade `src/lib/speech.ts → narrate()` to look up MP3s in the
   registry and play via `<audio>` element, falling back to Web
   Speech when the registry has no match.
4. Configure `@vite-pwa/astro` to precache the new MP3s (or use a
   hybrid runtime-caching strategy — the agent will pick based on
   the precache budget at the time).
5. Add Playwright tests verifying that the registry is consulted
   before Web Speech for canonical phrases.
6. Build + verify + commit + push.

Estimated agent work: 30–45 min after you confirm the recordings
are ready.

---

## Troubleshooting common issues

### "My voice sounds weird in playback"

Everyone's voice sounds weird to themselves on recordings (your skull
conducts low frequencies you don't hear in playback). This is normal.
**Your 3yo will recognise it as your voice instantly** — the way
they hear your voice through the air is exactly what's on the
recording.

### "I'm too self-conscious to read these phrases out loud"

- Record alone in the room.
- Pretend you're reading a children's book to your 3yo. Same
  tone, same warmth, same energy.
- The first 5 phrases will feel awkward. By phrase 6 you'll be in
  the rhythm.

### "The recording has audible background hum"

- Identify the source: AC, fridge, fan, computer, traffic outside.
- Kill it if you can (turn off AC for 30 min, close window).
- If you can't, ffmpeg's `highpass=f=80` filter cuts low-frequency
  hum without affecting voice intelligibility:
  ```bash
  ffmpeg -i in.mp3 -filter:a "highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ar 44100 -ac 1 -b:a 64k out.mp3
  ```

### "Some phrases sound more energetic than others"

- Loudness normalisation (Phase 3.5) handles volume but not
  energy/expressiveness.
- If a few phrases lack energy on listen-back, re-record just
  those, normalise, replace.

### "The Audacity export gave me weird filenames"

- Audacity respects your label text exactly. If you typed
  `shared count 1` (with spaces), the file is
  `shared count 1.mp3`. Rename to `shared-count-1.mp3` in Finder
  before moving to `src/assets/narration/shared/` — the registry
  expects hyphenated lowercase names.

### "I don't have time to record the full Tier A in one sitting"

- Don't split sessions. Voice tone drifts; the 3yo will hear the
  inconsistency. **Wait until you have 30 quiet minutes** (one
  weekday morning before work, one Saturday afternoon while the
  kid naps, etc.).
- If you've started and your voice gets tired (around phrase 50
  on Tier B), stop. Continue another day. But for Tier A's 13
  phrases, fatigue won't be an issue.

---

## TL;DR for the impatient

1. Quiet bedroom + iPhone Voice Memos + phone 6 inches off-axis from your mouth.
2. Open `docs/T9-PHRASE-SCRIPT.md` on your laptop, read each Tier A phrase 2–3 times with pauses.
3. AirDrop the M4A to your Mac.
4. Audacity: import → label each phrase → Export Multiple as MP3 64 kbps mono → loudness-normalise to −16 LUFS.
5. `mv` the files to `src/assets/narration/shared/`.
6. New agent session: "T9 recordings are ready. Wire them in."

That's it.
