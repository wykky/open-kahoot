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

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }
  }, [open]);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg bg-black text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors text-sm font-bold shadow-md"
        aria-label={`Choose language (current: ${current.label})`}
        title={current.label}
      >
        <Globe className="w-5 h-5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border-2 border-black rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
          {LANGUAGES.map(lang => (
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
