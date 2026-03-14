'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/lib/store';

// Module-level singleton — created ONCE, never recreated.
// React Strict Mode mounts components twice; if createClient() were
// called inside useEffect, two Supabase instances would fight over
// the navigator.locks Web API → lock steal → spurious SIGNED_OUT.
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAppStore((s) => s.setAuthData);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string, email: string) => {
      // Optimistic: user is authenticated immediately, before DB responds
      if (mounted) setAuthData({ id: userId, email } as any, false, 0);

      try {
        const profilePromise = supabase
          .from('profiles')
          .select('is_pro, files_processed')
          .eq('id', userId)
          .maybeSingle();

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 8000)
        );

        let { data, error } = await Promise.race([profilePromise, timeout]);

        if (!data && !error) {
          // New user — create profile row
          const result = await supabase
            .from('profiles')
            .insert([{ id: userId }])
            .select()
            .single();
          data = result.data;
        }

        if (mounted && data) {
          setAuthData(
            { id: userId, email } as any,
            data.is_pro || false,
            data.files_processed || 0
          );
        }
      } catch {
        // DB timed out or failed — user stays authenticated with defaults
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('[Auth]', event, session?.user?.email ?? 'none');

        if (event === 'SIGNED_OUT') {
          setAuthData(null, false, 0);
        } else if (
          (event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED') &&
          session?.user
        ) {
          await fetchProfile(session.user.id, session.user.email ?? '');
        } else if (event === 'INITIAL_SESSION' && !session?.user) {
          setAuthData(null, false, 0);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setAuthData]);

  return <>{children}</>;
}
