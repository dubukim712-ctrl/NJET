import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/technician-task-order') {
      return nextResolve(new URL('../lib/technician-task-order.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { getStaffServiceAppointments } = await import('../data/appointments/queries.ts');
hooks.deregister();

async function captureQueueQuery(view, { canManage = true, search = '', assignedTask } = {}) {
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
  }, canManage, assignedTask), { data: [], error: null });
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

test('assigned active work and recent completions use separate bounded queries', async () => {
  const technicianId = '00000000-0000-4000-8000-000000000001';
  const active = await captureQueueQuery(undefined, { assignedTask: { technicianId, group: 'active' } });
  assert.equal(active.get('assigned_technician_id'), 'eq.' + technicianId);
  assert.equal(active.get('status'), 'in.(requested,confirmed,in_service,ready_for_pickup)');
  assert.equal(active.get('limit'), '100');

  const completed = await captureQueueQuery(undefined, { assignedTask: { technicianId, group: 'completed' } });
  assert.equal(completed.get('assigned_technician_id'), 'eq.' + technicianId);
  assert.equal(completed.get('status'), 'eq.completed');
  assert.match(completed.get('updated_at'), /^gte\./);
  assert.match(completed.get('order'), /^updated_at.desc/);
  assert.equal(completed.get('limit'), '100');
});
