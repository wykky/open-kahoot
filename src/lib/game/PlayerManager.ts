import { v4 as uuidv4 } from 'uuid';
import type { Game, Player, Question } from '@/types/game';
import { issuePlayerToken, verifyPlayerToken } from './tokens';
import { upsertPlayer, insertAnswer, updatePlayerScore } from '@/lib/db';

// Phase 8: adaptive scoring trust window — accept client-reported time if within 2s of server-measured.
const TRUST_WINDOW_MS = 2000;
// Kahoot-style 500-pt floor for correct answers: 1000*(1-r/2) — 1000 at t=0, 500 at deadline.
// On 3G, this stops penalizing students who answered correctly but slowly into ~0 points territory.
const MAX_POINTS_PER_QUESTION = 1000;
// Dyslexia accessibility: reduce the time penalty fraction by 20% before applying the /2 floor.
const DYSLEXIA_TIME_PENALTY_MULTIPLIER = 0.8;
// Streak/combo bonus: matches Kahoot's pattern. Streak 1 = no bonus (first correct, no chain yet),
// streak 2 = +100, ..., streak 6+ = +500 capped. Reset to 0 on any wrong / no answer.
const STREAK_BONUS_PER_STEP = 100;
const STREAK_BONUS_MAX = 500;
// Flat bonus for the player who submitted the earliest correct answer on a question.
const FIRST_CORRECT_BONUS = 100;

function streakBonusFor(streak: number): number {
  return Math.min(STREAK_BONUS_MAX, Math.max(0, (streak - 1) * STREAK_BONUS_PER_STEP));
}

/**
 * Canonical scoring math — single source of truth for "how many points did this player
 * earn on this question". Called once per (player, question) by updateScores. Result is
 * cached on player.lastPointsEarned so storeAnswersToHistory and getPersonalResult can
 * read the same number without recomputing (and without drifting from each other).
 */
export function computeQuestionPoints(player: Player, game: Game, question: Question): number {
  if (player.isHost) return 0;
  if (player.currentAnswer === undefined) return 0;
  if (player.currentAnswer !== question.correctAnswer) return 0;

  const questionStartTime = game.questionStartTime || Date.now();
  const answerTimeLimit = game.settings.answerTime * 1000;

  const serverResponseMs = (player.answerTime || Date.now()) - questionStartTime;
  let scoringResponseMs = serverResponseMs;
  if (
    typeof player.perceivedResponseMs === 'number' &&
    player.perceivedResponseMs >= 0 &&
    Math.abs(serverResponseMs - player.perceivedResponseMs) <= TRUST_WINDOW_MS
  ) {
    scoringResponseMs = player.perceivedResponseMs;
  }

  const timeUsedRatio = Math.max(0, Math.min(1, scoringResponseMs / answerTimeLimit));
  const adjusted = player.hasDyslexiaSupport
    ? timeUsedRatio * DYSLEXIA_TIME_PENALTY_MULTIPLIER
    : timeUsedRatio;

  return Math.max(0, Math.round(MAX_POINTS_PER_QUESTION * (1 - adjusted / 2)));
}

export interface JoinGameResult {
  success: boolean;
  game?: Game;
  playerId?: string;
  playerToken?: string;
  isReconnection?: boolean;
  reason?: string; // diagnostic for debug logs
  kickedSocketId?: string; // Phase 7: the OLD socket holding this player's identity, to be kicked
}

export class PlayerManager {
  // Per-game per-player per-question option permutations. Key: "playerId:questionIndex".
  // Generated lazily on first emit to the player; consumed by translateAnswerIndex on submit.
  // Lives only in memory — regenerated if the player reconnects on a fresh server.
  private optionPermutations = new Map<string, Map<string, number[]>>();

  private getOrCreatePermutation(gameId: string, playerId: string, questionIndex: number, optionCount: number): number[] {
    let gameMap = this.optionPermutations.get(gameId);
    if (!gameMap) {
      gameMap = new Map();
      this.optionPermutations.set(gameId, gameMap);
    }
    const key = `${playerId}:${questionIndex}`;
    let perm = gameMap.get(key);
    if (!perm) {
      // Fisher-Yates. Math.random is fine here — this is anti-peek, not crypto.
      perm = Array.from({ length: optionCount }, (_, i) => i);
      for (let i = perm.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [perm[i], perm[j]] = [perm[j]!, perm[i]!];
      }
      gameMap.set(key, perm);
    }
    return perm;
  }

  /**
   * Returns a question with options reordered for this player. Caller must use this
   * when settings.shuffleAnswers is true; otherwise just pass the canonical question.
   */
  getShuffledQuestionForPlayer(game: Game, player: Player, question: Question): Question {
    if (!game.settings.shuffleAnswers) return question;
    const perm = this.getOrCreatePermutation(game.id, player.id, game.currentQuestionIndex, question.options.length);
    return { ...question, options: perm.map((i) => question.options[i]!) };
  }

  /**
   * Map a player's "what they clicked" index (in their shuffled space) back to the
   * canonical option index used by question.correctAnswer.
   */
  translateAnswerIndex(game: Game, player: Player, clickedIndex: number): number {
    if (!game.settings.shuffleAnswers) return clickedIndex;
    const gameMap = this.optionPermutations.get(game.id);
    const perm = gameMap?.get(`${player.id}:${game.currentQuestionIndex}`);
    if (!perm) return clickedIndex; // No perm yet (shouldn't happen — emit always precedes submit)
    return perm[clickedIndex] ?? clickedIndex;
  }

  clearOptionPermutations(gameId: string): void {
    this.optionPermutations.delete(gameId);
  }

  /**
   * Phase 2: joinGame requires a playerToken for reconnection.
   * - persistentId without a valid token → treated as a new join (rejected if mid-game)
   * - persistentId WITH valid token → reconnection, updates socketId & marks connected
   * - no persistentId → fresh join in waiting phase only, issues a new playerToken
   */
  joinGame(
    game: Game,
    socketId: string,
    playerName: string,
    persistentId: string | null = null,
    playerToken: string | null = null,
    userId: string | null = null
  ): JoinGameResult {
    // Reconnection attempt
    if (persistentId) {
      const existingPlayer = game.players.find((p) => p.id === persistentId);
      if (existingPlayer && !existingPlayer.isHost) {
        if (!playerToken || !verifyPlayerToken(playerToken, game.id, persistentId)) {
          return { success: false, reason: 'invalid playerToken on reconnect' };
        }
        // Phase 7: single-active-session lock — capture old socketId so the previous tab can be kicked
        const kickedSocketId =
          existingPlayer.socketId && existingPlayer.socketId !== socketId
            ? existingPlayer.socketId
            : undefined;
        existingPlayer.socketId = socketId;
        existingPlayer.isConnected = true;
        // Phase 4: refresh DB record (link userId if newly signed in)
        try { upsertPlayer(game.id, existingPlayer, userId); } catch (e) { console.error('[db] upsertPlayer failed:', e); }
        return {
          success: true,
          game,
          playerId: persistentId,
          playerToken,
          isReconnection: true,
          kickedSocketId,
        };
      }
      // persistentId provided but no matching player → fall through to fresh join
    }

    // Fresh join — only during waiting phase
    if (game.status !== 'waiting') {
      return { success: false, reason: 'game not in waiting phase' };
    }

    // Reject duplicate names (active OR disconnected, NFC-normalized)
    const normalized = playerName.normalize('NFC').trim();
    if (game.players.some((p) => !p.isHost && p.name.normalize('NFC').trim() === normalized)) {
      return { success: false, reason: 'name taken' };
    }

    const playerId = uuidv4();
    const newPlayer: Player = {
      id: playerId,
      socketId,
      name: normalized,
      score: 0,
      isHost: false,
      isConnected: true,
    };
    game.players.push(newPlayer);
    // Phase 4: persist new player
    try { upsertPlayer(game.id, newPlayer, userId); } catch (e) { console.error('[db] upsertPlayer failed:', e); }
    return {
      success: true,
      game,
      playerId,
      playerToken: issuePlayerToken(game.id, playerId),
      isReconnection: false,
    };
  }

  disconnectPlayer(socketId: string, game: Game): Player | undefined {
    const player = game.players.find((p) => p.socketId === socketId);
    if (player) {
      player.isConnected = false;
      return player;
    }
    return undefined;
  }

  removePlayer(playerId: string, game: Game): boolean {
    const idx = game.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      const player = game.players[idx];
      game.players.splice(idx, 1);
      console.log(`[PIN ${game.pin}] Removed player ${player.name} (${player.id})`);
      return true;
    }
    return false;
  }

  getPlayerBySocketId(socketId: string, game: Game): Player | undefined {
    return game.players.find((p) => p.socketId === socketId);
  }

  getPlayerById(playerId: string, game: Game): Player | undefined {
    return game.players.find((p) => p.id === playerId);
  }

  getConnectedPlayers(game: Game): Player[] {
    return game.players.filter((p) => p.isConnected && !p.isHost);
  }

  getHost(game: Game): Player | undefined {
    return game.players.find((p) => p.isHost);
  }

  isHost(socketId: string, game: Game): boolean {
    const p = this.getPlayerBySocketId(socketId, game);
    return p?.isHost ?? false;
  }

  submitAnswer(
    game: Game,
    playerId: string,
    answerIndex: number,
    isPersistentId: boolean = false,
    clientPerceivedMs?: number
  ): boolean {
    const player = isPersistentId
      ? this.getPlayerById(playerId, game)
      : this.getPlayerBySocketId(playerId, game);
    if (!player || player.isHost) return false;
    if (player.currentAnswer !== undefined) return false; // no double answers
    // Translate from player's shuffled space to canonical (no-op if shuffleAnswers is off)
    const canonicalIndex = this.translateAnswerIndex(game, player, answerIndex);
    player.currentAnswer = canonicalIndex;
    player.answerTime = Date.now();
    if (typeof clientPerceivedMs === 'number' && clientPerceivedMs >= 0) {
      player.perceivedResponseMs = clientPerceivedMs; // Phase 8: adaptive scoring input
    }
    return true;
  }

  clearAnswers(game: Game): void {
    game.players.forEach((player) => {
      if (!player.isHost) {
        delete player.currentAnswer;
        delete player.answerTime;
        delete player.perceivedResponseMs;
        delete player.lastPointsEarned;
        // streakBonus / firstCorrectBonus reset by next updateScores so they reflect
        // the just-scored question while results phase is showing; don't clear here.
        // currentStreak intentionally persists across clearAnswers.
      }
    });
  }

  /**
   * Canonical scoring step. Idempotent via game.scoredQuestions — safe to call from
   * executeResultsPhase (the normal path) AND executeFinishedPhase (the safety net for
   * endGame-from-non-results / idle-GC / host-disconnect-timeout, which otherwise leaves
   * the final question unscored). Computes points once and caches on player.lastPointsEarned
   * so storeAnswersToHistory / getPersonalResult read the same number.
   */
  updateScores(game: Game, question: Question): void {
    if (!game.scoredQuestions) game.scoredQuestions = [];
    if (game.scoredQuestions.includes(game.currentQuestionIndex)) return;
    game.scoredQuestions.push(game.currentQuestionIndex);

    // First-correct: the earliest correct submitter. Use server-measured answerTime
    // (not perceived) since perceived is a client-reported value, vulnerable to spoofing.
    const correctPlayers = game.players.filter(
      (p) => !p.isHost && p.currentAnswer === question.correctAnswer && p.answerTime !== undefined
    );
    correctPlayers.sort((a, b) => (a.answerTime ?? Infinity) - (b.answerTime ?? Infinity));
    const firstCorrectId = correctPlayers[0]?.id;

    game.players.forEach((player) => {
      if (player.isHost) return;
      const basePoints = computeQuestionPoints(player, game, question);
      const wasCorrect = basePoints > 0;

      if (wasCorrect) {
        const newStreak = (player.currentStreak ?? 0) + 1;
        const streakBonus = streakBonusFor(newStreak);
        const firstCorrectBonus = player.id === firstCorrectId ? FIRST_CORRECT_BONUS : 0;
        const totalEarned = basePoints + streakBonus + firstCorrectBonus;
        player.currentStreak = newStreak;
        player.streakBonus = streakBonus;
        player.firstCorrectBonus = firstCorrectBonus;
        player.lastPointsEarned = totalEarned;
        player.score += totalEarned;
        const supportStatus = player.hasDyslexiaSupport ? ' (with dyslexia support)' : '';
        const serverResponseMs = (player.answerTime || Date.now()) - (game.questionStartTime || Date.now());
        const usedClient =
          typeof player.perceivedResponseMs === 'number' &&
          player.perceivedResponseMs >= 0 &&
          Math.abs(serverResponseMs - player.perceivedResponseMs) <= TRUST_WINDOW_MS &&
          player.perceivedResponseMs !== serverResponseMs;
        const streakTag = streakBonus > 0 ? ` [streak ${newStreak} +${streakBonus}]` : '';
        const firstTag = firstCorrectBonus > 0 ? ` [first +${firstCorrectBonus}]` : '';
        console.log(`[PIN ${game.pin}] ${player.name} +${totalEarned}${supportStatus}${usedClient ? ' [client-time]' : ''}${streakTag}${firstTag} | Total: ${player.score}`);
        try { updatePlayerScore(game.id, player.id, player.score); } catch (e) { console.error('[db] updatePlayerScore failed:', e); }
      } else {
        // Wrong / no answer breaks the streak. Cache 0 so getPersonalResult shows
        // the +0 outcome consistently with TSV row.
        player.currentStreak = 0;
        player.streakBonus = 0;
        player.firstCorrectBonus = 0;
        player.lastPointsEarned = 0;
      }
    });
  }

  storeAnswersToHistory(game: Game): void {
    const question = game.questions[game.currentQuestionIndex];
    if (!question) return;
    // Idempotent on (game, questionIndex): the natural path calls this once per question
    // in executePreprationPhase, and executeFinishedPhase also calls it for the final
    // question. Without the guard, the last question's records double up after clearAnswers
    // (the second pass sees player.currentAnswer = undefined and writes an empty row).
    if (game.answerHistory.some((r) => r.questionIndex === game.currentQuestionIndex)) {
      return;
    }
    const questionStartTime = game.questionStartTime || Date.now();

    game.players.forEach((player) => {
      if (player.isHost) return;
      const responseTime = player.answerTime ? player.answerTime - questionStartTime : 0;
      const wasCorrect =
        player.currentAnswer !== undefined && player.currentAnswer === question.correctAnswer;
      // Read the canonical points from updateScores. If updateScores didn't run for some
      // reason (shouldn't happen — executeResultsPhase or executeFinishedPhase always calls
      // it first), default to 0 rather than recomputing with a different formula.
      const pointsEarned = player.lastPointsEarned ?? 0;
      const record = {
        playerId: player.id,
        playerName: player.name,
        questionIndex: game.currentQuestionIndex,
        questionId: question.id,
        answerIndex: player.currentAnswer ?? null,
        answerTime: player.answerTime,
        responseTime,
        pointsEarned,
        wasCorrect,
        hasDyslexiaSupport: player.hasDyslexiaSupport || false,
      };
      game.answerHistory.push(record);
      try { insertAnswer(game.id, record); } catch (e) { console.error('[db] insertAnswer failed:', e); }
    });
  }

  /**
   * Tie-aware competition ranking (1, 1, 3, 4, 5, 5, 7). Mutates `rank` on each player.
   * Assumes the input list is already sorted by score DESC (use getLeaderboard).
   */
  applyCompetitionRanks(players: Player[]): Player[] {
    let lastRank = 0;
    let lastScore = Number.POSITIVE_INFINITY;
    players.forEach((p, idx) => {
      if (p.score !== lastScore) {
        lastRank = idx + 1;
        lastScore = p.score;
      }
      p.rank = lastRank;
    });
    return players;
  }

  getLeaderboard(game: Game): Player[] {
    return game.players.filter((p) => !p.isHost).sort((a, b) => b.score - a.score);
  }

  getFinalResults(game: Game): Player[] {
    return this.getLeaderboard(game);
  }

  generateGameLogsTSV(game: Game): string {
    const headers = [
      'question_index',
      'question_datetime',
      'question_string',
      'proposition_correct',
      'proposition_wrong1',
      'proposition_wrong2',
      'proposition_wrong3',
      'question_explanation',
      'player_id',
      'player_nickname',
      'choice_string',
      'choice_datetime',
      'has_dyslexia_support',
    ];
    const rows: string[] = [headers.join('\t')];
    const sortedAnswers = [...game.answerHistory].sort((a, b) => {
      if (a.questionIndex !== b.questionIndex) return a.questionIndex - b.questionIndex;
      return a.playerName.localeCompare(b.playerName);
    });
    sortedAnswers.forEach((ar) => {
      const question = game.questions[ar.questionIndex];
      if (!question) return;
      const qStart = ar.answerTime ? new Date(ar.answerTime - ar.responseTime) : new Date();
      const qDatetime = qStart.toISOString();
      const cDatetime = ar.answerTime ? new Date(ar.answerTime).toISOString() : '';
      const correct = question.options[question.correctAnswer];
      const wrongs = question.options.filter((_, i) => i !== question.correctAnswer);
      while (wrongs.length < 3) wrongs.push('');
      const choiceString = ar.answerIndex !== null ? question.options[ar.answerIndex] : '';
      rows.push([
        ar.questionIndex.toString(),
        qDatetime,
        question.question.replace(/\t/g, ' '),
        correct.replace(/\t/g, ' '),
        wrongs[0].replace(/\t/g, ' '),
        wrongs[1].replace(/\t/g, ' '),
        wrongs[2].replace(/\t/g, ' '),
        (question.explanation || '').replace(/\t/g, ' '),
        ar.playerId,
        ar.playerName.replace(/\t/g, ' '),
        choiceString.replace(/\t/g, ' '),
        cDatetime,
        ar.hasDyslexiaSupport ? 'true' : 'false',
      ].join('\t'));
    });
    return rows.join('\n');
  }

  toggleDyslexiaSupport(game: Game, playerId: string): boolean {
    const player = this.getPlayerById(playerId, game);
    if (!player || player.isHost) return false;
    player.hasDyslexiaSupport = !player.hasDyslexiaSupport;
    return true;
  }
}
