import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { requirePermission } from '@/data/auth/guards';
import { getRoleOptions, getUsers } from '@/data/rbac/queries';
import { getUserBranchOptions } from '@/data/rbac/branch-options';
import {
  buildUsersHref,
  normalizeSearch,
  parseRoleFilter,
} from '@/lib/rbac';
import { parsePage, singleParam } from '@/lib/search-params';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { UsersFilters } from '@/components/rbac/UsersFilters';
import { UsersTable } from '@/components/rbac/UsersTable';
import { TablePagination } from '@/components/ui/TablePagination';
import { EmptyState } from '@/components/layout/EmptyState';

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
  const { profile } = await requirePermission(PERMISSIONS.usersRead, '/admin/users');
  const params = await searchParams;
  const search = normalizeSearch(singleParam(params.q));
  const roleId = parseRoleFilter(singleParam(params.role));
  const page = parsePage(params.page);
  const canManage = hasPermission(profile, PERMISSIONS.usersManage);

  const [{ users, total, pageSize, error }, roleResult, branchResult] = await Promise.all([
    getUsers({ search, roleId, page }),
    getRoleOptions(),
    canManage
      ? getUserBranchOptions()
      : Promise.resolve({ branches: null, error: null }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total > 0 && page > totalPages) {
    redirect(buildUsersHref({ page: totalPages, search, roleId }));
  }

  return (
    <div className="space-y-6">
      <UsersFilters roles={roleResult.roles} search={search} roleId={roleId} />

      {(error || roleResult.error || branchResult.error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error
            ? 'We could not load users. Please try again.'
            : roleResult.error
              ? 'We could not load the role list. Refresh the page before changing a role.'
              : 'We could not load the branch list. Refresh the page before assigning a branch.'}
        </div>
      )}

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={
            search || roleId
              ? 'No accounts match the current filters.'
              : 'Accounts will appear here after people sign up.'
          }
        />
      ) : (
        <>
          <UsersTable
            users={users}
            roles={roleResult.roles}
            branches={branchResult.branches}
            actor={profile}
            canManage={canManage}
          />
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            previousHref={buildUsersHref({ page: page - 1, search, roleId })}
            nextHref={buildUsersHref({ page: page + 1, search, roleId })}
          />
        </>
      )}
    </div>
  );
}
