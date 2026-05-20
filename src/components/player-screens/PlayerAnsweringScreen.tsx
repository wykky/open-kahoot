'use client';

import { useState } from 'react';
import { getChoiceColor } from '@/lib/palette';
import type { Question } from '@/types/game';

// Kahoot-style shape per tile: redundant encoding for colorblind students and
// readability across a classroom. Shape + letter + color is triple-redundant.
const CHOICE_SHAPES = ['▲', '◆', '●', '■'] as const;
const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;

interface PlayerAnsweringScreenProps {
  onSubmitAnswer: (answer: number | number[]) => void;
  question?: Question;
}

export default function PlayerAnsweringScreen({
  onSubmitAnswer,
  question
}: PlayerAnsweringScreenProps) {
  const showQuestion = !!question;
  const isMulti = question?.questionType === 'multi';

  // Local selection set for multi-select. Cleared implicitly when the component
  // remounts on the next question; we don't need a useEffect because the parent
  // unmounts/remounts the screen between phases.
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const togglePick = (idx: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };
  const submitMulti = () => {
    if (picked.size === 0) return;
    onSubmitAnswer(Array.from(picked).sort((a, b) => a - b));
  };

  return (
    <div className="w-full flex flex-col min-h-0 sm:bg-white sm:rounded-lg sm:p-4 sm:border sm:border-gray-300 sm:shadow-[0px_20px_30px_-10px_rgba(0,_0,_0,_0.1)]">
      {showQuestion ? (
        <>
          {/* Question text */}
          {question?.image && (
            <div className="mb-2 sm:mb-3 flex justify-center shrink-0">
              <img
                src={question.image}
                alt={question.question}
                className="max-h-20 sm:max-h-32 rounded-lg object-contain"
              />
            </div>
          )}
          <h2 className="text-sm sm:text-xl font-bold text-black text-center mb-1 sm:mb-2 leading-snug px-1 break-words shrink-0">
            {question?.question}
          </h2>
          {isMulti && (
            <p className="text-[11px] sm:text-sm font-semibold text-yellow-800 text-center mb-2 sm:mb-3 shrink-0">
              Pick all that apply, then tap Submit
            </p>
          )}
          {/* Answer buttons with shape + letter + option text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 flex-1 min-h-0">
            {(question?.options ?? ['', '', '', '']).map((optionText, index) => {
              const isSelected = isMulti && picked.has(index);
              const onClick = isMulti ? () => togglePick(index) : () => onSubmitAnswer(index);
              return (
                <button
                  key={index}
                  onClick={onClick}
                  aria-label={`${CHOICE_LETTERS[index]}: ${optionText}`}
                  aria-pressed={isMulti ? isSelected : undefined}
                  className={`min-h-12 sm:min-h-20 rounded-xl font-bold text-white transition-all transform active:scale-95 sm:hover:scale-105 border-4 ${getChoiceColor(index)} px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 text-left overflow-hidden ${
                    isSelected ? 'ring-4 ring-black ring-offset-2' : ''
                  }`}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/30 flex items-center justify-center text-base sm:text-xl"
                    aria-hidden="true"
                  >
                    {CHOICE_SHAPES[index]}
                  </span>
                  <span className="flex-1 text-xs sm:text-base leading-tight break-words line-clamp-3">
                    {optionText}
                  </span>
                  {isMulti && (
                    <span
                      className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-xs sm:text-sm ${
                        isSelected ? 'bg-white text-black' : 'bg-transparent'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {isMulti && (
            <button
              type="button"
              onClick={submitMulti}
              disabled={picked.size === 0}
              className={`mt-2 sm:mt-3 w-full py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base border-4 border-black transition-colors shrink-0 ${
                picked.size === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-400 text-black hover:bg-black hover:text-yellow-400'
              }`}
            >
              Submit {picked.size > 0 ? `(${picked.size} picked)` : ''}
            </button>
          )}
        </>
      ) : (
        <>
          {/* Classroom mode — shape + letter, no option text (question is on the host screen).
              Multi-select isn't supported here: without the question the player can't tell. */}
          <h2 className="text-xl sm:text-2xl text-black text-center mb-3 sm:mb-4 font-subtitle shrink-0">
            Choose your answer:
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0">
            {CHOICE_LETTERS.map((letter, index) => (
              <button
                key={letter}
                onClick={() => onSubmitAnswer(index)}
                aria-label={`Option ${letter}`}
                className={`h-full min-h-20 sm:min-h-28 rounded-xl font-bold text-white transition-all transform hover:scale-105 border-4 ${getChoiceColor(index)} flex flex-col items-center justify-center gap-1 sm:gap-2`}
              >
                <span className="text-4xl sm:text-5xl leading-none" aria-hidden="true">{CHOICE_SHAPES[index]}</span>
                <span className="text-xl sm:text-2xl">{letter}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
