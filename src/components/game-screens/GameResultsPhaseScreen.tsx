'use client';

import { Trophy } from 'lucide-react';
import { getGradient } from '@/lib/palette';
import AnimatedIcon from '@/components/AnimatedIcon';
import HostResultsScreen from '@/components/host-screens/HostResultsScreen';
import PlayerResultsScreen from '@/components/player-screens/PlayerResultsScreen';
import type { GameStats, PersonalResult, Question, Game } from '@/types/game';

interface GameResultsPhaseScreenProps {
  isHost: boolean;
  isPlayer: boolean;
  questionStats: GameStats | null;
  personalResult: PersonalResult | null;
  onShowLeaderboard: () => void;
  currentQuestion?: Question | null;
  selectedAnswer?: number | number[] | null;
  game?: Game | null;
}

export default function GameResultsPhaseScreen({
  isHost,
  isPlayer,
  questionStats,
  personalResult,
  onShowLeaderboard,
  currentQuestion,
  selectedAnswer,
  game
}: GameResultsPhaseScreenProps) {
  const showOnPlayers = game?.settings.showQuestionOnPlayers ?? true;

  // Host view
  if (isHost && questionStats) {
    return (
      <div className={`h-dvh overflow-hidden ${getGradient('results')} p-3 sm:p-6 flex`}>
        <div className="container mx-auto max-w-4xl flex flex-col min-h-0">
          <HostResultsScreen
            questionStats={questionStats}
            onShowLeaderboard={onShowLeaderboard}
          />
        </div>
      </div>
    );
  }

  // Player view
  if (isPlayer && personalResult) {
    return (
      <div className={`h-dvh overflow-hidden ${getGradient(personalResult.wasCorrect ? 'correct' : 'incorrect')} p-3 sm:p-6 flex`}>
        <div className="container mx-auto max-w-2xl flex flex-col min-h-0">
          <PlayerResultsScreen
            personalResult={personalResult}
            currentQuestion={showOnPlayers ? currentQuestion ?? undefined : undefined}
            selectedAnswer={selectedAnswer}
          />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className={`h-dvh overflow-hidden ${getGradient('waiting')} flex items-center justify-center p-8`}>
      <div className="text-center">
        <AnimatedIcon icon={Trophy} size="md" iconColor="text-gray-400" className="mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Getting your results ready...</h1>
        <p className="text-gray-600 text-sm sm:text-base">Hold tight, we&apos;re calculating scores!</p>
      </div>
    </div>
  );
}
