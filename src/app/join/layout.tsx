import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join a game',
  description: 'Enter the game PIN your teacher shared, pick a nickname, and play. No account needed.',
  alternates: { canonical: '/join' },
  openGraph: {
    title: 'Join a game — Atenu Live',
    description: 'Enter the game PIN your teacher shared and play — no account needed.',
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
