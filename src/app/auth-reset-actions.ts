'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    return redirect('/forgot-password?error=' + encodeURIComponent(error.message));
  }

  return redirect('/forgot-password?success=Check your email for the reset link.');
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return redirect('/update-password?error=' + encodeURIComponent(error.message));
  }

  return redirect('/login?success=Password updated successfully.');
}
