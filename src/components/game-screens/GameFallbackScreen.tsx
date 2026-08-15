'use client';

import { Hourglass } from 'lucide-react';
import PendingLayout from '@/components/PendingLayout';

/**
 * Catch-all for any phase with no dedicated screen. The common case this used to
 * cover — a player sitting in the 'leaderboard' phase — now has its own screen
 * (PlayerLeaderboardScreen), so this is a genuine rare fallback. Copy is phrased
 * around the game ("next question") rather than the host, since from a student's
 * seat the host isn't the interesting actor.
 */
export default function GameFallbackScreen() {
  return (
    <PendingLayout
      icon={Hourglass}
      title="Get ready..."
      description="The next question is coming up."
    />
  );
}
