'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAppStore((s) => s.setAuthData);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const fetchProfileAndSetAuth = async (userId: string, email: string) => {
      try {
        let { data } = await supabase
          .from('profiles')
          .select('is_pro, files_processed')
          .eq('id', userId)
          .maybeSingle();

        if (!data) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert([{ id: userId }])
            .select()
            .single();
          data = newProfile;
        }

        if (mounted) {
          setAuthData(
            { id: userId, email } as any,
            data?.is_pro || false,
            data?.files_processed || 0
          );
        }
      } catch (error) {
        console.error('[Auth] Profile fetch failed:', error);
        if (mounted) {
          setAuthData({ id: userId, email } as any, false, 0);
        }
      }
    };

    // Step 1: Read current session directly (reliable cross-browser)
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          await fetchProfileAndSetAuth(session.user.id, session.user.email ?? '');
        } else {
          setAuthData(null, false, 0);
        }
      } catch (error) {
        console.error('[Auth] getSession failed:', error);
        if (mounted) setAuthData(null, false, 0);
      }
    };

    initAuth();

    // Step 2: Listen for auth changes (login, logout, token refresh)
    // Does NOT handle INITIAL_SESSION to avoid double profile fetch.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
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
          await fetchProfileAndSetAuth(session.user.id, session.user.email ?? '');
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
