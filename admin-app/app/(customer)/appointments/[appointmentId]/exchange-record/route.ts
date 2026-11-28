import { requireCustomer } from '@/data/auth/guards';
import { getCustomerAppointmentDetail } from '@/data/appointments/customer-appointment-detail';
import { formatWarrantyDate } from '@/lib/service-warranty';
import { serviceAppointmentIdSchema } from '@/lib/validations/service-appointments';

export async function GET(_request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const id = serviceAppointmentIdSchema.safeParse((await params).appointmentId);
  if (!id.success) return new Response(null, { status: 404 });

  const { supabase } = await requireCustomer(`/appointments/${id.data}`);
  const appointment = await getCustomerAppointmentDetail(supabase, id.data);
  if (!appointment) return new Response(null, { status: 404 });

  const { data, error } = await supabase.rpc('service_warranty_exchange_details', { p_appointment_id: id.data }).maybeSingle();
  if (error) return new Response('Could not load the warranty exchange record.', { status: 500 });
  if (!data?.completed_at || !data.replacement_serial || !data.replacement_handover_on) {
    return new Response(null, { status: 404 });
  }

  const record = [
    'NJET Warranty Exchange Record',
    '',
    `Service reference: ${data.appointment_number}`,
    `Original order: ${data.order_number}`,
    `Customer: ${data.customer_name}`,
    `Branch: ${data.branch_name}`,
    `Product: ${data.product_name}`,
    `Original serial: ${data.original_serial}`,
    `Replacement serial: ${data.replacement_serial}`,
    `Replacement handover date: ${formatWarrantyDate(data.replacement_handover_on)} (Philippine time)`,
    '',
    'This record links the replacement unit to your original purchase.',
  ].join('\n');

  return new Response(record, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="warranty-exchange-${id.data}.txt"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
