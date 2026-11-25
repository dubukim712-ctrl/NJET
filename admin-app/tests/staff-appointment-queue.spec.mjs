import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { getStaffServiceAppointments } from '../data/appointments/queries.ts';

async function captureQueueQuery(view, { canManage = true, search = '' } = {}) {
  const urls = [];
  const client = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url) => {
      urls.push(new URL(url));
      return Response.json([]);
    } },
  });
  assert.deepEqual(await getStaffServiceAppointments(client, {
    view, status: '', branchId: '', date: '', search,
  }, canManage), { data: [], error: null });
  assert.equal(urls.length, 1);
  return urls[0].searchParams;
}

test('attention combines the queue and search predicates before applying the row limit', async () => {
  const params = await captureQueueQuery('attention', { search: 'SVC-000004' });
  assert.equal(params.get('limit'), '100');
  assert.equal(params.get('pending_cancellations.status'), 'eq.pending');
  assert.match(params.get('select'), /pending_cancellations:service_appointment_cancellation_requests\(\)/);
  assert.match(params.get('or'), /and\(or\(status\.eq\.requested,and\(status\.eq\.confirmed,scheduled_at\.lt\./);
  assert.match(params.get('or'), /pending_cancellations\.not\.is\.null\),or\(appointment_number\.ilike\.%SVC-000004%/);
  const readOnly = await captureQueueQuery('attention', { canManage: false });
  assert.doesNotMatch(readOnly.get('or'), /pending_cancellations/);
});

test('today and upcoming divide scheduled work at midnight in Philippine time', async () => {
  const today = await captureQueueQuery('today');
  const [start, end] = today.getAll('scheduled_at');
  assert.match(start, /^gte\..*T16:00:00\.000Z$/);
  assert.match(end, /^lt\..*T16:00:00\.000Z$/);
  assert.equal(Date.parse(end.slice(3)) - Date.parse(start.slice(4)), 86_400_000);
  assert.equal(today.get('status'), 'in.(confirmed,in_service,ready_for_pickup)');

  const upcoming = await captureQueueQuery('upcoming');
  assert.match(upcoming.get('scheduled_at'), /^gte\..*T16:00:00\.000Z$/);

  const history = await captureQueueQuery('history');
  assert.equal(history.get('status'), 'in.(completed,cancelled,no_show)');
  assert.match(history.get('order'), /^scheduled_at\.desc/);
});
