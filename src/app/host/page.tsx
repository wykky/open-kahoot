'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import jschardet from 'jschardet';
import * as iconv from 'iconv-lite';
import { getSocket } from '@/lib/socket-client';
import { appConfig } from '@/lib/config';
import { useBeforeUnload } from '@/lib/hooks/useBeforeUnload';
import type { Question, Game, Player, GameSettings } from '@/types/game';

// Host Setup Components
import HostGameLobbyScreen from '@/components/host-setup/HostGameLobbyScreen';
import HostQuizCreationScreen from '@/components/host-setup/HostQuizCreationScreen';

// Phase 2: hostToken in localStorage survives tab close + browser restart (5 min server-side grace).
const HOST_TOKEN_KEY = (gameId: string) => `host_token_${gameId}`;
const ACTIVE_HOST_GAME_KEY = 'atenu_live_active_host_game';
const ACTIVE_GAME_STALE_MS = 10 * 60 * 1000; // pointer older than 10 min is discarded

export default function HostPage() {
  const { data: session } = useSession();
  const dbUserId = ((session?.user as { dbUserId?: string } | undefined)?.dbUserId) ?? null;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    thinkTime: 5,
    answerTime: 20,
    showQuestionOnPlayers: true,
  });
  const [game, setGame] = useState<Game | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);

  const router = useRouter();

  const { clearNavigationFlag } = useBeforeUnload({
    enabled: questions.length > 0,
    message: 'You have unsaved questions in your quiz. Are you sure you want to leave?',
  });

  // Resume detection — runs once on mount
  useEffect(() => {
    let cancelled = false;
    const tryResume = () => {
      let pointerRaw: string | null = null;
      try { pointerRaw = localStorage.getItem(ACTIVE_HOST_GAME_KEY); } catch {}
      if (!pointerRaw) return;
      let pointer: { gameId: string; pin: string; ts: number };
      try { pointer = JSON.parse(pointerRaw); } catch {
        try { localStorage.removeItem(ACTIVE_HOST_GAME_KEY); } catch {}
        return;
      }
      if (!pointer.gameId || Date.now() - pointer.ts > ACTIVE_GAME_STALE_MS) {
        try {
          localStorage.removeItem(ACTIVE_HOST_GAME_KEY);
          localStorage.removeItem(HOST_TOKEN_KEY(pointer.gameId));
        } catch {}
        return;
      }
      let token: string | null = null;
      try { token = localStorage.getItem(HOST_TOKEN_KEY(pointer.gameId)); } catch {}
      if (!token) {
        try { localStorage.removeItem(ACTIVE_HOST_GAME_KEY); } catch {}
        return;
      }
      const socket = getSocket();
      socket.emit('validateGame', pointer.gameId, { hostToken: token }, (valid: boolean, gameData?: Game) => {
        if (cancelled) return;
        if (valid && gameData) {
          setGame(gameData);
          setHostToken(token);
          // If the game is past lobby, jump straight to the live game view
          if (gameData.status !== 'waiting') {
            router.replace(`/game/${gameData.id}?host=true`);
          }
        } else {
          // Game is gone (cleaned up / restarted) — purge stale pointers
          try {
            localStorage.removeItem(ACTIVE_HOST_GAME_KEY);
            localStorage.removeItem(HOST_TOKEN_KEY(pointer.gameId));
          } catch {}
        }
      });
    };
    tryResume();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const discardActiveGame = () => {
    if (!confirm('Discard the current game and start fresh? Players will be disconnected.')) return;
    if (game && hostToken) {
      try { getSocket().emit('endGame', game.id, hostToken); } catch {}
    }
    try {
      if (game) localStorage.removeItem(HOST_TOKEN_KEY(game.id));
      localStorage.removeItem(ACTIVE_HOST_GAME_KEY);
    } catch {}
    setGame(null);
    setHostToken(null);
  };

  useEffect(() => {
    const socket = getSocket();
    socket.on('playerJoined', (player: Player) => {
      setGame((prev) =>
        prev
          ? { ...prev, players: [...prev.players.filter((p) => p.id !== player.id), player] }
          : null
      );
    });
    socket.on('playerLeft', (playerId: string) => {
      setGame((prev) =>
        prev ? { ...prev, players: prev.players.filter((p) => p.id !== playerId) } : null
      );
    });
    socket.on('gameUpdated', (updatedGame: Game) => setGame(updatedGame));
    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameUpdated');
    };
  }, []);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const parseTsvFile = async (file: File): Promise<Question[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detected = jschardet.detect(buffer);
    const encoding = detected.encoding || 'utf-8';
    const text = iconv.decode(buffer, encoding);
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase(),
        complete: (results) => {
          try {
            const data = results.data as Record<string, string>[];
            if (data.length === 0) throw new Error('File must contain at least one data row');
            const requiredColumns = ['question', 'correct', 'wrong1', 'wrong2', 'wrong3'];
            const headers = Object.keys(data[0] || {});
            const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
            if (missingColumns.length > 0) {
              throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }
            const parsedQuestions: Question[] = [];
            for (const row of data) {
              const questionText = row.question?.trim();
              const correctAnswer = row.correct?.trim();
              const wrong1 = row.wrong1?.trim();
              const wrong2 = row.wrong2?.trim();
              const wrong3 = row.wrong3?.trim();
              const explanation = row.explanation?.trim();
              const image = row.image?.trim();
              if (!questionText || !correctAnswer || !wrong1 || !wrong2 || !wrong3) continue;
              const answers = [correctAnswer, wrong1, wrong2, wrong3];
              const shuffledAnswers = shuffleArray(answers);
              const correctIndex = shuffledAnswers.indexOf(correctAnswer);
              parsedQuestions.push({
                id: uuidv4(),
                question: questionText,
                options: shuffledAnswers,
                correctAnswer: correctIndex,
                timeLimit: 30,
                explanation: explanation || undefined,
                image: image || undefined,
              });
            }
            resolve(parsedQuestions);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: unknown) => {
          const errorMessage =
            error && typeof error === 'object' && 'message' in error
              ? String(error.message)
              : 'Unknown parsing error';
          reject(new Error(`Failed to parse TSV file: ${errorMessage}`));
        },
      });
    });
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importedQuestions = await parseTsvFile(file);
      setQuestions(importedQuestions);
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      alert(
        `Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      event.target.value = '';
    }
  };

  const handleAppendTSV = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importedQuestions = await parseTsvFile(file);
      const newQuestions = [...questions];
      newQuestions.splice(index, 0, ...importedQuestions);
      setQuestions(newQuestions);
      event.target.value = '';
    } catch (error) {
      console.error('Append error:', error);
      alert(
        `Error appending file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      event.target.value = '';
    }
  };

  const addQuestion = (index?: number) => {
    const newQuestion: Question = {
      id: uuidv4(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 30,
    };
    if (index !== undefined) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 0, newQuestion);
      setQuestions(newQuestions);
    } else {
      setQuestions([...questions, newQuestion]);
    }
  };

  const updateQuestion = (
    index: number,
    field: keyof Question,
    value: string | number | number[] | undefined
  ) => {
    const updated = [...questions];
    const next = { ...updated[index], [field]: value } as Question;
    // Side effect: switching questionType seeds/clears correctAnswers.
    // Single → multi: seed with TWO correct indices — the existing primary plus the
    //                 next slot. The server validator rejects multi-select with fewer
    //                 than 2 corrects (the whole point), so seeding with 1 means
    //                 "Create game" silently fails. Start the host at a valid state;
    //                 they can uncheck and check whichever pair they actually want.
    // Multi → single: clear correctAnswers so single-mode reads stay clean.
    if (field === 'questionType') {
      if (value === 'multi') {
        if (!next.correctAnswers || next.correctAnswers.length < 2) {
          const primary = next.correctAnswer;
          const buddy = (primary + 1) % 4;
          next.correctAnswers = [primary, buddy].sort((a, b) => a - b);
        }
      } else {
        delete next.correctAnswers;
      }
    }
    // Keep correctAnswer aligned to the first entry of correctAnswers for multi —
    // downstream code paths still read correctAnswer for display fallbacks.
    if (field === 'correctAnswers' && Array.isArray(value) && value.length > 0) {
      next.correctAnswer = value[0];
    }
    updated[index] = next;
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const createGame = () => {
    if (questions.length === 0) return;
    const socket = getSocket();
    const title = 'Quiz Game';
    socket.emit('createGame', title, questions, gameSettings, dbUserId, (createdGame: Game, token: string) => {
      setGame(createdGame);
      setHostToken(token);
      try {
        localStorage.setItem(HOST_TOKEN_KEY(createdGame.id), token);
        localStorage.setItem(
          ACTIVE_HOST_GAME_KEY,
          JSON.stringify({ gameId: createdGame.id, pin: createdGame.pin, ts: Date.now() })
        );
      } catch {}
      clearNavigationFlag();
    });
  };

  const startGame = () => {
    if (!game || !hostToken) return;
    const socket = getSocket();
    socket.emit('startGame', game.id, hostToken);
    clearNavigationFlag();
    router.push(`/game/${game.id}?host=true`);
  };

  const toggleDyslexiaSupport = (playerId: string) => {
    if (!game || !hostToken) return;
    const socket = getSocket();
    socket.emit('toggleDyslexiaSupport', game.id, playerId, hostToken);
  };

  const kickPlayer = (playerId: string) => {
    if (!game || !hostToken) return;
    const socket = getSocket();
    socket.emit('kickPlayer', game.id, playerId, hostToken);
  };

  const getJoinUrl = () => (game ? `${appConfig.url}/join?pin=${game.pin}` : '');

  const downloadTSV = () => {
    if (questions.length === 0) {
      alert('There are no questions to export.');
      return;
    }
    const tsvContent = Papa.unparse(
      {
        fields: ['question', 'correct', 'wrong1', 'wrong2', 'wrong3', 'explanation', 'image'],
        data: questions.map((q) => {
          const wrongOptions = q.options.filter((_, i) => i !== q.correctAnswer);
          return {
            question: q.question,
            correct: q.options[q.correctAnswer],
            wrong1: wrongOptions[0] || '',
            wrong2: wrongOptions[1] || '',
            wrong3: wrongOptions[2] || '',
            explanation: q.explanation || '',
            image: q.image || '',
          };
        }),
      },
      { delimiter: '\t' }
    );
    const blob = new Blob([`﻿${tsvContent}`], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    link.download = `quiz-${timestamp}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAIQuestions = async (
    subject: string,
    language: 'english' | 'french',
    questionCount: number = 5
  ) => {
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, language, questionCount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions');
      if (!data.success || !data.questions) throw new Error('Failed to generate questions');
      const newQuestions: Question[] = data.questions.map((q: {
        question: string; correct: string; wrong1: string; wrong2: string; wrong3: string; explanation?: string;
      }) => {
        const answers = [q.correct, q.wrong1, q.wrong2, q.wrong3];
        const shuffledAnswers = shuffleArray(answers);
        const correctIndex = shuffledAnswers.indexOf(q.correct);
        return {
          id: uuidv4(),
          question: q.question,
          options: shuffledAnswers,
          correctAnswer: correctIndex,
          timeLimit: 30,
          explanation: q.explanation || undefined,
        };
      });
      setQuestions([...questions, ...newQuestions]);
      alert(`Successfully generated ${newQuestions.length} questions!`);
    } catch (error) {
      console.error('Error generating questions:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Failed to generate questions'}`
      );
    }
  };

  if (game) {
    return (
      <>
        <HostGameLobbyScreen
          game={game}
          joinUrl={getJoinUrl()}
          onStartGame={startGame}
          onToggleDyslexiaSupport={toggleDyslexiaSupport}
          onKickPlayer={kickPlayer}
        />
        <button
          onClick={discardActiveGame}
          aria-label="End this game and start a new quiz"
          className="fixed bottom-4 left-4 z-50 px-3 py-2 bg-black/80 text-white text-xs rounded-lg shadow-lg hover:bg-black backdrop-blur-sm"
        >
          End game & start new
        </button>
      </>
    );
  }

  return (
    <HostQuizCreationScreen
      questions={questions}
      gameSettings={gameSettings}
      onUpdateSettings={setGameSettings}
      onAddQuestion={addQuestion}
      onAppendTSV={handleAppendTSV}
      onFileImport={handleFileImport}
      onUpdateQuestion={updateQuestion}
      onUpdateOption={updateOption}
      onRemoveQuestion={removeQuestion}
      onMoveQuestion={moveQuestion}
      onDownloadTSV={downloadTSV}
      onCreateGame={createGame}
      onGenerateAIQuestions={handleGenerateAIQuestions}
    />
  );
}
