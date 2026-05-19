'use client';

import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromoo' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }
  }, [open]);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    // Mirror to a cookie so server components (host/history etc.) pick up the same
    // locale. i18next-browser-languagedetector also writes it but be explicit for
    // SameSite + path correctness across the whole app.
    if (typeof document !== 'undefined') {
      document.cookie = `atenu-locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-lg bg-yellow-400 text-black border border-black hover:bg-black hover:text-yellow-400 transition-colors shadow-sm flex items-center justify-center"
        aria-label={`Choose language (current: ${current.label})`}
        title={current.label}
      >
        <Globe className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-black rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => change(lang.code)}
              className={`block w-full text-left px-4 py-2.5 text-sm text-black hover:bg-yellow-400 hover:text-black transition-colors ${
                lang.code === i18n.language ? 'bg-yellow-400 font-bold' : 'bg-white'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
