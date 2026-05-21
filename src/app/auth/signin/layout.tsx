import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Host sign in',
  description: 'Sign in with Google to host quizzes on Atenu Live. Players don\'t need an account.',
  openGraph: {
    title: 'Host sign in — Atenu Live',
    description: 'Sign in with Google to host quizzes. Players don\'t need an account.',
  },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
