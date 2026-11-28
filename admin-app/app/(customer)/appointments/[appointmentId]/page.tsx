import { notFound } from 'next/navigation';
import { CustomerAppointmentDetailsView } from '@/components/dashboard/CustomerAppointmentDetailsView';
import { serviceAppointmentIdSchema } from '@/lib/validations/service-appointments';

export const metadata = { title: 'Appointment details' };

export default async function CustomerAppointmentDetailsPage({ params }: {
  params: Promise<{ appointmentId: string }>;
}) {
  if (!serviceAppointmentIdSchema.safeParse((await params).appointmentId).success) notFound();
  return <CustomerAppointmentDetailsView />;
}
