import { Question } from '@/types/game';
import Card from '@/components/Card';
import Image from 'next/image';

interface HostThinkingScreenProps {
  currentQuestion: Question;
}

export default function HostThinkingScreen({ currentQuestion }: HostThinkingScreenProps) {
  return (
    <Card className="mb-8">
      {/* Question Text */}
      <h1 className="mb-2 text-5xl text-black text-center leading-tight font-subtitle">
        {currentQuestion.question}
      </h1>
      {currentQuestion.questionType === 'multi' && (
        <p className="mb-6 text-center text-lg font-bold text-yellow-700">
          Pick all that apply
        </p>
      )}

      {/* Question Image */}
      {currentQuestion.image && (
        <div className="">
          <Image src={currentQuestion.image} alt={currentQuestion.question} width={600} height={400} className="max-h-96 w-auto mx-auto rounded-lg" />
        </div>
      )}
    </Card>
  );
} 