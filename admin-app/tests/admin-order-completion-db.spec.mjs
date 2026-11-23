import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const fixtureUrl = new URL('./fixtures/admin-order-completion.sql', import.meta.url);
const migrationUrl = new URL(
  '../supabase/migrations/20240101000060_order_completion_payment_capture.sql',
  import.meta.url,
);

test('completion RPC rejects unauthorized, invalid-state and invalid-payment mutations atomically', async (t) => {
  const database = new PGlite();
  t.after(() => database.close());
  await database.exec(await readFile(fixtureUrl, 'utf8'));
  await database.exec(await readFile(migrationUrl, 'utf8'));

  const actor = randomUUID();
  const branch = randomUUID();
  const pending = randomUUID();
  const confirmed = randomUUID();
  await database.query("select set_config('test.actor_id', $1, false)", [actor]);
  await database.query(
    "insert into public.orders (id, branch_id, status, total_minor) values ($1, $3, 'awaiting_confirmation', 10000), ($2, $3, 'confirmed', 10000)",
    [pending, confirmed, branch],
  );

  async function complete(orderId, amount, method, provider = null) {
    await database.exec('set role authenticated');
    try {
      return await database.query(
        'select public.complete_commerce_order_with_payment($1, $2, $3, $4, $5)',
        [orderId, amount, method, provider, null],
      );
    } finally {
      await database.exec('reset role');
    }
  }

  await database.query("select set_config('test.can_manage_orders', 'false', false)");
  await assert.rejects(() => complete(confirmed, 100, 'cash'), /not allowed to complete orders/);
  await database.query("select set_config('test.can_manage_orders', 'true', false)");
  await assert.rejects(() => complete(pending, 100, 'cash'), /cannot be completed with a store payment/);
  await assert.rejects(() => complete(confirmed, 100, 'online'), /Enter valid payment details/);
  await assert.rejects(() => complete(confirmed, 10001, 'cash'), /collection exceeds the order balance/);

  const before = await database.query('select id, status from public.orders');
  assert.deepEqual(new Map(before.rows.map(({ id, status }) => [id, status])), new Map([
    [pending, 'awaiting_confirmation'],
    [confirmed, 'confirmed'],
  ]));
  assert.deepEqual((await database.query('select order_id from public.order_payment_transactions')).rows, []);

  await complete(confirmed, 10000, 'cash');
  await assert.rejects(() => complete(confirmed, 10000, 'cash'), /cannot be completed with a store payment/);
  assert.deepEqual((await database.query(
    'select status from public.orders where id = $1', [confirmed],
  )).rows, [{ status: 'completed' }]);
  assert.deepEqual((await database.query(
    'select order_id, amount_minor, recorded_by from public.order_payment_transactions',
  )).rows, [{ order_id: confirmed, amount_minor: 10000, recorded_by: actor }]);
});
