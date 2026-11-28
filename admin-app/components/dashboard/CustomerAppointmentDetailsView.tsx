'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { SmartLink } from '@/components/ui/SmartLink';
import { WarrantySummary } from '@/components/appointments/WarrantySummary';
import { CustomerAppointmentCard } from '@/components/dashboard/CustomerServiceAppointments';
import { useCustomerSessionId } from '@/components/dashboard/CustomerSession';
import { customerAppointmentsOptions, useInvalidateServiceAppointmentsQuery } from '@/data/appointments/client';
import { appointmentDetailOptions } from '@/data/appointments/customer-views-client';
import { useCustomerServiceAppointmentsRealtime } from '@/components/realtime/useCustomerServiceAppointmentsRealtime';

export function CustomerAppointmentDetailsView() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const userId = useCustomerSessionId();
  const client = useQueryClient();
  const history = customerAppointmentsOptions(userId);
  const query = useQuery(appointmentDetailOptions(userId, appointmentId));
  const invalidate = useInvalidateServiceAppointmentsQuery();
  useCustomerServiceAppointmentsRealtime(userId, invalidate);

  useEffect(() => {
    if (!userId) return;
    const options = customerAppointmentsOptions(userId);
    if (!client.getQueryData(options.queryKey)) void client.prefetchQuery(options);
  }, [client, userId]);

  const preview = query.isPending
    ? client.getQueryData(history.queryKey)?.find(({ id }) => id === appointmentId)
    : undefined;
  const details = query.data;
  const appointment = userId ? details?.appointment ?? preview : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SmartLink href="/appointments" prefetch={true} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Back to appointments</SmartLink>
      <h1 className="text-3xl font-semibold tracking-tight">Appointment details</h1>
      {details?.warranty && <WarrantySummary details={details.warranty} inspectionConfirmed={appointment?.status === 'confirmed'} />}
      {details?.warrantyUnavailable && <p className="text-sm text-muted-foreground">Warranty assessment details could not be loaded.</p>}
      {details?.exchangeCompleted && (
        <Button asChild variant="outline" className="min-h-11">
          <a href={'/appointments/' + appointmentId + '/exchange-record'}>Download exchange record</a>
        </Button>
      )}
      {appointment && (
        <ul aria-label="Appointment details">
          <CustomerAppointmentCard appointment={appointment} defaultExpanded />
        </ul>
      )}
      {!appointment && query.isPending && userId && (
        <div role="status" aria-label="Loading appointment details" className="h-36 animate-pulse rounded-xl border bg-card" />
      )}
      {!appointment && (!query.isPending || !userId) && !query.isError && <p>This appointment is unavailable.</p>}
      {query.isError && (
        <div role="alert" className="space-y-2">
          <p>Appointment details could not be loaded.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
        </div>
      )}
    </div>
  );
}
