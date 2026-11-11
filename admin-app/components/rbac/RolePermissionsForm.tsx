'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Permission, RoleScope } from '@/types/database';
import { updateRolePermissionsAction } from '@/data/actions/permissions';
import { useInvalidateAdminRolesQuery } from '@/data/rbac/admin-roles-client';
import { useInvalidateAdminUsersQuery } from '@/data/rbac/admin-users-client';
import { PermissionChecklist } from '@/components/rbac/PermissionChecklist';
import { Button } from '@/components/ui/Button';

interface RolePermissionsFormProps {
  roleId: string;
  permissions: Permission[];
  scope: RoleScope;
  initialKeys: string[];
  canManage: boolean;
}

function normalized(keys: string[]): string {
  return [...keys].sort().join('|');
}

export function RolePermissionsForm({
  roleId,
  permissions,
  scope,
  initialKeys,
  canManage,
}: RolePermissionsFormProps) {
  const router = useRouter();
  const invalidateRoles = useInvalidateAdminRolesQuery();
  const invalidateUsers = useInvalidateAdminUsersQuery();
  const [keys, setKeys] = useState(initialKeys);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = normalized(keys) !== normalized(initialKeys);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const result = await updateRolePermissionsAction(roleId, keys);

      if (result.success) {
        await Promise.all([invalidateRoles(), invalidateUsers()]);
        toast.success('Permissions updated.');
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch {
      const message = 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">Permissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {canManage
            ? 'Choose what this role can read and manage. Manage includes read.'
            : 'You can view these permissions, but you do not have permission to change them.'}
        </p>
      </div>

      <PermissionChecklist
        permissions={permissions}
        scope={scope}
        value={keys}
        onChange={setKeys}
        disabled={!canManage || isSaving}
      />

      {error && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button type="submit" loading={isSaving} disabled={!isDirty}>
            Save permissions
          </Button>
        </div>
      )}
    </form>
  );
}
