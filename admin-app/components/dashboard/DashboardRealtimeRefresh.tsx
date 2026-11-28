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
  tables,
}: {
  profile: UserProfile;
  tables: RealtimeTable[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => adminDashboardQueryKey(profile, null).slice(0, -1), [profile]);
  const refreshServerContext = tables.some((table) =>
    ['roles', 'users'].includes(table)
  );
  const refresh = useCallback((table?: RealtimeTable) => {
    void queryClient.invalidateQueries({ queryKey });
    if (refreshServerContext && (table === 'roles' || table === 'users')) router.refresh();
  }, [queryClient, queryKey, refreshServerContext, router]);
  const connection = useRealtimeChanges(
    `admin-dashboard-${profile.id}`,
    tables,
    refresh
  );
  return <RealtimeStatus state={connection} />;
}
