import { Question } from '@/types/game';
import Image from 'next/image';

interface HostThinkingScreenProps {
  currentQuestion: Question;
}

export default function HostThinkingScreen({ currentQuestion }: HostThinkingScreenProps) {
  return (
    <div className="bg-white border-4 border-black rounded-2xl p-4 sm:p-6 shadow-xl flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Question Text */}
      <h1 className="mb-2 text-2xl sm:text-4xl text-black text-center leading-tight font-subtitle shrink-0">
        {currentQuestion.question}
      </h1>
      {currentQuestion.questionType === 'multi' && (
        <p className="mb-3 text-center text-base sm:text-lg font-bold text-yellow-700 shrink-0">
          Pick all that apply
        </p>
      )}

      {/* Question Image */}
      {currentQuestion.image && (
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          <Image
            src={currentQuestion.image}
            alt={currentQuestion.question}
            width={600}
            height={400}
            className="max-h-full w-auto mx-auto rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}