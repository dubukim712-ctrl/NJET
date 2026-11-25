import assert from 'node:assert/strict';
import test from 'node:test';
import { compareTechnicianTasks, isPastConfirmedTask } from '../lib/technician-task-order.ts';

function task(id, status, day, updatedDay = day) {
  return {
    id, status,
    scheduled_at: '2026-11-' + day + 'T03:00:00Z',
    preferred_start_at: '2026-11-' + day + 'T03:00:00Z',
    updated_at: '2026-11-' + updatedDay + 'T04:00:00Z',
  };
}

test('in-service work comes first, confirmed slots sort chronologically, and recent completions come last', () => {
  const tasks = [
    task('new-completion', 'completed', 16, 25),
    task('late-confirmed', 'confirmed', 27),
    task('old-completion', 'completed', 20, 23),
    task('early-confirmed', 'confirmed', 25),
    task('started', 'in_service', 26),
  ];
  assert.deepEqual(tasks.sort(compareTechnicianTasks).map(({ id }) => id), [
    'started', 'early-confirmed', 'late-confirmed', 'new-completion', 'old-completion',
  ]);
});

test('only confirmed appointments with passed scheduled slots are flagged', () => {
  const confirmed = task('confirmed', 'confirmed', 25);
  const start = Date.parse(confirmed.scheduled_at);
  assert.equal(isPastConfirmedTask(confirmed, start), false);
  assert.equal(isPastConfirmedTask(confirmed, start + 1), true);
  assert.equal(isPastConfirmedTask({ ...confirmed, scheduled_at: null }, start + 1), false);
  assert.equal(isPastConfirmedTask({ ...confirmed, status: 'in_service' }, start + 1), false);
});
