import type { createClient } from '@/data/supabase/server';

export async function getCustomerAppointmentDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
) {
  const { data, error } = await supabase.rpc('customer_service_appointment_detail', {
    p_appointment_id: appointmentId,
  }).maybeSingle();
  if (error) throw new Error('Appointment details could not be loaded.');
  return data;
}
