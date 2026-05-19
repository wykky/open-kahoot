'use client';

import Link from 'next/link';
import { MonitorCog, MonitorPlay } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import Hero from '@/components/Hero';
import ActionCard from '@/components/ActionCard';

export default function Home() {
  return (
    <PageLayout gradient="home" showLogo={false}>
      <Hero title="Atenu Live" />

      {/* Action Cards */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <ActionCard
          href="/join"
          icon={MonitorPlay}
          variant="join"
          title="Play"
          description="Enter a game pin to join an existing quiz and compete with other players"
          buttonText="Play →"
        />
        <ActionCard
          href="/host"
          icon={MonitorCog}
          variant="host"
          title="Host"
          description="Create your own quiz with custom questions and let players join with a game pin"
          buttonText="Host →"
        />
      </div>

      {/* "New here?" link */}
      <div className="text-center mt-8">
        <Link
          href="/how-it-works"
          className="text-sm text-gray-700 underline underline-offset-4 hover:text-black"
        >
          New here? How it works →
        </Link>
      </div>
    </PageLayout>
  );
}
