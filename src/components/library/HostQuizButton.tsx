'use client';

/**
 * "Host this quiz" button on a library card.
 *
 * Flow (direct-start, per the spec choice):
 *  1. Click → fetch the quiz + its questions from /api/library/[id]
 *  2. getSocket().emit('createGame', ...) with the prepared payload — same wire
 *     event the /host editor uses, so the server-side path is unchanged.
 *  3. On the createGame callback, write hostToken + active-game pointer to
 *     localStorage (same keys /host/page.tsx uses for resume detection).
 *  4. Navigate to /host. Its resume logic engages, validates the game, and
 *     drops the host into the lobby. No editor stop-over.
 *
 * The button is intentionally a thin client component so the page itself
 * stays a server-rendered list (lower JS payload).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MonitorPlay } from 'lucide-react';
import { getSocket } from '@/lib/socket-client';
import type { Game, GameSettings, Question } from '@/types/game';

const HOST_TOKEN_KEY = (gameId: string) => `host_token_${gameId}`;
const ACTIVE_HOST_GAME_KEY = 'atenu_live_active_host_game';

interface HostQuizButtonProps {
  quizId: string;
  title: string;
}

interface LibraryApiResponse {
  quiz: {
    id: string;
    title: string;
    defaultSettings: GameSettings;
  };
  questions: Question[];
}

export default function HostQuizButton({ quizId, title }: HostQuizButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const dbUserId = ((session?.user as { dbUserId?: string } | undefined)?.dbUserId) ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Host-only feature: redirect to sign-in if not authenticated.
  const signedIn = status === 'authenticated' && !!dbUserId;

  const handleClick = async () => {
    if (busy) return;
    setError(null);

    if (!signedIn) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/library')}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/library/${quizId}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Quiz not found' : 'Failed to load quiz');
      }
      const data = (await res.json()) as LibraryApiResponse;

      const socket = getSocket();
      socket.emit(
        'createGame',
        data.quiz.title || title,
        data.questions,
        data.quiz.defaultSettings,
        dbUserId,
        (createdGame: Game, token: string) => {
          try {
            localStorage.setItem(HOST_TOKEN_KEY(createdGame.id), token);
            localStorage.setItem(
              ACTIVE_HOST_GAME_KEY,
              JSON.stringify({ gameId: createdGame.id, pin: createdGame.pin, ts: Date.now() })
            );
          } catch {}
          router.push('/host');
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-black font-bold text-sm transition-colors ${
          busy
            ? 'bg-gray-200 text-gray-500 cursor-wait'
            : 'bg-yellow-400 text-black hover:bg-black hover:text-yellow-400'
        }`}
      >
        <MonitorPlay className="w-4 h-4" />
        {busy ? 'Starting…' : 'Host this quiz'}
      </button>
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
