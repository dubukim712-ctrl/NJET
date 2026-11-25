import type { ServiceAppointmentStatus } from '@/types/commerce-tables';
import type { WarrantyDecision, WarrantyDetails } from '@/types/service-warranty';

export const warrantyDecisions: Record<WarrantyDecision, string> = {
  under_review: 'Under review',
  covered_repair: 'Covered repair',
  replacement_approved: 'Replacement approved',
  paid_repair: 'Paid repair offered',
  further_review: 'Needs further review',
};

export const warrantyTiming: Record<WarrantyDetails['timing'], string> = {
  needs_review: 'Handover or bike details need review',
  within_window: 'Reported within the standard window',
  after_window: 'Reported after the standard window',
};

const localDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' });
const manilaDateTime = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
});

export function formatWarrantyDate(date: string) {
  return localDate.format(new Date(date + 'T00:00:00Z'));
}

export function formatWarrantyTimestamp(timestamp: string) {
  return manilaDateTime.format(new Date(timestamp));
}

export function canStartStaffWarrantyReview(status: ServiceAppointmentStatus) {
  return status === 'in_service' || status === 'ready_for_pickup' || status === 'completed';
}
