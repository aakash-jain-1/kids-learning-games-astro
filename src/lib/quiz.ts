/**
 * Shared quiz controller for story-flow games.
 *
 * First consumer was Daily Routines (2026-05-08, page-local inline ~100 lines
 * of TS). Extracted here when Woodcutter (second consumer) landed (also
 * 2026-05-08), per the rule-#5 *"refactor trigger = second consumer"*
 * migration principle codified in `PROGRESS.md`.
 *
 * Both consumers share:
 * - A multiple-choice question shape: `{ q, opts, ans }`.
 * - State persistence: `{ attempts, bestScore, lastPlayed }` keyed by
 *   `<gameId>_quiz_v1` LocalStorage key.
 * - HTML structure: a `<div id="quizBody">` for questions + a result
 *   panel (`.quiz-result`) with emoji + score-text + action buttons.
 *
 * The action buttons are **page-local**, not part of this controller —
 * "Try Again" is universal but "Read Again" is Routines-specific
 * (Woodcutter has only one scene, so there is no equivalent "go back to
 * scene 1" action). Pages wire those buttons themselves and call
 * `controller.start()` to retry.
 *
 * Storage convention: `<gameId>_quiz_v1` is page-level state for quiz
 * metadata. The shared `kids_progress_v1:<gameId>` key
 * (`src/lib/progress.ts`) handles the *learning* state shape (a
 * `Set<string>` of items learned / scenes visited). This module handles
 * quiz performance metrics that don't fit the Set shape.
 *
 * Keyed-by-gameId design (not "active game" singleton): both story
 * games coexist in the same browser session — visiting Woodcutter then
 * Routines must not corrupt either game's bookkeeping. Every API takes
 * `gameId` explicitly so two `mountQuiz` controllers can run on
 * different pages without sharing state at any point.
 */

import { recordPlay, todayLocal } from '@/lib/retention';

/** Multiple-choice question shape. Shared by every story game's quiz. */
export interface QuizQuestion {
  /** Question text (plain string; this module HTML-escapes it before insertion). */
  q: string;
  /** Answer options; vanilla games all ship 4-option sets but the lib doesn't enforce a count. */
  opts: readonly string[];
  /** Index of the correct option in `opts`. */
  ans: number;
}

/** Persisted quiz performance metrics. */
export interface QuizState {
  /** Total quiz attempts across all sessions. Increments once per `showResult`. */
  attempts: number;
  /** Best percentage score (0-100, integer). Monotonic — `Math.max` on every result. */
  bestScore: number;
  /** ISO date string (YYYY-MM-DD) of the last attempt, or `''` if never played. */
  lastPlayed: string;
}

const storageKey = (gameId: string): string => `${gameId}_quiz_v1`;

/**
 * Load the persisted state for `gameId`, returning a fresh-zero state if
 * nothing is stored or the JSON is malformed. All fields are validated;
 * a partial / corrupt write can never crash the page.
 */
export const loadQuizState = (gameId: string): QuizState => {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return { attempts: 0, bestScore: 0, lastPlayed: '' };
    const parsed = JSON.parse(raw) as Partial<QuizState>;
    return {
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : '',
    };
  } catch {
    return { attempts: 0, bestScore: 0, lastPlayed: '' };
  }
};

export const saveQuizState = (gameId: string, s: QuizState): void => {
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(s));
    // Retention instrumentation (T-retention, 2026-05-20): every
    // quiz completion records a sitewide play datapoint for the
    // `/stats` activity chart. Placed at the saveQuizState level
    // (one site) rather than per-onComplete callsite so all 13
    // mountQuiz games inherit retention recording for free.
    // recordPlay handles SSR + storage-failure noops internally.
    recordPlay(gameId);
  } catch {
    /* LocalStorage full or disabled (Safari private mode) — silently noop. */
  }
};

/** Wipe the persisted quiz state for `gameId`. Used by future Settings's "Start Over". */
export const clearQuizState = (gameId: string): void => {
  try {
    localStorage.removeItem(storageKey(gameId));
  } catch {
    /* noop */
  }
};

/** HTML-escape a question/option string before injecting it via `innerHTML`. */
export const escapeQuizHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Optional message overrides, keyed by score band. Defaults match the Daily Routines shipping copy. */
export interface QuizMessages {
  /** Shown when score === 100%. */
  perfect?: string;
  /** Shown when score >= `greatGteThreshold` and < 100%. */
  great?: string;
  /** Shown when score < `greatGteThreshold`. */
  keepReading?: string;
}

export interface QuizControllerConfig {
  /** Stable per-game id for the LocalStorage key (`routines`, `woodcutter`, …). */
  gameId: string;
  /** The questions to ask, in display order. */
  questions: readonly QuizQuestion[];
  /** Container that holds question + option markup (cleared and rewritten per question). */
  bodyEl: HTMLElement;
  /** Container that holds the result block (revealed when the quiz finishes). */
  resultEl: HTMLElement;
  /** Element to write the result emoji into (e.g. 🌟 / 👏 / 📚). */
  resultEmojiEl: HTMLElement;
  /** Element to write the result text into. */
  resultTextEl: HTMLElement;
  /** Optional message overrides (see {@link QuizMessages}). */
  messages?: QuizMessages;
  /** Threshold (>=) for the "great" message; defaults to 63 (Routines' published value). */
  greatGteThreshold?: number;
  /** Called once on every 100% completion — caller decides confetti palette etc. */
  onPerfect?: () => void;
  /** Called on every option-button click (before scoring) — e.g. `playTap` SFX. */
  playTap?: () => void;
}

export interface QuizController {
  /** Start (or restart) the quiz from question 1. Idempotent. */
  start: () => void;
  /** Read-only snapshot of the in-memory state (latest persisted values). */
  getState: () => QuizState;
}

const DEFAULT_MESSAGES: Required<QuizMessages> = {
  perfect: 'Perfect! You got every answer right!',
  great: 'Great job!',
  keepReading: 'Read again and try once more!',
};

/**
 * Mount a quiz controller onto an existing DOM tree. The controller wires
 * a single delegated click listener on `bodyEl` that handles every
 * `.quiz-opt` button across every question (so re-rendering questions
 * doesn't leak listeners). Call `start()` once to render question 1, then
 * again to retry the quiz.
 */
export const mountQuiz = (cfg: QuizControllerConfig): QuizController => {
  let idx = 0;
  let correct = 0;
  let state = loadQuizState(cfg.gameId);
  const greatGte = cfg.greatGteThreshold ?? 63;
  const messages: Required<QuizMessages> = { ...DEFAULT_MESSAGES, ...(cfg.messages ?? {}) };

  const renderQuestion = (): void => {
    if (idx >= cfg.questions.length) {
      showResult();
      return;
    }
    const q = cfg.questions[idx]!;
    const total = cfg.questions.length;
    const headHtml =
      `<div class="quiz-question">${idx + 1}/${total}: ${escapeQuizHtml(q.q)}</div>`;
    const optsHtml = q.opts
      .map(
        (o, i) =>
          `<button type="button" class="quiz-opt" data-i="${i}">${escapeQuizHtml(o)}</button>`,
      )
      .join('');
    cfg.bodyEl.innerHTML = headHtml + optsHtml;
  };

  /**
   * Per-tap feedback timings (2026-05-20). Before this date the function
   * advanced to the next question instantly, which left wrong answers
   * with **zero** visible feedback — the screen just jumped, asymmetric
   * to the celebratory state on correct (perfect-score confetti via
   * `onPerfect`). The age-safe variant added here:
   *   - On correct: a 450ms `quiz-opt--correct` pop on the tapped button.
   *   - On wrong:   a 250ms shake on the tapped button (`--wrong`) + a
   *                 600ms green-ring pulse on the actual correct option
   *                 (`--reveal`) so the child sees what was right.
   * No red, no desaturation, no negative tone — shame-coded feedback
   * (red flash, buzzer) is the thing this flow deliberately avoids, and
   * that still holds: this quiz is the documented exemption to §5 rule 8,
   * which governs the preschool games' own answer loops. The reveal
   * celebrates the correct answer rather than condemning the miss. The
   * preschool-math triad (Counting Friends, More Friends, Number
   * Friends) does NOT use `mountQuiz` — its errorless guided-count flow
   * is page-local. See PROGRESS.md → 2026-05-20 entry.
   *
   * Amended 2026-08-23: "no colour" turned out to mean "no *static*
   * anything", so `--wrong` was made entirely of motion and vanished
   * under `prefers-reduced-motion` — measured pixel-identical to an
   * untouched option in four games. It now also carries a dashed slate
   * ring, which keeps the no-red rule while surviving a child who asked
   * for less motion. The tone decision was right; the carrier wasn't. */
  const ADVANCE_MS_CORRECT = 450;
  const ADVANCE_MS_WRONG = 700;

  // Re-entrancy guard for `onAnswer`. The `disabled` attribute on
  // every option button blocks user-initiated clicks during the
  // feedback gate, but a programmatic `dispatchEvent('click')` (used
  // by the re-entrancy regression test, and conceivable in a fast
  // assistive-tech repeat scenario) bypasses that suppression. The
  // closure flag below is the canonical guard — every entry path
  // checks it and the timeout that ends the feedback window resets
  // it, so a second tap mid-transition is a hard no-op rather than
  // a state-mutating second invocation.
  let answering = false;

  const onAnswer = (i: number): void => {
    if (answering) return;
    const q = cfg.questions[idx];
    if (!q) return;
    answering = true;

    const buttons = cfg.bodyEl.querySelectorAll<HTMLButtonElement>('.quiz-opt');
    // Disable every option during the feedback window. Belt-and-
    // braces with `answering`: the disabled attribute keeps the
    // user-visible affordance correct (cursor: not-allowed,
    // unresponsive hover) while `answering` is the actual hard
    // guard against re-entrant `onAnswer` calls.
    for (const b of buttons) b.disabled = true;

    let advanceMs: number;
    if (i === q.ans) {
      correct++;
      buttons[i]?.classList.add('quiz-opt--correct');
      advanceMs = ADVANCE_MS_CORRECT;
    } else {
      buttons[i]?.classList.add('quiz-opt--wrong');
      buttons[q.ans]?.classList.add('quiz-opt--reveal');
      advanceMs = ADVANCE_MS_WRONG;
    }

    setTimeout(() => {
      answering = false;
      idx++;
      renderQuestion();
    }, advanceMs);
  };

  const showResult = (): void => {
    cfg.bodyEl.style.display = 'none';
    const total = cfg.questions.length;
    const pct = Math.round((correct / total) * 100);

    const emoji = pct === 100 ? '🌟' : pct >= greatGte ? '👏' : '📚';
    const message =
      pct === 100 ? messages.perfect : pct >= greatGte ? messages.great : messages.keepReading;

    cfg.resultEmojiEl.textContent = emoji;
    cfg.resultTextEl.textContent = `${correct}/${total} correct (${pct}%) — ${message}`;
    cfg.resultEl.hidden = false;

    state = {
      attempts: state.attempts + 1,
      bestScore: Math.max(state.bestScore, pct),
      lastPlayed: todayLocal(),
    };
    saveQuizState(cfg.gameId, state);

    if (pct === 100) {
      cfg.onPerfect?.();
    }
  };

  cfg.bodyEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.quiz-opt');
    if (!btn) return;
    cfg.playTap?.();
    const i = Number(btn.dataset.i);
    if (Number.isNaN(i)) return;
    onAnswer(i);
  });

  return {
    start: () => {
      idx = 0;
      correct = 0;
      cfg.resultEl.hidden = true;
      cfg.bodyEl.style.removeProperty('display');
      renderQuestion();
    },
    getState: () => state,
  };
};
