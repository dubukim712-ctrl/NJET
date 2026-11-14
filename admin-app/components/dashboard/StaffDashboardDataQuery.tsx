'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import type { StaffDashboardData } from '@/data/dashboard/queries';
import type { UserProfile } from '@/types/database';
import { StaffDashboardActivity } from './StaffDashboardActivity';
import { StaffDashboardOperations } from './StaffDashboardOperations';
import { DashboardMetrics } from './StaffDashboardWidgets';
import { StaffDashboardSkeleton } from './StaffDashboardSkeleton';

export function StaffDashboardDataQuery({
  profile,
  branchName,
  showInventoryBranch,
  quickActions,
  sections,
  data,
  isPending,
  isError,
  error,
  onRetry,
}: {
  profile: UserProfile;
  branchName: string | null;
  showInventoryBranch: boolean;
  quickActions: ReactNode;
  sections: {
    orders: boolean;
    jobs: boolean;
    inventory: boolean;
    team: boolean;
    isSales: boolean;
    isTechnician: boolean;
  };
  data: StaffDashboardData | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (!data && isPending) {
    return <StaffDashboardSkeleton quickActions={quickActions} sections={sections} />;
  }

  if (!data) {
    return (
      <>
        {quickActions}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
          <p className="text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : 'Dashboard data could not be loaded.'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardMetrics
        profile={profile}
        data={data}
        selectedBranchName={branchName}
      />
      {quickActions}
      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          Dashboard data could not be refreshed. Showing the last loaded data.
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <StaffDashboardOperations
          data={data}
          showInventoryBranch={showInventoryBranch}
        />
        <StaffDashboardActivity data={data} />
      </div>
    </>
  );
}
