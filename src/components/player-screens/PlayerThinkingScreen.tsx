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
      <div className="w-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-6 sm:p-8 shadow-lg">
          {question.image && (
            <div className="mb-4 flex justify-center">
              <img
                src={question.image}
                alt={question.question}
                className="max-h-48 rounded-lg object-contain"
              />
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-black text-center leading-snug">
            {question.question}
          </h2>
          {question.questionType === 'multi' && (
            <p className="mt-2 text-center text-sm font-semibold text-yellow-800">
              Multi-select — get ready to pick all that apply
            </p>
          )}
          <p className="mt-6 text-center text-gray-600 text-sm flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            Look at the main screen and read the question
          </p>
        </div>
      </div>
    );
  }

  // Classroom mode — just show "Get Ready"
  return (
    <div className="text-center w-full flex flex-col items-center justify-center">
      <PendingLayout
        icon={Eye}
        title="Get ready!"
        description="Look at the main screen and read the question"
        ignoreMinHeight
      />
    </div>
  );
}
