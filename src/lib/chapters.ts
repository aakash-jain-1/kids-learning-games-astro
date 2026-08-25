/**
 * Break a long run into chapters.
 *
 * §5 rule 11 made a run cover every item in its pool, which is what makes
 * "finished" mean something — sampling would leave coverage to chance. The
 * measured cost of that (2026-08-23) is that the longest runs are long: 25
 * rounds of Where's Teddy is ~7 minutes of narration before the child looks,
 * decides and taps. `run-state.ts` made those runs survive being put down, but
 * it did not give the child anywhere to stop: the completion screen only fires
 * after the final round, so on the longest games a child who plays most days
 * may never once reach a win.
 *
 * Chapters keep the coverage guarantee and add the closure. The run is still
 * every item; it just arrives in sittings of roughly six, each ending in a
 * celebration and an explicit "keep going or come back later".
 *
 * Memory Match already worked this way and is the precedent this generalises:
 * its 3 → 4 → 6 pair boards are exactly the 13-animal pool dealt once, and it
 * fires confetti at the end of each board rather than only at the end of the
 * run.
 *
 * Chapters are derived from the round index alone, so nothing new is persisted
 * and a resumed run lands at the start of whichever chapter it was in.
 */

/**
 * Rounds per chapter, before evening out.
 *
 * Six is about 40 seconds of narration in the quickest game (Animal Sounds, at
 * 6.4s per round) and about 100 in the slowest (Where's Teddy, 16.8s) — so a
 * chapter is one to two minutes of listening plus the child's own thinking
 * time. That sits inside a 3-4 year old's attention for a single repetitive
 * task without being so short that finishing one feels unearned.
 */
export const CHAPTER_TARGET = 6;

/**
 * Runs shorter than this are one chapter — they are already a sitting.
 *
 * Week Friends is 6 rounds and the preschool-maths games are 8; breaking those
 * up would interrupt a run that takes under a minute.
 */
export const MIN_ROUNDS_FOR_CHAPTERS = 12;

/**
 * How many rounds are in each chapter, as evenly as they divide.
 *
 * The remainder goes to the *earliest* chapters rather than the last, so a run
 * never ends on a stub — finishing on "just one more round" reads as an
 * afterthought, and the last chapter is the one carrying the completion
 * celebration.
 */
export function chapterSizes(totalRounds: number, target: number = CHAPTER_TARGET): number[] {
  if (totalRounds < MIN_ROUNDS_FOR_CHAPTERS) return [totalRounds];

  const count = Math.max(2, Math.round(totalRounds / target));
  const base = Math.floor(totalRounds / count);
  const extra = totalRounds % count;

  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * The zero-based round indices that a chapter ends on, excluding the last
 * round of the run — that one ends the run, and the completion screen owns it.
 */
export function chapterEnds(totalRounds: number, target: number = CHAPTER_TARGET): Set<number> {
  const sizes = chapterSizes(totalRounds, target);
  const ends = new Set<number>();

  let seen = 0;
  for (let i = 0; i < sizes.length - 1; i++) {
    seen += sizes[i]!;
    ends.add(seen - 1);
  }
  return ends;
}

/** Which chapter a round belongs to, 1-based, and how many there are. */
export function chapterOf(
  roundIdx: number,
  totalRounds: number,
  target: number = CHAPTER_TARGET,
): { n: number; of: number } {
  const sizes = chapterSizes(totalRounds, target);

  let seen = 0;
  for (let i = 0; i < sizes.length; i++) {
    seen += sizes[i]!;
    if (roundIdx < seen) return { n: i + 1, of: sizes.length };
  }
  return { n: sizes.length, of: sizes.length };
}

/**
 * How a break announces the count, rotated by chapter.
 *
 * Measured by playing all seven games end to end (2026-08-25): the break was
 * **one sentence, heard 19 times** across a single sweep of the seven games —
 * "That's 7! You can keep going, or stop for now.", with only the number
 * moving. It was the most repeated line in the app, and it was on the one
 * screen whose whole job is to feel like a reward. For comparison the same
 * sweep found Animal Sounds rotating six different questions for a line a
 * child hears about five times.
 *
 * Only the celebration rotates. The offer that follows it is deliberately
 * fixed, for the same reason `WRONG_LEAD` in `data/preschool-narration.ts` is a
 * single constant: it is an instruction, not a flourish. It also echoes the two
 * buttons under it, and a child learning that this panel always means the same
 * thing is the point — you don't reword a button every time you show it.
 *
 * Indexed by chapter rather than hashed like `RIGHT_LEADS`, because here the
 * repeat *is* the defect: a run has three or four breaks and consecutive ones
 * must differ. Four covers every game without repeating except Animal Sounds,
 * which has five chapters and so comes back round to the first.
 */
export const BREAK_LEADS: readonly ((n: number) => string)[] = [
  (n) => `That's ${n}!`,
  (n) => `${n} done!`,
  (n) => `That's ${n} already!`,
  (n) => `${n} so far!`,
];

/** The celebration for the break after `chapter` (1-based), covering `roundsDone` rounds. */
export function breakLead(chapter: number, roundsDone: number): string {
  const pick = BREAK_LEADS[(chapter - 1) % BREAK_LEADS.length]!;
  return pick(roundsDone);
}

/** The offer under the celebration. Fixed on purpose — see `BREAK_LEADS`. */
export const BREAK_OFFER = 'You can keep going, or stop for now.';

// ── The panel ────────────────────────────────────────────────────────

interface ChapterBreakOptions {
  /** Rounds in a full run. */
  total: number;
  /** Resume play. The panel is already closed by the time this runs. */
  onContinue: () => void;
  /** The game's narrator, so the break is spoken as well as shown. */
  narrate?: (line: string) => void;
  /** The game's tap sound, so the buttons feel like the game's buttons. */
  playTap?: () => void;
}

export interface ChapterBreakHandle {
  /** True if finishing this round should pause for a break. */
  endsChapter(roundIdx: number): boolean;
  /** Open the panel after `roundsDone` rounds. */
  show(roundsDone: number): void;
}

/**
 * Wire up `components/ChapterBreak.astro`.
 *
 * Returns a handle that never breaks when the panel can't be shown — missing
 * markup, or a browser without `<dialog>`. That fallback matters more than it
 * looks: the game *returns* after asking for a break, so a break that silently
 * failed to open would leave the child on a finished round with nothing
 * happening. No panel means no chapters, and the run plays straight through
 * exactly as it did before.
 */
export function mountChapterBreak(opts: ChapterBreakOptions): ChapterBreakHandle {
  const { total, onContinue, narrate, playTap } = opts;
  const ends = chapterEnds(total);

  const panel = document.getElementById('stBreak') as HTMLDialogElement | null;
  const starsEl = document.getElementById('stBreakStars');
  const titleEl = document.getElementById('stBreakTitle');
  const goBtn = document.getElementById('stBreakGo') as HTMLButtonElement | null;

  const inert = { endsChapter: () => false, show: () => {} };
  if (!panel || !starsEl || !titleEl || !goBtn) return inert;
  if (typeof panel.showModal !== 'function') return inert;

  const chapters = chapterSizes(total).length;

  goBtn.addEventListener('click', () => {
    playTap?.();
    panel.close();
  });

  // Closing is the only way back into the run, so resuming hangs off `close`
  // rather off the button — that way Escape resumes too, instead of leaving
  // the child on a round that never starts.
  panel.addEventListener('close', () => onContinue());

  const show = (roundsDone: number): void => {
    const done = chapterOf(roundsDone - 1, total).n;

    const filled = document.createElement('span');
    filled.className = 'st-break-star--on';
    filled.textContent = '★'.repeat(done);
    starsEl.replaceChildren(filled, document.createTextNode('☆'.repeat(chapters - done)));
    starsEl.setAttribute('aria-label', `${done} of ${chapters} parts done`);

    const lead = breakLead(done, roundsDone);
    titleEl.textContent = lead;

    if (!panel.open) panel.showModal();
    narrate?.(`${lead} ${BREAK_OFFER}`);
  };

  return { endsChapter: (roundIdx) => ends.has(roundIdx), show };
}
