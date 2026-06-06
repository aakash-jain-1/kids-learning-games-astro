/**
 * Shared stage model for the preschool-math triad — Counting Friends,
 * More Friends, Number Friends.
 *
 * Carved out 2026-06-03 when all three preschool-math games gained
 * stages at once. Three consumers (and a fourth, Pattern Sequences,
 * could adopt later) clears the project's "refactor on second consumer"
 * bar comfortably.
 *
 * **What a stage is.** A stage is a difficulty band the child climbs by
 * playing well. Stages scale *two* things together:
 *
 *   1. The number ceiling (`maxN`): 5 -> 10 -> 10. Stage 1 keeps the
 *      five-frame anchor every game shipped with; Stage 2+ open the
 *      ten-frame. We deliberately cap at 10 (not 15) so the dot-frame
 *      stays a clean two-row ten-frame with no awkward partial row.
 *   2. Breadth: longer sessions (8 -> 10 -> 12 rounds), the full
 *      6-theme pool instead of the starter 4, and a fuller / harder
 *      number-combination mix authored per game.
 *
 * **Auto-progression.** After a full session the game compares the
 * child's first-try accuracy against `ADVANCE_RATIO`. Meet it and not
 * already at the top stage -> advance one stage and celebrate. Miss it
 * -> stay put. We never auto-drop: dropping a child down a stage after
 * an off day is exactly the shame-coded feedback the whole triad is
 * built to avoid. `bestStage` records the high-water mark for the
 * parent dashboard.
 *
 * **Why frameSize is separate from maxN.** They happen to be equal
 * today (both 5 then 10), but the dot-frame is a *rendering* concern
 * and the ceiling is a *content* concern. Keeping them as distinct
 * fields means a future "Stage 3 caps at 12 but still renders a
 * ten-frame + 2" tweak is a one-cell edit, not a refactor.
 *
 * This module is pure data + pure functions — no DOM, no storage, no
 * randomness — so it is trivially unit-testable and SSR-safe.
 */

import { THEMES, type ThemeMeta } from '@/lib/preschool-themes';

/** The three stages. Stable integers so they serialise cleanly into the per-game stats JSON. */
export type StageId = 1 | 2 | 3;

/** Lowest / highest stage — single source of truth for clamping + advance caps. */
export const MIN_STAGE: StageId = 1;
export const MAX_STAGE: StageId = 3;

/** First-try accuracy (0..1) a session must hit to advance to the next stage. */
export const ADVANCE_RATIO = 0.75;

export interface StageMeta {
  /** Child-facing label shown on the stage pill + level-up message. */
  readonly label: string;
  /** Rounds per session at this stage. */
  readonly rounds: number;
  /** Inclusive number ceiling for this stage (sums / sizes / targets). */
  readonly maxN: number;
  /** Dot-frame cell count for this stage (5 = five-frame, 10 = ten-frame). */
  readonly frameSize: number;
  /** Whether this stage uses the full 6-theme pool (false = starter 4). */
  readonly allThemes: boolean;
}

export const STAGE_META: Readonly<Record<StageId, StageMeta>> = {
  1: { label: 'Starter', rounds: 8, maxN: 5, frameSize: 5, allThemes: false },
  2: { label: 'Explorer', rounds: 10, maxN: 10, frameSize: 10, allThemes: true },
  3: { label: 'Champion', rounds: 12, maxN: 10, frameSize: 10, allThemes: true },
};

/** Clamp any number (e.g. a parsed-from-storage value) to a valid `StageId`. */
export const clampStage = (n: number): StageId => {
  if (!Number.isFinite(n)) return MIN_STAGE;
  const r = Math.round(n);
  if (r <= MIN_STAGE) return MIN_STAGE;
  if (r >= MAX_STAGE) return MAX_STAGE;
  return r as StageId;
};

/** The next stage up, capped at `MAX_STAGE`. */
export const nextStage = (stage: StageId): StageId =>
  (stage >= MAX_STAGE ? MAX_STAGE : (stage + 1)) as StageId;

/**
 * Should the child advance after a session? True only when they are
 * below the top stage and hit the first-try accuracy bar. `rounds`
 * is the number of rounds actually completed this session (the divisor
 * for the ratio); a zero-round session never advances.
 */
export const shouldAdvance = (
  firstTry: number,
  rounds: number,
  stage: StageId,
): boolean => {
  if (stage >= MAX_STAGE) return false;
  if (rounds <= 0) return false;
  return firstTry / rounds >= ADVANCE_RATIO;
};

/**
 * Theme pool for a stage. Stage 1 uses the first 4 themes (the
 * original pond/orchard/sea/garden set the games shipped with); Stage
 * 2+ use the full catalog. Relies on the new themes being appended to
 * the END of `THEMES` so the starter slice stays stable.
 */
export const themesForStage = (stage: StageId): readonly ThemeMeta[] =>
  STAGE_META[stage].allThemes ? THEMES : THEMES.slice(0, 4);
