'use client';

import { getChoiceColor } from '@/lib/palette';
import type { Question } from '@/types/game';

// Kahoot-style shape per tile: redundant encoding for colorblind students and
// readability across a classroom. Shape + letter + color is triple-redundant.
const CHOICE_SHAPES = ['▲', '◆', '●', '■'] as const;
const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;

interface PlayerAnsweringScreenProps {
  onSubmitAnswer: (answerIndex: number) => void;
  question?: Question;
}

export default function PlayerAnsweringScreen({
  onSubmitAnswer,
  question
}: PlayerAnsweringScreenProps) {
  const showQuestion = !!question;

  return (
    <div className="w-full flex flex-col justify-center sm:bg-white sm:rounded-lg sm:p-8 sm:border sm:border-gray-300 sm:shadow-[0px_20px_30px_-10px_rgba(0,_0,_0,_0.1)]">
      {showQuestion ? (
        <>
          {/* Question text */}
          {question?.image && (
            <div className="mb-3 sm:mb-4 flex justify-center">
              <img
                src={question.image}
                alt={question.question}
                className="max-h-24 sm:max-h-40 rounded-lg object-contain"
              />
            </div>
          )}
          <h2 className="text-base sm:text-2xl font-bold text-black text-center mb-3 sm:mb-6 leading-snug px-2 break-words">
            {question?.question}
          </h2>
          {/* Answer buttons with shape + letter + option text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 flex-1">
            {(question?.options ?? ['', '', '', '']).map((optionText, index) => (
              <button
                key={index}
                onClick={() => onSubmitAnswer(index)}
                aria-label={`${CHOICE_LETTERS[index]}: ${optionText}`}
                className={`min-h-14 sm:min-h-24 rounded-xl font-bold text-white transition-all transform active:scale-95 sm:hover:scale-105 border-4 ${getChoiceColor(index)} px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 text-left overflow-hidden`}
              >
                <span
                  className="flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/30 flex items-center justify-center text-lg sm:text-2xl"
                  aria-hidden="true"
                >
                  {CHOICE_SHAPES[index]}
                </span>
                <span className="flex-1 text-sm sm:text-lg leading-tight break-words line-clamp-3">
                  {optionText}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Classroom mode — shape + letter, no option text (question is on the host screen) */}
          <h2 className="text-3xl text-black text-center mb-8 font-subtitle">
            Choose your answer:
          </h2>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {CHOICE_LETTERS.map((letter, index) => (
              <button
                key={letter}
                onClick={() => onSubmitAnswer(index)}
                aria-label={`Option ${letter}`}
                className={`h-full min-h-32 rounded-xl font-bold text-white transition-all transform hover:scale-105 border-4 ${getChoiceColor(index)} flex flex-col items-center justify-center gap-2`}
              >
                <span className="text-6xl leading-none" aria-hidden="true">{CHOICE_SHAPES[index]}</span>
                <span className="text-3xl">{letter}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
