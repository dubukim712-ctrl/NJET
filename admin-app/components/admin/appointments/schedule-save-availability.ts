type ScheduleAvailability = {
  date: string;
  time: string;
  scheduleRequired: boolean;
  keepCurrentTime: boolean;
  checkingSlots: boolean;
  slotsFailed: boolean;
  availableTimes: readonly string[];
  emptySlotsReason: string;
};

export function getScheduleBlockingReason({
  date,
  time,
  scheduleRequired,
  keepCurrentTime,
  checkingSlots,
  slotsFailed,
  availableTimes,
  emptySlotsReason,
}: ScheduleAvailability): string | null {
  const changedSlot = Boolean(date && !keepCurrentTime);
  if (changedSlot && checkingSlots) return 'Wait for service times to finish loading before saving.';
  if (changedSlot && slotsFailed) return 'Service times could not be verified. Retry the availability check before saving.';
  if (changedSlot && !availableTimes.length) return emptySlotsReason;
  if (Boolean(date) !== Boolean(time) || (scheduleRequired && (!date || !time))) {
    return 'Choose both a scheduled date and time before saving.';
  }
  if (changedSlot && !availableTimes.includes(time)) {
    return 'The selected time is no longer available. Choose another time before saving.';
  }
  return null;
}
