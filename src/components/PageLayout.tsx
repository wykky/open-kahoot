import { gradients } from '@/lib/palette';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
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

  // `isPurpleBackground` is a legacy name — these gradients render as brand yellow,
  // so black text reads correctly. The variable is kept to minimise diff downstream.
  const isPurpleBackground = gradient === 'leaderboard' || gradient === 'finished';
  const textColor = 'text-black';
  const footerTextColor = isPurpleBackground ? 'text-black/70' : 'text-gray-700';
  const footerLinkHover = 'hover:text-black';

  const currentYear = new Date().getFullYear();

  return (
    <div className={`h-dvh overflow-hidden ${gradientClasses[gradient]} p-3 sm:p-6 flex flex-col ${centerVertically ? 'justify-center' : ''} relative`}>
      <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5">
        <Link
          href="/leaderboard"
          aria-label="Leaderboard"
          title="Leaderboard"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-yellow-400 text-black border border-black hover:bg-black hover:text-yellow-400 transition-colors shadow-sm flex items-center justify-center"
        >
          <Trophy className="w-4 h-4" />
        </Link>
        <UserMenu />
      </div>
      <div className={`container mx-auto ${maxWidthClasses[maxWidth]} flex-1 min-h-0 flex flex-col overflow-hidden`}>
        {showLogo && (
          <Link
            href="/"
            className={`text-2xl sm:text-3xl font-title mb-2 sm:mb-4 mt-10 sm:mt-0 text-center ${textColor} block shrink-0`}
          >
            Atenu Live
          </Link>
        )}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
      <footer
        className={`shrink-0 mt-2 text-center text-[10px] sm:text-xs ${footerTextColor}`}
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <li>
            <Link href="/how-it-works" className={`underline-offset-2 hover:underline ${footerLinkHover}`}>
              How it works
            </Link>
          </li>
          <li aria-hidden="true">·</li>
          <li>
            <Link href="/leaderboard" className={`underline-offset-2 hover:underline ${footerLinkHover}`}>
              Leaderboard
            </Link>
          </li>
          <li aria-hidden="true">·</li>
          <li>
            <Link href="/privacy" className={`underline-offset-2 hover:underline ${footerLinkHover}`}>
              Privacy
            </Link>
          </li>
          <li aria-hidden="true">·</li>
          <li>
            <Link href="/terms" className={`underline-offset-2 hover:underline ${footerLinkHover}`}>
              Terms
            </Link>
          </li>
          <li aria-hidden="true" className="hidden sm:inline">·</li>
          <li className="hidden sm:inline">
            <a
              href="https://atenu.org"
              target="_blank"
              rel="noopener"
              className={`underline-offset-2 hover:underline ${footerLinkHover}`}
            >
              Atenu.org
            </a>
          </li>
          <li aria-hidden="true" className="hidden sm:inline">·</li>
          <li className="hidden sm:inline">© {currentYear} Atenu Live</li>
        </ul>
      </footer>
    </div>
  );
}
