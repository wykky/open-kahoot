/**
 * Public quiz library at /library.
 *
 * Server-rendered list of curated, Atenu-uploaded quizzes. Hosts browse and
 * click "Host this quiz" to spin up a fresh game with the prepared questions.
 * Pagination follows the same Prev/Next pattern used on /leaderboard and
 * /host/history so the page fits inside h-dvh.
 */

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { listLibraryQuizzes, countLibraryQuizzes } from '@/lib/db';
import HostQuizButton from '@/components/library/HostQuizButton';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 6;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; subject?: string; grade?: string }>;
}) {
  const sp = await searchParams;
  const subject = sp.subject?.trim() || undefined;
  const gradeRaw = sp.grade ? parseInt(sp.grade, 10) : undefined;
  const grade = Number.isFinite(gradeRaw) ? gradeRaw : undefined;

  const total = countLibraryQuizzes({ subject, grade });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rawPage = sp.page ? parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), totalPages) : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const quizzes = listLibraryQuizzes({ limit: PAGE_SIZE, offset, subject, grade });

  // Preserve filters across paging
  const baseParams = new URLSearchParams();
  if (subject) baseParams.set('subject', subject);
  if (grade !== undefined) baseParams.set('grade', String(grade));
  const prevHref = page > 1
    ? `/library?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page - 1) }).toString()}`
    : null;
  const nextHref = page < totalPages
    ? `/library?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page + 1) }).toString()}`
    : null;

  return (
    <PageLayout gradient="home" maxWidth="4xl">
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-3 sm:p-5 flex-1 min-h-0 flex flex-col">
        <header className="shrink-0 text-center mb-3">
          <h1 className="text-2xl sm:text-3xl font-title text-black">Quiz library</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Pre-built quizzes by Atenu. Tap one and start hosting in seconds.
          </p>
        </header>

        {/* Cards region */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {quizzes.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              No quizzes here yet. Check back soon.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {quizzes.map((q) => (
                <li
                  key={q.id}
                  className="border-2 border-gray-300 rounded-lg p-3 bg-yellow-50/20 hover:bg-yellow-50 transition-colors flex flex-col"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-black text-sm sm:text-base leading-tight truncate">
                      {q.title}
                    </h2>
                    <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                      {q.subject && (
                        <span className="text-[10px] bg-yellow-400 text-black border border-black px-1.5 py-0.5 rounded font-semibold">
                          {q.subject}
                        </span>
                      )}
                      {q.grade != null && (
                        <span className="text-[10px] bg-black text-yellow-400 border border-black px-1.5 py-0.5 rounded font-semibold">
                          Grade {q.grade}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-700 px-1.5 py-0.5">
                        {q.question_count} questions · {q.default_answer_time}s each
                      </span>
                    </div>
                    {q.description && (
                      <p className="text-xs text-gray-600 leading-snug line-clamp-2 mb-2">
                        {q.description}
                      </p>
                    )}
                  </div>
                  <HostQuizButton quizId={q.id} title={q.title} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between mt-3 pt-3 border-t border-gray-200 text-xs sm:text-sm">
            {prevHref ? (
              <Link href={prevHref} className="px-3 py-1.5 rounded-lg bg-white border border-black text-black hover:bg-yellow-100 transition-colors font-semibold">
                ← Prev
              </Link>
            ) : (
              <span aria-disabled className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 font-semibold pointer-events-none">
                ← Prev
              </span>
            )}
            <span className="text-gray-700 font-medium">
              Page {page} of {totalPages}
            </span>
            {nextHref ? (
              <Link href={nextHref} className="px-3 py-1.5 rounded-lg bg-white border border-black text-black hover:bg-yellow-100 transition-colors font-semibold">
                Next →
              </Link>
            ) : (
              <span aria-disabled className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 font-semibold pointer-events-none">
                Next →
              </span>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
