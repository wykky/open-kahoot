/**
 * Public "How it works" page at /how-it-works.
 *
 * Server-rendered static documentation explaining the game flow for hosts
 * and players. No auth, no DB, no client JS — purely informational.
 * Sections use native <details>/<summary> accordions (one-open-at-a-time
 * via the `name` attribute) so the page fits on one screen on any device.
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
    a: 'Yes — hosts sign in for free with Google. This lets you save your quizzes and reconnect if your browser closes mid-game.',
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
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        {/* Hero */}
        <header className="text-center space-y-1 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-title text-black">
            How Atenu Live works
          </h1>
          <p className="text-gray-700 text-xs sm:text-sm">
            Live multiplayer quizzes for Ethiopian high-school students.
          </p>
        </header>

        {/* Accordion list — scrolls inside its own container when sections expand */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-3 space-y-2">
          <details name="howitworks" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <MonitorCog className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">For hosts (teachers)</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <ul className="list-disc pl-9 pr-3 pb-3 space-y-1 text-gray-800 text-sm">
              <li>Sign in for free with Google.</li>
              <li>Create a quiz by typing questions, pasting them in, or letting the AI generate them for you.</li>
              <li>Share the 6-digit PIN with your class — on the board, projector, or chat group.</li>
              <li>Click <span className="font-bold">Start</span> when everyone has joined.</li>
            </ul>
          </details>

          <details name="howitworks" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <Users className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">For players (students)</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <ul className="list-disc pl-9 pr-3 pb-3 space-y-1 text-gray-800 text-sm">
              <li>Open <span className="font-mono text-xs">live.atenu.org</span> on any phone or computer.</li>
              <li>Type the PIN your teacher gave you.</li>
              <li>Pick a nickname — no account needed.</li>
              <li>Answer fast and correctly to earn the most points.</li>
            </ul>
          </details>

          <details name="howitworks" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">Scoring</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <div className="px-3 pb-3 space-y-2 text-gray-800 text-sm">
              <p>
                Each question is worth up to <span className="font-bold">1,000 points</span>.
                Correct answers earn points; faster answers earn more. A correct answer at
                the very last second still scores at least 500 points, so a slow connection
                won&apos;t wipe out your score. A wrong or missed answer scores zero.
              </p>
              <p>
                Get several correct answers in a row to build a streak bonus: <span className="font-bold">+100</span> for
                two in a row, <span className="font-bold">+200</span> for three, up to <span className="font-bold">+500</span> at
                six. The first player to submit a correct answer on each question earns an
                extra <span className="font-bold">+100</span>. The final leaderboard ranks
                everyone by total points; ties share the same rank.
              </p>
            </div>
          </details>

          <details name="howitworks" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <Smartphone className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">Built for phones</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Atenu Live is built mobile-first for 3G and 4G phones. On slow
              connections, question images are hidden automatically so the quiz
              stays fast. It works on any device with a modern browser — no app
              to install.
            </p>
          </details>

          <details name="howitworks" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <GraduationCap className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">About Atenu</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
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
          </details>

          <details name="howitworks" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <HelpCircle className="w-4 h-4 text-yellow-600" />
              <span className="flex-1">Frequently asked questions</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <dl className="px-3 pb-3 space-y-2 text-sm">
              {faqs.map(({ q, a }) => (
                <div key={q} className="border-l-2 border-yellow-300 pl-3">
                  <dt className="font-bold text-black">{q}</dt>
                  <dd className="text-gray-700 mt-0.5">{a}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        {/* Back link */}
        <div className="text-center pt-3 shrink-0">
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-yellow-400 text-black font-bold border-2 border-black hover:bg-black hover:text-yellow-400 transition-colors text-sm"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
