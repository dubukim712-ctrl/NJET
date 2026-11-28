import { CrmDirectoryView } from '@/components/admin/crm/CrmDirectoryView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Customer CRM' };

export default async function Page() {
  await requirePermission(PERMISSIONS.crmRead, '/admin/crm');
  return <CrmDirectoryView />;
}
