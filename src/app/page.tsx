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

      {/* Action cards — side-by-side on every viewport. The region is flex-1
          but cards cap at max-h so they don't stretch into the empty-space
          problem on tall viewports. items-center keeps them vertically
          centred regardless of remaining height. */}
      <div className="flex-1 min-h-0 max-w-4xl mx-auto w-full grid grid-cols-2 gap-3 sm:gap-6 items-center">
        <div className="max-h-80 h-full">
          <ActionCard
            href="/join"
            icon={MonitorPlay}
            variant="join"
            title="Play"
            description="Join with a PIN"
            buttonText="Play →"
          />
        </div>
        <div className="max-h-80 h-full">
          <ActionCard
            href="/host"
            icon={MonitorCog}
            variant="host"
            title="Host"
            description="Create your quiz"
            buttonText="Host →"
          />
        </div>
      </div>

      {/* "New here?" link */}
      <div className="shrink-0 text-center mt-2 sm:mt-4">
        <Link
          href="/how-it-works"
          className="text-xs sm:text-sm text-gray-700 underline underline-offset-4 hover:text-black"
        >
          New here? How it works →
        </Link>
      </div>
    </PageLayout>
  );
}
