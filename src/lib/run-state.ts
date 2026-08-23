/**
 * Resume an unfinished run.
 *
 * §5 rule 11 made a run cover every item in the pool, which is what makes
 * "finished" mean something. Measured on 2026-08-23, that also made the longest
 * runs long: 25 rounds of Where's Teddy is about seven minutes of narration
 * before the child looks, decides and taps. A 3-4 year old does not reliably
 * sit through that in one go — and until now, closing the tab threw the whole
 * run away and dropped them back at 1/25.
 *
 * The per-round stats survived that (`rounds`, `correctFirstTry`), but
 * `sessions` — the number the dashboard shows as "Full runs finished" — only
 * increments on completion. So on the three longest games a child who played
 * twenty rounds a day for a week could still show zero finished runs, and never
 * see the completion screen at all.
 *
 * This stores the generated run itself rather than a seed, because the run is
 * already plain JSON-serialisable data and a seed would have to survive every
 * future change to the generator to mean the same thing. The cost is a few KB
 * per game; the benefit is that a resumed run is *exactly* the run that was
 * interrupted, including its ordering constraints.
 */

/** Bumped when the envelope changes shape, which invalidates stored runs. */
const VERSION = 1;

/**
 * A run older than this starts over instead of resuming.
 *
 * A child coming back the same day, or the next morning, is still "finishing
 * what they started" and should land where they left off. Resuming a run from
 * three weeks ago is not that — it's a confusing cold start at 18/27 with no
 * memory of the first seventeen.
 */
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

interface Envelope<T> {
  v: number;
  run: T[];
  idx: number;
  savedAt: number;
}

/**
 * The key for the run in progress on this page, if any.
 *
 * Tracked so a Reset can clear it without every game having to wire the pill
 * itself — see `listenForReset` below.
 */
let activeKey: string | null = null;

export function saveRun<T>(key: string, run: readonly T[], idx: number): void {
  if (typeof localStorage === 'undefined') return;
  activeKey = key;
  try {
    const envelope: Envelope<T> = {
      v: VERSION,
      run: [...run],
      idx,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota or private-mode failures are not worth interrupting play for; the
    // run simply won't resume.
  }
}

export function clearRun(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * The run to resume, or `null` to start fresh.
 *
 * `expectedLength` guards against content drift: if a game gains an animal or
 * drops a letter, `TOTAL_ROUNDS` changes and every stored run for it becomes
 * meaningless. Rather than trying to migrate one, it is discarded — a child
 * loses at most one partial run, once, on the release that changed the content.
 */
export function loadRun<T>(key: string, expectedLength: number): { run: T[]; idx: number } | null {
  if (typeof localStorage === 'undefined') return null;
  activeKey = key;

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  const discard = (): null => {
    clearRun(key);
    return null;
  };

  let parsed: Envelope<T>;
  try {
    parsed = JSON.parse(raw) as Envelope<T>;
  } catch {
    return discard();
  }

  if (!parsed || parsed.v !== VERSION) return discard();
  if (!Array.isArray(parsed.run) || parsed.run.length !== expectedLength) return discard();
  if (!Number.isInteger(parsed.idx)) return discard();
  if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
    return discard();
  }

  // Nothing to resume at the very start, and a run parked on its last round
  // has effectively been finished — resuming there would show the completion
  // screen for a run the child already saw through.
  if (parsed.idx <= 0 || parsed.idx >= parsed.run.length) return discard();

  return { run: parsed.run, idx: parsed.idx };
}

/**
 * Clear the stored run when the Reset pill restarts the page.
 *
 * `GameControls` documents Reset as "a fresh page reload — saved progress
 * survives, in-session state resets to the start", and that worked precisely
 * because the round index only ever lived in memory. Persisting it would have
 * quietly broken the pill in every run-mode game: "Start over?" → confirm →
 * still on round 18. So Reset now announces itself and this clears up first.
 */
export function listenForReset(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('kids:reset', () => {
    if (activeKey) clearRun(activeKey);
  });
}
