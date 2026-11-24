import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { resolveCheckoutAddress } from '../data/commerce/checkout-address.ts';

test('checkout resolves saved address names and selector codes, with blank defaults', () => {
  assert.deepEqual(resolveCheckoutAddress({
    street_address: ' 12 Main St ', province_code: '130000000',
    province_name: ' Metro Manila ', city_code: '137404000', city_name: 'Makati',
    barangay_code: '137404001', barangay_name: 'Bangkal', postal_code: null,
  }), {
    addressLine1: '12 Main St', provinceCode: '130000000', province: 'Metro Manila',
    cityCode: '137404000', city: 'Makati', barangayCode: '137404001', barangay: 'Bangkal',
    postalCode: '',
  });
  assert.ok(Object.values(resolveCheckoutAddress(null)).every((field) => field === ''));
});

test('first checkout saves an address once without replacing profile data', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select current_setting('test.user_id', true)::uuid $$;
    create function public.current_user_has_permission(text) returns boolean language sql stable
      as $$ select $1 = 'storefront.access' $$;
    create table public.users (id uuid primary key, phone_number text, phone_verified_at timestamptz);
    insert into public.users values
      ('00000000-0000-4000-8000-000000000001', '+639171234567', '2026-01-01T00:00:00Z'),
      ('00000000-0000-4000-8000-000000000002', null, null);
    select set_config('test.user_id', '00000000-0000-4000-8000-000000000001', false);
  `);
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const file of ['20240101000105_user_saved_address.sql', '20240101000106_checkout_first_saved_address.sql']) {
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  }
  const save = async (street, barangayCode = '137404001') => (await db.query(
    'select public.save_first_checkout_address($1,$2,$3,$4,$5,$6,$7,$8) as saved',
    [street, '130000000', 'Metro Manila', '137404000', 'Makati', barangayCode, 'Bangkal', '1233'],
  )).rows[0].saved;

  await db.exec('set role anon');
  await assert.rejects(save('12 Main St'), { code: '42501' });
  await db.exec('set role authenticated');
  assert.equal(await save('12 Main St', ''), false);
  assert.equal(await save('12 Main St'), true);
  assert.equal(await save('13 Another St'), false);

  await db.exec('reset role');
  const { rows } = await db.query('select * from public.users order by id');
  assert.equal(rows[0].street_address, '12 Main St');
  assert.equal(rows[0].barangay_code, '137404001');
  assert.equal(rows[0].phone_number, '+639171234567');
  assert.equal(rows[0].phone_verified_at.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(rows[1].street_address, null);
  await db.exec("update public.users set street_address = 'Existing profile address' where phone_number is null");
  await db.exec("select set_config('test.user_id', '00000000-0000-4000-8000-000000000002', false); set role authenticated");
  assert.equal(await save('Other checkout address'), false);
});
