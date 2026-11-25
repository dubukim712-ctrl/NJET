import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { TERMS_VERSION, RETURN_POLICY_VERSION, PRIVACY_VERSION } from '../lib/commerce.ts';

test('checkout accepts bundled policy versions and requires a newer published return policy', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select '00000000-0000-4000-8000-000000000001'::uuid
    $$;
    create function public.current_user_has_permission(text) returns boolean language sql stable as $$ select true $$;
    create table public.users (id uuid primary key);
    insert into public.users values (auth.uid());
    create table public.storefront_legal_policy_versions (id bigint, slug text, version text);
    create table public.orders (id uuid primary key, terms_version text, return_policy_version text, privacy_version text, discounts_applied boolean);
    create function public.create_commerce_order(
      text, text, text, uuid, uuid, text, text, text, text, text, text, text, text, text, text,
      boolean, boolean, jsonb, jsonb
    ) returns uuid language sql as $$
      insert into public.orders (id) values (gen_random_uuid()) returning id
    $$;
    create function public.apply_product_discounts_to_order(uuid, text, text, text)
      returns void language sql as $$ update public.orders set discounts_applied = true where id = $1 $$;
  `);
  const migration = (filename) => readFile(new URL('../supabase/migrations/' + filename, import.meta.url), 'utf8');
  const initial = await migration('20240101000076_editable_storefront_legal_policies.sql');
  await db.exec(initial.slice(initial.indexOf('create function public.create_commerce_order_with_recipient('),
    initial.indexOf('revoke all on function public.create_commerce_order_with_recipient(')));
  await db.exec(await migration('20240101000089_discounted_storefront_orders.sql'));
  await db.exec(await migration('20240101000101_checkout_submissions.sql'));
  await db.exec(await migration('20240101000135_checkout_return_policy_default.sql'));

  const args = `
    'Test customer', '09123456789', 'pickup', null, null, null, null, null, null, null,
    'cash', null, null, null, $1, $2, $3, true, true, '[]', '[]'
  `;
  const checkout = (version) => db.query(
    `select public.create_commerce_order_with_discount(${args}, null, gen_random_uuid()) as id`,
    [TERMS_VERSION, version, PRIVACY_VERSION]);
  await assert.rejects(checkout(RETURN_POLICY_VERSION), /The policies changed/);
  await db.exec(await migration('20240101000136_checkout_policy_discount_path.sql'));
  await assert.rejects(checkout('NJET-RETURNS-2026-1'), /The policies changed/);
  const [order] = (await checkout(RETURN_POLICY_VERSION)).rows;
  assert.deepEqual((await db.query(
    'select return_policy_version, discounts_applied from public.orders where id = $1', [order.id]
  )).rows, [{ return_policy_version: RETURN_POLICY_VERSION, discounts_applied: true }]);

  await db.query("insert into public.storefront_legal_policy_versions values (1, 'return-policy', 'published-returns')");
  await assert.rejects(checkout(RETURN_POLICY_VERSION), /The policies changed/);
  assert.ok((await checkout('published-returns')).rows[0].id);
  const [legacy] = (await db.query(`select public.create_commerce_order_with_recipient(${args}) as id`,
    [TERMS_VERSION, 'published-returns', PRIVACY_VERSION])).rows;
  assert.equal((await db.query('select discounts_applied from public.orders where id = $1', [legacy.id])).rows[0].discounts_applied, true);
});
