/**
 * Public terms of service at /terms.
 *
 * Static page — no DB, no auth, no client JS.
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
      <div className="bg-white rounded-2xl border-4 border-black shadow-xl p-6 sm:p-10 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-title text-black">Terms of service</h1>
          <p className="text-gray-600 text-sm">Last updated: {lastUpdated}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">The short version</h2>
          <p className="text-gray-800">
            Atenu Live is a free quiz tool for Ethiopian students. Use it for
            classroom learning, study groups, and friendly competition. Be
            kind, don&apos;t cheat, and don&apos;t abuse the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Who can use it</h2>
          <p className="text-gray-800">
            Anyone with a modern browser can play. Hosting a quiz requires a
            free sign-in with Google or Telegram. We assume hosts are
            teachers, tutors, or older students; players are usually a school
            class.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Acceptable use</h2>
          <p className="text-gray-800">Please don&apos;t:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-800">
            <li>upload quiz content that is hateful, sexual, violent, or otherwise inappropriate for a classroom;</li>
            <li>use nicknames or quiz titles intended to bully, threaten, or impersonate someone;</li>
            <li>scrape, spam, or load-test the service;</li>
            <li>attempt to break, reverse-engineer, or circumvent the game logic to cheat the leaderboard.</li>
          </ul>
          <p className="text-gray-800">
            We may remove accounts, quizzes, or players that break these
            rules without warning.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Your quiz content</h2>
          <p className="text-gray-800">
            Hosts keep ownership of the questions they create. By hosting a
            quiz on Atenu Live, you give us permission to display the
            questions to the players in that game and to store the questions
            and results so the game works and you can review the history
            later.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Privacy</h2>
          <p className="text-gray-800">
            How we handle data is covered in the{' '}
            <Link href="/privacy" className="text-yellow-700 underline hover:text-yellow-800">
              privacy policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Service availability</h2>
          <p className="text-gray-800">
            Atenu Live is provided as-is, free of charge. We do our best to
            keep it online and fast on Ethiopian networks, but we can&apos;t
            guarantee uninterrupted service. Please don&apos;t rely on Atenu
            Live for graded assessments where downtime could affect a
            student&apos;s mark.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Changes</h2>
          <p className="text-gray-800">
            These terms may be updated as the service evolves. Major changes
            will be noted on the home page. The &quot;Last updated&quot; date
            at the top of this page reflects the most recent change.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-title text-black">Contact</h2>
          <p className="text-gray-800">
            Questions, bug reports, abuse reports — email{' '}
            <a
              href="mailto:hello@atenu.org"
              className="text-yellow-700 underline hover:text-yellow-800"
            >
              hello@atenu.org
            </a>
            .
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
