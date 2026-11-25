import assert from 'node:assert/strict';
import test from 'node:test';
import { isClosedStaffAppointment, requiresFutureAppointmentSlot } from '../lib/staff-appointment-editing.ts';
import { getScheduleBlockingReason } from '../components/admin/appointments/schedule-save-availability.ts';

const available = {
  date: '2026-11-25',
  time: '09:30',
  scheduleRequired: true,
  keepCurrentTime: false,
  checkingSlots: false,
  slotsFailed: false,
  availableTimes: ['09:30'],
  emptySlotsReason: 'No service slots are available on this date.',
};

test('a changed appointment time cannot be saved until availability confirms the slot', () => {
  assert.match(getScheduleBlockingReason({ ...available, checkingSlots: true }), /finish loading/);
  assert.match(getScheduleBlockingReason({ ...available, slotsFailed: true }), /Retry/);
  assert.match(getScheduleBlockingReason({ ...available, availableTimes: ['10:00'] }), /no longer available/);
  assert.equal(getScheduleBlockingReason({ ...available, availableTimes: [] }), available.emptySlotsReason);
  assert.equal(getScheduleBlockingReason(available), null);
});

test('a persisted appointment time can be kept without a successful availability lookup', () => {
  for (const flags of [{ checkingSlots: true }, { slotsFailed: true }]) {
    assert.equal(getScheduleBlockingReason({
      ...available,
      ...flags,
      keepCurrentTime: true,
      availableTimes: [],
    }), null);
  }
});

test('unscheduled requests may stay unscheduled but still require complete date and time pairs', () => {
  assert.equal(getScheduleBlockingReason({
    ...available,
    date: '',
    time: '',
    scheduleRequired: false,
    checkingSlots: true,
  }), null);
  assert.match(getScheduleBlockingReason({ ...available, time: '' }), /both a scheduled date and time/);
});

test('only a newly chosen past slot blocks active appointment updates', () => {
  const saved = '2026-11-25T03:00:00Z';
  const newPastSlot = '2026-11-25T11:30:00+08:00';
  const futureSlot = '2026-11-26T11:00:00+08:00';
  const now = Date.parse('2026-11-25T05:00:00Z');
  assert.equal(requiresFutureAppointmentSlot(saved, '2026-11-25T11:00:00+08:00', 'in_service', now), false);
  assert.equal(requiresFutureAppointmentSlot(saved, newPastSlot, 'confirmed', now), true);
  assert.equal(requiresFutureAppointmentSlot(null, newPastSlot, 'confirmed', now), true);
  assert.equal(requiresFutureAppointmentSlot(saved, futureSlot, 'confirmed', now), false);
});

test('completed, cancelled and no-show records are treated as closed', () => {
  for (const status of ['completed', 'cancelled', 'no_show']) assert.equal(isClosedStaffAppointment(status), true);
  for (const status of ['requested', 'confirmed', 'in_service', 'ready_for_pickup']) assert.equal(isClosedStaffAppointment(status), false);
});
