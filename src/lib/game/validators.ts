/**
 * Input validation for socket events.
 *
 * Every client-sent value is untrusted. These guards reject malformed,
 * oversized, or out-of-range payloads BEFORE they reach game state.
 *
 * Returns null when valid, or a short error string when invalid.
 */

import type { Question, GameSettings } from '@/types/game';

// Tunables — bump if a legitimate user hits a cap.
export const LIMITS = {
  TITLE_MAX: 200,
  QUESTIONS_MAX: 200,
  QUESTION_TEXT_MAX: 1000,
  OPTION_TEXT_MAX: 300,
  OPTIONS_COUNT: 4,
  EXPLANATION_MAX: 2000,
  IMAGE_URL_MAX: 2048,
  PLAYER_NAME_MAX: 30,
  PIN_REGEX: /^\d{4,8}$/,
  ID_MAX: 100, // gameId / questionId / persistentId
  TIME_MIN: 3,
  TIME_MAX: 120,
};

function isStr(v: unknown): v is string {
  return typeof v === 'string';
}

function isFiniteInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && Number.isFinite(v);
}

export function validateCreateGamePayload(
  title: unknown,
  questions: unknown,
  settings: unknown
): string | null {
  if (!isStr(title) || title.length === 0 || title.length > LIMITS.TITLE_MAX) {
    return 'Invalid title';
  }
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > LIMITS.QUESTIONS_MAX) {
    return `Invalid questions (must be 1..${LIMITS.QUESTIONS_MAX})`;
  }
  for (let i = 0; i < questions.length; i++) {
    const err = validateQuestion(questions[i], i);
    if (err) return err;
  }
  return validateSettings(settings);
}

function validateQuestion(q: unknown, index: number): string | null {
  if (!q || typeof q !== 'object') return `Q${index + 1}: not an object`;
  const Q = q as Partial<Question>;
  if (!isStr(Q.id) || Q.id.length === 0 || Q.id.length > LIMITS.ID_MAX) {
    return `Q${index + 1}: invalid id`;
  }
  if (!isStr(Q.question) || Q.question.length === 0 || Q.question.length > LIMITS.QUESTION_TEXT_MAX) {
    return `Q${index + 1}: invalid question text`;
  }
  if (!Array.isArray(Q.options) || Q.options.length !== LIMITS.OPTIONS_COUNT) {
    return `Q${index + 1}: must have exactly ${LIMITS.OPTIONS_COUNT} options`;
  }
  for (let j = 0; j < Q.options.length; j++) {
    const opt = Q.options[j];
    if (!isStr(opt) || opt.length === 0 || opt.length > LIMITS.OPTION_TEXT_MAX) {
      return `Q${index + 1} option ${j + 1}: invalid`;
    }
  }
  if (!isFiniteInt(Q.correctAnswer) || Q.correctAnswer < 0 || Q.correctAnswer >= LIMITS.OPTIONS_COUNT) {
    return `Q${index + 1}: correctAnswer out of range`;
  }
  if (Q.questionType !== undefined && Q.questionType !== 'single' && Q.questionType !== 'multi') {
    return `Q${index + 1}: questionType must be 'single' or 'multi'`;
  }
  if (Q.questionType === 'multi') {
    if (!Array.isArray(Q.correctAnswers) || Q.correctAnswers.length < 2 || Q.correctAnswers.length >= LIMITS.OPTIONS_COUNT) {
      return `Q${index + 1}: multi-select needs 2 or 3 correct answers`;
    }
    const seen = new Set<number>();
    for (const idx of Q.correctAnswers) {
      if (!isFiniteInt(idx) || idx < 0 || idx >= LIMITS.OPTIONS_COUNT) {
        return `Q${index + 1}: correctAnswers index out of range`;
      }
      if (seen.has(idx)) return `Q${index + 1}: correctAnswers has duplicates`;
      seen.add(idx);
    }
    if (!seen.has(Q.correctAnswer)) {
      return `Q${index + 1}: correctAnswer must be one of correctAnswers`;
    }
  } else if (Q.correctAnswers !== undefined) {
    return `Q${index + 1}: correctAnswers only allowed for multi-select questions`;
  }
  if (!isFiniteInt(Q.timeLimit) || Q.timeLimit < LIMITS.TIME_MIN || Q.timeLimit > LIMITS.TIME_MAX) {
    return `Q${index + 1}: timeLimit must be ${LIMITS.TIME_MIN}..${LIMITS.TIME_MAX}s`;
  }
  if (Q.explanation !== undefined && (!isStr(Q.explanation) || Q.explanation.length > LIMITS.EXPLANATION_MAX)) {
    return `Q${index + 1}: invalid explanation`;
  }
  if (Q.image !== undefined && Q.image !== '' && Q.image !== null) {
    if (!isStr(Q.image) || Q.image.length > LIMITS.IMAGE_URL_MAX || !/^https?:\/\//i.test(Q.image)) {
      return `Q${index + 1}: image must be an https?:// URL up to ${LIMITS.IMAGE_URL_MAX} chars`;
    }
  }
  return null;
}

function validateSettings(s: unknown): string | null {
  if (!s || typeof s !== 'object') return 'Invalid settings';
  const S = s as Partial<GameSettings>;
  if (!isFiniteInt(S.thinkTime) || S.thinkTime < LIMITS.TIME_MIN || S.thinkTime > LIMITS.TIME_MAX) {
    return `Invalid thinkTime (${LIMITS.TIME_MIN}..${LIMITS.TIME_MAX}s)`;
  }
  if (!isFiniteInt(S.answerTime) || S.answerTime < LIMITS.TIME_MIN || S.answerTime > LIMITS.TIME_MAX) {
    return `Invalid answerTime (${LIMITS.TIME_MIN}..${LIMITS.TIME_MAX}s)`;
  }
  if (S.showQuestionOnPlayers !== undefined && typeof S.showQuestionOnPlayers !== 'boolean') {
    return 'Invalid showQuestionOnPlayers';
  }
  if (S.shuffleAnswers !== undefined && typeof S.shuffleAnswers !== 'boolean') {
    return 'Invalid shuffleAnswers';
  }
  return null;
}

export function validateJoinGamePayload(
  pin: unknown,
  playerName: unknown,
  persistentId: unknown
): string | null {
  if (!isStr(pin) || !LIMITS.PIN_REGEX.test(pin)) return 'Invalid PIN';
  if (!isStr(playerName)) return 'Invalid name';
  // Normalize before length check so multi-byte/Unicode characters count as graphemes-ish.
  const trimmed = playerName.normalize('NFC').trim();
  if (trimmed.length === 0 || trimmed.length > LIMITS.PLAYER_NAME_MAX) {
    return `Name must be 1..${LIMITS.PLAYER_NAME_MAX} characters`;
  }
  // persistentId may be null (fresh join) or a string (reconnect). Anything else is invalid.
  if (persistentId != null) {
    if (!isStr(persistentId) || persistentId.length > LIMITS.ID_MAX) {
      return 'Invalid persistentId';
    }
  }
  return null;
}

export function validateSubmitAnswerPayload(
  gameId: unknown,
  questionId: unknown,
  answer: unknown,
  persistentId: unknown
): string | null {
  if (!isStr(gameId) || gameId.length === 0 || gameId.length > LIMITS.ID_MAX) return 'Invalid gameId';
  if (!isStr(questionId) || questionId.length === 0 || questionId.length > LIMITS.ID_MAX) return 'Invalid questionId';
  // answer may be a single index (single-select) OR an array of distinct indices (multi-select).
  if (Array.isArray(answer)) {
    if (answer.length === 0 || answer.length > LIMITS.OPTIONS_COUNT) {
      return 'Invalid answer (array length)';
    }
    const seen = new Set<number>();
    for (const idx of answer) {
      if (!isFiniteInt(idx) || idx < 0 || idx >= LIMITS.OPTIONS_COUNT) return 'Invalid answer index';
      if (seen.has(idx)) return 'Duplicate answer index';
      seen.add(idx);
    }
  } else if (!isFiniteInt(answer) || answer < 0 || answer >= LIMITS.OPTIONS_COUNT) {
    return 'Invalid answer';
  }
  if (persistentId !== undefined) {
    if (!isStr(persistentId) || persistentId.length > LIMITS.ID_MAX) return 'Invalid persistentId';
  }
  return null;
}

export function validateGameId(gameId: unknown): string | null {
  if (!isStr(gameId) || gameId.length === 0 || gameId.length > LIMITS.ID_MAX) return 'Invalid gameId';
  return null;
}
