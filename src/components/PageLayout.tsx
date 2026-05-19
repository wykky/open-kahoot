import { gradients } from '@/lib/palette';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import UserMenu from './UserMenu';

interface PageLayoutProps {
  children: React.ReactNode;
  gradient: 'loading' | 'error' | 'join' | 'host' | 'leaderboard' | 'finished' | 'thinking' | 'answering' | 'results' | 'waiting' | 'home';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  showLogo?: boolean;
  diagonalPattern?: 'none' | 'subtle' | 'standard' | 'dense' | 'reverse' | 'crosshatch';
  centerVertically?: boolean;
}

export default function PageLayout({
  children,
  gradient,
  maxWidth = '4xl',
  showLogo = true,
  centerVertically = false
}: PageLayoutProps) {
  const gradientClasses = gradients;

  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  };

  const isPurpleBackground = gradient === 'leaderboard' || gradient === 'finished';
  const textColor = isPurpleBackground ? 'text-white' : 'text-black';

  return (
    <div className={`min-h-screen ${gradientClasses[gradient]} p-8 ${centerVertically ? 'flex flex-col justify-center' : ''} relative`}>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1.5">
        <Link
          href="/leaderboard"
          aria-label="Leaderboard"
          title="Leaderboard"
          className="w-10 h-10 rounded-lg bg-yellow-400 text-black border border-black hover:bg-black hover:text-yellow-400 transition-colors shadow-sm flex items-center justify-center"
        >
          <Trophy className="w-4 h-4" />
        </Link>
        <UserMenu />
        <LanguageSelector />
      </div>
      <div className={`container mx-auto ${maxWidthClasses[maxWidth]}`}>
        {showLogo && (
          <Link
            href="/"
            className={`text-4xl font-title mb-8 mt-12 sm:mt-0 text-center ${textColor} block`}
          >
            Atenu Live
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
