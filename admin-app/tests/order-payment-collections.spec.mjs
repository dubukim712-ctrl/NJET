import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { orderPaymentTransactionSchema } from '../lib/validations/order-sales-report.ts';

const orderId = '00000000-0000-4000-8000-000000000001';

test('manual payment validation accepts collections only', () => {
  const payment = {
    orderId, transactionType: 'collection', paymentMethod: 'cash',
    paymentProvider: null, amountMinor: 100, isDownpayment: false,
    reference: null, note: null,
  };
  assert.equal(orderPaymentTransactionSchema.safeParse(payment).success, true);
  assert.equal(orderPaymentTransactionSchema.safeParse({ ...payment, transactionType: 'refund' }).success, false);
});

test('the payment RPC rejects new refunds and counts historical refunds against collections', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '${orderId}'::uuid $$;
    create function public.current_user_has_permission(text) returns boolean language sql as $$ select true $$;
    create function public.current_user_can_access_branch(uuid) returns boolean language sql as $$ select true $$;
    create table public.orders (id uuid primary key, branch_id uuid, status text, payment_method text, total_minor integer);
    create table public.order_payment_transactions (
      id uuid primary key default gen_random_uuid(), order_id uuid, transaction_type text,
      payment_method text, payment_provider text, amount_minor integer, is_downpayment boolean,
      reference text, note text, recorded_by uuid
    );
    insert into public.orders values ('${orderId}', null, 'confirmed', 'cash', 1000);
    insert into public.order_payment_transactions (order_id, transaction_type, amount_minor)
      values ('${orderId}', 'collection', 900), ('${orderId}', 'refund', 200);
  `);
  const migration = new URL('../supabase/migrations/20240101000146_collection_only_payment_transactions.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  const record = (type, amount) => db.query(
    "select public.record_order_payment_transaction($1, $2, 'cash', null, $3, null, null, false)",
    [orderId, type, amount],
  );
  await assert.rejects(record('refund', 100), /Only collections can be recorded/);
  await assert.rejects(record('collection', 301), /cannot exceed the order total/);
  await record('collection', 300);
  const { rows } = await db.query(
    "select transaction_type, amount_minor from public.order_payment_transactions where transaction_type = 'refund'",
  );
  assert.deepEqual(rows, [{ transaction_type: 'refund', amount_minor: 200 }]);
});
