'use client';

import { Select } from '@/components/ui/Select';
import type { DashboardBranchContext } from '@/data/dashboard/branch-context';

export function DashboardBranchSelector({
  context, value, updating, onWarm,
}: {
  context: DashboardBranchContext;
  value: string;
  updating: boolean;
  onWarm: () => void;
}) {
  return (
    <div className="w-full sm:w-56" onPointerEnter={onWarm} onFocusCapture={onWarm}>
      {context.canSelectBranch ? (
        <Select
          label="Branch"
          value={value}
          onValueChange={(branchId) => {
            const url = new URL(window.location.href);
            if (branchId === 'all') url.searchParams.delete('branch');
            else url.searchParams.set('branch', branchId);
            window.history.pushState(null, '', url);
          }}
          disabled={context.branches.length === 0}
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
      {updating && <p className="mt-1 text-xs text-muted-foreground" role="status">Updating branch totals…</p>}
      {context.error && !updating && (
        <p className="mt-1 text-xs text-destructive" role="status">{context.error}</p>
      )}
    </div>
  );
}
