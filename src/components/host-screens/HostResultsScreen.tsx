'use client';

import { useEffect } from 'react';
import { GameStats } from '@/types/game';
import Button from '@/components/Button';
import { ChevronRight } from 'lucide-react';
import { useCountdownMusic } from '@/lib/useCountdownMusic';
import { getCorrectAnswerSet } from '@/lib/game/questionType';

interface HostResultsScreenProps {
  questionStats: GameStats;
  onShowLeaderboard: () => void;
}

export default function HostResultsScreen({ 
  questionStats, 
  onShowLeaderboard 
}: HostResultsScreenProps) {
  const { playGong } = useCountdownMusic();

  // Play gong sound when results phase starts (only once)
  useEffect(() => {
    playGong();
  }, [playGong]); // Add missing dependency

  // Choice button colors for display - extract base color class
  const choiceColorClasses = [
    'bg-rose-500', // A
    'bg-blue-600', // B
    'bg-amber-400', // C
    'bg-emerald-500' // D
  ];

  return (
    <div className="bg-white rounded-lg p-3 sm:p-5 border border-gray-300 h-full flex flex-col overflow-hidden">
      <div className="text-center mb-2 sm:mb-3 shrink-0">
        <h1 className="text-xl sm:text-3xl text-black mb-1 sm:mb-2 font-subtitle leading-tight">
          {questionStats.question.question}
        </h1>
        {questionStats.question.explanation && (
          <p className="text-gray-600 text-xs sm:text-base mb-2 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            {questionStats.question.explanation}
          </p>
        )}
        <p className="text-gray-600 text-sm sm:text-lg">
          {`${questionStats.correctAnswers} out of ${questionStats.totalPlayers} players got it right!`}
        </p>
      </div>

      <div className="text-center mb-2 sm:mb-3 shrink-0">
        <Button
          onClick={onShowLeaderboard}
          variant="primary"
          size="md"
          icon={ChevronRight}
          iconPosition="right"
          className="mx-auto"
        >
          Show leaderboard
        </Button>
      </div>

      {questionStats.question.questionType === 'multi' && (
        <p className="text-center text-[11px] sm:text-sm font-semibold text-yellow-800 mb-1 sm:mb-2 shrink-0">
          Multi-select — every correct option highlighted below
        </p>
      )}
      {(() => {
        const correctSet = getCorrectAnswerSet(questionStats.question);
        return (
      <div className="space-y-1.5 sm:space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {questionStats.answers.map((answer, index) => {
          const baseColor = choiceColorClasses[index];
          const opacity = correctSet.has(index) ? 'opacity-100' : 'opacity-40';

          return (
            <div key={index} className="relative rounded-lg border-2 border-gray-300 overflow-hidden">
              {/* Progress zone - fills the rectangle */}
              <div
                className={`absolute inset-0 ${baseColor} ${opacity} transition-all duration-1000`}
                style={{ width: `${answer.percentage}%` }}
              />

              {/* Content on top */}
              <div className="relative flex items-center justify-between p-2 sm:p-3 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base ${baseColor} ${opacity} shrink-0`}>
                  {String.fromCharCode(65 + index)}
                </div>
                  <span className="text-black font-semibold text-sm sm:text-base truncate">
                  {questionStats.question.options[index]}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                  <span className="text-black font-bold text-sm sm:text-base">{answer.count}</span>
                  <span className="text-gray-600 text-xs sm:text-sm">({answer.percentage}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
        );
      })()}
    </div>
  );
}