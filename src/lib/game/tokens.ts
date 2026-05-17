/**
 * Stateless HMAC tokens for host and player identity.
 *
 * The server holds a secret (GAME_SECRET, falling back to AUTH_SECRET).
 * Tokens are derived as HMAC_SHA256(secret, `${role}:${gameId}:${userId}`)
 * truncated to 32 hex chars (128 bits — plenty for an in-memory game session).
 *
 * Verification is constant-time. No server-side storage is needed:
 * given (token, gameId, userId), we recompute the expected token and compare.
 *
 * Why stateless:
 *   - Restarts that wipe in-memory games also implicitly invalidate tokens (good).
 *   - No token table to leak, expire, or garbage-collect.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const SECRET =
  process.env.GAME_SECRET ||
  process.env.AUTH_SECRET ||
  'dev-only-game-secret-do-not-use-in-prod';

if (process.env.NODE_ENV === 'production' && SECRET === 'dev-only-game-secret-do-not-use-in-prod') {
  console.warn(
    '[tokens] WARNING: neither GAME_SECRET nor AUTH_SECRET is set in production. Tokens will be guessable.'
  );
}

const TOKEN_HEX_LEN = 32; // 128 bits

function makeToken(role: 'host' | 'player', gameId: string, userId: string): string {
  return createHmac('sha256', SECRET)
    .update(`${role}:${gameId}:${userId}`)
    .digest('hex')
    .slice(0, TOKEN_HEX_LEN);
}

function verify(
  expected: string,
  actual: unknown
): boolean {
  if (typeof actual !== 'string' || actual.length !== TOKEN_HEX_LEN) return false;
  // Both buffers must be the same length for timingSafeEqual.
  const expBuf = Buffer.from(expected, 'utf8');
  const actBuf = Buffer.from(actual, 'utf8');
  if (expBuf.length !== actBuf.length) return false;
  try {
    return timingSafeEqual(expBuf, actBuf);
  } catch {
    return false;
  }
}

export function issueHostToken(gameId: string, hostId: string): string {
  return makeToken('host', gameId, hostId);
}

export function issuePlayerToken(gameId: string, playerId: string): string {
  return makeToken('player', gameId, playerId);
}

export function verifyHostToken(token: unknown, gameId: string, hostId: string): boolean {
  return verify(makeToken('host', gameId, hostId), token);
}

export function verifyPlayerToken(token: unknown, gameId: string, playerId: string): boolean {
  return verify(makeToken('player', gameId, playerId), token);
}
