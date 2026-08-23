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
