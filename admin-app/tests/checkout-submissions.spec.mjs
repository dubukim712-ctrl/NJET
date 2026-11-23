import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const fixtureUrl = new URL('./fixtures/checkout-submissions.sql', import.meta.url);
const migrationUrl = new URL(
  '../supabase/migrations/20240101000101_checkout_submissions.sql',
  import.meta.url,
);

test('checkout returns the committed order after a lost response and creates a new order for a new submission', async (t) => {
  const database = new PGlite();
  t.after(() => database.close());
  await database.exec(await readFile(fixtureUrl, 'utf8'));
  await database.exec(await readFile(migrationUrl, 'utf8'));

  const customerId = randomUUID();
  const variantId = randomUUID();
  await database.query('insert into public.users (id) values ($1)', [customerId]);
  await database.query("select set_config('test.customer_id', $1, false)", [customerId]);

  const payload = {
    p_customer_name: 'Test Customer',
    p_contact_number: '09171234567',
    p_fulfillment: 'pickup',
    p_branch_id: randomUUID(),
    p_delivery_zone_id: null,
    p_address_line1: '123 Test Street',
    p_barangay: 'Test Barangay',
    p_city: 'Test City',
    p_province: 'Test Province',
    p_postal_code: null,
    p_payment_method: 'cash',
    p_payment_provider: null,
    p_payment_recipient_id: null,
    p_payment_reference: null,
    p_terms_version: '1',
    p_return_policy_version: '1',
    p_privacy_version: '1',
    p_terms_accepted: true,
    p_privacy_accepted: true,
    p_items: JSON.stringify([{ variant_id: variantId, quantity: 1 }]),
    p_documents: '[]',
    p_coupon_code: null,
  };

  async function submit(submissionId, checkoutPayload = payload) {
    const args = { ...checkoutPayload, p_submission_id: submissionId };
    const parameters = Object.keys(args).map((name, index) => `${name} => $${index + 1}`);
    await database.exec('set role authenticated');
    try {
      const { rows } = await database.query(
        `select public.create_commerce_order_with_discount(${parameters.join(', ')}) as order_id`,
        Object.values(args),
      );
      return rows[0].order_id;
    } finally {
      await database.exec('reset role');
    }
  }

  async function counts() {
    const { rows } = await database.query(`
      select (select count(*)::int from public.orders) as orders,
             (select count(*)::int from public.checkout_submissions) as submissions
    `);
    return rows[0];
  }

  const submissionId = randomUUID();
  let committedOrderId;
  const lostResponse = new Error('Simulated connection loss after commit');
  await assert.rejects(async () => {
    committedOrderId = await submit(submissionId);
    throw lostResponse;
  }, (error) => error === lostResponse);

  assert.ok(committedOrderId);
  assert.equal(await submit(submissionId), committedOrderId);
  assert.deepEqual(await counts(), { orders: 1, submissions: 1 });

  const newOrderId = await submit(randomUUID());
  assert.notEqual(newOrderId, committedOrderId);

  // The checkout hook generates a fresh submission ID when the payload changes.
  const changedOrderId = await submit(randomUUID(), {
    ...payload,
    p_items: JSON.stringify([{ variant_id: variantId, quantity: 2 }]),
  });
  assert.ok(![committedOrderId, newOrderId].includes(changedOrderId));

  const { rows } = await database.query('select items from public.orders where id = $1', [changedOrderId]);
  assert.deepEqual(rows[0].items, [{ variant_id: variantId, quantity: 2 }]);
  assert.deepEqual(await counts(), { orders: 3, submissions: 3 });
});
