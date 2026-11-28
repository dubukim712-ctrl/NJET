'use client';

import { queryOptions } from '@tanstack/react-query';
import { getCustomerAppointmentFormAction, getCustomerAppointmentViewAction } from '@/data/actions/customer-appointment-views';
import { customerServiceAppointmentsQueryKey } from '@/data/appointments/query-keys';

export function appointmentFormOptions(userId: string) {
  return queryOptions({
    queryKey: [...customerServiceAppointmentsQueryKey, 'form', userId],
    queryFn: () => getCustomerAppointmentFormAction(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: Infinity,
    retry: false,
  });
}

export function appointmentDetailOptions(userId: string, appointmentId: string) {
  return queryOptions({
    queryKey: [...customerServiceAppointmentsQueryKey, 'detail', userId, appointmentId],
    queryFn: () => getCustomerAppointmentViewAction(appointmentId, userId),
    enabled: Boolean(userId && appointmentId),
    staleTime: 15_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
}
