'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/Select';
import type { DashboardBranchContext } from '@/data/dashboard/branch-context';

export function DashboardBranchSelector({
  context,
}: {
  context: DashboardBranchContext;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selectBranch = (branchId: string) => {
    startTransition(() => {
      router.push(`/admin?branch=${encodeURIComponent(branchId)}`);
    });
  };

  return (
    <div className="w-full sm:w-56">
      {context.canSelectBranch ? (
        <Select
          label="Branch"
          value={context.selectedBranchId ?? 'all'}
          onChange={(event) => selectBranch(event.currentTarget.value)}
          disabled={isPending || context.branches.length === 0}
          containerClassName="w-full"
        >
          <option value="all">All branches</option>
          {context.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </Select>
      ) : (
        <Select
          label="Branch"
          value={context.selectedBranchId ?? 'none'}
          disabled
          containerClassName="w-full"
        >
          <option value={context.selectedBranchId ?? 'none'}>
            {context.selectedBranchName ?? 'No assigned branch'}
          </option>
        </Select>
      )}
      {context.error && (
        <p className="mt-1 text-xs text-destructive" role="status">{context.error}</p>
      )}
    </div>
  );
}
