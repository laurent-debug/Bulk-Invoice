'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before mounting, render children WITHOUT the i18n provider.
  // This prevents returning null (which would unmount the entire tree including
  // AuthProvider's useEffect), while still avoiding hydration mismatches.
  // Translations will simply fall back to their keys until mounted.
  if (!mounted) {
    return <>{children}</>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
