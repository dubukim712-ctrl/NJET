import { redirect } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account security and preferences.
        </p>
      </div>

      <section
        className="rounded-xl border bg-card p-5 sm:p-6"
        aria-labelledby="security-heading"
      >
        <h2 id="security-heading" className="text-lg font-semibold">
          Change password
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Choose a strong password you don&apos;t use anywhere else.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}