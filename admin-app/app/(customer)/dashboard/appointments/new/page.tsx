import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CustomerServiceAppointmentForm } from '@/components/dashboard/CustomerServiceAppointmentForm';

import { formatSavedPhilippineMobileNumber } from '@/lib/phone-number';
import { requireCustomer } from '@/data/auth/guards';
import { resolveCheckoutAddress, savedAddressColumns } from '@/data/commerce/checkout-address';

export const metadata = { title: 'Book a service appointment' };

export default async function NewCustomerAppointmentPage() {
  const { supabase, user } = await requireCustomer('/dashboard/appointments/new');
  const [{ data: contact }, { data: previousBikes }] = await Promise.all([
    supabase.from('users').select(`phone_number, ${savedAddressColumns}`).eq('id', user.id).maybeSingle(),
    supabase.rpc('customer_recent_service_bikes'),
  ]);

  const phoneNumber = formatSavedPhilippineMobileNumber(contact?.phone_number);
  return (
    <div className="space-y-6">
      <Link href="/dashboard/appointments" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to appointments
      </Link>
      <header>
        <p className="text-sm font-medium text-primary">Service request</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Book an e-bike service</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a branch visit or request a home service. A staff member will confirm your appointment.
        </p>
      </header>
      <CustomerServiceAppointmentForm
        key={user.id}
        initialPhoneNumber={phoneNumber}
        previousBikes={previousBikes ?? []}
        initialAddress={resolveCheckoutAddress(contact)}
      />
    </div>
  );
}
