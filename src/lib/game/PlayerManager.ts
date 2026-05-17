import { v4 as uuidv4 } from 'uuid';
import type { Game, Player } from '@/types/game';
import { issuePlayerToken, verifyPlayerToken } from './tokens';
import { upsertPlayer, insertAnswer, updatePlayerScore } from '@/lib/db';

export interface JoinGameResult {
  success: boolean;
  game?: Game;
  playerId?: string;
  playerToken?: string;
  isReconnection?: boolean;
  reason?: string; // diagnostic for debug logs
}

export class PlayerManager {
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

  submitAnswer(game: Game, playerId: string, answerIndex: number, isPersistentId: boolean = false): boolean {
    const player = isPersistentId
      ? this.getPlayerById(playerId, game)
      : this.getPlayerBySocketId(playerId, game);
    if (!player || player.isHost) return false;
    if (player.currentAnswer !== undefined) return false; // no double answers
    player.currentAnswer = answerIndex;
    player.answerTime = Date.now();
    return true;
  }

  clearAnswers(game: Game): void {
    game.players.forEach((player) => {
      if (!player.isHost) {
        delete player.currentAnswer;
        delete player.answerTime;
      }
    });
  }

  storeAnswersToHistory(game: Game): void {
    const question = game.questions[game.currentQuestionIndex];
    if (!question) return;
    // Idempotent guard: storeAnswersToHistory fires in both executePreprationPhase AND
    // executeFinishedPhase. For the last question both paths run — without this guard,
    // the final question is recorded twice (once with the real answer, once empty after
    // clearAnswers). Skip if records for this questionIndex already exist.
    if (game.answerHistory.some((r) => r.questionIndex === game.currentQuestionIndex)) {
      return;
    }
    const questionStartTime = game.questionStartTime || Date.now();

    game.players.forEach((player) => {
      if (!player.isHost) {
        const responseTime = player.answerTime ? player.answerTime - questionStartTime : 0;
        const wasCorrect = player.currentAnswer === question.correctAnswer;
        let pointsEarned = 0;
        if (wasCorrect && player.currentAnswer !== undefined) {
          const answerTimeLimit = game.settings.answerTime * 1000;
          const timeUsedRatio = responseTime / answerTimeLimit;
          let adjusted = timeUsedRatio;
          if (player.hasDyslexiaSupport) adjusted = timeUsedRatio * 0.8;
          pointsEarned = Math.max(0, Math.round(1000 * (1 - adjusted)));
        }
        const record = {
          playerId: player.id,
          playerName: player.name,
          questionIndex: game.currentQuestionIndex,
          questionId: question.id,
          answerIndex: player.currentAnswer ?? null,
          answerTime: player.answerTime,
          responseTime,
          pointsEarned,
          wasCorrect: wasCorrect && player.currentAnswer !== undefined,
          hasDyslexiaSupport: player.hasDyslexiaSupport || false,
        };
        game.answerHistory.push(record);
        // Phase 4: persist answer
        try { insertAnswer(game.id, record); } catch (e) { console.error('[db] insertAnswer failed:', e); }
      }
    });
  }

  updateScores(game: Game, correctAnswer: number): void {
    const questionStartTime = game.questionStartTime || Date.now();
    const maxPoints = 1000;
    game.players.forEach((player) => {
      if (!player.isHost && player.currentAnswer === correctAnswer) {
        const responseTime = (player.answerTime || Date.now()) - questionStartTime;
        const answerTimeLimit = game.settings.answerTime * 1000;
        const timeUsedRatio = Math.max(0, Math.min(1, responseTime / answerTimeLimit));
        let adjusted = timeUsedRatio;
        if (player.hasDyslexiaSupport) adjusted = timeUsedRatio * 0.8;
        const pointsEarned = Math.max(0, Math.round(maxPoints * (1 - adjusted)));
        player.score += pointsEarned;
        const supportStatus = player.hasDyslexiaSupport ? ' (with dyslexia support)' : '';
        console.log(`[PIN ${game.pin}] ${player.name} +${pointsEarned}${supportStatus} | Total: ${player.score}`);
        // Phase 4: persist running score
        try { updatePlayerScore(game.id, player.id, player.score); } catch (e) { console.error('[db] updatePlayerScore failed:', e); }
      }
    });
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
