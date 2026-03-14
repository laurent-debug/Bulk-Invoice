'use client';

/**
 * AuthProvider — Singleton auth initializer
 *
 * Mounts ONCE at the root. Subscribes to Supabase auth events and writes
 * the result to the Zustand store. Never re-runs because it lives outside
 * of I18nProvider (which toggles `null → children` on first hydration).
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAppStore((s) => s.setAuthData);
  // Guard to prevent the effect from running more than once
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();

    const fetchProfileAndSetAuth = async (userId: string, email: string) => {
      console.log('[Auth] Fetching profile for:', email);
      let { data } = await supabase
        .from('profiles')
        .select('is_pro, files_processed')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        // Profile doesn't exist yet (new user) — create it
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
    };

    // 1. Check existing session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfileAndSetAuth(session.user.id, session.user.email ?? '');
      } else {
        setAuthData(null, false, 0);
      }
    });

    // 2. Subscribe to future auth events
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event);

        if (event === 'SIGNED_OUT') {
          setAuthData(null, false, 0);
          return;
        }

        if (
          (event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED') &&
          session?.user
        ) {
          await fetchProfileAndSetAuth(
            session.user.id,
            session.user.email ?? ''
          );
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [setAuthData]);

  return <>{children}</>;
}
