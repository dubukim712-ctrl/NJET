'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerServiceAppointmentBranchesAction,
  getCustomerServiceAppointmentsAction,
  getStaffServiceAppointmentOptionsAction,
  getStaffServiceAppointmentsAction,
  getTechnicianOptionsAction,
} from '@/data/actions/service-appointments';
import {
  customerServiceAppointmentsQueryKey,
  serviceAppointmentsQueryKey,
  staffServiceAppointmentsQueryKey,
} from '@/data/appointments/query-keys';
import type { ServiceAppointmentFilters } from '@/lib/validations/service-appointments';

export class ServiceAppointmentsQueryError extends Error {}

export function useCustomerServiceAppointmentBranchesQuery(userId: string) {
  return useQuery({
    queryKey: [...customerServiceAppointmentsQueryKey, 'branches', userId],
    queryFn: async () => {
      const result = await getCustomerServiceAppointmentBranchesAction();
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data.branches;
    },
    retry: false,
    staleTime: 60_000,
    gcTime: Infinity,
  });
}

export function useCustomerServiceAppointmentsQuery(userId: string) {
  return useQuery({
    queryKey: [...customerServiceAppointmentsQueryKey, userId],
    queryFn: async () => {
      const result = await getCustomerServiceAppointmentsAction();
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    gcTime: Infinity,
  });
}

export function useStaffServiceAppointmentsQuery(
  userId: string,
  filters: ServiceAppointmentFilters
) {
  return useQuery({
    queryKey: [...staffServiceAppointmentsQueryKey, userId, filters],
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
