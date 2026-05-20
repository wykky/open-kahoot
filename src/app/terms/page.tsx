/**
 * Public terms of service at /terms.
 *
 * Static page — no DB, no auth, no client JS. Sections use native
 * <details>/<summary> accordions (one-open-at-a-time via `name`) so the
 * page fits on one screen on any device.
 */

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Terms of service — Atenu Live',
  description:
    'The simple rules for using Atenu Live — free, classroom-friendly, no abuse, no spam.',
};

const lastUpdated = 'May 2026';

export default function TermsPage() {
  return (
    <PageLayout gradient="home" maxWidth="2xl">
      <div className="bg-white rounded-xl border-4 border-black shadow-xl p-4 sm:p-6 flex-1 min-h-0 flex flex-col">
        <header className="text-center space-y-1 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-title text-black">Terms of service</h1>
          <p className="text-gray-600 text-xs">Last updated: {lastUpdated}</p>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto mt-3 space-y-2">
          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">The short version</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Atenu Live is a free quiz tool for Ethiopian students. Use it for
              classroom learning, study groups, and friendly competition. Be
              kind, don&apos;t cheat, and don&apos;t abuse the service.
            </p>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Who can use it</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Anyone with a modern browser can play. Hosting a quiz requires
              a free sign-in with Google. We assume hosts are teachers,
              tutors, or older students; players are usually a school class.
            </p>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Acceptable use</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <div className="px-3 pb-3 space-y-2 text-gray-800 text-sm">
              <p>Please don&apos;t:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>upload quiz content that is hateful, sexual, violent, or otherwise inappropriate for a classroom;</li>
                <li>use nicknames or quiz titles intended to bully, threaten, or impersonate someone;</li>
                <li>scrape, spam, or load-test the service;</li>
                <li>attempt to break, reverse-engineer, or circumvent the game logic to cheat the leaderboard.</li>
              </ul>
              <p>
                We may remove accounts, quizzes, or players that break these
                rules without warning.
              </p>
            </div>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Your quiz content</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Hosts keep ownership of the questions they create. By hosting a
              quiz on Atenu Live, you give us permission to display the
              questions to the players in that game and to store the questions
              and results so the game works and you can review the history
              later.
            </p>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Privacy</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              How we handle data is covered in the{' '}
              <Link href="/privacy" className="text-yellow-700 underline hover:text-yellow-800">
                privacy policy
              </Link>
              .
            </p>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Service availability</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Atenu Live is provided as-is, free of charge. We do our best to
              keep it online and fast on Ethiopian networks, but we can&apos;t
              guarantee uninterrupted service. Please don&apos;t rely on Atenu
              Live for graded assessments where downtime could affect a
              student&apos;s mark.
            </p>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Changes</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              These terms may be updated as the service evolves. Major changes
              will be noted on the home page. The &quot;Last updated&quot; date
              at the top of this page reflects the most recent change.
            </p>
          </details>

          <details name="terms" className="group border-l-4 border-yellow-400 bg-yellow-50/30 rounded-r">
            <summary className="list-none cursor-pointer px-3 py-2 text-sm font-bold flex items-center gap-2 text-black">
              <span className="flex-1">Contact</span>
              <span className="transition-transform group-open:rotate-90">▸</span>
            </summary>
            <p className="px-3 pb-3 text-gray-800 text-sm">
              Questions, bug reports, abuse reports — email{' '}
              <a
                href="mailto:hello@atenu.org"
                className="text-yellow-700 underline hover:text-yellow-800"
              >
                hello@atenu.org
              </a>
              .
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
