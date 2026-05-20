#!/usr/bin/env node
/**
 * Production-runnable port of scripts/import-library-quiz.ts.
 *
 * The TS version imports through path aliases that don't resolve at runtime
 * in the bare Next.js Docker image. This CJS file talks to better-sqlite3
 * directly so it can be invoked with just `node scripts/import-library-quiz.cjs`
 * from inside the atenu-live container — no tsx, no path-alias setup.
 *
 * Same flags as the TS version:
 *   --tsv <path>         (required)
 *   --slug <slug>        (required, unique key for the library quiz)
 *   --title <title>      (required, human-readable)
 *   --subject <subject>  Math / Biology / Geography / ...
 *   --grade <9..12>
 *   --language en|am|om
 *   --description <text>
 *   --think <seconds>    default 5
 *   --answer <seconds>   default 20
 *   --shuffle 1          default off
 */

const fs = require('node:fs');
const crypto = require('node:crypto');
const { parseArgs } = require('node:util');
const Database = require('better-sqlite3');

const DB_PATH = process.env.ATENU_DB_PATH || '/app/data/atenu.db';

function parseTsv(content) {
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
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const row = {};
    header.forEach((col, j) => {
      row[col] = (cells[j] ?? '').trim();
    });
    if (!row.question || !row.correct) continue;
    rows.push(row);
  }
  return rows;
}

function shuffleArr(arr) {
  // Shuffle option order ONCE at import time so the correct answer isn't always
  // in slot A. The host's per-game shuffleAnswers setting layers on top of this.
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function main() {
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
      shuffle: { type: 'string' },
    },
    strict: false,
  });

  for (const reqField of ['tsv', 'slug', 'title']) {
    if (!values[reqField]) {
      console.error(`Missing required --${reqField}`);
      process.exit(1);
    }
  }

  const tsv = fs.readFileSync(values.tsv, 'utf8');
  const rows = parseTsv(tsv);
  if (rows.length === 0) {
    console.error('No data rows in TSV.');
    process.exit(1);
  }

  const thinkTime = values.think ? parseInt(values.think, 10) : 5;
  const defaultAnswer = values.answer ? parseInt(values.answer, 10) : 20;
  const shuffleFlag = values.shuffle === '1' ? 1 : 0;

  // Build canonical question objects — shuffle options once so slot A isn't
  // always the correct one before any host-level shuffleAnswers kicks in.
  const questions = rows.map((r) => {
    const opts = [r.correct, r.wrong1, r.wrong2, r.wrong3];
    const sh = shuffleArr(opts.map((o, i) => ({ o, originalIndex: i })));
    const correctAnswer = sh.findIndex((s) => s.originalIndex === 0);
    const perQTime = r.time ? parseInt(r.time, 10) : NaN;
    return {
      text: r.question,
      options: sh.map((s) => s.o),
      correctAnswer,
      timeLimit: Number.isFinite(perQTime) ? perQTime : defaultAnswer,
      explanation: r.explanation || null,
      imageUrl: r.image || null,
    };
  });

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  const now = Date.now();

  const existing = db
    .prepare('SELECT id, created_at FROM quiz_library WHERE slug = ?')
    .get(values.slug);
  const id = existing?.id ?? crypto.randomUUID();

  const upsertStmt = db.prepare(
    `INSERT OR REPLACE INTO quiz_library (
       id, slug, title, subject, grade, language, description, question_count,
       default_think_time, default_answer_time, default_shuffle_answers, published,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  );
  const deleteQuestions = db.prepare(
    'DELETE FROM quiz_library_questions WHERE library_id = ?'
  );
  const insertQuestion = db.prepare(
    `INSERT INTO quiz_library_questions (
       library_id, question_index, id, text, options_json, correct_answer,
       correct_answers, question_type, time_limit, explanation, image_url
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    upsertStmt.run(
      id,
      values.slug,
      values.title,
      values.subject || null,
      values.grade ? parseInt(values.grade, 10) : null,
      values.language || null,
      values.description || null,
      questions.length,
      thinkTime,
      defaultAnswer,
      shuffleFlag,
      existing?.created_at ?? now,
      now
    );
    deleteQuestions.run(id);
    questions.forEach((q, idx) => {
      insertQuestion.run(
        id,
        idx,
        crypto.randomUUID(),
        q.text,
        JSON.stringify(q.options),
        q.correctAnswer,
        null,
        'single',
        q.timeLimit,
        q.explanation,
        q.imageUrl
      );
    });
  });
  tx();

  db.close();
  console.log(
    `${existing ? 'Updated' : 'Inserted'}: ${values.title} (${questions.length} questions)`
  );
}

main();
