/**
 * Host quiz history at /host/history.
 *
 * Server component: queries games this signed-in host has run.
 * Middleware (/host/:path*) already enforces auth — defensive check kept anyway.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { auth } from '@/auth';
import { getGamesByHost, type HostGameSummary } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(g: HostGameSummary): { label: string; cls: string } {
  if (g.status === 'finished') return { label: 'Finished', cls: 'bg-green-100 text-green-800 border-green-300' };
  if (g.status === 'waiting') return { label: 'Waiting', cls: 'bg-gray-100 text-gray-700 border-gray-300' };
  return { label: 'In progress', cls: 'bg-yellow-100 text-yellow-900 border-yellow-400' };
}

export default async function HostHistoryPage() {
  const session = await auth();
  const dbUserId = (session?.user as { dbUserId?: string } | undefined)?.dbUserId;
  if (!session || !dbUserId) {
    redirect('/auth/signin?callbackUrl=/host/history');
  }

  const games = getGamesByHost(dbUserId, { limit: 100 });
  const footerNote = `Showing your most recent ${games.length} ${games.length === 1 ? 'quiz' : 'quizzes'}. Draft lobbies that were never started are hidden.`;

  return (
    <PageLayout gradient="host" maxWidth="4xl">
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-title text-black">My quizzes</h1>
          <Link
            href="/host"
            className="px-4 py-2 rounded-lg text-sm font-bold border-2 border-black bg-yellow-400 text-black hover:bg-black hover:text-yellow-400 transition-colors"
          >
            + New quiz
          </Link>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven&apos;t run any quizzes yet.</p>
            <Link
              href="/host"
              className="inline-block px-5 py-3 rounded-lg font-bold border-2 border-black bg-yellow-400 text-black hover:bg-black hover:text-yellow-400 transition-colors"
            >
              Create your first quiz
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b-2 border-black text-gray-700">
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 pr-2 hidden sm:table-cell">PIN</th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2 text-right">Players</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">Qs</th>
                  <th className="py-2 pr-2 hidden md:table-cell">Status</th>
                  <th className="py-2 pr-2 text-right">TSV</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const badge = statusBadge(g);
                  return (
                    <tr key={g.id} className="border-b border-gray-200 hover:bg-yellow-50">
                      <td className="py-3 pr-2 font-medium truncate max-w-[16ch] sm:max-w-none">{g.title}</td>
                      <td className="py-3 pr-2 font-mono text-sm hidden sm:table-cell">{g.pin}</td>
                      <td className="py-3 pr-2 text-gray-600 whitespace-nowrap">
                        {formatDate(g.finished_at ?? g.started_at ?? g.created_at)}
                      </td>
                      <td className="py-3 pr-2 text-right">{g.player_count}</td>
                      <td className="py-3 pr-2 text-right hidden sm:table-cell">{g.question_count}</td>
                      <td className="py-3 pr-2 hidden md:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {g.has_tsv ? (
                          <a
                            href={`/api/games/${g.id}/tsv`}
                            className="text-yellow-700 hover:text-black underline font-medium"
                            download
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-6">{footerNote}</p>
      </div>
    </PageLayout>
  );
}
