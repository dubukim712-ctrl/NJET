import { z } from 'zod';
import { notFound } from 'next/navigation';
import { CrmCustomerView } from '@/components/admin/crm/CrmCustomerView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Customer profile' };

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  if (!z.uuid().safeParse((await params).customerId).success) notFound();
  await requirePermission(PERMISSIONS.crmRead, '/admin/crm');
  return <CrmCustomerView />;
}
