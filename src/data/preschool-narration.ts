/**
 * Shared narration fragments for the preschool games.
 *
 * One phrase lives here so far, and it is the one every game says when a child
 * gets something wrong. It is shared rather than restated per game because a
 * rule written out at fourteen call sites is a rule with nothing holding it —
 * see §5 rule 8 in CONTEXT.md for how that went last time.
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
