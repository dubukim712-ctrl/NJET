'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { useCallback } from 'react';
import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerServiceAppointmentBranchesAction,
  getCustomerServiceAppointmentsAction,
  getMyAssignedServiceAppointmentsAction,
  getStaffServiceAppointmentOptionsAction,
  getStaffServiceAppointmentsAction,
  getTechnicianOptionsAction,
} from '@/data/actions/service-appointments';
import {
  customerServiceAppointmentsQueryKey,
  myAssignedServiceAppointmentsQueryKey,
  serviceAppointmentsQueryKey,
  staffServiceAppointmentsQueryKey,
} from '@/data/appointments/query-keys';
import type { ServiceAppointmentFilters } from '@/lib/validations/service-appointments';

export class ServiceAppointmentsQueryError extends Error {}

export function useCustomerServiceAppointmentBranchesQuery(userId: string) {
  return useQuery(customerAppointmentBranchesOptions(userId));
}

export function customerAppointmentBranchesOptions(userId: string) {
  return queryOptions({
    queryKey: [...customerServiceAppointmentsQueryKey, 'branches', userId],
    queryFn: async () => {
      const result = await getCustomerServiceAppointmentBranchesAction();
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data.branches;
    },
    enabled: Boolean(userId),
    retry: false,
    staleTime: 60_000,
    gcTime: Infinity,
  });
}

export function useCustomerServiceAppointmentsQuery(userId: string) {
  return useQuery(customerAppointmentsOptions(userId));
}

export function customerAppointmentsOptions(userId: string) {
  return queryOptions({
    queryKey: [...customerServiceAppointmentsQueryKey, userId],
    queryFn: async () => {
      const result = await getCustomerServiceAppointmentsAction(userId);
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId),
    retry: false,
    staleTime: 15_000,
    gcTime: Infinity,
  });
}

export function useStaffServiceAppointmentsQuery(
  userId: string,
  filters: ServiceAppointmentFilters
) {
  const { branch_id, is_full_access } = useAdminProfile();
  return useQuery({
    queryKey: [...staffServiceAppointmentsQueryKey, userId, branch_id, is_full_access, filters],
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchInterval: filters.view && filters.view !== 'history' ? 60_000 : false,
    queryFn: async () => {
      const result = await getStaffServiceAppointmentsAction(filters);
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });
}

export function useMyAssignedServiceAppointmentsQuery(userId: string) {
  const { branch_id, is_full_access } = useAdminProfile();
  return useQuery({
    queryKey: [...myAssignedServiceAppointmentsQueryKey, userId, branch_id, is_full_access],
    refetchOnMount: 'always',
    queryFn: async () => {
      const result = await getMyAssignedServiceAppointmentsAction();
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId),
    retry: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });
}

export function useStaffServiceAppointmentOptionsQuery(userId: string) {
  return useQuery({
    queryKey: [...serviceAppointmentsQueryKey, 'options', userId],
    queryFn: async () => {
      const result = await getStaffServiceAppointmentOptionsAction();
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 60_000,
    gcTime: Infinity,
  });
}

export function useServiceTechnicianOptionsQuery(
  userId: string,
  branchId: string
) {
  return useQuery({
    queryKey: [...serviceAppointmentsQueryKey, 'technicians', userId, branchId],
    queryFn: async () => {
      const result = await getTechnicianOptionsAction(branchId);
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId && branchId),
    retry: false,
    staleTime: 60_000,
    gcTime: Infinity,
  });
}

export function useInvalidateServiceAppointmentsQuery() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: serviceAppointmentsQueryKey }),
    [queryClient]
  );
}
