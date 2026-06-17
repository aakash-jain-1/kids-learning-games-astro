/**
 * Data for the Days Parade game — the foundational "meet & learn every
 * day of the week" game (added 2026-06-17). It is the *prequel* to Week
 * Friends: a 3-4yo first learns the seven day names as an ordered set
 * (through song, repetition, and going through them one by one) BEFORE
 * the "what day comes next?" sequencing challenge that Week Friends
 * poses. Both live in the `preschool-cognitive` family.
 *
 * ── Pedagogy ───────────────────────────────────────────────────────
 *
 * The recognized guidance for teaching days of the week to this age:
 * the week is a **rote ordered list** learned through **song +
 * repetition + visual order**, and grounded in **routine** ("today is
 * Monday, so we go to school"). This game is the digital analogue of
 * the classroom "days of the week" wall chart + song:
 *
 * - A **week train** shows all seven days, Sunday-first (matching the
 *   ubiquitous song + `Date.getDay()`), always in order.
 * - **Tap any day** to meet it: hear its name, see a friendly fact, and
 *   collect a "met" check — a collect-them-all loop (met N / 7).
 * - **"Sing the days"** walks the whole week in order, highlighting and
 *   naming each day — the song, on tap.
 * - A live **"Today is …"** badge anchors the abstract list in the
 *   child's lived routine.
 *
 * No scoring, no failure, no quiz — this is pure exploration/learning
 * (the recognition + sequencing practice lives in Week Friends).
 *
 * Day identity (index / name / short / emoji / color) is imported from
 * `@/data/week-friends` so a given day looks identical across both
 * games — single source of truth for day content. This module only adds
 * the *learning* extras (ordinal, weekday/weekend grouping, fun fact).
 */

import { DAYS, TOTAL_DAYS, lookupDay, type DayMeta } from '@/data/week-friends';

export { DAYS, TOTAL_DAYS, lookupDay };
export type { DayMeta };

/** A day enriched with the learning-game extras. */
export interface DayCard extends DayMeta {
  /** 1-based position in the week (Sunday = 1). */
  readonly ordinal: number;
  /** Weekend (Sun/Sat) vs school-week day (Mon-Fri). */
  readonly group: 'weekday' | 'weekend';
  /** Pill text shown in the detail panel. */
  readonly groupLabel: string;
  /** Kid-friendly fact, spoken + shown when the day is met. */
  readonly fact: string;
}

/** Spoken/written facts, Sunday-first. Short, warm, routine-anchored. */
const FACTS: readonly string[] = [
  'Sunday is the first day of the week. A day to rest and play!',
  'Monday starts a brand new week. Off to school we go!',
  'Tuesday comes right after Monday.',
  'Wednesday is in the middle of the week.',
  'Thursday comes after Wednesday. The weekend is getting close!',
  'Friday is the last school day. Hooray, the weekend is near!',
  'Saturday is a weekend day. Time to play!',
];

const isWeekend = (index: number): boolean => index === 0 || index === 6;

/** All seven days, Sunday-first, enriched for the learning game. */
export const ALL_DAYS: readonly DayCard[] = DAYS.map((d) => ({
  ...d,
  ordinal: d.index + 1,
  group: isWeekend(d.index) ? 'weekend' : 'weekday',
  groupLabel: isWeekend(d.index) ? 'Weekend day' : 'School-week day',
  fact: FACTS[d.index]!,
}));

/** Total days to "meet" — drives the N / 7 progress denominator. */
export const TOTAL_TO_MEET = ALL_DAYS.length;

// ── Stats ──────────────────────────────────────────────────────────
//
// The set of days the child has met is tracked via the shared progress
// lib (`kids_progress_v1:days-parade`) so it also feeds the /stats
// activity chart for free (saveLearned → recordPlay). This bespoke key
// only carries the explore-game extras the progress lib doesn't model:
// how many full "sing the days" walks, and the last-played date.

/** Storage key for the explore-game extras (sing count + last played). */
export const STATS_KEY = 'days_parade_stats_v1';

export interface DaysParadeStats {
  /** Number of completed "Sing the days" walk-throughs. */
  readonly sings: number;
  /** ISO date string (YYYY-MM-DD) of the last play. */
  readonly lastPlayed: string;
}

const ZERO_STATS: DaysParadeStats = { sings: 0, lastPlayed: '' };

export const loadDaysParadeStats = (): DaysParadeStats => {
  if (typeof localStorage === 'undefined') return ZERO_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO_STATS;
    const p = JSON.parse(raw) as Partial<DaysParadeStats>;
    return {
      sings: typeof p.sings === 'number' ? p.sings : 0,
      lastPlayed: typeof p.lastPlayed === 'string' ? p.lastPlayed : '',
    };
  } catch {
    return ZERO_STATS;
  }
};

export const saveDaysParadeStats = (s: DaysParadeStats): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — silent noop, matches site convention */
  }
};
