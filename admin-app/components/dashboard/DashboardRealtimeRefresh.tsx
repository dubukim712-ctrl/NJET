'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RealtimeTable } from '@/types/realtime';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';

export function DashboardRealtimeRefresh({
  branchId,
  tables,
}: {
  branchId: string | null;
  tables: RealtimeTable[];
}) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const connection = useRealtimeChanges(
    `admin-dashboard-${branchId ?? 'all'}`,
    tables,
    refresh
  );
  return <RealtimeStatus state={connection} />;
}
