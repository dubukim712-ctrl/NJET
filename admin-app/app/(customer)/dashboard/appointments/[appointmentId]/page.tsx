import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerAppointmentCard } from '@/components/dashboard/CustomerServiceAppointments';
import { getCustomerAppointmentDetail } from '@/data/appointments/customer-appointment-detail';
import { requireCustomer } from '@/data/auth/guards';
import { serviceAppointmentIdSchema } from '@/lib/validations/service-appointments';

export const metadata = { title: 'Appointment details' };

export default async function CustomerAppointmentDetailsPage({ params }: {
  params: Promise<{ appointmentId: string }>;
}) {
  const id = serviceAppointmentIdSchema.safeParse((await params).appointmentId);
  if (!id.success) notFound();
  const { supabase } = await requireCustomer(`/dashboard/appointments/${id.data}`);
  const appointment = await getCustomerAppointmentDetail(supabase, id.data);
  if (!appointment) notFound();

  const { data, error } = await supabase.rpc('customer_service_appointment_cancellation_requests')
    .eq('appointment_id', id.data).maybeSingle();
  if (error) throw new Error('Appointment cancellation details could not be loaded.');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard/appointments" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Back to appointments</Link>
      <h1 className="text-3xl font-semibold tracking-tight">Appointment details</h1>
      <ul aria-label="Appointment details">
        <CustomerAppointmentCard appointment={{ ...appointment, cancellation_request: data }} defaultExpanded />
      </ul>
    </div>
  );
}
