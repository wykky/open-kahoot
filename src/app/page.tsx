'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { MonitorCog, MonitorPlay } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import Hero from '@/components/Hero';
import ActionCard from '@/components/ActionCard';

export default function Home() {
  const { t } = useTranslation();

  return (
    <PageLayout gradient="home" showLogo={false}>
      <Hero title={t('home.title')} />

      {/* Action Cards */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <ActionCard
          href="/join"
          icon={MonitorPlay}
          variant="join"
          title={t('home.play.title')}
          description={t('home.play.description')}
          buttonText={t('home.play.button')}
        />
        <ActionCard
          href="/host"
          icon={MonitorCog}
          variant="host"
          title={t('home.host.title')}
          description={t('home.host.description')}
          buttonText={t('home.host.button')}
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
