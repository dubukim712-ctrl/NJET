import assert from 'node:assert/strict';
import test from 'node:test';
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
