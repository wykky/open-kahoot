/**
 * Server-side i18n. Reads the `atenu-locale` cookie (written by LanguageSelector
 * and i18next-browser-languagedetector) and returns the matching JSON dictionary.
 *
 * Server components import this; client components keep using react-i18next.
 * Both ultimately read the same cookie, so the locale stays in sync across SSR
 * and CSR boundaries.
 */
import 'server-only';
import { cookies } from 'next/headers';
import enJson from '@/locales/en.json';
import amJson from '@/locales/am.json';
import omJson from '@/locales/om.json';

const DICTIONARIES = {
  en: enJson,
  am: amJson,
  om: omJson,
} as const;

export type ServerLocale = keyof typeof DICTIONARIES;
export type Dictionary = typeof enJson;

const LOCALE_COOKIE = 'atenu-locale';

export async function getServerLocale(): Promise<ServerLocale> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(LOCALE_COOKIE)?.value;
    if (raw === 'am' || raw === 'om' || raw === 'en') return raw;
  } catch {
    // cookies() throws in static-rendering contexts — fall through to default
  }
  return 'en';
}

export async function getDict(): Promise<Dictionary> {
  return DICTIONARIES[await getServerLocale()];
}
