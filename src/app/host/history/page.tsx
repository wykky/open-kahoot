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

export const metadata = {
  title: 'My quizzes',
  description: 'Your past quizzes on Atenu Live — review results and re-host any time.',
};

const PAGE_SIZE = 6;

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

export default async function HostHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const dbUserId = (session?.user as { dbUserId?: string } | undefined)?.dbUserId;
  if (!session || !dbUserId) {
    redirect('/auth/signin?callbackUrl=/host/history');
  }

  const sp = await searchParams;
  const allGames = getGamesByHost(dbUserId, { limit: 100 });

  const totalPages = Math.max(1, Math.ceil(allGames.length / PAGE_SIZE));
  const rawPage = parseInt(sp.page || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, totalPages) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const games = allGames.slice(start, start + PAGE_SIZE);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const prevHref = `/host/history?page=${page - 1}`;
  const nextHref = `/host/history?page=${page + 1}`;

  return (
    <PageLayout gradient="host" maxWidth="4xl">
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-title text-black">My quizzes</h1>
          <Link
            href="/host"
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border-2 border-black bg-yellow-400 text-black hover:bg-black hover:text-yellow-400 transition-colors"
          >
            + New quiz
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {allGames.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You haven&apos;t run any quizzes yet.</p>
              <Link
                href="/host"
                className="inline-block px-5 py-3 rounded-lg font-bold border-2 border-black bg-yellow-400 text-black hover:bg-black hover:text-yellow-400 transition-colors"
              >
                Create your first quiz
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
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
                      <td className="p-2 font-medium truncate max-w-[14ch] sm:max-w-none">{g.title}</td>
                      <td className="p-2 font-mono hidden sm:table-cell">{g.pin}</td>
                      <td className="p-2 text-gray-600 whitespace-nowrap">
                        {formatDate(g.finished_at ?? g.started_at ?? g.created_at)}
                      </td>
                      <td className="p-2 text-right">{g.player_count}</td>
                      <td className="p-2 text-right hidden sm:table-cell">{g.question_count}</td>
                      <td className="p-2 hidden md:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-2 text-right">
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
          )}
        </div>

        {allGames.length > 0 && (
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
        )}
      </div>
    </PageLayout>
  );
}
