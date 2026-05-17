import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import type { Game, Question, GameSettings, GamePhase } from '@/types/game';
import { gameConfig } from '@/lib/config';
import { insertGame, updateGameStatus, upsertPlayer } from '@/lib/db';

const MAX_PIN_GENERATION_ATTEMPTS = 1000;

export class GameManager {
  private games: Map<string, Game> = new Map();
  private gamesByPin: Map<string, string> = new Map(); // pin -> gameId

  createGame(
    hostSocketId: string,
    title: string,
    questions: Question[],
    settings: GameSettings,
    hostUserId: string | null = null
  ): Game {
    const gameId = uuidv4();
    const hostId = uuidv4(); // Generate persistent ID for host
    const pin = this.generatePin();

    const game: Game = {
      id: gameId,
      pin,
      hostId: hostId,
      title,
      questions,
      settings,
      currentQuestionIndex: -1,
      status: 'waiting',
      phase: 'waiting',
      players: [{
        id: hostId,
        socketId: hostSocketId,
        name: 'Host',
        score: 0,
        isHost: true,
        isConnected: true
      }],
      gameLoopActive: false,
      answerHistory: []
    };

    this.games.set(gameId, game);
    this.gamesByPin.set(pin, gameId);

    // Phase 4: persist
    try {
      insertGame(game, hostUserId);
      upsertPlayer(gameId, game.players[0], hostUserId);
    } catch (e) {
      console.error('[db] insertGame failed:', e);
    }

    return game;
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  getGameByPin(pin: string): Game | undefined {
    const gameId = this.gamesByPin.get(pin);
    return gameId ? this.games.get(gameId) : undefined;
  }

  deleteGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (game) {
      this.gamesByPin.delete(game.pin);
      this.games.delete(gameId);
    }
  }

  updateGameStatus(gameId: string, status: GamePhase): void {
    const game = this.games.get(gameId);
    if (game) {
      game.status = status;
    }
  }

  updateGamePhase(gameId: string, phase: GamePhase): void {
    const game = this.games.get(gameId);
    if (game) {
      game.phase = phase;
      game.status = phase; // Keep status in sync with phase for backwards compatibility
      // Phase 4: persist
      try { updateGameStatus(gameId, phase, game.currentQuestionIndex); } catch (e) { console.error('[db] updateGameStatus failed:', e); }
    }
  }

  updateCurrentQuestion(gameId: string, questionIndex: number): void {
    const game = this.games.get(gameId);
    if (game) {
      game.currentQuestionIndex = questionIndex;
    }
  }

  setQuestionStartTime(gameId: string, startTime: number): void {
    const game = this.games.get(gameId);
    if (game) {
      game.questionStartTime = startTime;
    }
  }

  setPhaseStartTime(gameId: string, startTime: number): void {
    const game = this.games.get(gameId);
    if (game) {
      game.phaseStartTime = startTime;
    }
  }

  getCurrentQuestion(game: Game): Question | undefined {
    return game.questions[game.currentQuestionIndex];
  }

  isGameFinished(game: Game): boolean {
    return game.currentQuestionIndex >= game.questions.length - 1;
  }

  /**
   * Generate a unique PIN using a cryptographically secure RNG.
   * Bounded retry: throws if it cannot find a free PIN after MAX_PIN_GENERATION_ATTEMPTS.
   * Practically only fires when the PIN namespace is near saturation (10^pinLength games).
   */
  private generatePin(): string {
    const pinLength = gameConfig.pinLength;
    const min = Math.pow(10, pinLength - 1);
    const max = Math.pow(10, pinLength); // randomInt upper bound is exclusive
    for (let attempt = 0; attempt < MAX_PIN_GENERATION_ATTEMPTS; attempt++) {
      const pin = randomInt(min, max).toString();
      if (!this.gamesByPin.has(pin)) return pin;
    }
    throw new Error(
      `Could not allocate a free PIN after ${MAX_PIN_GENERATION_ATTEMPTS} attempts. ` +
      `Active games: ${this.gamesByPin.size}. Consider increasing pinLength.`
    );
  }

  // Debug methods
  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  getGameCount(): number {
    return this.games.size;
  }
}

/**
 * Phase 3: strip server-only heavy fields before broadcasting a Game to clients.
 *
 * `answerHistory` grows unbounded over a game's lifetime (200 players × 60 questions
 * = 12k records, ~200 bytes each = ~2.4 MB). Multiplying that by every emit to every
 * socket is O(n²) bandwidth. Clients never read it — it's only used server-side for
 * the TSV log export. This helper returns a shallow copy with `answerHistory: []`.
 */
export function sanitizeGameForClient(game: Game): Game {
  return { ...game, answerHistory: [] };
}
