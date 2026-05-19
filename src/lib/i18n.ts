import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from '@/locales/en.json';
import amTranslations from '@/locales/am.json';
import omTranslations from '@/locales/om.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: enTranslations },
        am: { translation: amTranslations },
        om: { translation: omTranslations },
      },
      fallbackLng: {
        'am-ET': ['am', 'en'],
        'om-ET': ['om', 'en'],
        'en-US': ['en'],
        'en-GB': ['en'],
        default: ['en'],
      },
      supportedLngs: ['en', 'am', 'om'],
      load: 'languageOnly',
      nonExplicitSupportedLngs: true,
      detection: {
        // Cookie first so server components (next/headers) can read the same value
        // the client picked. localStorage stays as a fallback for older sessions.
        order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
        caches: ['cookie', 'localStorage'],
        lookupCookie: 'atenu-locale',
        cookieMinutes: 60 * 24 * 365, // 1 year
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
