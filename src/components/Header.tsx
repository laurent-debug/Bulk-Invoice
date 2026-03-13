'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/utils/supabase/client';
import { type User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Header({
  onHistoryOpen,
}: {
  onHistoryOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, isPro, setAuthData } = useAppStore();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      
      if (session?.user) {
        console.log('[Auth] Initial session found:', session.user.email);
        let { data } = await supabase
          .from('profiles')
          .select('is_pro, files_processed')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (!data && mounted) {
           const { data: newProfile } = await supabase
            .from('profiles')
            .insert([{ id: session.user.id }])
            .select()
            .single();
           data = newProfile;
        }

        if (mounted) {
          setAuthData(session.user, !!data?.is_pro, data?.files_processed || 0);
        }
      }
    };

    checkInitialSession();

    // onAuthStateChange handles subsequent changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, session ? 'has session' : 'NO session');

        if (event === 'SIGNED_OUT') {
          setAuthData(null, false, 0);
          return;
        }

        if (session?.user) {
          console.log('[Auth] State change - fetching profile for:', session.user.email);
          let { data, error } = await supabase
            .from('profiles')
            .select('is_pro, files_processed')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error('[Auth] Profile fetch error:', error);
          }

          // If no profile exists, create one
          if (!data && !error) {
            console.log('[Auth] No profile found, creating one...');
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert([{ id: session.user.id }])
              .select()
              .single();
            
            if (insertError) {
              console.error('[Auth] Profile creation error:', insertError);
            } else {
              data = newProfile;
            }
          }
          
          setAuthData(session.user, !!data?.is_pro, data?.files_processed || 0);
        } else if (event === 'INITIAL_SESSION') {
          // No session found on startup
          setAuthData(null, false, 0);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">{t('header.title')}</h1>
              {isPro && (
                <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400 border border-violet-500/20">
                  PRO
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 -mt-0.5 tracking-widest uppercase">Smart Organization</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-400 hidden sm:inline-block truncate max-w-[150px]">
                {user.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => supabase.auth.signOut()}
              >
                {t('common.signout')}
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25">
                {t('common.signin')}
              </Button>
            </Link>
          )}

          <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          {/* Language Selector */}
          <Select value={i18n.language ?? 'en'} onValueChange={(lang) => { if (lang) i18n.changeLanguage(lang); }}>
            <SelectTrigger className="w-[60px] h-9 bg-white/5 border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-950 border-white/10 min-w-[60px]">
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
              <SelectItem value="de">DE</SelectItem>
            </SelectContent>
          </Select>

          {/* History */}
          <button
            onClick={onHistoryOpen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
            title={t('header.history') ?? undefined}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
