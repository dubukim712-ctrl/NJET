import { UsersQuery } from '@/components/rbac/UsersQuery';
import { requirePermission } from '@/data/auth/guards';
import {
  normalizeSearch,
  parseRoleFilter,
} from '@/lib/rbac';
import { parsePage, singleParam } from '@/lib/search-params';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export type UsersSearchParams = {
  q?: string | string[];
  role?: string | string[];
  page?: string | string[];
};

export async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<UsersSearchParams>;
}) {
  const [{ user, profile }, params] = await Promise.all([
    requirePermission(PERMISSIONS.usersRead, '/admin/users'),
    searchParams,
  ]);

  return (
    <UsersQuery
      userId={user.id}
      canManage={hasPermission(profile, PERMISSIONS.usersManage)}
      search={normalizeSearch(singleParam(params.q))}
      roleId={parseRoleFilter(singleParam(params.role))}
      page={parsePage(params.page)}
    />
  );
}
