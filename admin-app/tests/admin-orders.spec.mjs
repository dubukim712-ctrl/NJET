import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { actionContext } from './helpers/admin-action-test.mjs';

const { getCommerceOrdersAction } = await import('../data/actions/commerce-orders.ts');
const { completeCommerceOrderWithPaymentAction } = await import('../data/actions/commerce-order-completion.ts');

test('customer cannot read staff orders or complete an order', async () => {
  const context = actionContext({ scope: 'customer', permissions: ['storefront.access'] });
  await context.run(async () => {
    const denial = { destination: '/?error=insufficient_permissions' };
    await assert.rejects(() => getCommerceOrdersAction({ q: '', status: '', branch: '' }), denial);
    await assert.rejects(() => completeCommerceOrderWithPaymentAction({ orderId: randomUUID() }), denial);
  });
  assert.deepEqual(context.calls, []);
});

test('read-only staff cannot complete orders', async () => {
  const context = actionContext({ scope: 'staff', permissions: ['admin.access', 'orders.read'] });
  await assert.rejects(
    () => context.run(() => completeCommerceOrderWithPaymentAction({ orderId: randomUUID() })),
    { destination: '/admin?error=insufficient_permissions' },
  );
  assert.deepEqual(context.calls, []);
});

test('completion rejects inconsistent payment details before invoking the RPC', async () => {
  const context = actionContext({ scope: 'staff', permissions: ['admin.access', 'orders.manage'] });
  const validPayment = {
    orderId: randomUUID(),
    amountMinor: 100,
    paymentMethod: 'cash',
    paymentProvider: null,
    reference: null,
  };

  for (const [changes, field] of [
    [{ amountMinor: -1 }, 'amountMinor'],
    [{ paymentMethod: null }, 'paymentMethod'],
    [{ paymentMethod: 'online' }, 'paymentProvider'],
    [{ paymentProvider: 'gcash' }, 'paymentProvider'],
    [{ amountMinor: 0 }, null],
  ]) {
    const result = await context.run(() => completeCommerceOrderWithPaymentAction({
      ...validPayment,
      ...changes,
    }));
    assert.equal(result.success, false);
    assert.equal(result.error, 'Review the payment details.');
    if (field) assert.ok(result.fieldErrors[field]?.length, 'Expected an error on ' + field);
  }
  assert.deepEqual(context.calls, []);
});

test('completion sends validated payment details to the RPC', async () => {
  const context = actionContext(
    { scope: 'staff', permissions: ['admin.access', 'orders.manage'] },
    { rpc: () => ({ error: null }) },
  );
  const orderId = randomUUID();
  const result = await context.run(() => completeCommerceOrderWithPaymentAction({
    orderId,
    amountMinor: 1250,
    paymentMethod: 'online',
    paymentProvider: 'gcash',
    reference: ' TEST-123 ',
  }));
  assert.equal(result.success, true);
  assert.deepEqual(context.calls, [{
    name: 'complete_commerce_order_with_payment',
    args: {
      p_order_id: orderId,
      p_amount_minor: 1250,
      p_payment_method: 'online',
      p_payment_provider: 'gcash',
      p_reference: 'TEST-123',
    },
  }]);
});
