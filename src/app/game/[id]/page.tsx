'use client';

import { useEffect, useReducer } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getSocket } from '@/lib/socket-client';
import type { Game, Question, GameStats, Player, PersonalResult, GamePhase, PhaseDeadline } from '@/types/game';
// Game Screen Components
import GameValidationScreen from '@/components/game-screens/GameValidationScreen';
import GameErrorScreen from '@/components/game-screens/GameErrorScreen';
import GameWaitingScreen from '@/components/game-screens/GameWaitingScreen';
import GameLeaderboardScreen from '@/components/game-screens/GameLeaderboardScreen';
import GameFinalResultsScreen from '@/components/game-screens/GameFinalResultsScreen';
import GameThinkingPhaseScreen from '@/components/game-screens/GameThinkingPhaseScreen';
import GameWaitingForResultsScreen from '@/components/game-screens/GameWaitingForResultsScreen';
import GameAnsweringPhaseScreen from '@/components/game-screens/GameAnsweringPhaseScreen';
import GameResultsPhaseScreen from '@/components/game-screens/GameResultsPhaseScreen';
import GameFallbackScreen from '@/components/game-screens/GameFallbackScreen';

const HOST_TOKEN_KEY = (gameId: string) => `host_token_${gameId}`;
const PLAYER_ID_KEY = (pin: string) => `player_id_${pin}`;
const PLAYER_TOKEN_KEY = (pin: string) => `player_token_${pin}`;

interface GameState {
  game: Game | null;
  currentQuestion: Question | null;
  timeLeft: number;
  phase: 'thinking' | 'answering';
  selectedAnswer: number | null;
  hasAnswered: boolean;
  questionStats: GameStats | null;
  personalResult: PersonalResult | null;
  finalScores: Player[];
  leaderboard: Player[];
  gameStatus: GamePhase | 'waiting-results';
  gameError: string | null;
  isValidating: boolean;
  hostReconnecting: boolean;
  qEpoch: number | null; // Phase 6: stale-answer guard
}

type GameAction =
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_GAME_ERROR'; payload: string }
  | { type: 'SET_GAME_DATA'; payload: { game: Game; status: GamePhase } }
  | { type: 'START_THINKING_PHASE'; payload: { question: Question; thinkTime: number; deadline?: PhaseDeadline } }
  | { type: 'START_ANSWERING_PHASE'; payload: { answerTime: number; deadline?: PhaseDeadline } }
  | { type: 'SUBMIT_ANSWER'; payload: { answerIndex: number } }
  | { type: 'QUESTION_ENDED'; payload: GameStats }
  | { type: 'WAITING_FOR_RESULTS' }
  | { type: 'PERSONAL_RESULT'; payload: PersonalResult }
  | { type: 'SHOW_LEADERBOARD'; payload: { leaderboard: Player[]; game: Game } }
  | { type: 'GAME_FINISHED'; payload: Player[] }
  | { type: 'TICK_TIMER' }
  | { type: 'GAME_STARTED'; payload: Game }
  | { type: 'HOST_RECONNECTING'; payload: boolean };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_VALIDATING':
      return { ...state, isValidating: action.payload };
    case 'SET_GAME_ERROR':
      return { ...state, gameError: action.payload, isValidating: false };
    case 'SET_GAME_DATA':
      return { ...state, game: action.payload.game, gameStatus: action.payload.status, isValidating: false };
    case 'GAME_STARTED':
      return { ...state, game: action.payload, gameStatus: 'preparation' };
    case 'START_THINKING_PHASE': {
      // Phase 6: derive timeLeft from server's absolute deadline if available, fall back to thinkTime
      let timeLeft = action.payload.thinkTime;
      if (action.payload.deadline) {
        const skew = Date.now() - action.payload.deadline.serverNow;
        timeLeft = Math.max(0, Math.ceil((action.payload.deadline.deadlineMs + skew - Date.now()) / 1000));
      }
      return {
        ...state,
        currentQuestion: action.payload.question,
        timeLeft,
        phase: 'thinking',
        selectedAnswer: null,
        hasAnswered: false,
        questionStats: null,
        personalResult: null,
        gameStatus: 'thinking',
        qEpoch: action.payload.deadline?.qEpoch ?? state.qEpoch,
      };
    }
    case 'START_ANSWERING_PHASE': {
      let timeLeft = action.payload.answerTime;
      if (action.payload.deadline) {
        const skew = Date.now() - action.payload.deadline.serverNow;
        timeLeft = Math.max(0, Math.ceil((action.payload.deadline.deadlineMs + skew - Date.now()) / 1000));
      }
      return {
        ...state,
        timeLeft,
        phase: 'answering',
        gameStatus: 'answering',
        qEpoch: action.payload.deadline?.qEpoch ?? state.qEpoch,
      };
    }
    case 'SUBMIT_ANSWER':
      return { ...state, selectedAnswer: action.payload.answerIndex, hasAnswered: true };
    case 'QUESTION_ENDED':
      return { ...state, questionStats: action.payload, gameStatus: 'results' };
    case 'WAITING_FOR_RESULTS':
      return { ...state, gameStatus: 'waiting-results' };
    case 'PERSONAL_RESULT':
      return { ...state, personalResult: action.payload, gameStatus: 'results' };
    case 'SHOW_LEADERBOARD':
      return {
        ...state,
        leaderboard: action.payload.leaderboard,
        game: action.payload.game,
        gameStatus: 'leaderboard',
      };
    case 'GAME_FINISHED':
      return { ...state, finalScores: action.payload, gameStatus: 'finished' };
    case 'TICK_TIMER':
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };
    case 'HOST_RECONNECTING':
      return { ...state, hostReconnecting: action.payload };
    default:
      return state;
  }
}

const initialState: GameState = {
  game: null,
  currentQuestion: null,
  timeLeft: 0,
  phase: 'thinking',
  selectedAnswer: null,
  hasAnswered: false,
  questionStats: null,
  personalResult: null,
  finalScores: [],
  leaderboard: [],
  gameStatus: 'waiting',
  gameError: null,
  isValidating: true,
  hostReconnecting: false,
  qEpoch: null,
};

export default function GamePage() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const gameId = params?.id ?? null;
  const isHost = searchParams?.get('host') === 'true';
  const isPlayer = searchParams?.get('player') === 'true';

  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const socket = getSocket();

    if (!gameId) {
      dispatch({ type: 'SET_VALIDATING', payload: false });
      dispatch({ type: 'SET_GAME_ERROR', payload: t('screens.gameError.gameNotFound') });
      return;
    }

    // Build the auth payload for validateGame
    const buildAuth = (gameData?: Game) => {
      if (isHost) {
        const t = (() => {
          try { return localStorage.getItem(HOST_TOKEN_KEY(gameId)) || ''; } catch { return ''; }
        })();
        return { hostToken: t };
      }
      if (gameData) {
        const pin = gameData.pin;
        const pid = (() => {
          try { return localStorage.getItem(PLAYER_ID_KEY(pin)) || ''; } catch { return ''; }
        })();
        const tok = (() => {
          try { return localStorage.getItem(PLAYER_TOKEN_KEY(pin)) || ''; } catch { return ''; }
        })();
        return { playerId: pid, playerToken: tok };
      }
      return {};
    };

    const urlParams = new URLSearchParams(window.location.search);
    const isPlayerParam = urlParams.get('player') === 'true';

    if (isPlayerParam) {
      // First, validateGame with empty auth to fetch game (for PIN). Then re-validate with full auth.
      socket.emit('validateGame', gameId, {}, (valid: boolean, gameData?: Game) => {
        if (valid && gameData) {
          const auth = buildAuth(gameData);
          // Re-validate with the real player auth so the server marks us as known
          socket.emit('validateGame', gameId, auth, (valid2: boolean, gameData2?: Game) => {
            dispatch({ type: 'SET_VALIDATING', payload: false });
            if (valid2 && gameData2) {
              dispatch({ type: 'SET_GAME_DATA', payload: { game: gameData2, status: gameData2.status } });
            } else {
              dispatch({ type: 'SET_GAME_ERROR', payload: t('screens.gameError.unableToRejoin') });
              setTimeout(() => router.push('/'), 3000);
            }
          });
        } else {
          dispatch({ type: 'SET_VALIDATING', payload: false });
          dispatch({ type: 'SET_GAME_ERROR', payload: t('screens.gameError.gameNotFound') });
          setTimeout(() => router.push('/'), 3000);
        }
      });
    } else {
      const auth = buildAuth();
      socket.emit('validateGame', gameId, auth, (valid: boolean, gameData?: Game) => {
        dispatch({ type: 'SET_VALIDATING', payload: false });
        if (valid && gameData) {
          dispatch({ type: 'SET_GAME_DATA', payload: { game: gameData, status: gameData.status } });
        } else {
          dispatch({ type: 'SET_GAME_ERROR', payload: t('screens.gameError.gameNotFound') });
          setTimeout(() => router.push('/'), 3000);
        }
      });
    }

    socket.on('gameStarted', (gameData: Game) => dispatch({ type: 'GAME_STARTED', payload: gameData }));
    socket.on('thinkingPhase', (question: Question, thinkTime: number, deadline?: PhaseDeadline) =>
      dispatch({ type: 'START_THINKING_PHASE', payload: { question, thinkTime, deadline } })
    );
    socket.on('answeringPhase', (answerTime: number, deadline?: PhaseDeadline) =>
      dispatch({ type: 'START_ANSWERING_PHASE', payload: { answerTime, deadline } })
    );
    socket.on('questionEnded', () => dispatch({ type: 'WAITING_FOR_RESULTS' }));
    socket.on('personalResult', (result: PersonalResult) =>
      dispatch({ type: 'PERSONAL_RESULT', payload: result })
    );
    socket.on('hostResults', (stats: GameStats) => dispatch({ type: 'QUESTION_ENDED', payload: stats }));
    socket.on('leaderboardShown', (leaderboardData: Player[], gameData: Game) =>
      dispatch({ type: 'SHOW_LEADERBOARD', payload: { leaderboard: leaderboardData, game: gameData } })
    );
    socket.on('gameFinished', (scores: Player[]) => dispatch({ type: 'GAME_FINISHED', payload: scores }));
    socket.on('playerAnswered', () => {});
    socket.on('gameLogs', (tsvData: string, filename: string) => {
      const blob = new Blob([tsvData], { type: 'text/tab-separated-values' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
    socket.on('waitForNextQuestion', () => {
      // Late joiner during answering — just stay on waiting screen
      console.log('[client] Server says: wait for next question');
    });
    socket.on('hostReconnecting', () => dispatch({ type: 'HOST_RECONNECTING', payload: true }));
    socket.on('hostReconnected', () => dispatch({ type: 'HOST_RECONNECTING', payload: false }));

    return () => {
      socket.off('gameStarted');
      socket.off('thinkingPhase');
      socket.off('answeringPhase');
      socket.off('questionEnded');
      socket.off('hostResults');
      socket.off('personalResult');
      socket.off('leaderboardShown');
      socket.off('gameFinished');
      socket.off('playerAnswered');
      socket.off('gameLogs');
      socket.off('waitForNextQuestion');
      socket.off('hostReconnecting');
      socket.off('hostReconnected');
    };
  }, [gameId, isHost, router, t]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (state.timeLeft > 0 && (state.phase === 'thinking' || state.phase === 'answering')) {
      timer = setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [state.timeLeft, state.phase]);

  const submitAnswer = (answerIndex: number) => {
    if (state.hasAnswered || !state.currentQuestion || state.phase !== 'answering') return;
    dispatch({ type: 'SUBMIT_ANSWER', payload: { answerIndex } });
    const gamePin = state.game?.pin;
    if (!gamePin || !gameId) return;
    const persistentId = (() => {
      try { return localStorage.getItem(PLAYER_ID_KEY(gamePin)) || ''; } catch { return ''; }
    })();
    const playerToken = (() => {
      try { return localStorage.getItem(PLAYER_TOKEN_KEY(gamePin)) || ''; } catch { return ''; }
    })();
    if (!persistentId || !playerToken) {
      console.warn('[submitAnswer] missing playerId/playerToken — answer cannot be submitted');
      return;
    }
    const socket = getSocket();
    socket.emit(
      'submitAnswer',
      gameId,
      state.currentQuestion.id,
      answerIndex,
      persistentId,
      playerToken,
      state.qEpoch ?? undefined
    );
  };

  const getHostToken = (): string => {
    // Read URL directly to bypass any stale React closure / useParams transient.
    const path = typeof window === 'undefined' ? '' : window.location.pathname;
    const id = path.split('/')[2] || gameId;
    if (!id) return '';
    try { return localStorage.getItem(HOST_TOKEN_KEY(id)) || ''; } catch { return ''; }
  };

  const nextQuestion = () => {
    const socket = getSocket();
    if (!gameId) return;
    socket.emit('nextQuestion', gameId, getHostToken());
  };

  const showLeaderboard = () => {
    const socket = getSocket();
    if (!gameId) return;
    const tok = getHostToken();
    console.log('[client] showLeaderboard | gameId:', gameId, '| token len:', tok.length, '| prefix:', tok.slice(0, 12));
    socket.emit('showLeaderboard', gameId, tok);
  };

  const downloadLogs = () => {
    const socket = getSocket();
    if (!gameId) return;
    socket.emit('downloadGameLogs', gameId, getHostToken());
  };

  if (state.isValidating) return <GameValidationScreen />;
  if (state.gameError) return <GameErrorScreen error={state.gameError} />;
  if (state.gameStatus === 'waiting' || state.gameStatus === 'preparation') {
    return <GameWaitingScreen gameStatus={state.gameStatus} />;
  }
  if (state.gameStatus === 'leaderboard' && isHost) {
    return (
      <GameLeaderboardScreen
        leaderboard={state.leaderboard}
        game={state.game}
        onNextQuestion={nextQuestion}
      />
    );
  }
  if (state.gameStatus === 'finished') {
    return (
      <GameFinalResultsScreen
        finalScores={state.finalScores}
        isHost={isHost}
        onDownloadLogs={downloadLogs}
      />
    );
  }
  if (state.gameStatus === 'thinking' && state.phase === 'thinking' && state.currentQuestion) {
    return (
      <GameThinkingPhaseScreen
        currentQuestion={state.currentQuestion}
        timeLeft={state.timeLeft}
        game={state.game}
        isHost={isHost}
        isPlayer={isPlayer}
      />
    );
  }
  if (state.gameStatus === 'waiting-results') {
    return <GameWaitingForResultsScreen isHost={isHost} />;
  }
  if (state.gameStatus === 'answering' && state.phase === 'answering' && state.currentQuestion) {
    return (
      <GameAnsweringPhaseScreen
        currentQuestion={state.currentQuestion}
        timeLeft={state.timeLeft}
        game={state.game}
        isHost={isHost}
        isPlayer={isPlayer}
        onSubmitAnswer={submitAnswer}
        hasAnswered={state.hasAnswered}
      />
    );
  }
  if (state.gameStatus === 'results') {
    return (
      <GameResultsPhaseScreen
        isHost={isHost}
        isPlayer={isPlayer}
        questionStats={state.questionStats}
        personalResult={state.personalResult}
        onShowLeaderboard={showLeaderboard}
        currentQuestion={state.currentQuestion}
        selectedAnswer={state.selectedAnswer}
        game={state.game}
      />
    );
  }
  return <GameFallbackScreen />;
}
