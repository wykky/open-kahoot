'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { LogIn, LogOut } from "lucide-react";

export default function UserMenu() {
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
      <div className="p-2 sm:px-3 sm:py-2 bg-black text-yellow-400 rounded-lg border-2 border-yellow-400 text-sm font-bold shadow-md">
        ...
      </div>
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg bg-yellow-400 text-black border-2 border-black hover:bg-black hover:text-yellow-400 transition-colors text-sm font-bold shadow-md"
        aria-label="Sign in with Atenu"
        title="Sign in"
      >
        <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const initial = (session.user?.name || session.user?.email || "?")[0].toUpperCase();

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg bg-yellow-400 text-black border-2 border-black hover:opacity-90 transition-opacity text-sm font-bold shadow-md"
        aria-label={`User menu (${session.user?.name || session.user?.email})`}
      >
        <div className="w-7 h-7 rounded-full bg-black text-yellow-400 flex items-center justify-center font-bold text-sm">
          {initial}
        </div>
        <span className="hidden sm:inline pr-2 max-w-[140px] truncate">{session.user?.name || session.user?.email}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border-2 border-black rounded-lg shadow-xl overflow-hidden z-50 min-w-[220px]">
          <div className="px-4 py-3 text-sm text-black border-b border-gray-200 bg-yellow-50">
            <div className="font-bold truncate">{session.user?.name || "User"}</div>
            <div className="text-xs text-gray-600 truncate">{session.user?.email}</div>
          </div>
          <button
            onClick={() => signOut()}
            className="block w-full text-left px-4 py-2.5 text-sm text-black hover:bg-yellow-400 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
