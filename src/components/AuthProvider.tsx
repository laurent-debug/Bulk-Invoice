'use client';

import { useEffect, useRef } from 'react';
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
      // We don't set optimistic Auth data for Pro users yet because if it fails they get trapped as FREE.
      // Wait for DB to return.

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
      } catch (err) {
        console.error('[Auth] Profile fetch failed:', err);
        // If DB timed out or failed — we still need to let them use the app locally.
        if (mounted) setAuthData({ id: userId, email } as any, false, 0);
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

  return (
    <>
      <PreferencesSync />
      {children}
    </>
  );
}

// Separate component for preferences sync to avoid massive re-renders of AuthProvider children
function PreferencesSync() {
  const { user, pattern, categories, exportGrouping, setPattern, setCategories, setExportGrouping } = useAppStore();
  const isFirstMount = useRef(true);

  // Sync down from user metadata when user logs in
  useEffect(() => {
    if (user && isFirstMount.current) {
      isFirstMount.current = false;
      
      const syncDown = async () => {
        const { data } = await supabase.auth.getUser();
        const prefs = data.user?.user_metadata?.preferences;
        if (prefs) {
          if (prefs.pattern) setPattern(prefs.pattern);
          if (prefs.categories) setCategories(prefs.categories);
          if (prefs.exportGrouping) setExportGrouping(prefs.exportGrouping);
        }
      };
      syncDown();
    }
  }, [user, setPattern, setCategories, setExportGrouping]);

  // Sync up to user metadata when preferences change
  useEffect(() => {
    if (!user || isFirstMount.current) return;

    const timeout = setTimeout(async () => {
      await supabase.auth.updateUser({
        data: {
          preferences: {
            pattern,
            categories,
            exportGrouping
          }
        }
      });
      console.log('[Auth] Synced preferences to user metadata');
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [user, pattern, categories, exportGrouping]);
  
  return null;
}

