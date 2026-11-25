import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

export function isClosedStaffAppointment(status: ServiceAppointmentStatus) {
  return status === 'completed' || status === 'cancelled' || status === 'no_show';
}

export function sameAppointmentSlot(saved: string | null, next: string | null) {
  if (!saved || !next) return saved === next;
  return Date.parse(saved) === Date.parse(next);
}

export function requiresFutureAppointmentSlot(
  saved: string | null, next: string | null, status: ServiceAppointmentStatus, now: number,
) {
  return !isClosedStaffAppointment(status) && next !== null &&
    !sameAppointmentSlot(saved, next) && Date.parse(next) <= now;
}

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
});

export function formatStaffAppointmentDate(value: string) {
  return dateFormat.format(new Date(value));
}
