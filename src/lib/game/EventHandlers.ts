import { Server as SocketIOServer, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Question,
  GameSettings,
  Game
} from '@/types/game';
import { GameManager } from './GameManager';
import { PlayerManager } from './PlayerManager';
import { QuestionManager } from './QuestionManager';
import { GameplayLoop } from './GameplayLoop';
import {
  validateCreateGamePayload,
  validateJoinGamePayload,
  validateSubmitAnswerPayload,
  validateGameId,
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

      socket.on('joinGame', (pin, playerName, persistentId, callback) => {
        this.handleJoinGame(socket, pin, playerName, persistentId, callback);
      });

      socket.on('validateGame', (gameId, callback) => {
        this.handleValidateGame(socket, gameId, callback);
      });

      socket.on('startGame', (gameId) => {
        this.handleStartGame(socket, gameId);
      });

      socket.on('submitAnswer', (gameId, questionId, answerIndex, persistentId) => {
        this.handleSubmitAnswer(socket, gameId, questionId, answerIndex, persistentId);
      });

      socket.on('nextQuestion', (gameId) => {
        this.handleNextQuestion(socket, gameId);
      });

      socket.on('showLeaderboard', (gameId) => {
        this.handleShowLeaderboard(socket, gameId);
      });

      socket.on('endGame', (gameId) => {
        this.handleEndGame(socket, gameId);
      });

      socket.on('downloadGameLogs', (gameId) => {
        this.handleDownloadGameLogs(socket, gameId);
      });

      socket.on('toggleDyslexiaSupport', (gameId, playerId) => {
        this.handleToggleDyslexiaSupport(socket, gameId, playerId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleCreateGame(
    socket: Socket,
    title: string,
    questions: Question[],
    settings: GameSettings,
    callback: (game: Game) => void
  ): void {
    const err = validateCreateGamePayload(title, questions, settings);
    if (err) {
      console.warn(`[CREATE_GAME] Rejected from ${socket.id}: ${err}`);
      socket.emit('error', err);
      return;
    }
    try {
      const game = this.gameManager.createGame(socket.id, title, questions, settings);
      socket.join(game.id);
      callback(game);
    } catch (error) {
      console.error('[CREATE_GAME] Error creating game:', error);
      socket.emit('error', 'Failed to create game');
    }
  }

  private handleJoinGame(
    socket: Socket,
    pin: string,
    playerName: string,
    persistentId?: string | ((success: boolean, game?: Game, playerId?: string) => void),
    callback?: (success: boolean, game?: Game, playerId?: string) => void
  ): void {
    // Resolve legacy / new signature
    const actualCallback = typeof persistentId === 'function' ? persistentId : callback;
    const actualPersistentId = typeof persistentId === 'string' ? persistentId : null;

    const err = validateJoinGamePayload(pin, playerName, persistentId);
    if (err) {
      console.warn(`[JOIN_GAME] Rejected from ${socket.id}: ${err}`);
      actualCallback?.(false);
      return;
    }

    try {
      const game = this.gameManager.getGameByPin(pin);
      if (!game) {
        actualCallback?.(false);
        return;
      }

      const result = this.playerManager.joinGame(
        game,
        socket.id,
        playerName.normalize('NFC').trim(),
        actualPersistentId
      );

      if (result.success && result.game) {
        socket.join(result.game.id);
        const connectedPlayers = this.playerManager.getConnectedPlayers(result.game).length;
        console.log(`[PIN ${result.game.pin}] Player joined/reconnected | Connected players: ${connectedPlayers}`);

        const player = this.playerManager.getPlayerById(result.playerId!, result.game);
        if (result.isReconnection) {
          this.io.to(result.game.id).emit('playerReconnected', player!);
        } else {
          this.io.to(result.game.id).emit('playerJoined', player!);
        }
      }

      actualCallback?.(result.success, result.game, result.playerId);
    } catch (error) {
      console.error('[JOIN_GAME] Error joining game:', error);
      actualCallback?.(false);
    }
  }

  private handleValidateGame(
    socket: Socket,
    gameId: string,
    callback: (valid: boolean, game?: Game) => void
  ): void {
    const err = validateGameId(gameId);
    if (err) {
      callback(false);
      return;
    }

    try {
      const game = this.gameManager.getGame(gameId);
      const host = game ? this.playerManager.getHost(game) : undefined;
      const hasActiveHost = host?.isConnected ?? false;
      const isValid = !!game && hasActiveHost;

      if (isValid) {
        socket.join(game.id);
        const isHost = host && host.socketId === socket.id;
        if (game.gameLoopActive) {
          this.gameplayLoop.syncPlayerToCurrentPhase(game, socket.id, !!isHost);
        }
        callback(true, game);
      } else {
        callback(false);
      }
    } catch (error) {
      console.error('[VALIDATE_GAME] Error validating game:', error);
      callback(false);
    }
  }

  private handleStartGame(socket: Socket, gameId: string): void {
    if (validateGameId(gameId)) return;

    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      if (!this.playerManager.isHost(socket.id, game)) {
        socket.emit('error', 'Not authorized');
        return;
      }
      socket.join(game.id);
      const playerCount = this.playerManager.getConnectedPlayers(game).length;
      console.log(`[PIN ${game.pin}] Starting game with ${playerCount} active players`);
      this.io.to(game.id).emit('gameStarted', game);
      this.gameplayLoop.startGameLoop(game);
    } catch (error) {
      console.error('[START_GAME] Error starting game:', error);
      socket.emit('error', 'Failed to start game');
    }
  }

  private handleSubmitAnswer(
    socket: Socket,
    gameId: string,
    questionId: string,
    answerIndex: number,
    persistentId?: string
  ): void {
    const err = validateSubmitAnswerPayload(gameId, questionId, answerIndex, persistentId);
    if (err) {
      console.warn(`[SUBMIT_ANSWER] Rejected from ${socket.id}: ${err}`);
      return;
    }

    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) return;

      const player = persistentId
        ? this.playerManager.getPlayerById(persistentId, game)
        : this.playerManager.getPlayerBySocketId(socket.id, game);

      if (game.phase !== 'answering') return;

      const success = this.playerManager.submitAnswer(
        game,
        persistentId || socket.id,
        answerIndex,
        !!persistentId
      );
      if (success && player) {
        this.io.to(game.id).emit('playerAnswered', player.id);
        this.gameplayLoop.onPlayerAnswered(game);
      }
    } catch (error) {
      console.error('[SUBMIT_ANSWER] Error submitting answer:', error);
    }
  }

  private handleNextQuestion(socket: Socket, gameId: string): void {
    if (validateGameId(gameId)) return;
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) return;
      if (!this.playerManager.isHost(socket.id, game)) return;
      if (game.phase !== 'leaderboard') return;
      this.gameplayLoop.transitionToPhase(game, 'preparation');
    } catch (error) {
      console.error('[NEXT_QUESTION] Error moving to next question:', error);
    }
  }

  private handleShowLeaderboard(socket: Socket, gameId: string): void {
    if (validateGameId(gameId)) return;
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) return;
      if (!this.playerManager.isHost(socket.id, game)) return;
      this.gameplayLoop.transitionToPhase(game, 'leaderboard');
    } catch (error) {
      console.error('[SHOW_LEADERBOARD] Error showing leaderboard:', error);
    }
  }

  private handleEndGame(socket: Socket, gameId: string): void {
    if (validateGameId(gameId)) return;
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) return;
      if (!this.playerManager.isHost(socket.id, game)) return;
      this.gameplayLoop.transitionToPhase(game, 'finished');
    } catch (error) {
      console.error('[END_GAME] Error ending game:', error);
    }
  }

  private handleDownloadGameLogs(socket: Socket, gameId: string): void {
    if (validateGameId(gameId)) {
      socket.emit('error', 'Invalid gameId');
      return;
    }
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      if (!this.playerManager.isHost(socket.id, game)) {
        socket.emit('error', 'Not authorized');
        return;
      }
      const tsvData = this.playerManager.generateGameLogsTSV(game);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `game_${game.pin}_${timestamp}.tsv`;
      socket.emit('gameLogs', tsvData, filename);
    } catch (error) {
      console.error('[DOWNLOAD_LOGS] Error generating logs:', error);
      socket.emit('error', 'Failed to generate logs');
    }
  }

  private handleToggleDyslexiaSupport(socket: Socket, gameId: string, playerId: string): void {
    if (validateGameId(gameId)) {
      socket.emit('error', 'Invalid gameId');
      return;
    }
    if (typeof playerId !== 'string' || playerId.length === 0 || playerId.length > 100) {
      socket.emit('error', 'Invalid playerId');
      return;
    }
    try {
      const game = this.gameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      if (!this.playerManager.isHost(socket.id, game)) {
        socket.emit('error', 'Not authorized');
        return;
      }
      if (game.status !== 'waiting') {
        socket.emit('error', 'Can only toggle dyslexia support in lobby');
        return;
      }
      const success = this.playerManager.toggleDyslexiaSupport(game, playerId);
      if (success) {
        const player = this.playerManager.getPlayerById(playerId, game);
        console.log(`[PIN ${game.pin}] Toggled dyslexia support for ${player?.name || playerId} | New: ${player?.hasDyslexiaSupport ? 'on' : 'off'}`);
        this.io.to(game.id).emit('gameUpdated', game);
      } else {
        socket.emit('error', 'Failed to toggle dyslexia support');
      }
    } catch (error) {
      console.error('[TOGGLE_DYSLEXIA] Error:', error);
      socket.emit('error', 'Failed to toggle dyslexia support');
    }
  }

  private handleDisconnect(socket: Socket): void {
    try {
      for (const game of this.gameManager.getAllGames()) {
        const player = this.playerManager.getPlayerBySocketId(socket.id, game);
        if (player) {
          this.playerManager.disconnectPlayer(socket.id, game);
          this.io.to(game.id).emit('playerDisconnected', player.id);
          if (player.isHost) {
            this.gameplayLoop.transitionToPhase(game, 'finished');
          }
          break;
        }
      }
    } catch (error) {
      console.error('[DISCONNECT] Error handling disconnect:', error);
    }
  }
}
