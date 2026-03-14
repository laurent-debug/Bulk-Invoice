'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Detect browser language AFTER hydration so the first client render
    // matches the server render (both use 'en'), preventing React error #418.
    const detected = navigator.language || 'en';
    const lang = (['en', 'fr', 'de'].find((l) => detected.toLowerCase().startsWith(l))) ?? 'en';
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
