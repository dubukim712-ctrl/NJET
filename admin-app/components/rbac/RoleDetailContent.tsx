import { RoleDetailView } from '@/components/rbac/RoleDetailView';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { isValidUuid } from '@/lib/rbac';

export async function RoleDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [, { id }] = await Promise.all([
    requirePermission(PERMISSIONS.rolesRead, '/admin/roles'),
    params,
  ]);
  if (!isValidUuid(id)) notFound();

  return <RoleDetailView />;
}
