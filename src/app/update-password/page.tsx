import { updatePassword } from '@/app/auth-reset-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function UpdatePasswordPage({
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
          <h1 className="text-2xl font-bold text-white tracking-tight">New Password</h1>
          <p className="mt-2 text-sm text-gray-400">
            Please enter your new password below.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
            {error}
          </div>
        )}

        <form action={updatePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              New Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-black/50 border-white/10 text-white focus-visible:ring-violet-500"
            />
          </div>

          <Button
            type="submit"
            className="mt-2 w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
