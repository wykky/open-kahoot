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

type Range = 'all' | 'month' | 'week';

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
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const rawRange = (sp.range as Range) || 'all';
  const range: Range = rawRange === 'week' || rawRange === 'month' ? rawRange : 'all';
  const sinceTs = rangeToSinceTs(range);
  const entries = withCompetitionRanks(getLeaderboard({ sinceTs, limit: 50 }));

  return (
    <PageLayout gradient="leaderboard" maxWidth="2xl">
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-4 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-title text-black text-center mb-6">Leaderboard</h1>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {([
            ['all', 'All-time'],
            ['month', 'This month'],
            ['week', 'This week'],
          ] as [Range, string][]).map(([key, label]) => (
            <Link
              key={key}
              href={`/leaderboard?range=${key}`}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                range === key
                  ? 'bg-yellow-400 text-black border-black'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No scores yet. Sign in and play a game!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b-2 border-black text-gray-700">
                  <th className="py-2 pr-2 w-12">#</th>
                  <th className="py-2 pr-2">Player</th>
                  <th className="py-2 pr-2 text-right">Points</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">Games</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">Correct</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.user_id} className="border-b border-gray-200 hover:bg-yellow-50">
                    <td className="py-3 pr-2 font-bold">
                      {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                    </td>
                    <td className="py-3 pr-2 flex items-center gap-2">
                      {e.avatar_url ? (
                        <img
                          src={e.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full border border-gray-300"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold text-sm">
                          {(e.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{e.name}</span>
                    </td>
                    <td className="py-3 pr-2 text-right font-bold">{e.total_points.toLocaleString()}</td>
                    <td className="py-3 pr-2 text-right hidden sm:table-cell">{e.games_played}</td>
                    <td className="py-3 pr-2 text-right hidden sm:table-cell">{correctPct(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-6">
          Only signed-in players (Google or Telegram) appear here. Anonymous nickname players are not tracked.
        </p>
      </div>
    </PageLayout>
  );
}
