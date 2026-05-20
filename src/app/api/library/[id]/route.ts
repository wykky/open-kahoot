/**
 * GET a curated library quiz with its full question list.
 *
 * Public — library content is the product, not a secret. Hosts use this to
 * fetch a quiz client-side and re-emit it through the existing `createGame`
 * socket flow ("Host this quiz" button on /library).
 *
 * Auth: none required to *read*. The actual game creation requires the host
 * to be signed in via the existing `/host` middleware path; this endpoint
 * just serves canonical library content.
 */

import { NextResponse } from 'next/server';
import { getLibraryQuiz, getLibraryQuizQuestions } from '@/lib/db';
import { tsvDownloadLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Reuse the tsv limiter — same shape of "expensive read, rare per user".
  // Keyed by IP since this endpoint is unauthenticated.
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  if (!tsvDownloadLimiter.consume(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { id } = await params;
  const quiz = getLibraryQuiz(id);
  if (!quiz) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const rows = getLibraryQuizQuestions(id);

  // Shape the response as the same Question[] the createGame socket event expects,
  // so the client can hand it through with no transformation.
  const questions = rows.map((r) => ({
    id: r.id,
    question: r.text,
    options: JSON.parse(r.options_json) as string[],
    correctAnswer: r.correct_answer,
    correctAnswers: r.correct_answers ? (JSON.parse(r.correct_answers) as number[]) : undefined,
    questionType: r.question_type as 'single' | 'multi',
    timeLimit: r.time_limit,
    explanation: r.explanation ?? undefined,
    image: r.image_url ?? undefined,
  }));

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      subject: quiz.subject,
      grade: quiz.grade,
      language: quiz.language,
      description: quiz.description,
      questionCount: quiz.question_count,
      defaultSettings: {
        thinkTime: quiz.default_think_time,
        answerTime: quiz.default_answer_time,
        shuffleAnswers: quiz.default_shuffle_answers === 1,
        showQuestionOnPlayers: true,
      },
    },
    questions,
  });
}
