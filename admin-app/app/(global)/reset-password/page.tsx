import { redirect } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password',
  description: 'Choose a new password',
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A valid recovery session is required to set a new password.
  if (!user) {
    redirect('/login?error=recovery_link_expired');
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}