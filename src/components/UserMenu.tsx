'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogIn, LogOut, History } from "lucide-react";

export default function UserMenu() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }
  }, [open]);

  if (status === "loading") {
    return (
      <div
        className="w-10 h-10 rounded-lg bg-black text-yellow-400 border border-yellow-400 shadow-sm flex items-center justify-center text-xs font-bold"
        aria-label={t('userMenu.loading')}
      >
        …
      </div>
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="w-10 h-10 rounded-lg bg-yellow-400 text-black border border-black hover:bg-black hover:text-yellow-400 transition-colors shadow-sm flex items-center justify-center"
        aria-label={t('userMenu.signIn')}
        title={t('userMenu.signIn')}
      >
        <LogIn className="w-4 h-4" />
      </button>
    );
  }

  const name = session.user?.name || session.user?.email || t('userMenu.userFallback');
  const initial = (session.user?.name || session.user?.email || "?")[0].toUpperCase();

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-black text-yellow-400 border border-black hover:opacity-90 transition-opacity flex items-center justify-center font-bold text-sm shadow-sm"
        aria-label={`User menu (${name})`}
        title={name}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-black rounded-lg shadow-xl overflow-hidden z-50 min-w-[220px]">
          <div className="px-4 py-3 text-sm text-black border-b border-gray-200 bg-yellow-50">
            <div className="font-bold truncate">{session.user?.name || t('userMenu.userFallback')}</div>
            <div className="text-xs text-gray-600 truncate">{session.user?.email}</div>
          </div>
          <Link
            href="/host/history"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-3 text-sm text-black hover:bg-yellow-400 transition-colors flex items-center gap-2 border-b border-gray-200"
          >
            <History className="w-4 h-4" />
            {t('userMenu.myQuizzes')}
          </Link>
          <button
            onClick={() => signOut()}
            className="block w-full text-left px-4 py-3 text-sm text-black hover:bg-yellow-400 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('userMenu.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
