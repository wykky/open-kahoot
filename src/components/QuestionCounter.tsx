'use client';

import type { Game } from '@/types/game';

/**
 * "Question 4 of 30" progress pill, shown during the thinking and answering
 * phases on both the host screen and player devices so students can see how
 * much of the quiz is left.
 *
 * Reads `totalQuestions` (a plain count) rather than `questions.length`: the
 * server strips the question list out of the client payload so players can't
 * read ahead to the correct answers, and sends only the count instead.
 *
 * Renders nothing when the count is unknown (e.g. a brief window during
 * reconnect) rather than showing a misleading "Question 1 of 0".
 */
export default function QuestionCounter({
  game,
  className = '',
}: {
  game: Game | null;
  className?: string;
}) {
  const total = game?.totalQuestions ?? 0;
  if (!game || total <= 0) return null;

  const current = Math.min((game.currentQuestionIndex ?? 0) + 1, total);

  return (
    <div className={`text-center ${className}`}>
      <span
        className="inline-block bg-white border-2 border-black rounded-full px-3 py-0.5 text-xs sm:text-sm font-bold text-black"
        aria-label={`Question ${current} of ${total}`}
      >
        Question {current} of {total}
      </span>
    </div>
  );
}
