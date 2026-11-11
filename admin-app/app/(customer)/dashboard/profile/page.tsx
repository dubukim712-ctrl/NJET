import { redirect } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { ProfileForm } from '@/components/auth/ProfileForm';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          We couldn&apos;t load your profile. Please refresh the page or sign in
          again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update how your account appears in the app.
        </p>
      </div>

      <section
        className="rounded-xl border bg-card p-5 sm:p-6"
        aria-labelledby="profile-heading"
      >
        <h2 id="profile-heading" className="text-lg font-semibold">
          Personal information
        </h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Email:</dt>
            <dd className="font-medium">{profile.email}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Role:</dt>
            <dd className="font-medium">{profile.role_name}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <ProfileForm profile={profile} />
        </div>
      </section>
    </div>
  );
}