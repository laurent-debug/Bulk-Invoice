import { forgotPassword } from '@/app/auth-reset-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const error = sp.error as string | undefined;
  const success = sp.success as string | undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-500 border border-emerald-500/20 text-center">
            {success}
          </div>
        )}

        <form action={forgotPassword} className="flex flex-col gap-4">
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

          <Button
            type="submit"
            formAction={forgotPassword}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            Send Reset Link
          </Button>

          <Link
            href="/login"
            className="mt-4 text-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}
