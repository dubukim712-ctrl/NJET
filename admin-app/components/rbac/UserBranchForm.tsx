'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { assignUserBranchAction } from '@/data/actions/users';
import type { UserBranchOption } from '@/data/rbac/branch-options';
import { useInvalidateAdminUsersQuery } from '@/data/rbac/admin-users-client';
import type { ManagedUser } from '@/types/rbac';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export function UserBranchForm({
  user,
  branches,
}: {
  user: ManagedUser;
  branches: UserBranchOption[] | null;
}) {
  const router = useRouter();
  const invalidateUsers = useInvalidateAdminUsersQuery();
  const [selected, setSelected] = useState(user.branch_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.scope !== 'staff' || user.is_full_access) {
    return <span className="text-sm text-muted-foreground">Not required</span>;
  }
  if (!branches) {
    return <span className="text-xs text-muted-foreground">Branch list unavailable</span>;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set('userId', user.id);
    formData.set('branchId', selected);
    try {
      const result = await assignUserBranchAction(formData);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Branch assignment updated.');
      await invalidateUsers();
      router.refresh();
    } catch (assignmentError) {
      console.error('Could not update user branch.', assignmentError);
      const message = 'Could not update the branch. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Select
          label={<span className="sr-only">Branch for {user.email}</span>}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={saving}
          containerClassName="w-full sm:w-48"
        >
          <option value="">Unassigned</option>
          {branches.map((branch) => (
            <option
              key={branch.id}
              value={branch.id}
              disabled={!branch.active && branch.id !== user.branch_id}
            >
              {branch.name}{branch.active ? '' : ' (inactive)'}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" loading={saving} disabled={selected === (user.branch_id ?? '')}>
          Save
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Unassigned users cannot access branch data.
      </p>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
