/**
 * Where's Teddy? — spatial and positional words for ages 3–4.
 *
 * "Which teddy is **under** the box?" Three mini-scenes sit side by side.
 * Each shows the *same two things* — a teddy and a box — in a different
 * spatial relation, and the child taps the one the question describes.
 *
 * ── Why the objects never change within a round ────────────────────
 *
 * Showing the same pair in all three scenes is the entire mechanic. If the
 * scenes held different objects the child could win by recognising a
 * picture, which is a skill they already have. Holding the objects fixed
 * means the only thing that differs between the three answers is the
 * *relation*, so reading the relation is the only way through. It is the
 * same move Opposites Friends makes by asking each pair in both
 * directions: remove the shortcut, and what's left is the concept.
 *
 * Spatial language is an explicit early-maths and early-language standard
 * and had zero coverage across the other 27 games.
 *
 * ── Five relations, and why "behind" nearly didn't ship ────────────
 *
 * `in / on / under / behind / next to`. Four of those are unambiguous when
 * drawn with flat emoji. **`behind` is not**: a teddy standing behind a box
 * and a teddy sitting inside a box both render as "an emoji whose bottom is
 * hidden by another emoji", and prototyping confirmed a child could not be
 * expected to tell them apart. The design doc anticipated this and offered
 * dropping to three relations.
 *
 * The cheaper fix is to stop the collision from ever appearing: **`in` and
 * `behind` are never options in the same round.** Ambiguity between two
 * pictures only matters when both are on screen, and `behind` is perfectly
 * legible next to `on`, `under` or `next to` — it is the one whose bottom
 * is cut off. So tier 3 draws its distractors from those three and never
 * from `in`, and the tiers below never offer `behind` at all. That keeps a
 * useful preposition instead of cutting it, and costs one line in
 * `distractorsFor`.
 *
 * ── One run covers every relation on every pair ────────────────────
 *
 * CONTEXT.md §5 rule 11. The bounded set here is the **25 questions**
 * (5 pairs × 5 relations), not the 5 relations: asking "under" about the
 * box, the basket, the bucket, the hat and the bathtub is what teaches that
 * *under* is a relation rather than a fact about boxes. The objects varying
 * while the relation holds still is the generalisation the game exists to
 * produce, so exhausting the grid is the point rather than a side effect.
 *
 * Stats are bespoke (`wheres_teddy_stats_v1`), the standard four-field
 * preschool shape with no stages. Filed under `preschool-cognitive`; no new
 * stats family.
 */

import {
  THEMES,
  type PreschoolTheme,
  type ThemeMeta,
} from '@/lib/preschool-themes';
import { WRONG_LEAD } from '@/data/preschool-narration';

export { THEMES, THEME_BY_KEY } from '@/lib/preschool-themes';
export type { PreschoolTheme, ThemeMeta } from '@/lib/preschool-themes';

// ── Relations ──────────────────────────────────────────────────────

export type Relation = 'in' | 'on' | 'under' | 'behind' | 'nextTo';

export interface RelationMeta {
  readonly id: Relation;
  /** Shown in the prompt card, shouted in caps by the CSS — "UNDER". */
  readonly label: string;
  /** Reads inside a sentence: "the teddy is **under** the box". */
  readonly phrase: string;
  /**
   * The reusable rule, spoken during a guided correction. Phrased as
   * something the child can apply next round rather than as a description
   * of this one picture.
   */
  readonly hint: string;
}

const RELATION_META: Readonly<Record<Relation, RelationMeta>> = {
  in: {
    id: 'in',
    label: 'IN',
    phrase: 'in',
    hint: 'in means inside, so look for the one tucked down inside it',
  },
  on: {
    id: 'on',
    label: 'ON',
    phrase: 'on',
    hint: 'on means resting on top, so look for the one sitting up on it',
  },
  under: {
    id: 'under',
    label: 'UNDER',
    phrase: 'under',
    hint: 'under means below, so look for the one right at the bottom',
  },
  behind: {
    id: 'behind',
    label: 'BEHIND',
    phrase: 'behind',
    hint: 'behind means at the back, so look for the one peeking out from behind',
  },
  nextTo: {
    id: 'nextTo',
    label: 'NEXT TO',
    phrase: 'next to',
    hint: 'next to means beside, so look for the one standing right alongside',
  },
};

export const lookupRelation = (id: Relation): RelationMeta => RELATION_META[id];

/** Every relation, in teaching order. */
export const RELATIONS: readonly Relation[] = ['in', 'on', 'under', 'nextTo', 'behind'];

// ── Object pairs ───────────────────────────────────────────────────

export type PairId = 'teddy-box' | 'cat-basket' | 'ball-bucket' | 'mouse-hat' | 'puppy-tub';

export interface ScenePair {
  readonly id: PairId;
  /** The thing that moves around. */
  readonly objectName: string;
  readonly objectEmoji: string;
  /** The thing it moves around, always spoken as "the <name>". */
  readonly landmarkName: string;
  readonly landmarkEmoji: string;
}

/**
 * Five pairs. Two constraints, both learned by rendering the 5 × 5 grid and
 * looking at it rather than by reasoning about it:
 *
 *  - **The landmark is an open container with a visible interior**, because
 *    `in` has to be drawable. A flat landmark like a bed makes "in the bed"
 *    and "on the bed" the same picture, which is why the bed was cut.
 *  - **The two emoji must not be the same colour.** A 🦆 duck against a
 *    white 🛁 bathtub disappeared almost entirely in the `in` scene, where
 *    the object is smallest and most overlapped — so the duck became a
 *    brown puppy, which is also the more natural thing to find in a bath.
 *
 * All five read naturally with all five relations in English — "next to the
 * bucket", "behind the hat" — so no pair needs an exception list and the
 * run stays a clean 5 × 5 grid.
 */
export const PAIRS: readonly ScenePair[] = [
  {
    id: 'teddy-box',
    objectName: 'teddy',
    objectEmoji: '🧸',
    landmarkName: 'box',
    landmarkEmoji: '📦',
  },
  {
    id: 'cat-basket',
    objectName: 'cat',
    objectEmoji: '🐱',
    landmarkName: 'basket',
    landmarkEmoji: '🧺',
  },
  {
    id: 'ball-bucket',
    objectName: 'ball',
    objectEmoji: '⚽',
    landmarkName: 'bucket',
    landmarkEmoji: '🪣',
  },
  {
    id: 'mouse-hat',
    objectName: 'mouse',
    objectEmoji: '🐭',
    landmarkName: 'hat',
    landmarkEmoji: '👒',
  },
  {
    id: 'puppy-tub',
    objectName: 'puppy',
    objectEmoji: '🐶',
    landmarkName: 'bathtub',
    landmarkEmoji: '🛁',
  },
];

const PAIR_BY_ID: Readonly<Record<PairId, ScenePair>> = Object.fromEntries(
  PAIRS.map((p) => [p.id, p]),
) as Record<PairId, ScenePair>;

export const lookupPair = (id: PairId): ScenePair => PAIR_BY_ID[id];

/**
 * Rounds in one full run — every pair asked about every relation, so
 * 5 × 5 = 25. Derived, so adding a sixth pair lengthens the run instead of
 * leaving it unreachable.
 */
export const TOTAL_ROUNDS = PAIRS.length * RELATIONS.length;

// ── Tier progression ───────────────────────────────────────────────

/**
 * The three relations a 3-year-old meets first. They are also the three
 * that are visually unambiguous, so tier 1 can show all three at once and
 * let the child compare them directly.
 */
const CORE: readonly Relation[] = ['in', 'on', 'under'];

/**
 * What `behind` may be shown against. `in` is deliberately absent — see the
 * file header. `behind` is legible beside any of these because it is the
 * only one whose bottom is hidden.
 */
const BEHIND_SAFE: readonly Relation[] = ['on', 'under', 'nextTo'];

/**
 * Which relations are *asked about* in each tier, hardest last.
 *
 * Difficulty here is a property of the word, not of the pair, so unlike
 * Opposites Friends the tiers partition the relations rather than the
 * content. Tier 1 drills the three core relations across all five pairs;
 * tier 2 introduces `next to` against them; tier 3 introduces `behind`,
 * the one that needs the child to read occlusion as depth.
 */
const TIERS: ReadonlyArray<readonly Relation[]> = [CORE, ['nextTo'], ['behind']];

// ── Round shape ────────────────────────────────────────────────────

export interface TeddyRound {
  /** Which two things this round is about; the same in all three scenes. */
  readonly pair: PairId;
  /** The relation being asked for — the correct scene. */
  readonly target: Relation;
  /** The three scenes in display order. One is `target`. */
  readonly scenes: readonly [Relation, Relation, Relation];
  /** Position (0/1/2) of the correct scene, so a tap validates without rescanning. */
  readonly correctIndex: 0 | 1 | 2;
  /** Tier this round came from (0-2). Parent stats / debug only. */
  readonly tier: 0 | 1 | 2;
  /** Theme rotated per round — drives the stage background ambience. */
  readonly theme: PreschoolTheme;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Pick a random element from `xs`. Caller asserts `xs.length > 0`. */
const pick = <T>(xs: readonly T[], rand: () => number): T =>
  xs[Math.floor(rand() * xs.length)]!;

/** Fisher-Yates shuffle of `xs` in place. */
const shuffleInPlace = <T>(xs: T[], rand: () => number): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};

/**
 * The two wrong scenes for a round.
 *
 * Tier 1 always shows the full `in / on / under` trio, so the tray is a
 * stable comparison frame the child sees fifteen times with five different
 * pairs — the relation is the thing that repeats, which is the point.
 *
 * Tier 3 draws from `BEHIND_SAFE`, which is where the `in`/`behind`
 * collision is actually prevented.
 */
const distractorsFor = (
  tier: 0 | 1 | 2,
  target: Relation,
  rand: () => number,
): readonly [Relation, Relation] => {
  const pool = tier === 0 ? CORE : tier === 1 ? CORE : BEHIND_SAFE;
  const others = shuffleInPlace(
    pool.filter((r) => r !== target),
    rand,
  );
  return [others[0]!, others[1]!];
};

// ── Run ────────────────────────────────────────────────────────────

/** One question: which pair, and which relation is being asked about. */
interface RunStep {
  readonly pairIdx: number;
  readonly target: Relation;
  readonly tier: 0 | 1 | 2;
}

/**
 * Order one tier's questions so the same pair is never asked twice in a row.
 *
 * This matters more here than in the games it is borrowed from. Within tier
 * 1 a pair's three questions render the *identical three scenes* — only the
 * word in the prompt changes — so back-to-back rounds on the same pair look
 * to the child like the game failed to advance, and the second one is
 * answerable by elimination from the first.
 *
 * Greedy by remaining count: at each step take the pair with the most
 * questions still owed that isn't the one just asked, breaking ties at
 * random so runs still vary. Taking the most-owed pair first is what stops
 * the algorithm painting itself into a corner at the end, which is exactly
 * where a shuffle-then-repair pass fails. A valid ordering always exists
 * here (no pair owes more than three of fifteen slots, well inside the
 * `ceil(n/2)` bound), and `prevPair` carries the guard across tier joins so
 * the seam is not a blind spot.
 */
const orderTier = (
  targets: readonly Relation[],
  tier: 0 | 1 | 2,
  rand: () => number,
  prevPair: number,
  startWith: Omit<RunStep, 'tier'> | null = null,
): RunStep[] => {
  const owed = new Map<number, Relation[]>(
    PAIRS.map((_, i) => [i, shuffleInPlace([...targets], rand)]),
  );

  const out: RunStep[] = [];
  let prev = prevPair;

  // A pinned opening question just becomes the first greedy choice, so the
  // rest of the tier is built around it and the no-repeat rule holds
  // through the join like anywhere else.
  if (startWith) {
    const list = owed.get(startWith.pairIdx);
    const at = list?.indexOf(startWith.target) ?? -1;
    if (list && at >= 0) {
      list.splice(at, 1);
      out.push({ ...startWith, tier });
      prev = startWith.pairIdx;
    }
  }

  const total = PAIRS.length * targets.length;
  while (out.length < total) {
    const remaining = [...owed].filter(([, list]) => list.length > 0);
    const candidates = remaining.filter(([idx]) => idx !== prev);
    // Unreachable by the bound above; falling back beats throwing at a
    // child mid-run if a future pair count ever breaks the assumption.
    const from = candidates.length > 0 ? candidates : remaining;

    const most = Math.max(...from.map(([, list]) => list.length));
    const [pairIdx, list] = pick(
      from.filter(([, l]) => l.length === most),
      rand,
    );

    out.push({ pairIdx, target: list.pop()!, tier });
    prev = pairIdx;
  }

  return out;
};

/**
 * Build one full run: **every relation asked about every pair** (CONTEXT.md
 * §5 rule 11).
 *
 * `rand` is injectable so the page can SSR a deterministic round 0
 * (`generateRun(() => 0.42)[0]`) and the specs can assert a stable first
 * paint.
 *
 * `startWith` pins the question the run opens on, which is how the page
 * hands the SSR'd round 0 over to a fresh random run. It exists so the page
 * doesn't have to generate freely and then cut that question out: removing
 * a round from the middle leaves its two former neighbours adjacent, and
 * those can be the same pair — the exact collision `orderTier` is here to
 * prevent. Pinning leaves no gap to reintroduce it through. Ignored unless
 * the pinned relation belongs to the first tier, which it always does for
 * an SSR round 0.
 */
export const generateRun = (
  rand: () => number = Math.random,
  startWith?: { readonly pair: PairId; readonly target: Relation },
): TeddyRound[] => {
  const pinned: Omit<RunStep, 'tier'> | null =
    startWith && TIERS[0]!.includes(startWith.target)
      ? {
          pairIdx: PAIRS.findIndex((p) => p.id === startWith.pair),
          target: startWith.target,
        }
      : null;

  const steps: RunStep[] = [];
  let prevPair = -1;
  for (let t = 0; t < TIERS.length; t++) {
    const tierSteps = orderTier(
      TIERS[t]!,
      t as 0 | 1 | 2,
      rand,
      prevPair,
      t === 0 && pinned && pinned.pairIdx >= 0 ? pinned : null,
    );
    steps.push(...tierSteps);
    prevPair = tierSteps[tierSteps.length - 1]!.pairIdx;
  }

  const rounds: TeddyRound[] = [];
  let prevTheme: PreschoolTheme | null = null;

  for (const { pairIdx, target, tier } of steps) {
    const [d1, d2] = distractorsFor(tier, target, rand);
    const triple: Relation[] = [target, d1, d2];
    shuffleInPlace(triple, rand);
    const scenes: readonly [Relation, Relation, Relation] = [
      triple[0]!,
      triple[1]!,
      triple[2]!,
    ];

    const themeChoices: readonly ThemeMeta[] =
      prevTheme === null ? THEMES : THEMES.filter((t) => t.key !== prevTheme);
    const theme = pick(themeChoices, rand).key;
    prevTheme = theme;

    rounds.push({
      pair: PAIRS[pairIdx]!.id,
      target,
      scenes,
      correctIndex: scenes.indexOf(target) as 0 | 1 | 2,
      tier,
      theme,
    });
  }

  return rounds;
};

// ── Narration ──────────────────────────────────────────────────────

export interface RoundNarration {
  /** Asks the question — "Which teddy is under the box?" */
  readonly intro: string;
  /** Confirms, restating the whole relation rather than just "yes". */
  readonly correct: string;
  /** Opens the guided correction. */
  readonly rerun: string;
  /** Names what the child tapped, neutrally, and restates the goal. */
  readonly wrongIs: (tapped: Relation) => string;
  /** Points at the right scene and gives the reusable rule. */
  readonly reveal: string;
}

/**
 * Build the round's script.
 *
 * The round is never failed and no score is shown. Every line names the
 * relation in full — "the teddy is under the box", never "that one" — since
 * hearing the preposition inside a whole sentence is the language half of
 * what this game teaches. The correction names what the child actually
 * tapped without judging it, then closes on the rule so the next round is
 * easier rather than merely answered.
 */
export const buildNarration = (round: TeddyRound): RoundNarration => {
  const pair = lookupPair(round.pair);
  const rel = lookupRelation(round.target);
  const o = pair.objectName;
  const l = pair.landmarkName;

  return {
    intro: `Which ${o} is ${rel.phrase} the ${l}?`,
    correct: `Yes! That ${o} is ${rel.phrase} the ${l}.`,
    rerun: `${WRONG_LEAD} Let's look at them again.`,
    wrongIs: (tapped: Relation): string =>
      `That ${o} is ${lookupRelation(tapped).phrase} the ${l}. ` +
      `We're looking for the ${o} ${rel.phrase} the ${l}.`,
    reveal: `This ${o} is ${rel.phrase} the ${l} — ${rel.hint}.`,
  };
};

// ── Stats ──────────────────────────────────────────────────────────

export const STATS_KEY = 'wheres_teddy_stats_v1';

export interface WheresTeddyStats {
  /** Full runs finished — every relation on every pair. */
  readonly sessions: number;
  readonly rounds: number;
  readonly correctFirstTry: number;
  /** `YYYY-MM-DD`, or `''` when never played. */
  readonly lastPlayed: string;
}

const ZERO: WheresTeddyStats = {
  sessions: 0,
  rounds: 0,
  correctFirstTry: 0,
  lastPlayed: '',
};

/** SSR-safe read — returns the zero state on the server or if storage is off. */
export const loadWheresTeddyStats = (): WheresTeddyStats => {
  if (typeof localStorage === 'undefined') return ZERO;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO;
    const parsed = JSON.parse(raw) as Partial<WheresTeddyStats>;
    return {
      sessions: Number(parsed.sessions) || 0,
      rounds: Number(parsed.rounds) || 0,
      correctFirstTry: Number(parsed.correctFirstTry) || 0,
      lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : '',
    };
  } catch {
    return ZERO;
  }
};

export const saveWheresTeddyStats = (stats: WheresTeddyStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* storage disabled / private mode — match site convention. */
  }
};
