import { login, signup } from '@/app/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const error = sp.error as string | undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in or create an account to start renaming your invoices in bulk.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
            {error}
          </div>
        )}

        <form className="flex flex-col gap-4">
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
              className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-violet-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <Link 
                href="/forgot-password" 
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-black/50 border-white/10 text-white focus-visible:ring-violet-500"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Button
              type="submit"
              formAction={login}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              Sign In
            </Button>
            <Button
              type="submit"
              formAction={signup}
              variant="outline"
              className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
            >
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
