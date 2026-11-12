'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { adminDashboardQueryKey } from '@/data/dashboard/admin-dashboard-client';
import type { UserProfile } from '@/types/database';
import type { RealtimeTable } from '@/types/realtime';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';

export function DashboardRealtimeRefresh({
  profile,
  branchId,
  requestedBranchId,
  tables,
}: {
  profile: UserProfile;
  branchId: string | null;
  requestedBranchId: string | null;
  tables: RealtimeTable[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => adminDashboardQueryKey(profile, requestedBranchId),
    [
      profile,
      requestedBranchId,
    ]
  );
  const refreshServerContext = tables.some((table) =>
    ['branches', 'roles', 'users'].includes(table)
  );
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
    if (refreshServerContext) router.refresh();
  }, [queryClient, queryKey, refreshServerContext, router]);
  const connection = useRealtimeChanges(
    `admin-dashboard-${profile.id}-${branchId ?? 'all'}`,
    tables,
    refresh
  );
  return <RealtimeStatus state={connection} />;
}
