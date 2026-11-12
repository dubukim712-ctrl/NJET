import { CustomerServiceAppointmentsSkeleton } from '@/components/dashboard/CustomerServiceAppointmentsSkeleton';

export default function CustomerAppointmentsLoading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2" aria-hidden="true">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-9 w-56 animate-pulse rounded bg-muted" />
          <div className="h-5 w-full max-w-sm animate-pulse rounded bg-muted" />
        </div>
        <div className="h-11 w-36 animate-pulse rounded-md bg-muted" />
      </header>
      <CustomerServiceAppointmentsSkeleton />
    </div>
  );
}
