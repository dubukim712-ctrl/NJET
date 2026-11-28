import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { CustomerServiceAppointments } from '@/components/dashboard/CustomerServiceAppointments';
import { Button } from '@/components/ui/Button';


export function CustomerAppointmentsView() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Your service history</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-2 text-sm text-muted-foreground">Track e-bike maintenance and repair requests.</p>
        </div>
        <Button asChild><Link href="/appointments/new" prefetch={true}><CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />Book service</Link></Button>
      </header>
      <CustomerServiceAppointments />
    </div>
  );
}
