import { ProfileForm } from '@/components/auth/ProfileForm';
import { requireStaff } from '@/data/auth/guards';

export const metadata = { title: 'Profile' };

export default async function AdminProfilePage() {
  const { profile } = await requireStaff('/admin/profile');

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update how your account appears to customers and staff.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Personal information</h2>
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
