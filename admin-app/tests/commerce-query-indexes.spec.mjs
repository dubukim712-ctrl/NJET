import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const readMigration = (name) => readFile(new URL(name, migrations), 'utf8');

test('commerce index migration replaces the old cursor index and indexes both foreign keys', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await readFile(new URL('./fixtures/checkout-submissions.sql', import.meta.url), 'utf8'));
  await db.exec(`
    alter table public.orders add column created_at timestamptz not null default now();
    create table public.product_variants (id uuid primary key);
    create table public.order_items (
      order_id uuid not null references public.orders(id) on delete cascade,
      variant_id uuid not null references public.product_variants(id) on delete restrict,
      unique (order_id, variant_id)
    );
  `);
  const commerceSchema = await readMigration('20240101000009_commerce_schema.sql');
  const previousIndex = commerceSchema.match(/create index orders_customer_created_idx[^;]+;/i);
  assert.ok(previousIndex);
  await db.exec(previousIndex[0]);
  await db.exec(await readMigration('20240101000101_checkout_submissions.sql'));
  await db.exec(await readMigration('20240101000103_commerce_query_indexes.sql'));

  const { rows } = await db.query(`
    select indexname, indexdef from pg_indexes
    where schemaname = 'public' and indexname in (
      'orders_customer_created_idx', 'orders_customer_created_id_idx',
      'order_items_variant_id_idx', 'checkout_submissions_order_id_idx'
    )
    order by indexname
  `);
  assert.deepEqual(rows, [
    {
      indexname: 'checkout_submissions_order_id_idx',
      indexdef: 'CREATE INDEX checkout_submissions_order_id_idx ON public.checkout_submissions USING btree (order_id)',
    },
    {
      indexname: 'order_items_variant_id_idx',
      indexdef: 'CREATE INDEX order_items_variant_id_idx ON public.order_items USING btree (variant_id)',
    },
    {
      indexname: 'orders_customer_created_id_idx',
      indexdef: 'CREATE INDEX orders_customer_created_id_idx ON public.orders USING btree (customer_id, created_at DESC, id DESC)',
    },
  ]);
});
