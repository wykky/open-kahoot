/**
 * SQLite persistence for Atenu Live.
 *
 * Storage: one file at /app/data/atenu.db (mounted from /opt/stack/atenu-live/data on host).
 * Library: better-sqlite3 (synchronous, native binding, ~1µs per query).
 *
 * Phase 4A: games + questions + players + answers (live game state)
 * Phase 4B: users (Google + Telegram identity persistence)
 * Phase 4C: leaderboard SQL helpers
 *
 * Restic backups already cover /opt/stack/* — DB is included automatically.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Game, Player, AnswerRecord } from '@/types/game';

const DB_PATH = process.env.ATENU_DB_PATH || '/app/data/atenu.db';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');     // better concurrent reads, durable writes
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');   // good durability/perf tradeoff with WAL
  migrate(db);
  return db;
}

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                  TEXT PRIMARY KEY,
      provider            TEXT NOT NULL,
      provider_user_id    TEXT NOT NULL,
      email               TEXT,
      name                TEXT,
      avatar_url          TEXT,
      vip                 INTEGER NOT NULL DEFAULT 0,
      created_at          INTEGER NOT NULL,
      last_seen_at        INTEGER NOT NULL,
      UNIQUE(provider, provider_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS games (
      id                      TEXT PRIMARY KEY,
      pin                     TEXT NOT NULL,
      host_user_id            TEXT,
      host_player_id          TEXT NOT NULL,
      title                   TEXT NOT NULL,
      settings_json           TEXT NOT NULL,
      status                  TEXT NOT NULL,
      current_question_index  INTEGER NOT NULL DEFAULT -1,
      player_count            INTEGER NOT NULL DEFAULT 0,
      question_count          INTEGER NOT NULL,
      created_at              INTEGER NOT NULL,
      started_at              INTEGER,
      finished_at             INTEGER,
      tsv_data                TEXT,
      FOREIGN KEY (host_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_games_host_user ON games(host_user_id);
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_finished_at ON games(finished_at);

    CREATE TABLE IF NOT EXISTS questions (
      game_id         TEXT NOT NULL,
      question_index  INTEGER NOT NULL,
      id              TEXT NOT NULL,
      text            TEXT NOT NULL,
      options_json    TEXT NOT NULL,
      correct_answer  INTEGER NOT NULL,
      time_limit      INTEGER NOT NULL,
      explanation     TEXT,
      image_url       TEXT,
      PRIMARY KEY (game_id, question_index),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
      id                      TEXT NOT NULL,
      game_id                 TEXT NOT NULL,
      user_id                 TEXT,
      name                    TEXT NOT NULL,
      final_score             INTEGER NOT NULL DEFAULT 0,
      is_host                 INTEGER NOT NULL DEFAULT 0,
      has_dyslexia_support    INTEGER NOT NULL DEFAULT 0,
      joined_at               INTEGER NOT NULL,
      PRIMARY KEY (id, game_id),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
    CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);

    CREATE TABLE IF NOT EXISTS answers (
      game_id                 TEXT NOT NULL,
      player_id               TEXT NOT NULL,
      question_index          INTEGER NOT NULL,
      answer_index            INTEGER,
      answer_time             INTEGER,
      response_time_ms        INTEGER NOT NULL,
      points_earned           INTEGER NOT NULL,
      was_correct             INTEGER NOT NULL,
      has_dyslexia_support    INTEGER NOT NULL,
      PRIMARY KEY (game_id, player_id, question_index),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_answers_player ON answers(player_id);
    CREATE INDEX IF NOT EXISTS idx_answers_game ON answers(game_id);
  `);
}

// ============================================================================
// USERS
// ============================================================================

export interface DbUser {
  id: string;
  provider: 'google' | 'telegram';
  provider_user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  vip: number;
  created_at: number;
  last_seen_at: number;
}

export function upsertUser(input: {
  provider: 'google' | 'telegram';
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}): DbUser {
  const d = getDb();
  const now = Date.now();
  const existing = d
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_user_id = ?')
    .get(input.provider, input.providerUserId) as DbUser | undefined;

  if (existing) {
    d.prepare(
      'UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), last_seen_at = ? WHERE id = ?'
    ).run(input.email ?? null, input.name ?? null, input.avatarUrl ?? null, now, existing.id);
    return { ...existing, email: input.email ?? existing.email, name: input.name ?? existing.name, last_seen_at: now };
  }

  const id = crypto.randomUUID();
  const row: DbUser = {
    id,
    provider: input.provider,
    provider_user_id: input.providerUserId,
    email: input.email ?? null,
    name: input.name ?? null,
    avatar_url: input.avatarUrl ?? null,
    vip: 0,
    created_at: now,
    last_seen_at: now,
  };
  d.prepare(
    'INSERT INTO users (id, provider, provider_user_id, email, name, avatar_url, vip, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(row.id, row.provider, row.provider_user_id, row.email, row.name, row.avatar_url, row.vip, row.created_at, row.last_seen_at);
  return row;
}

export function getUserById(id: string): DbUser | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser | undefined;
}

// ============================================================================
// GAMES
// ============================================================================

export function insertGame(game: Game, hostUserId: string | null): void {
  const d = getDb();
  const now = Date.now();
  const insertGameStmt = d.prepare(
    `INSERT OR REPLACE INTO games (
      id, pin, host_user_id, host_player_id, title, settings_json, status,
      current_question_index, player_count, question_count, created_at,
      started_at, finished_at, tsv_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertQuestionStmt = d.prepare(
    `INSERT OR REPLACE INTO questions (
      game_id, question_index, id, text, options_json, correct_answer, time_limit, explanation, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = d.transaction(() => {
    insertGameStmt.run(
      game.id,
      game.pin,
      hostUserId,
      game.hostId,
      game.title,
      JSON.stringify(game.settings),
      game.status,
      game.currentQuestionIndex,
      game.players.filter((p) => !p.isHost).length,
      game.questions.length,
      now,
      null,
      null,
      null
    );
    game.questions.forEach((q, idx) => {
      insertQuestionStmt.run(
        game.id,
        idx,
        q.id,
        q.question,
        JSON.stringify(q.options),
        q.correctAnswer,
        q.timeLimit,
        q.explanation ?? null,
        q.image ?? null
      );
    });
  });
  tx();
}

export function updateGameStatus(gameId: string, status: string, currentQuestionIndex: number): void {
  getDb()
    .prepare('UPDATE games SET status = ?, current_question_index = ?, started_at = COALESCE(started_at, CASE WHEN status = ? THEN NULL ELSE ? END) WHERE id = ?')
    .run(status, currentQuestionIndex, 'waiting', Date.now(), gameId);
}

export function finishGame(gameId: string, tsvData: string, finalPlayers: Player[]): void {
  const d = getDb();
  const now = Date.now();
  const tx = d.transaction(() => {
    d.prepare('UPDATE games SET status = ?, finished_at = ?, tsv_data = ?, player_count = ? WHERE id = ?').run(
      'finished',
      now,
      tsvData,
      finalPlayers.filter((p) => !p.isHost).length,
      gameId
    );
    const updPlayer = d.prepare('UPDATE players SET final_score = ? WHERE id = ? AND game_id = ?');
    finalPlayers.forEach((p) => updPlayer.run(p.score, p.id, gameId));
  });
  tx();
}

export function getGameTsv(gameId: string): string | null {
  const row = getDb().prepare('SELECT tsv_data FROM games WHERE id = ?').get(gameId) as { tsv_data: string | null } | undefined;
  return row?.tsv_data ?? null;
}

export function getGamePin(gameId: string): string | null {
  const row = getDb().prepare('SELECT pin FROM games WHERE id = ?').get(gameId) as { pin: string } | undefined;
  return row?.pin ?? null;
}

/** Boot sweep: any non-finished game becomes finished (server crashed mid-game). */
export function sweepInflightGamesOnBoot(generateTsv: (gameId: string) => string | null): number {
  const d = getDb();
  const inflight = d
    .prepare("SELECT id FROM games WHERE status != 'finished'")
    .all() as { id: string }[];
  let count = 0;
  for (const { id } of inflight) {
    const tsv = generateTsv(id);
    d.prepare('UPDATE games SET status = ?, finished_at = ?, tsv_data = ? WHERE id = ?').run(
      'finished',
      Date.now(),
      tsv,
      id
    );
    count++;
  }
  return count;
}

/** Retention sweep: delete games finished more than `days` ago. */
export function deleteOldGames(days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return getDb().prepare('DELETE FROM games WHERE finished_at IS NOT NULL AND finished_at < ?').run(cutoff).changes;
}

// ============================================================================
// PLAYERS
// ============================================================================

export function upsertPlayer(gameId: string, player: Player, userId: string | null): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO players (
        id, game_id, user_id, name, final_score, is_host, has_dyslexia_support, joined_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        COALESCE((SELECT joined_at FROM players WHERE id = ? AND game_id = ?), ?)
      )`
    )
    .run(
      player.id,
      gameId,
      userId,
      player.name,
      player.score,
      player.isHost ? 1 : 0,
      player.hasDyslexiaSupport ? 1 : 0,
      player.id,
      gameId,
      Date.now()
    );
}

export function updatePlayerScore(gameId: string, playerId: string, score: number): void {
  getDb().prepare('UPDATE players SET final_score = ? WHERE id = ? AND game_id = ?').run(score, playerId, gameId);
}

// ============================================================================
// ANSWERS
// ============================================================================

export function insertAnswer(gameId: string, answer: AnswerRecord): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO answers (
        game_id, player_id, question_index, answer_index, answer_time,
        response_time_ms, points_earned, was_correct, has_dyslexia_support
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      gameId,
      answer.playerId,
      answer.questionIndex,
      answer.answerIndex,
      answer.answerTime ?? null,
      answer.responseTime,
      answer.pointsEarned,
      answer.wasCorrect ? 1 : 0,
      answer.hasDyslexiaSupport ? 1 : 0
    );
}

// ============================================================================
// LEADERBOARDS (Phase 4C)
// ============================================================================

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  games_played: number;
  correct_count: number;
  total_answers: number;
}

/**
 * Top signed-in users by total points earned during a time window.
 * Anonymous players (players.user_id IS NULL) are excluded.
 */
export function getLeaderboard(opts: { sinceTs?: number; limit?: number } = {}): LeaderboardEntry[] {
  const limit = opts.limit ?? 50;
  const sinceTs = opts.sinceTs ?? 0;
  return getDb()
    .prepare(
      `SELECT
        u.id                                       AS user_id,
        COALESCE(u.name, 'Player')                 AS name,
        u.avatar_url                               AS avatar_url,
        SUM(a.points_earned)                       AS total_points,
        COUNT(DISTINCT a.game_id)                  AS games_played,
        SUM(CASE WHEN a.was_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
        COUNT(*)                                   AS total_answers
       FROM answers a
       JOIN players p ON p.id = a.player_id AND p.game_id = a.game_id
       JOIN users u ON u.id = p.user_id
       JOIN games g ON g.id = a.game_id
       WHERE g.finished_at IS NOT NULL
         AND g.finished_at >= ?
         AND p.is_host = 0
       GROUP BY u.id
       ORDER BY total_points DESC
       LIMIT ?`
    )
    .all(sinceTs, limit) as LeaderboardEntry[];
}

// ============================================================================
// BOOT
// ============================================================================

export function initDb(): void {
  getDb();
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
