'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signup } from '@/app/auth-actions';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export function LoginForm({ serverError: initialServerError }: { serverError?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState(initialServerError ?? '');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) setSuccessMessage(success);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordError('');
    setServerError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (mode === 'signup') {
      const confirmPassword = formData.get('confirmPassword') as string;
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match.');
        setIsLoading(false);
        return;
      }
      // Signup still uses server action (needs server origin for email redirect)
      startTransition(() => { signup(formData); });
      return;
    }

    // Login: client-side so SIGNED_IN fires on the same Supabase instance
    // that AuthProvider is listening to — auth state updates immediately.
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setServerError(error.message);
        setIsLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setServerError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const loading = isLoading || isPending;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {mode === 'login'
              ? 'Log in to continue.'
              : 'Test AI-powered invoice renaming for free.'}
          </p>
        </div>

        {(serverError || passwordError) && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center animate-in fade-in zoom-in duration-300"
          >
            {passwordError || serverError}
          </div>
        )}

        {successMessage && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-500 border border-emerald-500/20 text-center animate-in fade-in duration-500"
          >
            {successMessage}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-300">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={loading}
              className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-violet-500 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" title="Password field">
              <span className="text-sm font-medium text-gray-300">Password</span>
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={loading}
              className="bg-black/50 border-white/10 text-white focus-visible:ring-violet-500 disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-1">
              <div />
              {mode === 'login' && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
          </div>

          {mode === 'signup' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={loading}
                className="bg-black/50 border-white/10 text-white focus-visible:ring-violet-500 disabled:opacity-50"
              />
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold h-11 shadow-lg shadow-violet-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                mode === 'login' ? 'Log In' : 'Sign Up'
              )}
            </Button>

            <div className="text-center text-sm text-gray-400">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                disabled={loading}
                className="text-white hover:text-violet-400 font-medium underline underline-offset-4 disabled:opacity-50 disabled:no-underline"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setPasswordError('');
                  setSuccessMessage('');
                  setServerError('');
                }}
              >
                {mode === 'login' ? 'Create Account' : 'Log In'}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 border-t border-white/5 pt-6 text-[10px] text-gray-500 uppercase tracking-widest font-medium">
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          <span className="w-1 h-1 rounded-full bg-gray-800" />
          <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  );
}
