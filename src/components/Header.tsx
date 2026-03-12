'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/utils/supabase/client';
import { type User } from '@supabase/supabase-js';

export function Header({
  onHistoryOpen,
}: {
  onHistoryOpen: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Bulk Invoice Manager</h1>
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
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25">
                Sign In
              </Button>
            </Link>
          )}

          <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          {/* History */}
          <button
            onClick={onHistoryOpen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
            title="Historique des exports"
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
