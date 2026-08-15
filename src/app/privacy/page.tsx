/**
 * Public privacy policy at /privacy.
 *
 * Static page — no DB, no auth, no client JS. Covers what Atenu Live
 * collects from players (anonymous + signed-in) and hosts. Sections use
 * native <details>/<summary> accordions (one-open-at-a-time via `name`)
 * so the page fits on one screen on any device.
 */

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Privacy policy',
  description:
    'What Atenu Live collects, how long we keep it, and who we share it with. Built for Ethiopian high-school classrooms.',
  alternates: { canonical: '/privacy' },
};

const lastUpdated = 'May 2026';

export default function PrivacyPage() {
  return (
    <PageLayout gradient="home" maxWidth="2xl">
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        <header className="text-center space-y-1 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-title text-black">Privacy policy</h1>
          <p className="text-gray-600 text-xs">Last updated: {lastUpdated}</p>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto mt-3 space-y-2">
          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">The short version</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Atenu Live is a free live-quiz tool for Ethiopian students. We keep
              data collection to the minimum needed for the game to work. We do
              not sell data, do not show ads, and do not run third-party
              analytics or tracking pixels.
            </p>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">What players give us</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <div className="px-3 pb-3 space-y-2 text-gray-800 text-sm">
              <p>If you join a game with just a nickname, we store:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>the nickname you typed,</li>
                <li>a random anonymous ID saved on your device,</li>
                <li>your answers and points for that game.</li>
              </ul>
              <p>
                We never see your real name, email, phone number, or location.
                The anonymous ID only links your answers within one quiz so you
                can reconnect if your phone reloads.
              </p>
            </div>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">What hosts give us</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              To host a quiz you sign in with Google. From your account we
              receive your name, email, and avatar image. We store that plus
              the quizzes you create and the results of games you run.
            </p>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Signed-in players</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              If you sign in before playing, your name and avatar appear on the
              public{' '}
              <Link href="/leaderboard" className="text-yellow-700 underline hover:text-yellow-800">
                leaderboard
              </Link>{' '}
              along with your total points and number of games. You can stay
              anonymous by skipping sign-in.
            </p>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">How long we keep it</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <ul className="list-disc pl-9 pr-3 pb-3 space-y-1 text-gray-800 text-sm">
              <li>Quiz results: up to 12 months after the game finishes, then deleted automatically.</li>
              <li>Host accounts and saved quizzes: until you ask us to delete them.</li>
              <li>Active sessions: cleared when you sign out or close your browser.</li>
            </ul>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Who we share with</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              No one. The data stays on the server that runs the site. We
              use Google only to verify host sign-ins; they receive the
              standard OAuth callback and nothing more.
            </p>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Children</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Atenu Live is designed for high-school students (Grade 9-12).
              Players under 13 should only join games their school or parent
              arranged for them. Hosts (teachers) are responsible for the
              classroom setting.
            </p>
          </details>

          <details name="privacy" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Your rights</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Email{' '}
              <a
                href="mailto:info@atenu.org"
                className="text-yellow-700 underline hover:text-yellow-800"
              >
                info@atenu.org
              </a>{' '}
              or message us on Telegram at{' '}
              <a
                href="https://t.me/atenuChannel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-700 underline hover:text-yellow-800"
              >
                @atenuChannel
              </a>{' '}
              and we will delete your account, export your quizzes, or answer
              any question about your data within a few working days.
            </p>
          </details>
        </div>

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
