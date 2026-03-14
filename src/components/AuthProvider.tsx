'use client';

/**
 * AuthProvider — Singleton auth initializer
 *
 * Mounts ONCE at the root. Subscribes to Supabase auth events and writes
 * the result to the Zustand store. Never re-runs because it lives outside
 * of I18nProvider (which toggles `null → children` on first hydration).
 *
 * Uses onAuthStateChange as the single source of truth (INITIAL_SESSION
 * replaces getSession(), avoiding the double-fetch and stale-token issues).
 */

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAppStore((s) => s.setAuthData);

  useEffect(() => {
    const supabase = createClient();

    const fetchProfileAndSetAuth = async (userId: string, email: string) => {
      try {
        let { data } = await supabase
          .from('profiles')
          .select('is_pro, files_processed')
          .eq('id', userId)
          .maybeSingle();

        if (!data) {
          // New user — create profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert([{ id: userId }])
            .select()
            .single();
          data = newProfile;
        }

        setAuthData(
          { id: userId, email } as any,
          data?.is_pro || false,
          data?.files_processed || 0
        );
      } catch (error) {
        console.error('[Auth] Profile fetch failed:', error);
        // Still initialize auth so UI doesn't stay stuck on loading skeleton
        setAuthData(
          { id: userId, email } as any,
          false,
          0
        );
      }
    };

    // Single source of truth: onAuthStateChange handles everything.
    // INITIAL_SESSION fires immediately on subscribe with the current session
    // (or null), replacing the need for a separate getSession() call and
    // eliminating the double DB query on page load.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event);

        if (event === 'SIGNED_OUT') {
          setAuthData(null, false, 0);
          return;
        }

        if (
          (event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED') &&
          session?.user
        ) {
          await fetchProfileAndSetAuth(
            session.user.id,
            session.user.email ?? ''
          );
          return;
        }

        // INITIAL_SESSION with no session = unauthenticated
        if (event === 'INITIAL_SESSION' && !session?.user) {
          setAuthData(null, false, 0);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [setAuthData]);

  return <>{children}</>;
}
