import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { CustomerConfirmationCard } from '@/components/dashboard/CustomerConfirmationCard';
import { Button } from '@/components/ui/Button';
import { getCustomerAppointmentDetail } from '@/data/appointments/customer-appointment-detail';
import { requireCustomer } from '@/data/auth/guards';
import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';
import { appointmentConfirmationPath, formatConfirmationSlot } from '@/lib/customer-confirmation';
import { serviceAppointmentIdSchema } from '@/lib/validations/service-appointments';

export const metadata = { title: 'Appointment request submitted' };

export default async function AppointmentSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string | string[] }>;
}) {
  const id = serviceAppointmentIdSchema.safeParse((await searchParams).appointmentId);
  if (!id.success) notFound();
  const { supabase } = await requireCustomer(appointmentConfirmationPath(id.data));
  const appointment = await getCustomerAppointmentDetail(supabase, id.data);
  if (!appointment) notFound();

  return (
    <CustomerConfirmationCard
      title="Appointment request submitted"
      reference={appointment.appointment_number}
      status={<ServiceAppointmentStatusBadge status={appointment.status} />}
      actions={
        <>
          <Button asChild className="min-h-11"><Link href={`/dashboard/appointments/${id.data}`}>View appointment details</Link></Button>
          <Button asChild variant="outline" className="min-h-11"><Link href="/dashboard/appointments">Back to appointments</Link></Button>
          <Button asChild variant="outline" className="min-h-11"><Link href="/dashboard/appointments/new">Book another service</Link></Button>
        </>
      }
    >
      <dl className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Service branch</dt><dd>{appointment.branch_name}</dd></div>
        <div>
          <dt className="text-muted-foreground">{appointment.scheduled_at ? 'Scheduled slot' : 'Preferred slot'}</dt>
          <dd>{formatConfirmationSlot(appointment.scheduled_at ?? appointment.preferred_start_at)} (Philippine time)</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Service</dt>
          <dd><span className="capitalize">{appointment.service_type}</span> &middot; {appointment.service_mode === 'home_service' ? 'Home service' : 'Branch visit'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">E-bike</dt>
          <dd className="break-words">{formatAppointmentBikeName(appointment.bike_make, appointment.bike_model)}</dd>
          {appointment.bike_serial_number && <dd className="break-words">Serial: {appointment.bike_serial_number}</dd>}
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        {appointment.status === 'requested'
          ? 'Staff will review your request and confirm the date and time. Your preferred slot is tentative.'
          : 'Open appointment details to check the current status and schedule.'}
      </p>
    </CustomerConfirmationCard>
  );
}
