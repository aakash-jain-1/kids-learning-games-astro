/**
 * Shared narration fragments for the preschool games.
 *
 * What lives here is the wording that has to be the same everywhere: how a game
 * tells a child they were wrong, and how it is allowed to praise them for being
 * right. Both are shared rather than restated per game because a rule written
 * out at fourteen call sites is a rule with nothing holding it — see §5 rule 8
 * in CONTEXT.md for how that went last time.
 */

/**
 * How a wrong answer is announced, before the game explains anything.
 *
 * ── Why this exists ──
 *
 * Every game used to open its correction with **"Hmm!"** — "Hmm! Let's look
 * together.", "Hmm! Let's sing the days." Two games didn't even do that; they
 * went straight to "Let's count them together!" as though nothing had happened.
 *
 * "Hmm" is not a verification. To a three-year-old it reads as the game
 * *thinking*, not as "that one isn't it", so the only signals that an answer
 * was wrong were a red tint and a 220Hz tone — and the sentence immediately
 * after would cheerfully start teaching, which reads as agreement.
 *
 * The feedback literature is unusually clear here. In a review of 44 studies of
 * corrective feedback with children aged 3–11, **85% of the feedback conditions
 * included an explicit verification judgment** ("that answer is right/wrong")
 * and 67% also gave the correct answer; the effective conditions were the ones
 * that went *beyond* mere verification rather than skipping it. (Ruzek et al.,
 * "A developmental perspective on feedback", 2023.) These games already had the
 * "beyond" half — naming what the child picked, then the answer, then why. They
 * were missing the judgment that makes it a correction rather than a lesson.
 *
 * ── Why these three words ──
 *
 * *Concrete.* It points at the thing the child just touched. "It's not correct"
 * is an abstraction a pre-reader has to unpack; "not that one" is about the
 * tile under their finger, and it matches what they can see — the red tint and
 * the ✗ are on that tile and nowhere else.
 *
 * *About the choice, not the child.* Corrective feedback that implies a fixed
 * quality in the child ("you're not very good at this") is the kind that does
 * measurable harm; feedback aimed at the choice or the product ("that doesn't
 * look right", "not quite") is normal, and is what parents of preschoolers
 * actually say. (Kamins & Dweck 1999; coded this way in Silver et al. 2023.)
 * "Not that one" is squarely in the second group.
 *
 * *A bare "No" was considered and rejected.* It carries the verification, but
 * for this age "no" is overwhelmingly a *behaviour* word — the one that stops
 * you touching the socket. Using it for a wrong tap borrows that weight and
 * tells the child they did something naughty by guessing, which is the opposite
 * of what a game built on guessing wants. The negation is kept; the reprimand
 * isn't.
 *
 * *"Not quite" was considered and rejected* for a smaller reason: it implies
 * the child was close, and three-quarters of the time they weren't. It is the
 * right phrase for a near miss and a slightly dishonest one for a wild guess.
 *
 * ── Using it ──
 *
 * This is the *lead*. Every game keeps its own invitation after it, because
 * what to do next is game-specific and is the useful part:
 *
 *     `${WRONG_LEAD} Let's sing the days.`
 *     `${WRONG_LEAD} Let's listen again.`
 *
 * Kept deliberately short — the correction that follows is already several
 * seconds of speech, and the child is waiting to try again.
 */
export const WRONG_LEAD = 'Not that one.';

/**
 * Praise words that describe the child instead of what the child just did.
 *
 * ── Why this exists ──
 *
 * Nine of the completion screens used to hand out a title: **"Letter
 * champion!"**, "Counting champion!", "Sorting champion!", "You're a rhyming
 * star!", "Geometric genius!", "What a memory!". They were copy-pasted from
 * each other — the same word with the game's noun swapped in, which is the same
 * drift shape as rule 8 and rule 12, just in prose instead of CSS.
 *
 * The distinction that matters is between praising the *doer* and praising the
 * *doing*. Person praise ("you're a star") tells the child the performance was
 * evidence about who they are, so a later failure is evidence too, and the
 * documented response is to give up, feel bad, and treat ability as fixed.
 * Process praise ("great looking") commends the effort or strategy in that one
 * episode, and predicts persistence and a learning orientation instead.
 * (Kamins & Dweck 1999; Gunderson et al. 2013.)
 *
 * This is not a general-audience finding being stretched to fit. Cimpian et al.
 * (2007) ran exactly this contrast on **four-year-olds** and moved their
 * motivation and their response to a subsequent setback — the age these games
 * are for. The same literature notes person praise bites hardest in
 * *academically relevant* settings, which letters, sounds and counting are.
 *
 * ── What replaced them ──
 *
 * Each game now names the thing the child actually did: "Great looking!" for
 * finding a letter, "Great listening!" for hearing a first sound or a rhyme,
 * "Great remembering!" for the days of the week and for Memory Match, "Great
 * comparing!", "Great spotting!", "Great sorting!", "Great counting!". The
 * subtitle underneath still carries the tally ("You found all 26 letters
 * today!"), so nothing was lost — the trait label was the only casualty.
 *
 * Two of these were already right before the sweep and are worth keeping as the
 * model: Animal Sounds' "Great listening!" and the line Where's Teddy speaks,
 * "Wow! You found teddy every single time! Great looking!"
 *
 * Note the repeats are deliberate. Two games say "Great counting!" and two say
 * "Great listening!" because the child really is doing the same thing in both,
 * and an honest repeat beats a novel phrase that describes the wrong skill.
 *
 * ── Where the line is ──
 *
 * Not every excited word is a trait. "Amazing! You explored all ten objects in
 * the Solar System!" and "Stellar! Perfect score!" both survive, because the
 * interjection is aimed at the feat and the sentence after it names the doing.
 * What gets replaced is an interjection standing *alone* as the whole verdict,
 * with nothing for it to attach to but the child — which is why Weather's
 * one-word "Brilliant!" heading became "You learnt them all!" while Solar
 * System's "Amazing! …" was left as it was.
 *
 * "Brilliant" is on the list and "amazing" is not for a second reason: it
 * denotes *cleverness* specifically, which is the exact attribution the
 * research is about, where "amazing" and "stellar" denote how impressive the
 * thing done was. Role names are also fine — "Great job, space explorer!"
 * stays, because an explorer is someone who explored, not someone who is
 * gifted.
 *
 * ── Using it ──
 *
 * This list is what `tests/praise.spec.ts` searches the completion screens for.
 * Adding a word here adds it to the ban; the fix for a hit is always to say
 * what the child did instead of what they are.
 */
export const PERSON_PRAISE_WORDS = [
  'champion',
  'genius',
  'superstar',
  'star',
  'smart',
  'clever',
  'brilliant',
  'what a memory',
];

/**
 * How a game says "that's the one" before it explains why.
 *
 * ── Why this exists ──
 *
 * The mirror image of `WRONG_LEAD`, found the same way: by playing all 14 games
 * that have a wrong answer end to end and reading back every line spoken, in
 * order. **"Yes" opened 96 of them — 17.6% of all speech in the app**, half as
 * common again as the next word. The arithmetic left no room for doubt: in the
 * recognition games the count of "Yes" lines plus the count of wrong taps came
 * to exactly the round count (Animal Sounds 12 + 15 = 27, Where's Teddy
 * 17 + 8 = 25, Feeling Friends 8 + 12 = 20). Not *most* correct answers. Every
 * single one, in every game, for a run of up to 27 rounds.
 *
 * Nothing about that is broken, which is why no test had anything to say about
 * it. "Yes!" is the right word. It is just the *only* word.
 *
 * ── What these have in common ──
 *
 * Each one is an unambiguous verification. That constraint is not negotiable
 * and comes from the same research as `WRONG_LEAD`: the explicit right/wrong
 * judgment is the part that makes feedback a correction rather than a lesson,
 * and it applies to being right just as much as to being wrong. So warm noises
 * that don't actually confirm anything — "Ooh!", "Nice!" — are not on this
 * list.
 *
 * Each is also about the *answer*, never the child, per §5 rule 14. "Clever!"
 * and "Good girl!" verify just as well and are exactly the attribution that
 * research is about, so they're excluded for the same reason the words in
 * `PERSON_PRAISE_WORDS` are.
 *
 * And each has to read naturally in front of whatever the game says next,
 * across all fourteen: "…! The cow says moo!", "…! A is for Apple!", "…! Three
 * is more than two!"
 *
 * ── Why it is seeded, not counted ──
 *
 * The rotation is keyed off something the round already contains — the animal,
 * the letter, the day — rather than a round counter. That keeps every game's
 * `buildNarration(round)` signature untouched, and it means the server-rendered
 * first round and the client agree without threading an index through
 * thirteen games. It also makes the choice a property of the content: the cow
 * gets the same affirmation every time, which is steadier for a child than a
 * fresh shuffle on each play.
 *
 * The trade is that consecutive rounds can land on the same lead, since the
 * seeds are unrelated. With four leads that is about one pair in four, which is
 * roughly how often a person repeats themselves anyway — and it is a long way
 * from where this started, at four in four.
 *
 * Animal Sounds' *question* is the one place this can't be used, and for an
 * interesting reason: while a clip is playing the prompt may not name the
 * animal or say its call, so there is no round-specific content to seed from.
 * It rotates by round index instead.
 */
export const RIGHT_LEADS = ['Yes!', "That's it!", 'You got it!', "That's right!"] as const;

/**
 * Pick an affirmation from `RIGHT_LEADS`, stably, for a given round.
 *
 * `seed` should be something that identifies the round — the target's name, the
 * letter, the number. Anything stable will do; it only has to be the same on
 * the server and the client for the round that gets pre-rendered.
 */
export const rightLead = (seed: string | number): string => {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return RIGHT_LEADS[h % RIGHT_LEADS.length]!;
};
