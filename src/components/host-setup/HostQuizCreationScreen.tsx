'use client';

import { useState } from 'react';
import {
  MonitorPlay,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Sparkles,
} from 'lucide-react';
import type { Question, GameSettings } from '@/types/game';
import PageLayout from '@/components/PageLayout';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import QuestionEditor from '@/components/QuestionEditor';
import HostGameSettingsSection from './HostGameSettingsSection';
import HostEmptyQuestionsState from './HostEmptyQuestionsState';
import HostAIGenerationModal from './HostAIGenerationModal';
import { accent } from '@/lib/palette';

interface HostQuizCreationScreenProps {
  questions: Question[];
  gameSettings: GameSettings;
  title: string;
  onUpdateTitle: (title: string) => void;
  currentQuestionIndex: number;
  onChangeCurrentQuestionIndex: (index: number) => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onAddQuestion: (index?: number) => void;
  onAppendTSV: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateQuestion: (
    index: number,
    field: keyof Question,
    value: string | number | number[] | undefined
  ) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
  onRemoveQuestion: (index: number) => void;
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void;
  onDownloadTSV: () => void;
  onCreateGame: () => void;
  onGenerateAIQuestions: (subject: string, language: 'english' | 'french', questionCount: number) => Promise<void>;
}

export default function HostQuizCreationScreen({
  questions,
  gameSettings,
  title,
  onUpdateTitle,
  currentQuestionIndex,
  onChangeCurrentQuestionIndex,
  onUpdateSettings,
  onAddQuestion,
  onAppendTSV,
  onFileImport,
  onUpdateQuestion,
  onUpdateOption,
  onRemoveQuestion,
  onMoveQuestion,
  onDownloadTSV,
  onCreateGame,
  onGenerateAIQuestions,
}: HostQuizCreationScreenProps) {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isFormValid = questions.length > 0 && !questions.some((q) => !q.question || q.options.some((o) => !o));

  // Clamp the displayed index defensively — parent useEffect normally handles this
  // but during the same render cycle we can still be passed an out-of-range value.
  const safeIndex =
    questions.length === 0
      ? 0
      : Math.min(Math.max(currentQuestionIndex, 0), questions.length - 1);
  const currentQuestion = questions[safeIndex];

  const goPrev = () => {
    if (safeIndex > 0) onChangeCurrentQuestionIndex(safeIndex - 1);
  };
  const goNext = () => {
    if (safeIndex < questions.length - 1) onChangeCurrentQuestionIndex(safeIndex + 1);
  };

  return (
    <PageLayout gradient="host" maxWidth="4xl">
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-3 sm:p-5 flex-1 min-h-0 flex flex-col">
        {/* Top bar: editable title + Q n of N + settings gear */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 mb-3 pb-3 border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Quiz title"
            aria-label="Quiz title"
            className={`flex-1 min-w-0 px-2 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 text-black text-base sm:text-lg font-subtitle placeholder-gray-400 focus:outline-none focus:ring-2 ${accent.ringFocus} ${accent.borderFocus}`}
          />
          {questions.length > 0 && (
            <div className="shrink-0 text-xs sm:text-sm text-gray-700 font-semibold whitespace-nowrap">
              Q {safeIndex + 1} of {questions.length}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Quiz settings"
            title="Quiz settings"
            className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Middle: either empty state or the single QuestionEditor */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {questions.length === 0 || !currentQuestion ? (
            <HostEmptyQuestionsState
              onAddQuestion={onAddQuestion}
              onFileImport={onFileImport}
              onOpenAIModal={() => setIsAIModalOpen(true)}
            />
          ) : (
            <QuestionEditor
              key={currentQuestion.id}
              question={currentQuestion}
              questionIndex={safeIndex}
              totalQuestions={questions.length}
              onUpdateQuestion={onUpdateQuestion}
              onUpdateOption={onUpdateOption}
              onRemoveQuestion={onRemoveQuestion}
              onMoveQuestion={onMoveQuestion}
            />
          )}
        </div>

        {/* Bottom nav: prev / jump / next / add / delete / import / AI / create game */}
        {questions.length > 0 && (
          <div className="shrink-0 mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={safeIndex === 0}
              aria-label="Previous question"
              title="Previous question"
              className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <select
              value={safeIndex}
              onChange={(e) => onChangeCurrentQuestionIndex(parseInt(e.target.value, 10))}
              aria-label="Jump to question"
              className={`px-2 py-1.5 rounded-lg bg-white border border-gray-300 text-black text-sm focus:outline-none focus:ring-2 ${accent.ringFocus} ${accent.borderFocus}`}
            >
              {questions.map((_, idx) => (
                <option key={idx} value={idx}>
                  Q {idx + 1}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={goNext}
              disabled={safeIndex >= questions.length - 1}
              aria-label="Next question"
              title="Next question"
              className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => onAddQuestion()}
              aria-label="Add question"
              title="Add question at end"
              className="px-3 h-9 rounded-lg bg-yellow-400 text-black border border-black hover:bg-black hover:text-yellow-400 transition-colors text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>

            <button
              type="button"
              onClick={() => onRemoveQuestion(safeIndex)}
              aria-label="Delete this question"
              title="Delete question"
              className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-black hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <label
              aria-label="Import TSV"
              title="Append TSV after current question"
              className="relative w-9 h-9 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
            >
              <input
                type="file"
                accept=".tsv,.txt"
                onChange={(e) => onAppendTSV(safeIndex + 1, e)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-4 h-4" />
            </label>

            <button
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              aria-label="Generate questions with AI"
              title="Ask AI"
              className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <div className="flex-1" />

            <Button
              onClick={onDownloadTSV}
              variant="secondary"
              size="sm"
              icon={Download}
              title="Download quiz as TSV"
            >
              <span className="hidden sm:inline">TSV</span>
            </Button>

            <Button
              onClick={onCreateGame}
              disabled={!isFormValid}
              variant="primary"
              size="md"
              icon={MonitorPlay}
            >
              Create game
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Quiz settings"
      >
        <HostGameSettingsSection
          gameSettings={gameSettings}
          onUpdateSettings={onUpdateSettings}
        />
      </Modal>

      <HostAIGenerationModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerateQuestions={onGenerateAIQuestions}
      />
    </PageLayout>
  );
}
