'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteRoleAction } from '@/data/actions/roles';
import { useInvalidateAdminRolesQuery } from '@/data/rbac/admin-roles-client';
import { useInvalidateAdminUsersQuery } from '@/data/rbac/admin-users-client';

interface DeleteRoleButtonProps {
  roleId: string;
  roleName: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function DeleteRoleButton({
  roleId,
  roleName,
  disabled = false,
  disabledReason,
}: DeleteRoleButtonProps) {
  const router = useRouter();
  const invalidateRoles = useInvalidateAdminRolesQuery();
  const invalidateUsers = useInvalidateAdminUsersQuery();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await deleteRoleAction(roleId);

      if (result.success) {
        await Promise.all([invalidateRoles(), invalidateUsers()]);
        toast.success('Role deleted.');
        setOpen(false);
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
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${roleName}?`}
        description="This permanently removes the role. It can only be deleted when no users are assigned to it."
        confirmLabel="Delete role"
        onConfirm={handleDelete}
        loading={loading}
        error={error}
        destructive
      />
    </>
  );
}
