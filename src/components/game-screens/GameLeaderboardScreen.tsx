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
  // `totalQuestions`, not `questions.length`: the server strips the question list
  // from the client payload so players can't read the answer key out of the socket.
  const totalQuestions = game?.totalQuestions ?? 0;
  const isLastQuestion = (game?.currentQuestionIndex ?? 0) + 1 >= totalQuestions;
  const currentQuestion = (game?.currentQuestionIndex ?? 0) + 1;

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