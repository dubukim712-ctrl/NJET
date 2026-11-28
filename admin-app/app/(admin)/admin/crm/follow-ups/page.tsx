import { CrmFollowUpsView } from '@/components/admin/crm/CrmFollowUpsView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'CRM follow-ups' };

export default async function Page() {
  await requirePermission(PERMISSIONS.crmRead, '/admin/crm/follow-ups');
  return <CrmFollowUpsView />;
}
