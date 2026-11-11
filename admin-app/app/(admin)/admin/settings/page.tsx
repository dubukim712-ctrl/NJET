import { requireFullAccess } from '@/data/auth/guards';
import { SystemSettingsQuery } from '@/components/admin/settings/SystemSettingsQuery';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user } = await requireFullAccess('/admin/settings');

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Global</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage business information, branch service hours, payment accounts, and ownership certificates.
        </p>
      </header>
      <SystemSettingsQuery userId={user.id} />
    </div>
  );
}
