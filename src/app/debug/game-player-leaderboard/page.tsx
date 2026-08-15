'use client';

import PlayerLeaderboardScreen from '@/components/game-screens/PlayerLeaderboardScreen';
import { mockGame, mockLeaderboard } from '@/lib/debug-data';

/**
 * What a player sees between questions. To exercise the "you placed outside the
 * top 5" branch, set localStorage `player_id_123456` to a player id that isn't
 * in the first five rows of mockLeaderboard.
 */
export default function DebugPlayerLeaderboardPage() {
  return <PlayerLeaderboardScreen leaderboard={mockLeaderboard} game={mockGame} />;
}
