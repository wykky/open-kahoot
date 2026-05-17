import { Server as SocketIOServer } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Game,
  GamePhase
} from '@/types/game';
import { GameManager } from './GameManager';
import { PlayerManager } from './PlayerManager';
import { QuestionManager } from './QuestionManager';
import { TimerManager } from './TimerManager';

// How long to wait for the host to reconnect after they disconnect before finishing the game.
// Tunable: longer = friendlier for flaky wifi, shorter = faster cleanup of dead games.
const HOST_DISCONNECT_GRACE_MS = 60_000;

export class GameplayLoop {
  private phaseCallbacks: Map<string, (() => void) | null> = new Map();
  private hostDisconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    private gameManager: GameManager,
    private playerManager: PlayerManager,
    private questionManager: QuestionManager,
    private timerManager: TimerManager
  ) {}

  startGameLoop(game: Game): void {
    if (game.gameLoopActive) {
      console.log(`[PIN ${game.pin}] Game loop already active, ignoring start request`);
      return;
    }
    console.log(`[PIN ${game.pin}] Starting game loop with ${game.players.length} players (${game.players.filter(p => !p.isHost).length} active players)`);
    this.gameManager.updateGamePhase(game.id, 'preparation');
    game.gameLoopActive = true;
    this.schedulePhase(game, 'preparation', 0);
  }

  stopGameLoop(gameId: string): void {
    this.timerManager.clearAllTimers(gameId);
    this.phaseCallbacks.delete(gameId);
    this.clearHostDisconnectGrace(gameId);
    const game = this.gameManager.getGame(gameId);
    if (game) {
      game.gameLoopActive = false;
      console.log(`[PIN ${game.pin}] Game loop stopped`);
    }
  }

  transitionToPhase(game: Game, phase: GamePhase): void {
    if (!game.gameLoopActive) {
      console.log(`[PIN ${game.pin}] Cannot transition - game loop not active`);
      return;
    }
    this.timerManager.clearAllTimers(game.id);
    console.log(`[PIN ${game.pin}] Manual transition to phase: ${phase}`);
    this.schedulePhase(game, phase, 0);
  }

  /**
   * Phase 2: start a grace window when the host disconnects.
   * If the host doesn't return before HOST_DISCONNECT_GRACE_MS, the game is finished.
   * A reconnecting host (validated via hostToken) should call clearHostDisconnectGrace.
   */
  startHostDisconnectGrace(game: Game): void {
    if (this.hostDisconnectTimers.has(game.id)) return; // already running
    console.log(`[PIN ${game.pin}] Host disconnected — starting ${HOST_DISCONNECT_GRACE_MS / 1000}s grace window`);
    this.io.to(game.id).emit('hostReconnecting', HOST_DISCONNECT_GRACE_MS);
    const t = setTimeout(() => {
      console.log(`[PIN ${game.pin}] Host did not reconnect within grace — finishing game`);
      this.hostDisconnectTimers.delete(game.id);
      this.transitionToPhase(game, 'finished');
    }, HOST_DISCONNECT_GRACE_MS);
    this.hostDisconnectTimers.set(game.id, t);
  }

  clearHostDisconnectGrace(gameId: string): void {
    const t = this.hostDisconnectTimers.get(gameId);
    if (t) {
      clearTimeout(t);
      this.hostDisconnectTimers.delete(gameId);
      const game = this.gameManager.getGame(gameId);
      if (game) {
        console.log(`[PIN ${game.pin}] Host reconnected — grace cleared`);
        this.io.to(gameId).emit('hostReconnected');
      }
    }
  }

  private schedulePhase(game: Game, phase: GamePhase, delay: number): void {
    const timerType = `phase_${phase}`;
    this.timerManager.setTimer(game.id, timerType, () => {
      this.executePhase(game, phase);
    }, delay);
    if (delay > 0) {
      console.log(`[PIN ${game.pin}] Scheduled phase ${phase} with delay ${delay}ms`);
    }
  }

  private executePhase(game: Game, phase: GamePhase): void {
    console.log(`[PIN ${game.pin}] Phase: ${phase} | Question: ${game.currentQuestionIndex + 1}/${game.questions.length} | Players: ${game.players.filter(p => !p.isHost && p.isConnected).length}`);
    this.gameManager.updateGamePhase(game.id, phase);
    game.phaseStartTime = Date.now();
    switch (phase) {
      case 'preparation': this.executePreprationPhase(game); break;
      case 'thinking':    this.executeThinkingPhase(game); break;
      case 'answering':   this.executeAnsweringPhase(game); break;
      case 'results':     this.executeResultsPhase(game); break;
      case 'leaderboard': this.executeLeaderboardPhase(game); break;
      case 'finished':    this.executeFinishedPhase(game); break;
      default:
        console.error(`❌ [PIN ${game.pin}] Unknown phase: ${phase}`);
    }
  }

  private executePreprationPhase(game: Game): void {
    if (game.currentQuestionIndex >= 0) {
      this.playerManager.storeAnswersToHistory(game);
      console.log(`[PIN ${game.pin}] Stored answer history for question ${game.currentQuestionIndex}`);
    }
    this.playerManager.clearAnswers(game);
    const question = this.questionManager.startNextQuestion(game);
    if (!question) {
      console.log(`[PIN ${game.pin}] No more questions, finishing game`);
      this.schedulePhase(game, 'finished', 100);
      return;
    }
    this.schedulePhase(game, 'thinking', 500);
  }

  private executeThinkingPhase(game: Game): void {
    const question = this.questionManager.getCurrentQuestion(game);
    if (!question) {
      console.error(`❌ [PIN ${game.pin}] No current question for game`);
      return;
    }
    console.log(`[PIN ${game.pin}] Thinking phase | Question: "${question.question.substring(0, 30)}${question.question.length > 30 ? '...' : ''}" | Duration: ${game.settings.thinkTime}s`);
    this.io.to(game.id).emit('thinkingPhase', question, game.settings.thinkTime);
    this.timerManager.setThinkingPhaseTimer(game.id, () => {
      this.executePhase(game, 'answering');
    }, game.settings.thinkTime);
  }

  private executeAnsweringPhase(game: Game): void {
    const activePlayers = game.players.filter(p => !p.isHost && p.isConnected);
    console.log(`[PIN ${game.pin}] Answering phase | Duration: ${game.settings.answerTime}s | Active players: ${activePlayers.length}`);
    this.gameManager.setQuestionStartTime(game.id, Date.now());
    this.io.to(game.id).emit('answeringPhase', game.settings.answerTime);
    this.timerManager.setAnsweringPhaseTimer(game.id, () => {
      console.log(`[PIN ${game.pin}] Answering time expired, moving to results`);
      this.executePhase(game, 'results');
    }, game.settings.answerTime);
    this.phaseCallbacks.set(game.id, () => {
      const ap = game.players.filter(p => !p.isHost && p.isConnected);
      if (ap.length > 0 && this.questionManager.hasAllPlayersAnswered(game)) {
        console.log(`[PIN ${game.pin}] All players answered, ending answering phase early`);
        this.timerManager.clearTimer(game.id, TimerManager.TIMER_TYPES.ANSWERING_PHASE);
        this.executePhase(game, 'results');
      }
    });
  }

  private executeResultsPhase(game: Game): void {
    const currentQuestion = this.questionManager.getCurrentQuestion(game);
    if (!currentQuestion) {
      console.error(`❌ [PIN ${game.pin}] No current question for results phase`);
      return;
    }
    this.playerManager.updateScores(game, currentQuestion.correctAnswer);
    const stats = this.questionManager.getQuestionStats(game);
    if (stats) {
      const correctAnswerCount = stats.answers.find(a => a.optionIndex === currentQuestion.correctAnswer)?.count || 0;
      console.log(`[PIN ${game.pin}] Results | Correct: ${correctAnswerCount}/${stats.totalPlayers}`);
      this.io.to(game.id).emit('questionEnded', stats);
      const host = this.playerManager.getHost(game);
      if (host && host.isConnected) {
        this.io.to(host.socketId).emit('hostResults', stats);
      }
      game.players.forEach((player) => {
        if (!player.isHost) {
          const personalResult = this.questionManager.getPersonalResult(game, player.id);
          if (personalResult) {
            this.io.to(player.socketId).emit('personalResult', personalResult);
          }
        }
      });
    }
    this.phaseCallbacks.set(game.id, null);
    console.log(`[PIN ${game.pin}] Waiting for host to continue to leaderboard`);
  }

  private executeLeaderboardPhase(game: Game): void {
    const leaderboard = this.playerManager.getLeaderboard(game);
    const topPlayer = leaderboard[0] || null;
    console.log(`[PIN ${game.pin}] Leaderboard | Top: ${topPlayer ? `${topPlayer.name} (${topPlayer.score})` : 'none'}`);
    this.io.to(game.id).emit('leaderboardShown', leaderboard, game);
  }

  private executeFinishedPhase(game: Game): void {
    if (game.currentQuestionIndex >= 0) {
      this.playerManager.storeAnswersToHistory(game);
    }
    this.gameManager.updateGamePhase(game.id, 'finished');
    const finalResults = this.playerManager.getFinalResults(game);
    const sortedPlayers = [...game.players].filter(p => !p.isHost).sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0] || null;
    console.log(`[PIN ${game.pin}] Game finished | Winner: ${winner ? `${winner.name} (${winner.score})` : 'none'}`);
    this.io.to(game.id).emit('gameFinished', finalResults);
    this.stopGameLoop(game.id);
    this.timerManager.setTimer(game.id, 'game_cleanup', () => {
      console.log(`[PIN ${game.pin}] Cleaning up game resources after 30s delay`);
      this.gameManager.deleteGame(game.id);
    }, 30000);
  }

  onPlayerAnswered(game: Game): void {
    const answeredCount = this.questionManager.getAnsweredPlayerCount(game);
    const totalPlayers = game.players.filter(p => !p.isHost && p.isConnected).length;
    console.log(`[PIN ${game.pin}] Player answered | Progress: ${answeredCount}/${totalPlayers}`);
    const callback = this.phaseCallbacks.get(game.id);
    if (callback && game.phase === 'answering') {
      callback();
    }
  }

  /**
   * Sync a newly connected socket to the current game phase.
   *
   * Phase 2 gating: only `isHost` or `isKnownPlayer` connections receive the
   * live question during thinking/answering. Anyone else (new socket, no token,
   * not in game.players) gets a `waitForNextQuestion` event — kills the
   * second-tab-cheat path.
   */
  syncPlayerToCurrentPhase(
    game: Game,
    socketId: string,
    isHost: boolean,
    isKnownPlayer: boolean = false
  ): void {
    if (!game.gameLoopActive) return;
    const trusted = isHost || isKnownPlayer;
    const playerType = isHost ? 'Host' : isKnownPlayer ? 'Returning player' : 'Unknown';
    const currentQuestionLabel = game.currentQuestionIndex >= 0
      ? `Question ${game.currentQuestionIndex + 1}/${game.questions.length}`
      : 'No question';
    console.log(`[PIN ${game.pin}] ${playerType} connecting | Phase: ${game.phase} | ${currentQuestionLabel}`);

    switch (game.phase) {
      case 'thinking': {
        if (!trusted) {
          this.io.to(socketId).emit('waitForNextQuestion');
          return;
        }
        const question = this.questionManager.getCurrentQuestion(game);
        if (question) {
          const elapsed = Date.now() - (game.phaseStartTime || 0);
          const remaining = Math.max(0, game.settings.thinkTime - Math.floor(elapsed / 1000));
          if (remaining > 0) this.io.to(socketId).emit('thinkingPhase', question, remaining);
        }
        break;
      }
      case 'answering': {
        if (!trusted) {
          this.io.to(socketId).emit('waitForNextQuestion');
          return;
        }
        const currentQuestion = this.questionManager.getCurrentQuestion(game);
        if (currentQuestion) {
          this.io.to(socketId).emit('thinkingPhase', currentQuestion, game.settings.thinkTime);
          const delay = isHost ? 2000 : 100;
          setTimeout(() => {
            const elapsed = Date.now() - (game.questionStartTime || 0);
            const remaining = Math.max(0, game.settings.answerTime - Math.floor(elapsed / 1000));
            if (remaining > 0) this.io.to(socketId).emit('answeringPhase', remaining);
          }, delay);
        }
        break;
      }
      case 'leaderboard': {
        const leaderboard = this.playerManager.getLeaderboard(game);
        this.io.to(socketId).emit('leaderboardShown', leaderboard, game);
        break;
      }
      case 'finished': {
        const finalResults = this.playerManager.getFinalResults(game);
        this.io.to(socketId).emit('gameFinished', finalResults);
        break;
      }
      // waiting / preparation / results: nothing special to sync
    }
  }
}
