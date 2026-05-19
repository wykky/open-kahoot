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
          <h2 className="text-base sm:text-2xl font-bold text-black text-center mb-1 sm:mb-3 leading-snug px-2 break-words">
            {question?.question}
          </h2>
          {isMulti && (
            <p className="text-xs sm:text-sm font-semibold text-yellow-800 text-center mb-3 sm:mb-4">
              Pick all that apply, then tap Submit
            </p>
          )}
          {/* Answer buttons with shape + letter + option text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 flex-1">
            {(question?.options ?? ['', '', '', '']).map((optionText, index) => {
              const isSelected = isMulti && picked.has(index);
              const onClick = isMulti ? () => togglePick(index) : () => onSubmitAnswer(index);
              return (
                <button
                  key={index}
                  onClick={onClick}
                  aria-label={`${CHOICE_LETTERS[index]}: ${optionText}`}
                  aria-pressed={isMulti ? isSelected : undefined}
                  className={`min-h-14 sm:min-h-24 rounded-xl font-bold text-white transition-all transform active:scale-95 sm:hover:scale-105 border-4 ${getChoiceColor(index)} px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 text-left overflow-hidden ${
                    isSelected ? 'ring-4 ring-black ring-offset-2' : ''
                  }`}
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
                  {isMulti && (
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-sm ${
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
              className={`mt-3 sm:mt-4 w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg border-4 border-black transition-colors ${
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
