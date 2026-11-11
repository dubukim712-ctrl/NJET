'use client';

import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { CreateRoleForm } from '@/components/rbac/CreateRoleForm';
import { Button } from '@/components/ui/Button';
import {
  AdminRolesQueryError,
  useAdminRoleCreationDataQuery,
} from '@/data/rbac/admin-roles-client';

export function NewRoleQuery({ userId }: { userId: string }) {
  const query = useAdminRoleCreationDataQuery(userId);

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="permission catalog" />;
  }

  if (!query.data) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {query.error instanceof AdminRolesQueryError
            ? query.error.message
            : 'We could not load the permission catalog. Please try again.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return query.data.error ? (
    <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
      We could not load the permission catalog. Run the permissions migration, then refresh this page.
    </p>
  ) : (
    <div className="max-w-3xl">
      <CreateRoleForm permissions={query.data.permissions} />
    </div>
  );
}
