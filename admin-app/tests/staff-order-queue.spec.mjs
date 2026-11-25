import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { getOrderNextStep, getOrderView } from '../lib/order-queue.ts';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/order-queue') {
      return nextResolve(new URL('../lib/order-queue.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { getCommerceOrders } = await import('../data/commerce/admin-orders.ts');
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
  assert.equal(getOrderView({ status: 'cancelled' }), 'all');
  assert.equal(getOrderView({ view: 'closed', status: '' }), 'closed');
  const order = { phone_verification_status: 'manual_pending', documents: [{ kind: 'payment_proof' }] };
  assert.equal(getOrderNextStep({ ...order, status: 'awaiting_payment' }), 'Awaiting payment proof');
  assert.equal(getOrderNextStep({ ...order, status: 'awaiting_confirmation' }), 'Verify phone');
  assert.equal(getOrderNextStep({ ...order, status: 'awaiting_confirmation', phone_verification_status: 'otp_verified' }), 'Review payment proof');
  assert.equal(getOrderNextStep({ ...order, status: 'confirmed' }), 'Ready to complete');
  assert.equal(getOrderNextStep({ ...order, status: 'expired' }), 'Payment window expired');
  assert.equal(getOrderNextStep({ ...order, status: 'cancelled' }), null);
});
