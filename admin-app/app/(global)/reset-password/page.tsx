import { redirect } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { getPasswordResetStatus } from '@/data/auth/mfa';
import { AuthenticatorSignIn } from '@/components/auth/AuthenticatorSignIn';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password',
  description: 'Choose a new password',
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const status = await getPasswordResetStatus(supabase.auth);

  if (status === 'expired') {
    redirect('/login?error=recovery_link_expired');
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        {status === 'challenge' ? (
          <AuthenticatorSignIn passwordReset />
        ) : status === 'unavailable' ? (
          <p role="alert" className="text-sm text-destructive">
            Could not check your recovery session. Refresh this page or request a new password reset link.
          </p>
        ) : (
          <ResetPasswordForm />
        )}
      </div>
    </div>
  );
}