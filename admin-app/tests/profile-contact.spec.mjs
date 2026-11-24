import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('saving profile contact details preserves verification only for the same phone', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role authenticated;
    create role anon;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select current_setting('test.user_id', true)::uuid $$;
    create function public.current_user_has_permission(text) returns boolean language sql stable
      as $$ select current_setting('test.storefront', true) = 'true' and $1 = 'storefront.access' $$;
    create table public.users (
      id uuid primary key, role_id integer not null,
      full_name text check (full_name <> 'Invalid name'), avatar_url text,
      phone_number text check (phone_number is null or phone_number ~ '^[+]639[0-9]{9}$'),
      phone_verified_at timestamptz check (phone_verified_at is null or phone_number is not null)
    );
    alter table public.users enable row level security;
    grant select on public.users to authenticated;
    create policy own_profile on public.users for select to authenticated using (auth.uid() = id);
    insert into public.users (id, role_id, phone_number, phone_verified_at) values
      ('00000000-0000-4000-8000-000000000001', 1, '+639171234567', now()),
      ('00000000-0000-4000-8000-000000000002', 2, '+639181234567', now());
    select set_config('test.user_id', '00000000-0000-4000-8000-000000000001', false);
    select set_config('test.storefront', 'false', false);
  `);
  const migration = new URL('../supabase/migrations/20240101000105_user_saved_address.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  const save = (phone) => db.query(
    'select public.save_customer_profile_contact($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [phone, '12 Main St', '130000000', 'Metro Manila', '137404000', 'Makati', '137404001', 'Bangkal', '1233'],
  );
  await db.exec('set role anon');
  await assert.rejects(save('+639171234567'), { code: '42501' });
  await db.exec('set role authenticated');
  await assert.rejects(save('+639171234567'), /Sign in with a customer account/);
  await db.exec("select set_config('test.storefront', 'true', false)");
  await save('+639171234567');
  const profile = async () => (await db.query(
    'select phone_number, phone_verified_at, street_address, role_id from public.users',
  )).rows;
  const saved = await profile();
  assert.equal(saved.length, 1);
  assert.ok(saved[0].phone_verified_at);
  assert.equal(saved[0].street_address, '12 Main St');
  await save('+639191234567');
  assert.deepEqual(await profile(), [{
    phone_number: '+639191234567', phone_verified_at: null, street_address: '12 Main St', role_id: 1,
  }]);
  await assert.rejects(db.exec('update public.users set phone_verified_at = now()'), { code: '42501' });
  await assert.rejects(db.exec('update public.users set role_id = 2'), { code: '42501' });
  const unified = new URL('../supabase/migrations/20240101000107_unified_customer_profile.sql', import.meta.url);
  await db.exec('reset role');
  await db.exec(await readFile(unified, 'utf8'));
  await db.exec('set role authenticated');
  const saveProfile = (name, phone) => db.query(
    'select public.save_customer_profile($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as saved',
    [name, null, phone, null, null, null, null, null, null, null, null],
  );
  await assert.rejects(saveProfile('Invalid name', '+639181234567'), { code: '23514' });
  assert.deepEqual(await profile(), [{
    phone_number: '+639191234567', phone_verified_at: null, street_address: '12 Main St', role_id: 1,
  }]);
  assert.equal((await saveProfile('Alex', '+639181234567')).rows[0].saved, true);
  const savedProfile = await db.query('select full_name, phone_number, street_address from public.users');
  assert.deepEqual(savedProfile.rows, [{ full_name: 'Alex', phone_number: '+639181234567', street_address: null }]);
  await db.exec('reset role');
  const { rows } = await db.query("select phone_verified_at, street_address from public.users where role_id = 2");
  assert.ok(rows[0].phone_verified_at);
  assert.equal(rows[0].street_address, null);
});
