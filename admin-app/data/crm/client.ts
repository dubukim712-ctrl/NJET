'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminCrmCustomer, getAdminCrmCustomers, getAdminCrmFollowUps } from '@/data/actions/admin-crm';
import type { getCrmQueueFilters } from '@/lib/crm-view';
import type { UserProfile } from '@/types/database';
import type { CrmCustomer } from '@/types/crm';

const crmKey = ['admin-crm'] as const;
function scope(profile: UserProfile) {
  return [...crmKey, profile.id, profile.branch_id, profile.is_full_access, [...profile.permissions].sort()];
}

export function useCrmCustomers(profile: UserProfile, search: string, page: number) {
  return useQuery({
    queryKey: [...scope(profile), 'directory', search, page],
    placeholderData: keepPreviousData,
    queryFn: () => getAdminCrmCustomers(profile.id, search, page),
    retry: false,
  });
}

export function useCrmFollowUps(profile: UserProfile, filters: ReturnType<typeof getCrmQueueFilters>) {
  return useQuery({
    queryKey: [...scope(profile), 'follow-ups', filters],
    placeholderData: keepPreviousData,
    queryFn: () => getAdminCrmFollowUps(profile.id, filters),
    retry: false,
  });
}

export function useCrmCustomer(profile: UserProfile, customerId: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...scope(profile), 'customer', customerId],
    queryFn: () => getAdminCrmCustomer(profile.id, customerId),
    retry: false,
  });
  const preview = query.isPending
    ? client.getQueriesData<CrmCustomer[]>({ queryKey: [...scope(profile), 'directory'] })
        .flatMap(([, customers]) => customers ?? []).find((customer) => customer.id === customerId)
    : undefined;
  return { query, preview };
}

export function useInvalidateCrm() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: crmKey });
}
