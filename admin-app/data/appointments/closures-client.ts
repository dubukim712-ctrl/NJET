'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServiceAppointmentClosuresAction } from '@/data/actions/service-appointment-closures';
import { ServiceAppointmentsQueryError } from '@/data/appointments/client';
import { serviceAppointmentsQueryKey } from '@/data/appointments/query-keys';

export const serviceAppointmentClosuresQueryKey = [
  ...serviceAppointmentsQueryKey,
  'closures',
] as const;

export function useServiceAppointmentClosuresQuery(
  userId: string,
  branchId: string
) {
  return useQuery({
    queryKey: [...serviceAppointmentClosuresQueryKey, userId, branchId],
    queryFn: async () => {
      const result = await getServiceAppointmentClosuresAction({ branchId });
      if (!result.success) throw new ServiceAppointmentsQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId && branchId),
    retry: false,
    staleTime: 15_000,
  });
}

export function useInvalidateServiceAppointmentClosuresQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: serviceAppointmentClosuresQueryKey });
}
