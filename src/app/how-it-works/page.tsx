/**
 * Public "How it works" page at /how-it-works.
 *
 * Server-rendered static documentation explaining the game flow for hosts
 * and players. No auth, no DB, no client JS — purely informational.
 */

import Link from 'next/link';
import {
  Users,
  Smartphone,
  Trophy,
  HelpCircle,
  GraduationCap,
  MonitorCog,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

export const dynamic = 'force-static';

export const metadata = {
  title: 'How it works — Atenu Live',
  description:
    'Atenu Live is a free, live multiplayer quiz for Ethiopian high-school students. Hosts share a PIN, players join from their phone, and everyone races to answer questions fastest.',
};

type Faq = { q: string; a: string };

const faqs: Faq[] = [
  {
    q: 'Do I need an account to play?',
    a: 'No. Just open live.atenu.org, type the game PIN, and pick a nickname.',
  },
  {
    q: 'Do I need an account to host?',
    a: 'Yes — hosts sign in for free with Google or Telegram. This lets you save your quizzes and reconnect if your browser closes mid-game.',
  },
  {
    q: 'Is Atenu Live free?',
    a: 'Yes. Atenu Live is completely free to play and host.',
  },
  {
    q: 'How long does a quiz take?',
    a: 'About 10 to 30 minutes, depending on how many questions you set up and how much time you give per question.',
  },
  {
    q: 'How many players can join one game?',
    a: 'Atenu Live is calibrated for a full classroom — around 200 students on one school network works smoothly.',
  },
  {
    q: 'Can students cheat by looking at their neighbour’s screen?',
    a: 'Turn on "Shuffle answer order per player" in quiz settings. Each player then sees the four answers in a different random order, so peeking at the colour or letter on a nearby phone gives the wrong answer.',
  },
];

export default function HowItWorksPage() {
  return (
    <PageLayout gradient="home" maxWidth="2xl">
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-6 sm:p-10 space-y-8">
        {/* Hero */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-title text-black">
            How Atenu Live works
          </h1>
          <p className="text-gray-700 text-base sm:text-lg">
            Live multiplayer quizzes for Ethiopian high-school students.
          </p>
        </header>

        {/* For hosts */}
        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black flex items-center gap-2">
            <MonitorCog className="w-6 h-6 text-yellow-500" />
            For hosts (teachers)
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-800">
            <li>Sign in for free with Google or Telegram.</li>
            <li>Create a quiz by typing questions, pasting them in, or letting the AI generate them for you.</li>
            <li>Share the 6-digit PIN with your class — on the board, projector, or chat group.</li>
            <li>Click <span className="font-bold">Start</span> when everyone has joined.</li>
          </ul>
        </section>

        {/* For players */}
        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black flex items-center gap-2">
            <Users className="w-6 h-6 text-yellow-500" />
            For players (students)
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-800">
            <li>Open <span className="font-mono text-sm">live.atenu.org</span> on any phone or computer.</li>
            <li>Type the PIN your teacher gave you.</li>
            <li>Pick a nickname — no account needed.</li>
            <li>Answer fast and correctly to earn the most points.</li>
          </ul>
        </section>

        {/* Scoring */}
        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Scoring
          </h2>
          <p className="text-gray-800">
            Each question is worth up to <span className="font-bold">1,000 points</span>.
            Correct answers earn points; faster answers earn more. A correct answer at
            the very last second still scores at least 500 points, so a slow connection
            won&apos;t wipe out your score. A wrong or missed answer scores zero.
          </p>
          <p className="text-gray-800">
            Get several correct answers in a row to build a streak bonus: <span className="font-bold">+100</span> for
            two in a row, <span className="font-bold">+200</span> for three, up to <span className="font-bold">+500</span> at
            six. The first player to submit a correct answer on each question earns an
            extra <span className="font-bold">+100</span>. The final leaderboard ranks
            everyone by total points; ties share the same rank.
          </p>
        </section>

        {/* Mobile-first */}
        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-yellow-500" />
            Built for phones
          </h2>
          <p className="text-gray-800">
            Atenu Live is built mobile-first for 3G and 4G phones. On slow
            connections, question images are hidden automatically so the quiz
            stays fast. It works on any device with a modern browser — no app
            to install.
          </p>
        </section>

        {/* About */}
        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-yellow-500" />
            About Atenu
          </h2>
          <p className="text-gray-800">
            Atenu Live is part of{' '}
            <a
              href="https://atenu.org"
              className="text-yellow-700 underline hover:text-yellow-800"
              target="_blank"
              rel="noopener"
            >
              Atenu.org
            </a>
            , free study tools for Ethiopian high-school students preparing for ESSLCE.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-yellow-500" />
            Frequently asked questions
          </h2>
          <dl className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-l-4 border-yellow-400 pl-4">
                <dt className="font-bold text-black">{q}</dt>
                <dd className="text-gray-700 mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Back link */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-yellow-400 text-black font-bold border-2 border-black hover:bg-black hover:text-yellow-400 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
