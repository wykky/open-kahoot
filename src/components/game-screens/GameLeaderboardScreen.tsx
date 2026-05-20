'use client';

import { ChevronRight } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import Leaderboard from '@/components/Leaderboard';
import type { Player, Game } from '@/types/game';

interface GameLeaderboardScreenProps {
  leaderboard: Player[];
  game: Game | null;
  onNextQuestion: () => void;
}

export default function GameLeaderboardScreen({
  leaderboard,
  game,
  onNextQuestion
}: GameLeaderboardScreenProps) {
  const isLastQuestion = (game?.currentQuestionIndex ?? 0) + 1 >= (game?.questions.length ?? 0);
  const currentQuestion = (game?.currentQuestionIndex ?? 0) + 1;
  const totalQuestions = game?.questions.length ?? 0;

  return (
    <PageLayout gradient="waiting" maxWidth="4xl" showLogo={false}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="bg-white border-4 border-black rounded-2xl p-3 sm:p-5 shadow-xl flex-1 min-h-0 flex flex-col overflow-hidden">
          <Leaderboard
            players={leaderboard}
            title="Current leaderboard"
            subtitle={`Question ${currentQuestion} of ${totalQuestions} completed`}
            buttons={[{
              text: isLastQuestion ? 'Finish game' : 'Next question',
              onClick: onNextQuestion,
              icon: ChevronRight,
              iconPosition: 'right'
            }]}
            compact
          />
        </div>
      </div>
    </PageLayout>
  );
}