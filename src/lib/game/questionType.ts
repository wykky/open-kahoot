/**
 * Question-type helpers. Single source of truth for reading multi-select state
 * off a Question. Every consumer (scoring, validators, UI, TSV) goes through here
 * so adding a third question type later (e.g. slider for V2) is a one-place change.
 */

import type { Question } from '@/types/game';

/**
 * True if the question accepts multiple correct answers. `undefined` questionType
 * (e.g. older DB rows) is treated as 'single' for backward compat.
 */
export function isMultiSelect(q: Pick<Question, 'questionType'>): boolean {
  return q.questionType === 'multi';
}

/**
 * Canonical set of correct option indices for the question. Always returns at least
 * one entry. For single-select, falls back to `correctAnswer`.
 */
export function getCorrectAnswerSet(q: Question): Set<number> {
  if (isMultiSelect(q) && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
    return new Set(q.correctAnswers);
  }
  return new Set([q.correctAnswer]);
}

/**
 * Sorted array of correct option indices. Useful for stable serialization (TSV,
 * display, "answer set" comparisons).
 */
export function getCorrectAnswerArray(q: Question): number[] {
  return Array.from(getCorrectAnswerSet(q)).sort((a, b) => a - b);
}

/**
 * Normalize a player's submission to a sorted array of selected indices.
 * - undefined / null            → []
 * - single number               → [n]
 * - array of numbers (multi)    → deduped + sorted
 */
export function normalizeSubmission(answer: number | number[] | null | undefined): number[] {
  if (answer === null || answer === undefined) return [];
  if (typeof answer === 'number') return [answer];
  return Array.from(new Set(answer)).sort((a, b) => a - b);
}

/**
 * Strict correctness check. True iff the player's selection set equals the correct set.
 *
 * For single-select: same as `submission === correctAnswer`.
 * For multi-select: ALL correct indices selected AND no incorrect indices selected.
 * Matches Kahoot's behavior (no partial credit) and keeps the rest of the scoring
 * pipeline (streak, first-correct, history) on a clean wasCorrect: boolean.
 */
export function isAnswerCorrect(
  question: Question,
  submission: number | number[] | null | undefined
): boolean {
  const submitted = normalizeSubmission(submission);
  if (submitted.length === 0) return false;
  const correct = getCorrectAnswerSet(question);
  if (submitted.length !== correct.size) return false;
  for (const idx of submitted) {
    if (!correct.has(idx)) return false;
  }
  return true;
}

/**
 * Serialize a submission to a stable string for TSV/log storage.
 * Single-select returns the number as-is; multi-select returns "0,2" style.
 */
export function serializeSubmission(answer: number | number[] | null | undefined): number | string | null {
  if (answer === null || answer === undefined) return null;
  if (typeof answer === 'number') return answer;
  if (answer.length === 1) return answer[0];
  return Array.from(new Set(answer)).sort((a, b) => a - b).join(',');
}

/**
 * Inverse of serializeSubmission: parse the stored answer column back to an index array.
 * Accepts the in-memory shape used by AnswerRecord (number | string | null).
 */
export function parseAnswerIndices(stored: number | string | null | undefined): number[] {
  if (stored === null || stored === undefined) return [];
  if (typeof stored === 'number') return [stored];
  return stored
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n));
}
