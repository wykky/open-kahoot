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
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
