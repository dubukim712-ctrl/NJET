import { CustomerServiceAppointmentFormSkeleton } from '@/components/dashboard/CustomerServiceAppointmentFormSkeleton';

export default function NewCustomerAppointmentLoading() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <header className="space-y-2" aria-hidden="true">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-3xl animate-pulse rounded bg-muted" />
      </header>
      <CustomerServiceAppointmentFormSkeleton />
    </div>
  );
}
