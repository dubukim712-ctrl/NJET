import { notFound } from 'next/navigation';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { isValidUuid } from '@/lib/rbac';
import { RoleDetailQuery } from '@/components/rbac/RoleDetailQuery';

export async function RoleDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ user, profile }, { id }] = await Promise.all([
    requirePermission(PERMISSIONS.rolesRead, '/admin/roles'),
    params,
  ]);
  if (!isValidUuid(id)) notFound();

  return (
    <RoleDetailQuery
      userId={user.id}
      permissionSignature={[
        profile.scope,
        profile.is_full_access,
        ...profile.permissions.slice().sort(),
      ].join(':')}
      roleId={id}
    />
  );
}
