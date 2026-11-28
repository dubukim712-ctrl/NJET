import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { getOrderNextStep, getOrderView } from '../lib/order-queue.ts';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/reports/order-sales-dates') {
      return nextResolve(new URL('../lib/reports/order-sales-dates.ts', import.meta.url).href, context);
    }
    if (specifier === '@/lib/order-queue') {
      return nextResolve(new URL('../lib/order-queue.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { getCommerceOrders } = await import('../data/commerce/admin-orders.ts');
const { orderFiltersSchema } = await import('../lib/validations/order-filters.ts');
hooks.deregister();

test('needs-attention filters and prioritizes eligible orders before applying the row limit', async () => {
  const urls = [];
  const client = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url) => {
      const request = new URL(url);
      urls.push(request);
      return Response.json(request.pathname.endsWith('/branches') ? [{ id: 'branch-a', name: 'Main' }] : []);
    } },
  });

  const result = await getCommerceOrders(client, { q: 'NJET-000012', branch: 'branch-b', status: '' }, true, 'branch-a');
  assert.deepEqual(result.data, []);
  const orders = urls.find((url) => url.pathname.endsWith('/orders')).searchParams;
  assert.equal(orders.get('status'), 'in.(awaiting_confirmation,awaiting_payment)');
  assert.equal(orders.get('order'), 'status.asc,created_at.desc,id.desc');
  assert.equal(orders.get('branch_id'), 'eq.branch-a');
  assert.match(orders.get('or'), /contact_number\.ilike/);
  assert.equal(orders.get('limit'), '50');
});

test('queue retains direct status links and shows next steps only for applicable states', () => {
  assert.equal(getOrderView({ status: '' }), 'attention');
  assert.equal(getOrderView({ status: 'cancelled' }), 'attention');
  assert.equal(getOrderView({ view: 'history', status: '' }), 'history');
  const order = { phone_verification_status: 'manual_pending', documents: [{ kind: 'payment_proof' }] };
  assert.equal(getOrderNextStep({ ...order, status: 'awaiting_payment' }), 'Awaiting payment proof');
  assert.equal(getOrderNextStep({ ...order, status: 'awaiting_confirmation' }), 'Verify phone');
  assert.equal(getOrderNextStep({ ...order, status: 'awaiting_confirmation', phone_verification_status: 'otp_verified' }), 'Review payment proof');
  assert.equal(getOrderNextStep({ ...order, status: 'confirmed' }), 'Ready to complete');
  assert.equal(getOrderNextStep({ ...order, status: 'expired' }), 'Payment window expired');
  assert.equal(getOrderNextStep({ ...order, status: 'cancelled' }), null);
});

test('legacy all selects History and incompatible statuses are cleared', () => {
  assert.equal(orderFiltersSchema.parse({ view: 'all', status: 'expired' }).view, 'history');
  assert.equal(orderFiltersSchema.parse({ view: 'all', status: 'expired' }).status, 'expired');
  assert.equal(orderFiltersSchema.parse({ status: 'expired' }).view, 'attention');
  assert.equal(orderFiltersSchema.parse({ view: 'upcoming', status: 'expired' }).status, '');
});

test('Today uses Manila dates, Upcoming uses confirmed, and History keeps all dates', async () => {
  const requests = [];
  const client = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/orders')) requests.push(request.searchParams);
      return Response.json(request.pathname.endsWith('/branches') ? [{ id: 'branch-a', name: 'Main' }] : []);
    } },
  });
  for (const view of ['today', 'upcoming', 'history']) {
    const result = await getCommerceOrders(client, orderFiltersSchema.parse({ view }), true);
    assert.deepEqual(result.data, []);
  }
  const [today, upcoming, history] = requests;
  const [start, end] = today.getAll('created_at');
  assert.match(start, /^gte\..*T00:00:00\+08:00$/);
  assert.match(end, /^lt\..*T00:00:00\+08:00$/);
  assert.equal(Date.parse(end.slice(3)) - Date.parse(start.slice(4)), 86_400_000);
  assert.equal(today.has('status'), false);
  assert.equal(upcoming.get('status'), 'in.(confirmed)');
  assert.equal(history.has('status'), false);
  assert.equal(history.has('created_at'), false);
});
