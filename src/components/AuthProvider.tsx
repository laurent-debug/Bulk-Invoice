'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAppStore((s) => s.setAuthData);

  useEffect(() => {
    let mounted = true;

    // Safety net: if nothing resolves within 5s, mark auth as initialized (unauthenticated)
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Safety timeout — forcing isAuthInitialized=true');
        setAuthData(null, false, 0);
      }
    }, 5000);

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
      console.log('[Auth] Supabase client created');
    } catch (err) {
      console.error('[Auth] createClient() failed:', err);
      clearTimeout(safetyTimer);
      setAuthData(null, false, 0);
      return () => { mounted = false; };
    }

    const fetchProfileAndSetAuth = async (userId: string, email: string) => {
      try {
        console.log('[Auth] Fetching profile for:', email);
        let { data, error } = await supabase
          .from('profiles')
          .select('is_pro, files_processed')
          .eq('id', userId)
          .maybeSingle();

        console.log('[Auth] Profile result:', { data, error });

        if (!data) {
          console.log('[Auth] New user — creating profile');
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: userId }])
            .select()
            .single();
          console.log('[Auth] Profile created:', { newProfile, insertError });
          data = newProfile;
        }

        if (mounted) {
          console.log('[Auth] setAuthData → isPro:', data?.is_pro, '| filesProcessed:', data?.files_processed);
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
        console.log('[Auth] getSession() start');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[Auth] getSession() result:', { hasSession: !!session, userId: session?.user?.id, email: session?.user?.email, error });
        if (!mounted) return;

        if (session?.user) {
          await fetchProfileAndSetAuth(session.user.id, session.user.email ?? '');
        } else {
          console.log('[Auth] No session → unauthenticated');
          setAuthData(null, false, 0);
        }
      } catch (error) {
        console.error('[Auth] getSession failed:', error);
        if (mounted) setAuthData(null, false, 0);
      }
    };

    initAuth().then(() => clearTimeout(safetyTimer));

    // Step 2: Listen for auth changes (login, logout, token refresh)
    // Does NOT handle INITIAL_SESSION to avoid double profile fetch.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('[Auth] Event:', event, '| user:', session?.user?.email ?? 'none');

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
      clearTimeout(safetyTimer);
      listener.subscription.unsubscribe();
    };
  }, [setAuthData]);

  return <>{children}</>;
}
