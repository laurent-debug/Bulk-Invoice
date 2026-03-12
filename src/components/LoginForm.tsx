'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { login, signup } from '@/app/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export function LoginForm({ serverError }: { serverError?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setSuccessMessage(success);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // If it's a signup, let's just make sure passwords match before submitting to server action
    if (mode === 'signup') {
      const formData = new FormData(e.currentTarget);
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      
      if (password !== confirmPassword) {
        e.preventDefault();
        setPasswordError('Les mots de passe ne correspondent pas.');
        return;
      }
    }
    setPasswordError('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Bon retour !' : 'Créer un compte'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {mode === 'login' 
              ? 'Connectez-vous pour continuer.' 
              : 'Testez gratuitement le renommage de factures par IA.'}
          </p>
        </div>

        {(serverError || passwordError) && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
            {passwordError || serverError}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-500 border border-emerald-500/20 text-center animate-in fade-in duration-500">
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
              placeholder="vous@exemple.com"
              required
              className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-violet-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Mot de passe
              </label>
              {mode === 'login' && (
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-black/50 border-white/10 text-white focus-visible:ring-violet-500"
            />
          </div>

          {mode === 'signup' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="bg-black/50 border-white/10 text-white focus-visible:ring-violet-500"
              />
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <Button
              type="submit"
              formAction={mode === 'login' ? login : signup}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {mode === 'login' ? 'Se connecter' : 'S\'inscrire'}
            </Button>
            
            <div className="text-center text-sm text-gray-400">
              {mode === 'login' ? "Pas encore de compte ? " : "Vous avez déjà un compte ? "}
              <button
                type="button"
                className="text-white hover:text-violet-400 font-medium underline underline-offset-4"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setPasswordError('');
                }}
              >
                {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
