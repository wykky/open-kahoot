'use client';

import { Eye } from 'lucide-react';
import PendingLayout from '@/components/PendingLayout';
import type { Question } from '@/types/game';

interface PlayerThinkingScreenProps {
  question?: Question;
}

export default function PlayerThinkingScreen({ question }: PlayerThinkingScreenProps) {
  // If we have the question (solo / phone-shows-question mode), render it
  if (question) {
    return (
      <div className="w-full flex flex-col items-center justify-center px-2 min-h-0 overflow-hidden">
        <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-3 sm:p-5 shadow-lg max-h-full flex flex-col overflow-hidden">
          {question.image && (
            <div className="mb-2 sm:mb-3 flex justify-center shrink-0">
              <img
                src={question.image}
                alt={question.question}
                className="max-h-28 sm:max-h-40 rounded-lg object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <h2 className="text-base sm:text-xl font-bold text-black text-center leading-snug">
              {question.question}
            </h2>
            {question.questionType === 'multi' && (
              <p className="mt-1 text-center text-xs sm:text-sm font-semibold text-yellow-800">
                Multi-select — get ready to pick all that apply
              </p>
            )}
          </div>
          <p className="mt-2 sm:mt-3 text-center text-gray-600 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0">
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Look at the main screen and read the question
          </p>
        </div>
      </div>
    );
  }

  // Classroom mode — just show "Get Ready"
  return (
    <div className="text-center w-full flex flex-col items-center justify-center min-h-0">
      <PendingLayout
        icon={Eye}
        title="Get ready!"
        description="Look at the main screen and read the question"
        ignoreMinHeight
      />
    </div>
  );
}
