/**
 * Admin import script for the curated quiz library.
 *
 * Reads a TSV file matching the host TSV format (columns: question, correct,
 * wrong1, wrong2, wrong3, optionally explanation, image, time) and inserts it
 * into quiz_library + quiz_library_questions. Idempotent on slug — re-running
 * with the same slug overwrites questions but preserves created_at.
 *
 * Usage (inside the VPS container):
 *   docker exec -it atenu-live node scripts/import-library-quiz.js \
 *     --tsv /tmp/biology-g11-cells.tsv \
 *     --slug biology-g11-cells \
 *     --title "Biology Grade 11: Cells" \
 *     --subject Biology \
 *     --grade 11 \
 *     --language en \
 *     --think 5 --answer 25 --shuffle 1 \
 *     --description "Cell structure, organelles, transport."
 *
 * Or from the Mac repo to a local DB (set ATENU_DB_PATH):
 *   ATENU_DB_PATH=./data/atenu.db npx tsx scripts/import-library-quiz.ts \
 *     --tsv ./quizzes/biology-g11-cells.tsv \
 *     --slug biology-g11-cells \
 *     --title "Biology Grade 11: Cells" \
 *     --subject Biology --grade 11
 *
 * TSV file rules:
 * - Tab-delimited, first row is header (lowercase).
 * - Required columns: question, correct, wrong1, wrong2, wrong3
 * - Optional: explanation, image, time (per-question time override)
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { insertLibraryQuiz } from '../src/lib/db';

interface ParsedRow {
  question: string;
  correct: string;
  wrong1: string;
  wrong2: string;
  wrong3: string;
  explanation?: string;
  image?: string;
  time?: string;
}

function parseTsv(content: string): ParsedRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('TSV must have a header row and at least one data row.');
  }
  const header = lines[0].split('\t').map((h) => h.trim().toLowerCase());
  const required = ['question', 'correct', 'wrong1', 'wrong2', 'wrong3'];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const row: Record<string, string> = {};
    header.forEach((col, j) => {
      row[col] = (cells[j] ?? '').trim();
    });
    if (!row.question || !row.correct) continue;
    rows.push(row as unknown as ParsedRow);
  }
  return rows;
}

function shuffle<T>(arr: T[]): T[] {
  // Stable for any seed-replay needs; library import shuffles option order
  // ONCE at import time so questions don't always have the correct answer in
  // slot A. Players still get per-game shuffle if the host opts in.
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function main(): void {
  const { values } = parseArgs({
    options: {
      tsv: { type: 'string' },
      slug: { type: 'string' },
      title: { type: 'string' },
      subject: { type: 'string' },
      grade: { type: 'string' },
      language: { type: 'string' },
      description: { type: 'string' },
      think: { type: 'string' },
      answer: { type: 'string' },
      shuffle: { type: 'string' }, // "1" to enable shuffleAnswers by default
    },
    strict: false,
  });

  for (const required of ['tsv', 'slug', 'title']) {
    if (!values[required]) {
      console.error(`Missing required --${required}`);
      process.exit(1);
    }
  }

  const tsv = readFileSync(values.tsv as string, 'utf8');
  const rows = parseTsv(tsv);
  if (rows.length === 0) {
    console.error('No data rows in TSV.');
    process.exit(1);
  }

  const defaultAnswer = values.answer ? parseInt(values.answer as string, 10) : 20;

  const questions = rows.map((r) => {
    const opts = [r.correct, r.wrong1, r.wrong2, r.wrong3];
    const shuffled = shuffle(opts.map((o, i) => ({ o, i })));
    const correctAnswer = shuffled.findIndex((s) => s.i === 0);
    const perQTime = r.time ? parseInt(r.time, 10) : NaN;
    return {
      text: r.question,
      options: shuffled.map((s) => s.o),
      correctAnswer,
      timeLimit: Number.isFinite(perQTime) ? perQTime : defaultAnswer,
      explanation: r.explanation || null,
      imageUrl: r.image || null,
      questionType: 'single' as const,
    };
  });

  const result = insertLibraryQuiz({
    slug: values.slug as string,
    title: values.title as string,
    subject: (values.subject as string) || null,
    grade: values.grade ? parseInt(values.grade as string, 10) : null,
    language: (values.language as string) || null,
    description: (values.description as string) || null,
    defaultThinkTime: values.think ? parseInt(values.think as string, 10) : 5,
    defaultAnswerTime: defaultAnswer,
    defaultShuffleAnswers: values.shuffle === '1',
    questions,
  });

  console.log(
    `${result.replaced ? 'Updated' : 'Inserted'} library quiz "${values.title}" (id=${result.id}, ${questions.length} questions)`
  );
}

main();
