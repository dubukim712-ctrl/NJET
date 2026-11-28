'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { useSearchParams } from 'next/navigation';
import { UsersQuery } from '@/components/rbac/UsersQuery';
import {
  normalizeSearch,
  parseRoleFilter,
} from '@/lib/rbac';
import { parsePage } from '@/lib/search-params';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function UsersContent() {
  const profile = useAdminProfile();
  const params = useSearchParams();

  return (
    <UsersQuery
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.usersManage)}
      search={normalizeSearch(params.get('q') ?? undefined)}
      roleId={parseRoleFilter(params.get('role') ?? undefined)}
      page={parsePage(params.get('page') ?? undefined)}
    />
  );
}
