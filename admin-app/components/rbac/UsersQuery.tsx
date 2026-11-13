'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { UsersLoadingSkeleton } from '@/components/rbac/UsersLoadingSkeleton';
import { UsersFilters } from '@/components/rbac/UsersFilters';
import { UsersTable } from '@/components/rbac/UsersTable';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/Button';
import {
  AdminUsersQueryError,
  useAdminUsersQuery,
} from '@/data/rbac/admin-users-client';
import { buildUsersHref } from '@/lib/rbac';

export function UsersQuery({
  userId,
  canManage,
  search,
  roleId,
  page,
}: {
  userId: string;
  canManage: boolean;
  search?: string;
  roleId?: string;
  page: number;
}) {
  const router = useRouter();
  const query = useAdminUsersQuery(userId, canManage, search, roleId, page);
  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize))
    : 1;
  const outOfRange = Boolean(
    query.data && query.data.total > 0 && page > totalPages
  );

  useEffect(() => {
    if (outOfRange) {
      router.replace(buildUsersHref({ page: totalPages, search, roleId }));
    }
  }, [outOfRange, page, roleId, router, search, totalPages]);

  if (!query.data && query.isPending) {
    return (
      <UsersLoadingSkeleton
        canManage={canManage}
        hasFilters={Boolean(search || roleId)}
      />
    );
  }

  if (!query.data) {
    const message = query.error instanceof AdminUsersQueryError
      ? query.error.message
      : 'Users could not be loaded. Please try again later.';
    return (
      <div className="space-y-3">
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  if (outOfRange) {
    return (
      <UsersLoadingSkeleton
        canManage={canManage}
        hasFilters={Boolean(search || roleId)}
      />
    );
  }

  const { users, roles, branches, actor, errors, total, pageSize } = query.data;

  return (
    <div className="space-y-6">
      <UsersFilters roles={roles} search={search} roleId={roleId} />

      {(query.isError || errors.users || errors.roles || errors.branches) && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {query.isError
            ? query.error instanceof AdminUsersQueryError
              ? query.error.message
              : 'User data could not be refreshed.'
            : errors.users
              ? 'We could not load users. Please try again.'
              : errors.roles
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
            roles={roles}
            branches={branches}
            actor={actor}
            canManage={query.data.canManage}
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
