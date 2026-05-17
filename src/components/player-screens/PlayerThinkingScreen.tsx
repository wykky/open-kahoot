'use client';

import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PendingLayout from '@/components/PendingLayout';
import type { Question } from '@/types/game';

interface PlayerThinkingScreenProps {
  question?: Question;
}

export default function PlayerThinkingScreen({ question }: PlayerThinkingScreenProps) {
  const { t } = useTranslation();

  // If we have the question (solo / phone-shows-question mode), render it
  if (question) {
    return (
      <div className="w-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl bg-white border-2 border-black rounded-2xl p-6 sm:p-8 shadow-lg">
          {question.image && (
            <div className="mb-4 flex justify-center">
              <img
                src={question.image}
                alt=""
                className="max-h-48 rounded-lg object-contain"
              />
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-black text-center leading-snug">
            {question.question}
          </h2>
          <p className="mt-6 text-center text-gray-600 text-sm flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            {t('screens.playerThinking.description')}
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
        title={t('screens.playerThinking.title')}
        description={t('screens.playerThinking.description')}
        ignoreMinHeight
      />
    </div>
  );
}
