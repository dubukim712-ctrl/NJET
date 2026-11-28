'use server';

import { requireCustomer } from '@/data/auth/guards';
import { getCustomerAppointmentDetail } from '@/data/appointments/customer-appointment-detail';
import { serviceAppointmentIdSchema } from '@/lib/validations/service-appointments';
import { formatSavedPhilippineMobileNumber } from '@/lib/phone-number';
import { resolveCheckoutAddress, savedAddressColumns } from '@/data/commerce/checkout-address';

export async function getCustomerAppointmentViewAction(appointmentId: string, customerId: string) {
  if (!serviceAppointmentIdSchema.safeParse(appointmentId).success) return null;
  const { supabase, user } = await requireCustomer('/appointments');
  if (user.id !== customerId) return null;

  const appointment = await getCustomerAppointmentDetail(supabase, appointmentId);
  if (!appointment) return null;

  const [{ data, error }, warranty] = await Promise.all([
    supabase.rpc('customer_service_appointment_cancellation_requests').eq('appointment_id', appointmentId).maybeSingle(),
    supabase.rpc('service_warranty_details', { p_appointment_id: appointmentId }).maybeSingle(),
  ]);
  const exchange = warranty.data?.replacement_handover_on
    ? await supabase.rpc('service_warranty_exchange_details', { p_appointment_id: appointmentId }).maybeSingle()
    : null;
  if (error) throw new Error('Appointment cancellation details could not be loaded.');

  return {
    appointment: { ...appointment, cancellation_request: data },
    warranty: warranty.data,
    warrantyUnavailable: Boolean(warranty.error),
    exchangeCompleted: Boolean(exchange?.data?.completed_at),
  };
}

export async function getCustomerAppointmentFormAction(customerId: string) {
  const { supabase, user } = await requireCustomer('/appointments/new');
  if (user.id !== customerId) throw new Error('Your session has changed.');
  const [contact, bikes] = await Promise.all([
    supabase.from('users').select(`phone_number, ${savedAddressColumns}`).eq('id', user.id).maybeSingle(),
    supabase.rpc('customer_recent_service_bikes'),
  ]);
  if (contact.error || bikes.error) throw new Error('Service form options could not be loaded.');
  return {
    initialPhoneNumber: formatSavedPhilippineMobileNumber(contact.data?.phone_number),
    initialAddress: resolveCheckoutAddress(contact.data),
    previousBikes: bikes.data ?? [],
  };
}
