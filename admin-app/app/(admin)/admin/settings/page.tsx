import { AdminSettingsView } from '@/components/admin/settings/AdminSettingsView';
import { requireFullAccess } from '@/data/auth/guards';

export const metadata = { title: 'Settings' };

export default async function Page() {
  await requireFullAccess('/admin/settings');
  return <AdminSettingsView />;
}
