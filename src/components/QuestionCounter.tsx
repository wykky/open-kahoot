'use client';

/**
 * "Question 4 of 30" progress pill, shown during the thinking and answering
 * phases on both the host screen and player devices.
 *
 * Takes the index EXPLICITLY rather than reading it off the Game object. The
 * server only re-broadcasts the Game on gameStarted and leaderboardShown, so
 * `game.currentQuestionIndex` is stale for the whole of every question: it reads
 * -1 during question 1 (rendering "Question 0 of 30") and then trails one behind
 * for the rest of the quiz. The authoritative per-question value rides on the
 * phase deadline instead — see PhaseDeadline.questionIndex.
 *
 * `total` comes from Game.totalQuestions, which is safe: it is fixed for the
 * whole game, so a stale Game object still carries the right number.
 *
 * Renders nothing until both values are known, rather than flashing a
 * misleading "Question 0 of 0" during connect/reconnect.
 */
export default function QuestionCounter({
  questionIndex,
  total,
  className = '',
}: {
  questionIndex: number | null;
  total: number;
  className?: string;
}) {
  if (questionIndex === null || questionIndex < 0 || total <= 0) return null;

  const current = Math.min(questionIndex + 1, total);

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
