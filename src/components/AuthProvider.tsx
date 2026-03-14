'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAppStore((s) => s.setAuthData);

  useEffect(() => {
    let mounted = true;

    // Safety net: only fires if nothing resolved auth within 6s
    // Does NOT override a user that was already identified
    const safetyTimer = setTimeout(() => {
      if (mounted && !useAppStore.getState().isAuthInitialized) {
        console.warn('[Auth] Safety timeout — forcing unauthenticated');
        setAuthData(null, false, 0);
      }
    }, 6000);

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
      // Optimistic: mark user as authenticated immediately before any DB call
      // This ensures the UI shows the user even if the DB is slow/unreachable
      if (mounted) {
        console.log('[Auth] Optimistic auth set for:', email);
        setAuthData({ id: userId, email } as any, false, 0);
      }

      // Then fetch profile for isPro/filesProcessed with an 8s timeout
      try {
        console.log('[Auth] Fetching profile for:', email);

        const profilePromise = supabase
          .from('profiles')
          .select('is_pro, files_processed')
          .eq('id', userId)
          .maybeSingle();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 8000)
        );

        let { data, error } = await Promise.race([profilePromise, timeoutPromise]);
        console.log('[Auth] Profile result:', { data, error });

        if (!data && !error) {
          console.log('[Auth] New user — creating profile');
          const result = await supabase
            .from('profiles')
            .insert([{ id: userId }])
            .select()
            .single();
          console.log('[Auth] Profile created:', result);
          data = result.data;
        }

        if (mounted && data) {
          console.log('[Auth] setAuthData → isPro:', data.is_pro, '| filesProcessed:', data.files_processed);
          setAuthData(
            { id: userId, email } as any,
            data.is_pro || false,
            data.files_processed || 0
          );
        }
      } catch (err) {
        // Profile fetch timed out or failed — user stays authenticated with defaults
        console.warn('[Auth] Profile fetch failed/timed out (user stays logged in):', err);
      }
    };

    // Step 1: Read current session directly (cross-browser reliable)
    const initAuth = async () => {
      try {
        console.log('[Auth] getSession() start');

        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 5000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        console.log('[Auth] getSession() result:', { hasSession: !!session, email: session?.user?.email, error });
        if (!mounted) return;

        if (session?.user) {
          await fetchProfileAndSetAuth(session.user.id, session.user.email ?? '');
        } else {
          console.log('[Auth] No session → unauthenticated');
          setAuthData(null, false, 0);
        }
      } catch (err) {
        console.error('[Auth] getSession failed/timed out:', err);
        // Only mark as unauthenticated if we haven't already identified the user
        if (mounted && !useAppStore.getState().isAuthInitialized) {
          setAuthData(null, false, 0);
        }
      }
    };

    initAuth().then(() => clearTimeout(safetyTimer));

    // Step 2: Listen for auth state changes (login, logout, token refresh)
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
