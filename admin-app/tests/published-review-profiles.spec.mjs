import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('published review cards redact anonymous identities at the database boundary', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create table public.users (id uuid primary key, full_name text, avatar_url text);
    create table public.order_items (id uuid primary key, variant_name text);
    create table public.product_reviews (
      id uuid primary key, rating smallint, comment text, created_at timestamptz default now(),
      customer_id uuid, product_id uuid, order_item_id uuid, is_anonymous boolean, status text
    );
    create function public.published_product_reviews(uuid, integer, integer) returns integer
    language sql as $$ select 1 $$;

    insert into public.users values (
      '00000000-0000-4000-8000-000000000001', 'Jerico Andrei', 'https://example.test/avatar.png'
    );
    insert into public.order_items values ('00000000-0000-4000-8000-000000000002', 'Red');
    insert into public.product_reviews (id, rating, customer_id, product_id, order_item_id, is_anonymous, status)
    select gen_random_uuid(), 5, u.id, '00000000-0000-4000-8000-000000000003', i.id, v.anonymous, v.status
    from public.users u cross join public.order_items i
    cross join (values (true, 'published'), (false, 'published'), (false, 'pending')) v(anonymous, status);
  `);
  const migration = new URL('../supabase/migrations/20240101000109_published_review_profiles.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  await db.exec('set role anon');
  const { rows } = await db.query(`
    select reviewer_name, reviewer_avatar_url, is_anonymous, variant_name
    from public.published_product_reviews('00000000-0000-4000-8000-000000000003', 10, 0)
    order by is_anonymous
  `);
  assert.deepEqual(rows, [
    { reviewer_name: 'Jerico Andrei', reviewer_avatar_url: 'https://example.test/avatar.png', is_anonymous: false, variant_name: 'Red' },
    { reviewer_name: null, reviewer_avatar_url: null, is_anonymous: true, variant_name: 'Red' },
  ]);
});
