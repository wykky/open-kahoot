'use client';

import { useEffect, useRef } from 'react';
import { Users, Play } from 'lucide-react';
import type { Game, Player } from '@/types/game';
import PageLayout from '@/components/PageLayout';
import GamePinDisplay from '@/components/GamePinDisplay';
import PlayerList from '@/components/PlayerList';
import Button from '@/components/Button';
import { useCountdownMusic } from '@/lib/useCountdownMusic';
import { getSocket } from '@/lib/socket-client';

interface HostGameLobbyScreenProps {
  game: Game;
  joinUrl: string;
  onStartGame: () => void;
  onToggleDyslexiaSupport: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
}

export default function HostGameLobbyScreen({
  game,
  joinUrl,
  onStartGame,
  onToggleDyslexiaSupport,
  onKickPlayer,
}: HostGameLobbyScreenProps) {
  const { startLobbyMusic, stopLobbyMusic, playBlup } = useCountdownMusic();
  const playersOnly = game.players.filter(p => !p.isHost);
  const musicStartedRef = useRef(false);

  // Start lobby music only once when component mounts
  useEffect(() => {
    if (!musicStartedRef.current) {
      startLobbyMusic();
      musicStartedRef.current = true;
    }

    // Cleanup: stop lobby music when component unmounts
    return () => {
      stopLobbyMusic();
      musicStartedRef.current = false;
    };
  }, [startLobbyMusic, stopLobbyMusic]); // Add missing dependencies

  // Handle socket events for player interactions
  useEffect(() => {
    const socket = getSocket();
    
    const handlePlayerJoined = (player: Player) => {
      console.log(`Player joined: ${player.name} (${player.id})`);
      playBlup();
    };
    
    socket.on('playerJoined', handlePlayerJoined);

    return () => {
      socket.off('playerJoined', handlePlayerJoined);
    };
  }, [playBlup]); // Add missing dependency

  const handleStartGame = () => {
    // Stop lobby music before starting game
    stopLobbyMusic();
    onStartGame();
  };

  return (
    <PageLayout gradient="host" maxWidth="6xl">
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 text-center mb-4">
          <h2 className="text-2xl sm:text-3xl text-black mb-3 font-subtitle">{game.title}</h2>
          <GamePinDisplay pin={game.pin} joinUrl={joinUrl} />
        </div>

        {/* Separator line */}
        <div className="shrink-0 border-t border-gray-200 mb-3"></div>

        <div className="shrink-0 flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl text-black flex items-center gap-2 font-subtitle">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            Players ({playersOnly.length})
          </h2>
          <Button
            onClick={handleStartGame}
            disabled={playersOnly.length === 0}
            variant="primary"
            size="lg"
            icon={Play}
          >
            Start game
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <PlayerList
            players={playersOnly}
            emptyMessage="Waiting for players to join..."
            columns={3}
            showDyslexiaControls={true}
            onToggleDyslexiaSupport={onToggleDyslexiaSupport}
            showKickControl={true}
            onKickPlayer={onKickPlayer}
          />
        </div>
      </div>
    </PageLayout>
  );
} 