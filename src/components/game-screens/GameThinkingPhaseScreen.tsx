'use client';

import PageLayout from '@/components/PageLayout';
import Timer from '@/components/Timer';
import HostThinkingScreen from '@/components/host-screens/HostThinkingScreen';
import PlayerThinkingScreen from '@/components/player-screens/PlayerThinkingScreen';
import type { Question, Game } from '@/types/game';

interface GameThinkingPhaseScreenProps {
  currentQuestion: Question;
  timeLeft: number;
  game: Game | null;
  isHost: boolean;
  isPlayer: boolean;
}

export default function GameThinkingPhaseScreen({
  currentQuestion,
  timeLeft,
  game,
  isHost,
  isPlayer
}: GameThinkingPhaseScreenProps) {
  const showOnPlayers = game?.settings.showQuestionOnPlayers ?? true;

  return (
    <PageLayout gradient="thinking" maxWidth="4xl" showLogo={false}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0">
          <Timer
            timeLeft={timeLeft}
            totalTime={game?.settings.thinkTime || 5}
            label={isHost ? 'Players are reading the question' : 'Read the question carefully'}
            variant="thinking"
          />
        </div>

        {/* Question Display - Host Screen */}
        {isHost && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <HostThinkingScreen currentQuestion={currentQuestion} />
          </div>
        )}

        {/* Player Device - Waiting (or show question if enabled) */}
        {isPlayer && (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <PlayerThinkingScreen
              question={showOnPlayers ? currentQuestion : undefined}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
