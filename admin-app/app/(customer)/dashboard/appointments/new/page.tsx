import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CustomerServiceAppointmentForm } from '@/components/dashboard/CustomerServiceAppointmentForm';

export const metadata = { title: 'Book a service appointment' };

export default function NewCustomerAppointmentPage() {
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
      <CustomerServiceAppointmentForm />
    </div>
  );
}
