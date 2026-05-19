export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer (0-3)
  timeLimit: number; // Time limit in seconds
  explanation?: string;
  image?: string;
}

export interface AnswerRecord {
  playerId: string;
  playerName: string;
  questionIndex: number;
  questionId: string;
  answerIndex: number | null; // null if no answer was given
  answerTime?: number;
  responseTime: number; // milliseconds from question start
  pointsEarned: number;
  wasCorrect: boolean;
  hasDyslexiaSupport: boolean; // New field for dyslexia support tracking
}

export interface GameSettings {
  thinkTime: number; // Time to show question before allowing answers (in seconds)
  answerTime: number; // Time allowed to answer (in seconds)
  showQuestionOnPlayers?: boolean; // If true, players see question + answers on their phones
}

export type GamePhase = 'waiting' | 'preparation' | 'thinking' | 'answering' | 'results' | 'leaderboard' | 'finished';

export interface Game {
  id: string;
  pin: string;
  hostId: string;
  title: string;
  questions: Question[];
  settings: GameSettings;
  currentQuestionIndex: number;
  status: GamePhase;
  phase: GamePhase; // Current gameplay phase
  players: Player[];
  questionStartTime?: number;
  phaseStartTime?: number;
  phaseEndTime?: number;
  gameLoopActive?: boolean; // Whether the gameplay loop is running
  answerHistory: AnswerRecord[]; // Historical record of all answers
  lastActivityAt?: number; // Updated on any meaningful event — used by idle-game GC
  qEpoch?: number; // Phase 6: bumps on each thinking/answering phase entry; used to reject stale answers
  answerDeadlineMs?: number; // Phase 6: server-side deadline incl. grace; for late-answer acceptance
  // Question indices already passed through PlayerManager.updateScores. Makes updateScores
  // idempotent so we can call it defensively from executeFinishedPhase without double-credit.
  scoredQuestions?: number[];
  // Pause state when host disconnects mid-thinking / mid-answering. Captured on disconnect,
  // consumed on reconnect: the phase timer is restarted with `pauseRemainingMs` left and
  // qEpoch bumps to invalidate any answers submitted during the gap.
  pauseRemainingMs?: number;
  pausedPhase?: 'thinking' | 'answering';
}

export interface Player {
  id: string; // This is now the persistent player ID (UUID)
  socketId: string; // Current socket connection ID
  name: string;
  score: number;
  isHost: boolean;
  currentAnswer?: number;
  answerTime?: number;
  perceivedResponseMs?: number; // Phase 8: client-reported time-to-click, used for adaptive scoring
  isConnected: boolean; // Track connection status
  hasDyslexiaSupport?: boolean; // New field for dyslexia support
  // Cached per-question points. Set once by PlayerManager.updateScores; read by
  // storeAnswersToHistory (TSV row) and getPersonalResult (player's "+X" toast).
  // Cleared in clearAnswers between questions.
  lastPointsEarned?: number;
  // Phase 8+ tie-aware competition rank (1,1,3,4,5,5,7). Set server-side before
  // leaderboardShown / gameFinished emits. Clients should prefer this over array index.
  rank?: number;
}

export interface GameStats {
  question: Question;
  answers: {
    optionIndex: number;
    count: number;
    percentage: number;
  }[];
  correctAnswers: number;
  totalPlayers: number;
}

export interface PersonalResult {
  wasCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  position: number;
  pointsBehind: number;
  nextPlayerName: string | null;
  explanation?: string;
}

/**
 * Phase 6: server-authoritative deadline protocol.
 * Server sends absolute deadline + its own clock so clients can compute skew
 * and render accurate countdowns regardless of network latency.
 */
export interface PhaseDeadline {
  serverNow: number;      // server's Date.now() at emit time
  deadlineMs: number;     // server's absolute deadline timestamp
  qEpoch: number;         // monotonically increasing per phase entry; used to reject stale answers
}

// Socket Events
export interface ServerToClientEvents {
  gameJoined: (game: Game) => void;
  gameStarted: (game: Game) => void;
  questionStarted: (question: Question, timeLimit: number) => void;
  thinkingPhase: (question: Question, thinkTime: number, deadline?: PhaseDeadline) => void;
  answeringPhase: (answerTime: number, deadline?: PhaseDeadline) => void;
  questionEnded: (stats: GameStats) => void;
  hostResults: (stats: GameStats) => void;
  personalResult: (result: PersonalResult) => void;
  leaderboardShown: (leaderboard: Player[], game: Game) => void;
  gameFinished: (finalScores: Player[]) => void;
  playerJoined: (player: Player) => void;
  playerReconnected: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  playerDisconnected: (playerId: string) => void;
  error: (message: string) => void;
  playerAnswered: (playerId: string) => void;
  gameLogs: (tsvData: string, filename: string) => void;
  gameUpdated: (game: Game) => void;
  // Phase 2: emitted to late joiners during a live question (they shouldn't see the question)
  waitForNextQuestion: () => void;
  // Phase 2: emitted to all clients when the host disconnects (grace window started)
  hostReconnecting: (graceMs: number) => void;
  hostReconnected: () => void;
  // Phase 7: emitted to a socket that's being kicked because the same playerId connected from elsewhere
  kicked: (reason: string) => void;
}

// Auth for validateGame — caller may identify as host (with hostToken) or returning player (with playerId + playerToken).
export interface ValidateGameAuth {
  hostToken?: string;
  playerId?: string;
  playerToken?: string;
}

export interface ClientToServerEvents {
  createGame: (
    title: string,
    questions: Question[],
    settings: GameSettings,
    dbUserId: string | null,
    callback: (game: Game, hostToken: string) => void
  ) => void;
  joinGame: (
    pin: string,
    playerName: string,
    persistentId: string | null,
    playerToken: string | null,
    dbUserId: string | null,
    callback: (success: boolean, game?: Game, playerId?: string, playerToken?: string) => void
  ) => void;
  validateGame: (
    gameId: string,
    auth: ValidateGameAuth,
    callback: (valid: boolean, game?: Game) => void
  ) => void;
  startGame: (gameId: string, hostToken: string) => void;
  submitAnswer: (
    gameId: string,
    questionId: string,
    answerIndex: number,
    persistentId: string,
    playerToken: string,
    qEpoch?: number,
    clientPerceivedMs?: number
  ) => void;
  nextQuestion: (gameId: string, hostToken: string) => void;
  showLeaderboard: (gameId: string, hostToken: string) => void;
  endGame: (gameId: string, hostToken: string) => void;
  downloadGameLogs: (gameId: string, hostToken: string) => void;
  toggleDyslexiaSupport: (gameId: string, playerId: string, hostToken: string) => void;
  kickPlayer: (gameId: string, playerId: string, hostToken: string) => void;
  skipQuestion: (gameId: string, hostToken: string) => void;
}
