export const serviceAppointmentsQueryKey = ['service-appointments'] as const;
export const customerServiceAppointmentsQueryKey = [
  ...serviceAppointmentsQueryKey,
  'customer',
] as const;
export const staffServiceAppointmentsQueryKey = [
  ...serviceAppointmentsQueryKey,
  'staff',
] as const;
export const customerServiceAvailabilityQueryKey = [
  ...customerServiceAppointmentsQueryKey,
  'availability',
] as const;
