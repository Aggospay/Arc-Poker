/**
 * LocaleContext — single source of truth for the active language.
 * Wrap <App> with <LocaleProvider> and call useLocaleCtx() in any component.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { TranslationKey, LocaleInfo } from './translations';
import { translations, SUPPORTED_LOCALES } from './translations';

export type { TranslationKey, LocaleInfo };
export { SUPPORTED_LOCALES };

const STORAGE_KEY = 'arc_poker_lang';

function detectBrowserLocale(): string {
  try {
    const nav = navigator.languages ?? [navigator.language ?? 'en'];
    for (const lang of nav) {
      const full  = lang.toLowerCase();
      const short = full.split('-')[0];
      if (SUPPORTED_LOCALES.some((l: LocaleInfo) => l.code === full)) return full;
      const byShort = SUPPORTED_LOCALES.find((l: LocaleInfo) => l.code.startsWith(short));
      if (byShort) return byShort.code;
    }
  } catch { /* ssr guard */ }
  return 'en';
}

function loadLocale(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? detectBrowserLocale(); }
  catch { return 'en'; }
}

interface LocaleCtx {
  locale: string;
  currentLocale: LocaleInfo;
  isRtl: boolean;
  setLocale: (code: string) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(loadLocale);

  useEffect(() => {
    const info = SUPPORTED_LOCALES.find((l: LocaleInfo) => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir  = info?.rtl ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback((code: string) => {
    setLocaleState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* noop */ }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const dict     = translations[locale] ?? translations['en'];
    const fallback = translations['en'];
    return (dict?.[key] ?? fallback[key] ?? key);
  }, [locale]);

  const currentLocale = SUPPORTED_LOCALES.find((l: LocaleInfo) => l.code === locale) ?? SUPPORTED_LOCALES[0];

  return (
    <LocaleContext.Provider value={{ locale, currentLocale, isRtl: currentLocale.rtl ?? false, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleCtx(): LocaleCtx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleCtx must be used inside <LocaleProvider>');
  return ctx;
}
