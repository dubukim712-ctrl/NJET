import type { ReactNode } from 'react';
import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';
import { formatPhp } from '@/lib/commerce';
import type { StaffServiceAppointment } from '@/data/appointments/queries';
import { formatStaffAppointmentDate, sameAppointmentSlot } from '@/lib/staff-appointment-editing';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

export function StaffAppointmentDetails({ appointment }: { appointment: StaffServiceAppointment }) {
  const address = [appointment.address_line1, appointment.barangay, appointment.city, appointment.province, appointment.postal_code]
    .filter(Boolean).join(', ');
  const showRequested = !sameAppointmentSlot(appointment.preferred_start_at, appointment.scheduled_at);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">Customer &amp; bike</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Contact number">{appointment.contact_number}</Fact>
          <Fact label="Bike">{formatAppointmentBikeName(appointment.bike_make, appointment.bike_model)}</Fact>
          {appointment.bike_serial_number && <Fact label="Serial number">{appointment.bike_serial_number}</Fact>}
          <Fact label="Visit type">{appointment.service_mode === 'home_service' ? 'Home service' : 'Branch visit'}</Fact>
          {address && <Fact label="Home address">{address}</Fact>}
        </dl>
      </section>
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">Schedule &amp; technician</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Branch">{appointment.branch_name}</Fact>
          <Fact label="Technician">{appointment.assigned_technician_name ?? 'Unassigned'}</Fact>
          <Fact label="Scheduled time (Philippine time)">{appointment.scheduled_at ? (
            <time dateTime={appointment.scheduled_at}>{formatStaffAppointmentDate(appointment.scheduled_at)}</time>
          ) : 'Not scheduled'}</Fact>
          {showRequested && (
            <Fact label="Requested time (Philippine time)">
              <time dateTime={appointment.preferred_start_at}>{formatStaffAppointmentDate(appointment.preferred_start_at)}</time>
            </Fact>
          )}
        </dl>
      </section>
      <section className="space-y-3 rounded-lg border p-4 lg:col-span-2">
        <h3 className="font-semibold">Service &amp; costs</h3>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Fact label="Service type"><span className="capitalize">{appointment.service_type}</span></Fact>
          <Fact label="Estimate">{appointment.estimate_minor === null ? 'Not recorded' : formatPhp(appointment.estimate_minor)}</Fact>
          <Fact label="Final total">{appointment.final_total_minor === null ? 'Not recorded' : formatPhp(appointment.final_total_minor)}</Fact>
        </dl>
        <p className="whitespace-pre-wrap break-words text-sm">{appointment.issue_description}</p>
      </section>
    </div>
  );
}
