'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/database';
import type { RoleOption } from '@/data/rbac/queries';
import {
  getAssignableRoles,
  roleAssignmentBlockedReason,
} from '@/lib/rbac';
import { assignUserRoleAction } from '@/data/actions/users';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

interface UserRoleFormProps {
  user: UserProfile;
  roles: RoleOption[];
  actor: UserProfile;
}

export function UserRoleForm({ user, roles, actor }: UserRoleFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(user.role_id);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockedReason = roleAssignmentBlockedReason(actor, user);

  if (blockedReason) {
    return (
      <p className="max-w-56 text-xs text-muted-foreground">{blockedReason}</p>
    );
  }

  const assignableRoles = getAssignableRoles(actor, user, roles);

  if (assignableRoles.length === 0) {
    return (
      <p className="max-w-56 text-xs text-muted-foreground">
        No roles are available for you to assign.
      </p>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set('userId', user.id);
      formData.set('roleId', selected);

      const result = await assignUserRoleAction(formData);

      if (result.success) {
        toast.success('Role updated.');
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
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Select
          id={`role-${user.id}`}
          label={<span className="sr-only">Role for {user.email}</span>}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={isSaving}
          containerClassName="w-full sm:w-44"
        >
          {assignableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          size="sm"
          loading={isSaving}
          disabled={selected === user.role_id}
        >
          Save
        </Button>
      </form>

      {error && (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
