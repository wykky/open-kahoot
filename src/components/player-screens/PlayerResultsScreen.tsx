'use client';

import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { getChoiceColor } from '@/lib/palette';
import type { PersonalResult, Question } from '@/types/game';

interface PlayerResultsScreenProps {
  personalResult: PersonalResult;
  currentQuestion?: Question;
  selectedAnswer?: number | null;
}

export default function PlayerResultsScreen({
  personalResult,
  currentQuestion,
  selectedAnswer
}: PlayerResultsScreenProps) {
  const { t } = useTranslation();
  const showAnswers = !!currentQuestion;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border-4 border-black shadow-xl text-center w-full flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Result Header */}
      <div className="mb-6">
        <h1 className="text-4xl sm:text-5xl text-black mb-4 font-subtitle">
          {personalResult.wasCorrect ? t('screens.results.correct') : t('screens.results.incorrect')}
        </h1>
      </div>

      {/* Question + correct answer highlight */}
      {showAnswers && currentQuestion && (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mb-5 border border-gray-200 text-left">
          <p className="text-base font-semibold text-black mb-2 leading-snug break-words">
            {currentQuestion.question}
          </p>
          <div className="space-y-2 mt-3">
            {currentQuestion.options.map((opt, idx) => {
              const isCorrect = idx === currentQuestion.correctAnswer;
              const isPlayerChoice = idx === selectedAnswer;
              const baseColor = getChoiceColor(idx);

              let ring = '';
              let bg = 'bg-gray-100 text-gray-700';
              let icon = null;

              if (isCorrect) {
                bg = `${baseColor} text-white`;
                ring = 'ring-4 ring-green-400';
                icon = <Check className="w-5 h-5 flex-shrink-0" />;
              } else if (isPlayerChoice) {
                bg = `${baseColor} text-white opacity-70`;
                ring = 'ring-4 ring-red-400';
                icon = <X className="w-5 h-5 flex-shrink-0" />;
              } else {
                bg = 'bg-gray-100 text-gray-500';
              }

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${bg} ${ring}`}
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/30 flex items-center justify-center font-bold text-sm">
                    {['A', 'B', 'C', 'D'][idx]}
                  </span>
                  <span className="flex-1 text-left text-sm sm:text-base font-medium">
                    {opt}
                  </span>
                  {icon}
                </div>
              );
            })}
          </div>
          {personalResult.explanation && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                {t('screens.results.explanation', { defaultValue: 'Explanation' })}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {personalResult.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Points Earned */}
      <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mb-4 border border-gray-200">
        <p className="text-gray-600 text-sm mb-1">{t('screens.results.pointsEarned')}</p>
        <p className="text-3xl sm:text-4xl font-bold text-black">
          +{personalResult.pointsEarned}
        </p>
        <p className="text-gray-600 text-sm mt-1">{t('screens.results.totalScore')} {personalResult.totalScore}</p>
      </div>

      {/* Position & Competition */}
      <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mb-4 border border-gray-200">
        <p className="text-gray-600 text-sm mb-1">{t('screens.results.currentPosition')}</p>
        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="text-3xl sm:text-4xl font-bold text-black">#{personalResult.position}</span>
        </div>
        {personalResult.pointsBehind > 0 ? (
          <p className="text-gray-600 text-sm">
            {personalResult.pointsBehind} {t('screens.results.pointsBehind')}{' '}
            <span className="font-bold text-black">{personalResult.nextPlayerName}</span>
          </p>
        ) : (
          <p className="font-semibold text-sm">
            {t('screens.results.inTheLead')}
          </p>
        )}
      </div>

      <div className="flex-1"></div>

      {/* Waiting Message */}
      <div className="text-center mt-4">
        <p className="text-gray-600 text-sm">{t('screens.results.waitingForHost')}</p>
        <div className="flex justify-center mt-3">
          <div className="animate-pulse flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
