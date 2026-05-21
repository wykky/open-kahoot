import type { Metadata } from 'next';

/**
 * Per-route metadata for /host. The page itself is `'use client'`, which can't
 * export `metadata`, so we provide it via this segment layout.
 */
export const metadata: Metadata = {
  title: 'Host a quiz',
  description: 'Build a quiz and share a PIN with your class. Free, mobile-first, designed for Ethiopian classrooms.',
  openGraph: {
    title: 'Host a quiz — Atenu Live',
    description: 'Build a quiz and share a PIN with your class. Free, mobile-first.',
  },
};

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
