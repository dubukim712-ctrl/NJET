'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getCustomerServiceAppointmentAvailabilityAction,
  getCustomerServiceAppointmentSlotsAction,
} from '@/data/actions/service-availability';
import { ServiceAppointmentsQueryError } from '@/data/appointments/client';
import { customerServiceAvailabilityQueryKey } from '@/data/appointments/query-keys';

export function useCustomerServiceAppointmentSlotsQuery(
  userId: string,
  branchId: string,
  date: string
) {
  return useQuery({
    queryKey: [
      ...customerServiceAvailabilityQueryKey,
      'slots',
      userId,
      branchId,
      date,
    ],
    queryFn: async () => {
      const result = await getCustomerServiceAppointmentSlotsAction({ branchId, date });
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId && branchId && date),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCustomerServiceAppointmentAvailabilityQuery(
  userId: string,
  branchId: string,
  slotStart: string
) {
  return useQuery({
    queryKey: [
      ...customerServiceAvailabilityQueryKey,
      userId,
      branchId,
      slotStart,
    ],
    queryFn: async () => {
      const result = await getCustomerServiceAppointmentAvailabilityAction({
        branchId,
        slotStart,
      });
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId && branchId && slotStart),
    retry: false,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
