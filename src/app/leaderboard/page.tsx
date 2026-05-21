/**
 * Public leaderboard at /leaderboard.
 *
 * Server component: queries SQLite directly via getLeaderboard().
 * Tabs (All-time / Monthly / Weekly) are client-side via search params for no-JS friendliness.
 */

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leaderboard',
  description: 'See the top quiz players across Atenu Live — all-time, monthly, and weekly leaders.',
  alternates: { canonical: '/leaderboard' },
  openGraph: {
    title: 'Leaderboard — Atenu Live',
    description: 'Top quiz players across Atenu Live — all-time, monthly, and weekly leaders.',
  },
};

type Range = 'all' | 'month' | 'week';

const PAGE_SIZE = 8;

function rangeToSinceTs(range: Range): number {
  if (range === 'week') {
    const d = new Date();
    const day = d.getUTCDay(); // 0 = Sun, 1 = Mon ...
    const daysSinceMonday = (day + 6) % 7; // 0 if Mon, 6 if Sun
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday));
    return monday.getTime();
  }
  if (range === 'month') {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  return 0;
}

function correctPct(e: LeaderboardEntry): string {
  if (e.total_answers === 0) return '—';
  return `${Math.round((e.correct_count / e.total_answers) * 100)}%`;
}

/**
 * Phase 8: tie-aware competition ranking.
 * Players with the same total_points share the same rank; the next distinct score skips ahead
 * (e.g., 1, 1, 3, 4, 5, 5, 7). Entries must arrive pre-sorted by total_points DESC.
 */
function withCompetitionRanks(entries: LeaderboardEntry[]): Array<LeaderboardEntry & { rank: number }> {
  let lastRank = 0;
  let lastScore = Number.POSITIVE_INFINITY;
  return entries.map((e, idx) => {
    if (e.total_points !== lastScore) {
      lastRank = idx + 1;
      lastScore = e.total_points;
    }
    return { ...e, rank: lastRank };
  });
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rawRange = (sp.range as Range) || 'all';
  const range: Range = rawRange === 'week' || rawRange === 'month' ? rawRange : 'all';
  const sinceTs = rangeToSinceTs(range);
  const allEntries = withCompetitionRanks(getLeaderboard({ sinceTs, limit: 50 }));

  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
  const rawPage = parseInt(sp.page || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, totalPages) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const entries = allEntries.slice(start, start + PAGE_SIZE);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const prevHref = `/leaderboard?range=${range}&page=${page - 1}`;
  const nextHref = `/leaderboard?range=${range}&page=${page + 1}`;

  return (
    <PageLayout gradient="leaderboard" maxWidth="2xl">
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        <h1 className="shrink-0 text-2xl sm:text-3xl font-title text-black text-center mb-3">Leaderboard</h1>

        {/* Tabs — Link with aria-current for screen-reader users. */}
        <div role="tablist" aria-label="Time range" className="shrink-0 flex justify-center gap-2 mb-3">
          {([
            ['all', 'All-time'],
            ['month', 'This month'],
            ['week', 'This week'],
          ] as [Range, string][]).map(([key, label]) => {
            const isActive = range === key;
            return (
              <Link
                key={key}
                href={`/leaderboard?range=${key}`}
                role="tab"
                aria-current={isActive ? 'page' : undefined}
                aria-selected={isActive}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border-2 transition-colors ${
                  isActive
                    ? 'bg-yellow-400 text-black border-black'
                    : 'bg-white text-black border-gray-300 hover:bg-yellow-100'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No scores yet. Sign in and play a game!</p>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-black text-gray-700">
                  <th className="py-2 pr-2 w-10">#</th>
                  <th className="py-2 pr-2">Player</th>
                  <th className="py-2 pr-2 text-right">Points</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">Games</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">Correct</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.user_id} className="border-b border-gray-200 hover:bg-yellow-50">
                    <td className="p-2 font-bold">
                      {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {e.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={e.avatar_url}
                            alt={e.name || ''}
                            className="w-7 h-7 rounded-full border border-gray-300"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold text-xs">
                            {(e.name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[14ch] sm:max-w-none">{e.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right font-bold">{e.total_points.toLocaleString()}</td>
                    <td className="p-2 text-right hidden sm:table-cell">{e.games_played}</td>
                    <td className="p-2 text-right hidden sm:table-cell">{correctPct(e)}</td>
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
