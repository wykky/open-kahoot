/**
 * Public privacy policy at /privacy.
 *
 * Static page — no DB, no auth, no client JS. Covers what Atenu Live
 * collects from players (anonymous + signed-in) and hosts.
 */

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Privacy policy — Atenu Live',
  description:
    'What Atenu Live collects, how long we keep it, and who we share it with. Built for Ethiopian high-school classrooms.',
};

const lastUpdated = 'May 2026';

export default function PrivacyPage() {
  return (
    <PageLayout gradient="home" maxWidth="2xl">
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-6 sm:p-10 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-title text-black">Privacy policy</h1>
          <p className="text-gray-600 text-sm">Last updated: {lastUpdated}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">The short version</h2>
          <p className="text-gray-800">
            Atenu Live is a free live-quiz tool for Ethiopian students. We keep
            data collection to the minimum needed for the game to work. We do
            not sell data, do not show ads, and do not run third-party
            analytics or tracking pixels.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">What players give us</h2>
          <p className="text-gray-800">
            If you join a game with just a nickname, we store:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-800">
            <li>the nickname you typed,</li>
            <li>a random anonymous ID saved on your device,</li>
            <li>your answers and points for that game.</li>
          </ul>
          <p className="text-gray-800">
            We never see your real name, email, phone number, or location.
            The anonymous ID only links your answers within one quiz so you
            can reconnect if your phone reloads.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">What hosts give us</h2>
          <p className="text-gray-800">
            To host a quiz you sign in with Google or Telegram. From your
            account we receive your name, email or Telegram handle, and
            avatar image. We store that plus the quizzes you create and the
            results of games you run.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Signed-in players</h2>
          <p className="text-gray-800">
            If you sign in before playing, your name and avatar appear on the
            public{' '}
            <Link href="/leaderboard" className="text-yellow-700 underline hover:text-yellow-800">
              leaderboard
            </Link>{' '}
            along with your total points and number of games. You can stay
            anonymous by skipping sign-in.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">How long we keep it</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-800">
            <li>Quiz results: up to 12 months after the game finishes, then deleted automatically.</li>
            <li>Host accounts and saved quizzes: until you ask us to delete them.</li>
            <li>Active sessions: cleared when you sign out or close your browser.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Who we share with</h2>
          <p className="text-gray-800">
            No one. The data stays on the server that runs the site. We use
            Google and Telegram only to verify host sign-ins; they receive
            the standard OAuth callback and nothing more.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Children</h2>
          <p className="text-gray-800">
            Atenu Live is designed for high-school students (Grade 9-12).
            Players under 13 should only join games their school or parent
            arranged for them. Hosts (teachers) are responsible for the
            classroom setting.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Your rights</h2>
          <p className="text-gray-800">
            Email{' '}
            <a
              href="mailto:hello@atenu.org"
              className="text-yellow-700 underline hover:text-yellow-800"
            >
              hello@atenu.org
            </a>{' '}
            and we will delete your account, export your quizzes, or answer
            any question about your data within a few working days.
          </p>
        </section>

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
