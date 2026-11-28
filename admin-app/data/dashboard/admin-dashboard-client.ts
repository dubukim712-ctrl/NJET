'use client';

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { getStaffDashboardDataAction } from '@/data/actions/admin-dashboard';
import type { UserProfile } from '@/types/database';

type DashboardProfile = Pick<
  UserProfile,
  'id' | 'role_id' | 'scope' | 'is_full_access' | 'branch_id' | 'permissions'
>;

export function adminDashboardQueryKey(
  profile: DashboardProfile,
  requestedBranchId: string | null
) {
  return [
    'admin-dashboard',
    profile.id,
    profile.role_id,
    profile.scope,
    profile.is_full_access,
    profile.branch_id,
    JSON.stringify(profile.permissions),
    requestedBranchId === 'all' ? null : requestedBranchId,
  ] as const;
}

export function adminDashboardOptions(
  profile: DashboardProfile,
  requestedBranchId: string | null
) {
  return queryOptions({
    queryKey: adminDashboardQueryKey(profile, requestedBranchId),
    queryFn: async () => {
      const result = await getStaffDashboardDataAction(requestedBranchId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    refetchOnMount: 'always',
    staleTime: 30_000,
    gcTime: 30 * 60_000,
  });
}

export function useAdminDashboardQuery(profile: DashboardProfile, requestedBranchId: string | null) {
  return useQuery({ ...adminDashboardOptions(profile, requestedBranchId), placeholderData: keepPreviousData });
}
