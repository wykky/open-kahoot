import { Server as SocketIOServer, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Question,
  GameSettings,
  Game,
  ValidateGameAuth,
} from '@/types/game';
import { GameManager } from './GameManager';
import { PlayerManager } from './PlayerManager';
import { QuestionManager } from './QuestionManager';
import { GameplayLoop } from './GameplayLoop';
import { issueHostToken, verifyHostToken, verifyPlayerToken } from './tokens';
import {
  validateCreateGamePayload,
  validateJoinGamePayload,
  validateSubmitAnswerPayload,
  validateGameId,
  LIMITS,
} from './validators';

export class EventHandlers {
  constructor(
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    private gameManager: GameManager,
    private playerManager: PlayerManager,
    private questionManager: QuestionManager,
    private gameplayLoop: GameplayLoop
  ) {}

  setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('createGame', (title, questions, settings, callback) => {
        this.handleCreateGame(socket, title, questions, settings, callback);
      });
      socket.on('joinGame', (pin, playerName, persistentId, playerToken, callback) => {
        this.handleJoinGame(socket, pin, playerName, persistentId, playerToken, callback);
      });
      socket.on('validateGame', (gameId, auth, callback) => {
        this.handleValidateGame(socket, gameId, auth, callback);
      });
      socket.on('startGame', (gameId, hostToken) => {
        this.handleHostEvent(socket, gameId, hostToken, 'startGame', (game) => {
          socket.join(game.id);
          const playerCount = this.playerManager.getConnectedPlayers(game).length;
          console.log(`[PIN ${game.pin}] Starting game with ${playerCount} active players`);
          this.io.to(game.id).emit('gameStarted', game);
          this.gameplayLoop.startGameLoop(game);
        });
      });
      socket.on('submitAnswer', (gameId, questionId, answerIndex, persistentId, playerToken) => {
        this.handleSubmitAnswer(socket, gameId, questionId, answerIndex, persistentId, playerToken);
      });
      socket.on('nextQuestion', (gameId, hostToken) => {
        this.handleHostEvent(socket, gameId, hostToken, 'nextQuestion', (game) => {
          if (game.phase !== 'leaderboard') return;
          this.gameplayLoop.transitionToPhase(game, 'preparation');
        });
      });
      socket.on('showLeaderboard', (gameId, hostToken) => {
        this.handleHostEvent(socket, gameId, hostToken, 'showLeaderboard', (game) => {
          this.gameplayLoop.transitionToPhase(game, 'leaderboard');
        });
      });
      socket.on('endGame', (gameId, hostToken) => {
        this.handleHostEvent(socket, gameId, hostToken, 'endGame', (game) => {
          this.gameplayLoop.transitionToPhase(game, 'finished');
        });
      });
      socket.on('downloadGameLogs', (gameId, hostToken) => {
        this.handleHostEvent(socket, gameId, hostToken, 'downloadGameLogs', (game) => {
          const tsvData = this.playerManager.generateGameLogsTSV(game);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `game_${game.pin}_${timestamp}.tsv`;
          socket.emit('gameLogs', tsvData, filename);
        });
      });
      socket.on('toggleDyslexiaSupport', (gameId, playerId, hostToken) => {
        this.handleHostEvent(socket, gameId, hostToken, 'toggleDyslexiaSupport', (game) => {
          if (typeof playerId !== 'string' || playerId.length === 0 || playerId.length > LIMITS.ID_MAX) {
            socket.emit('error', 'Invalid playerId');
            return;
          }
          if (game.status !== 'waiting') {
            socket.emit('error', 'Can only toggle dyslexia support in lobby');
            return;
          }
          const ok = this.playerManager.toggleDyslexiaSupport(game, playerId);
          if (ok) {
            const player = this.playerManager.getPlayerById(playerId, game);
            console.log(`[PIN ${game.pin}] Toggled dyslexia for ${player?.name || playerId} → ${player?.hasDyslexiaSupport ? 'on' : 'off'}`);
            this.io.to(game.id).emit('gameUpdated', game);
          } else {
            socket.emit('error', 'Failed to toggle dyslexia support');
          }
        });
      });
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // ===== Helpers =====

  /**
   * Common wrapper for host-authenticated events.
   * Validates gameId + hostToken + game existence + host identity, then runs `action`.
   */
  private handleHostEvent(
    socket: Socket,
    gameId: string,
    hostToken: unknown,
    eventName: string,
    action: (game: Game) => void
  ): void {
    if (validateGameId(gameId)) return;
    const game = this.gameManager.getGame(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    if (!verifyHostToken(hostToken, game.id, game.hostId)) {
      console.warn(`[${eventName}] Rejected from ${socket.id}: invalid hostToken (PIN ${game.pin})`);
      socket.emit('error', 'Not authorized');
      return;
    }
    try {
      action(game);
    } catch (error) {
      console.error(`[${eventName}] Error:`, error);
      socket.emit('error', `Failed: ${eventName}`);
    }
  }

  // ===== createGame =====

  private handleCreateGame(
    socket: Socket,
    title: string,
    questions: Question[],
    settings: GameSettings,
    callback: (game: Game, hostToken: string) => void
  ): void {
    const err = validateCreateGamePayload(title, questions, settings);
    if (err) {
      console.warn(`[CREATE_GAME] Rejected from ${socket.id}: ${err}`);
      socket.emit('error', err);
      return;
    }
    try {
      const game = this.gameManager.createGame(socket.id, title, questions, settings);
      const hostToken = issueHostToken(game.id, game.hostId);
      socket.join(game.id);
      callback(game, hostToken);
    } catch (error) {
      console.error('[CREATE_GAME] Error:', error);
      socket.emit('error', 'Failed to create game');
    }
  }

  // ===== joinGame =====

  private handleJoinGame(
    socket: Socket,
    pin: string,
    playerName: string,
    persistentId: string | null,
    playerToken: string | null,
    callback: (success: boolean, game?: Game, playerId?: string, playerToken?: string) => void
  ): void {
    const err = validateJoinGamePayload(pin, playerName, persistentId);
    if (err) {
      console.warn(`[JOIN_GAME] Rejected from ${socket.id}: ${err}`);
      callback?.(false);
      return;
    }
    try {
      const game = this.gameManager.getGameByPin(pin);
      if (!game) {
        callback?.(false);
        return;
      }
      const result = this.playerManager.joinGame(game, socket.id, playerName, persistentId, playerToken);
      if (result.success && result.game) {
        socket.join(result.game.id);
        const connectedPlayers = this.playerManager.getConnectedPlayers(result.game).length;
        console.log(`[PIN ${result.game.pin}] Player ${result.isReconnection ? 'reconnected' : 'joined'} | Connected: ${connectedPlayers}`);
        const player = this.playerManager.getPlayerById(result.playerId!, result.game);
        if (result.isReconnection) {
          this.io.to(result.game.id).emit('playerReconnected', player!);
        } else {
          this.io.to(result.game.id).emit('playerJoined', player!);
        }
      } else if (result.reason) {
        console.warn(`[JOIN_GAME] ${socket.id}: ${result.reason}`);
      }
      callback?.(result.success, result.game, result.playerId, result.playerToken);
    } catch (error) {
      console.error('[JOIN_GAME] Error:', error);
      callback?.(false);
    }
  }

  // ===== validateGame (reconnection / late join) =====

  private handleValidateGame(
    socket: Socket,
    gameId: string,
    auth: ValidateGameAuth,
    callback: (valid: boolean, game?: Game) => void
  ): void {
    if (validateGameId(gameId)) {
      callback(false);
      return;
    }
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) {
        callback(false);
        return;
      }

      // Determine identity from auth — server cannot trust the socket alone.
      let isHost = false;
      let isKnownPlayer = false;

      if (auth && typeof auth === 'object') {
        if (auth.hostToken && verifyHostToken(auth.hostToken, game.id, game.hostId)) {
          isHost = true;
          // Host reconnect: refresh socketId, mark connected, clear any grace timer
          const hostPlayer = this.playerManager.getHost(game);
          if (hostPlayer) {
            hostPlayer.socketId = socket.id;
            hostPlayer.isConnected = true;
          }
          this.gameplayLoop.clearHostDisconnectGrace(game.id);
        } else if (
          auth.playerId &&
          auth.playerToken &&
          verifyPlayerToken(auth.playerToken, game.id, auth.playerId)
        ) {
          const player = this.playerManager.getPlayerById(auth.playerId, game);
          if (player && !player.isHost) {
            isKnownPlayer = true;
            player.socketId = socket.id;
            player.isConnected = true;
          }
        }
      }

      // For non-host visitors, host must be present (avoid lingering ghost games)
      const host = this.playerManager.getHost(game);
      const hasActiveHost = host?.isConnected ?? false;
      if (!isHost && !hasActiveHost) {
        callback(false);
        return;
      }

      socket.join(game.id);
      if (game.gameLoopActive) {
        this.gameplayLoop.syncPlayerToCurrentPhase(game, socket.id, isHost, isKnownPlayer);
      }
      callback(true, game);
    } catch (error) {
      console.error('[VALIDATE_GAME] Error:', error);
      callback(false);
    }
  }

  // ===== submitAnswer =====

  private handleSubmitAnswer(
    socket: Socket,
    gameId: string,
    questionId: string,
    answerIndex: number,
    persistentId: string,
    playerToken: string
  ): void {
    const err = validateSubmitAnswerPayload(gameId, questionId, answerIndex, persistentId);
    if (err) {
      console.warn(`[SUBMIT_ANSWER] Rejected from ${socket.id}: ${err}`);
      return;
    }
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) return;
      if (!persistentId || !verifyPlayerToken(playerToken, game.id, persistentId)) {
        console.warn(`[SUBMIT_ANSWER] Rejected from ${socket.id}: invalid playerToken (PIN ${game.pin})`);
        return;
      }
      const player = this.playerManager.getPlayerById(persistentId, game);
      if (!player || player.isHost) return;
      if (game.phase !== 'answering') return;
      const success = this.playerManager.submitAnswer(game, persistentId, answerIndex, true);
      if (success) {
        this.io.to(game.id).emit('playerAnswered', player.id);
        this.gameplayLoop.onPlayerAnswered(game);
      }
    } catch (error) {
      console.error('[SUBMIT_ANSWER] Error:', error);
    }
  }

  // ===== disconnect =====

  private handleDisconnect(socket: Socket): void {
    try {
      for (const game of this.gameManager.getAllGames()) {
        const player = this.playerManager.getPlayerBySocketId(socket.id, game);
        if (player) {
          this.playerManager.disconnectPlayer(socket.id, game);
          this.io.to(game.id).emit('playerDisconnected', player.id);
          if (player.isHost) {
            // Phase 2: don't kill the classroom on a wifi blip — start the grace timer.
            this.gameplayLoop.startHostDisconnectGrace(game);
          }
          break;
        }
      }
    } catch (error) {
      console.error('[DISCONNECT] Error:', error);
    }
  }
}
