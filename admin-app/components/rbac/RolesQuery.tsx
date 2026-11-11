'use client';

import Link from 'next/link';
import { Plus, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { RolesTable } from '@/components/rbac/RolesTable';
import { Button } from '@/components/ui/Button';
import {
  AdminRolesQueryError,
  useAdminRolesQuery,
} from '@/data/rbac/admin-roles-client';

export function RolesQuery({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const query = useAdminRolesQuery(userId, canManage);

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="roles" />;
  }

  if (!query.data) {
    return (
      <div className="space-y-3">
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {query.error instanceof AdminRolesQueryError
            ? query.error.message
            : 'We could not load roles. Please try again.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {query.data.canManage && (
        <div className="flex justify-end">
          <Link
            href="/admin/roles/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New role
          </Link>
        </div>
      )}

      {(query.isError || query.data.error) && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          We could not load roles. Please try again.
        </p>
      )}

      {query.data.error ? null : query.data.roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles yet"
          description="Create a role to define what a group of users can access."
          actionHref={query.data.canManage ? '/admin/roles/new' : undefined}
          actionLabel={query.data.canManage ? 'Create a role' : undefined}
        />
      ) : (
        <RolesTable
          roles={query.data.roles}
          canManage={query.data.canManage}
        />
      )}
    </div>
  );
}
