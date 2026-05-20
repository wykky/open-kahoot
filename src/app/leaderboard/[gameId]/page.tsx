/**
 * Per-quiz public leaderboard at /leaderboard/[gameId].
 *
 * Server component, no auth required. Queries SQLite directly. Returns 404 for
 * games that don't exist or haven't finished yet (gates mid-game leaks).
 *
 * Why this exists: hosts and players share results to Telegram/WhatsApp groups
 * after every classroom session. Each finished game becomes a permalink with
 * Open Graph tags — the social-preview card is the share format.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import {
  getGameLeaderboard,
  getGameMetadata,
  type GameLeaderboardEntry,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://live.atenu.org';

const PAGE_SIZE = 8;

/**
 * Phase 8: tie-aware competition ranking (1, 1, 3, 4, 5, 5, 7). Duplicated
 * here (not imported) because the parent /leaderboard page uses a different
 * row type and the function body is small.
 */
function withCompetitionRanks(
  entries: GameLeaderboardEntry[]
): Array<GameLeaderboardEntry & { rank: number }> {
  let lastRank = 0;
  let lastScore = Number.POSITIVE_INFINITY;
  return entries.map((e, idx) => {
    if (e.total_score !== lastScore) {
      lastRank = idx + 1;
      lastScore = e.total_score;
    }
    return { ...e, rank: lastRank };
  });
}

function formatFinishedDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function correctText(e: GameLeaderboardEntry): string {
  if (e.total_answers === 0) return '—';
  return `${e.correct_count}/${e.total_answers}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  const meta = getGameMetadata(gameId);
  if (!meta) {
    return {
      title: 'Quiz not found — Atenu Live',
      description: 'This quiz does not exist or has not finished yet.',
    };
  }
  const title = `${meta.title} — Atenu Live`;
  const description = `${meta.player_count} player${meta.player_count === 1 ? '' : 's'} competed. See the final scores.`;
  const url = `${APP_URL}/leaderboard/${gameId}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function GameLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { gameId } = await params;
  const sp = await searchParams;
  const meta = getGameMetadata(gameId);
  if (!meta) {
    notFound();
  }
  const allEntries = withCompetitionRanks(getGameLeaderboard(gameId, { limit: 20 }));

  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
  const rawPage = parseInt(sp.page || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, totalPages) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const entries = allEntries.slice(start, start + PAGE_SIZE);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const prevHref = `/leaderboard/${gameId}?page=${page - 1}`;
  const nextHref = `/leaderboard/${gameId}?page=${page + 1}`;

  return (
    <PageLayout gradient="leaderboard" maxWidth="2xl">
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        <h1 className="shrink-0 text-2xl sm:text-3xl font-title text-black text-center mb-1 break-words">
          {meta.title}
        </h1>
        <p className="shrink-0 text-center text-gray-600 text-xs sm:text-sm mb-3">
          {meta.player_count} player{meta.player_count === 1 ? '' : 's'} competed
          {' · '}
          {formatFinishedDate(meta.finished_at)}
        </p>

        <div className="flex-1 min-h-0 overflow-hidden">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No scores recorded.</p>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-black text-gray-700">
                  <th className="py-2 pr-2 w-10">#</th>
                  <th className="py-2 pr-2">Player</th>
                  <th className="py-2 pr-2 text-right">Points</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">
                    Correct
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.player_id}
                    className="border-b border-gray-200 hover:bg-yellow-50"
                  >
                    <td className="p-2 font-bold">
                      {e.rank === 1
                        ? '🥇'
                        : e.rank === 2
                          ? '🥈'
                          : e.rank === 3
                            ? '🥉'
                            : e.rank}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {e.is_signed_in && e.avatar_url ? (
                          // Deliberately a plain <img> — Atenu Live defers next/image
                          // migration because quiz image domains are user-supplied.
                          // See CLAUDE.md ("img → next/image deferred").
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={e.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full border border-gray-300"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold text-xs">
                            {(e.name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium break-words truncate max-w-[14ch] sm:max-w-none">
                          {e.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-right font-bold">
                      {e.total_score.toLocaleString()}
                    </td>
                    <td className="p-2 text-right hidden sm:table-cell">
                      {correctText(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        <div className="shrink-0 flex items-center justify-between mt-3 text-xs sm:text-sm">
          <Link
            href={prevHref}
            aria-disabled={!hasPrev}
            className={`px-3 py-1.5 rounded-lg font-bold border-2 transition-colors ${
              hasPrev
                ? 'bg-white text-black border-black hover:bg-yellow-400'
                : 'bg-gray-100 text-gray-400 border-gray-200 pointer-events-none'
            }`}
          >
            ← Prev
          </Link>
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Link
            href={nextHref}
            aria-disabled={!hasNext}
            className={`px-3 py-1.5 rounded-lg font-bold border-2 transition-colors ${
              hasNext
                ? 'bg-white text-black border-black hover:bg-yellow-400'
                : 'bg-gray-100 text-gray-400 border-gray-200 pointer-events-none'
            }`}
          >
            Next →
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
