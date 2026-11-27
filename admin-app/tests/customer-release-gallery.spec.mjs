import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const uuid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const staff = uuid(1);
const admin = uuid(2);
const customer = uuid(3);
const ownBranch = uuid(4);
const otherBranch = uuid(5);
const ownOrder = uuid(6);
const otherOrder = uuid(7);
const openOrder = uuid(8);
const image = `releases/${staff}/${uuid(9)}.webp`;
const extraImage = 'releases/' + staff + '/' + uuid(11) + '.webp';
const foreignImage = `releases/${customer}/${uuid(10)}.webp`;

test('releases enforce approval, branch scope, and storage attachment for staff', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());

  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    grant usage on schema storage, auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function public.current_user_is_full_access() returns boolean language sql stable as
      $$ select auth.uid() = '${admin}'::uuid $$;
    create function public.current_user_has_permission(text) returns boolean language sql stable as
      $$ select auth.uid() in ('${admin}'::uuid, '${staff}'::uuid) $$;
    create function public.current_user_can_access_branch(uuid) returns boolean language sql stable as
      $$ select public.current_user_is_full_access() or $1 = '${ownBranch}'::uuid $$;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${staff}'), ('${admin}'), ('${customer}');
    create table public.branches (id uuid primary key);
    insert into branches values ('${ownBranch}'), ('${otherBranch}');
    create table public.products (id uuid primary key);
    create table public.orders (id uuid primary key, branch_id uuid, status text);
    insert into orders values ('${ownOrder}', '${ownBranch}', 'completed'),
      ('${otherOrder}', '${otherBranch}', 'completed'), ('${openOrder}', '${ownBranch}', 'pending');
    alter table public.orders add column order_number text not null default 'NJET-000014';
    grant select on orders to authenticated;
    create table storage.objects (bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant select on storage.objects to anon, authenticated;
    grant insert, delete on storage.objects to authenticated;
    create policy "Storefront branding is public" on storage.objects for select using (true);
    create policy "Legacy admin deletes" on storage.objects for delete to authenticated
      using (public.current_user_is_full_access());
  `);
  const migration = new URL('../supabase/migrations/20240101000142_customer_release_gallery.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));

  const as = (role, user = '') => db.exec(`reset role; set role ${role}; set test.uid = '${user}'`);
  const upload = (path) => db.query("insert into storage.objects values ('njet-storefront-branding', $1)", [path]);
  const submit = (orderId, approved = false, path = image) => db.query(
    'insert into customer_releases (image_path, uploaded_by, order_id, is_approved) values ($1, $2, $3, $4) returning id',
    [path, staff, orderId, approved],
  );
  const visible = () => db.query('select image_path from customer_releases');
  const deleteImage = () => db.query('delete from storage.objects where name = $1 returning name', [image]);

  await as('authenticated', customer);
  await assert.rejects(upload(foreignImage), /row-level security/i);
  await as('authenticated', staff);
  await assert.rejects(submit(ownOrder), /row-level security/i);
  await assert.rejects(upload(foreignImage), /row-level security/i);
  await upload(image);
  await assert.rejects(submit(otherOrder), /row-level security/i);
  await assert.rejects(submit(openOrder), /row-level security/i);
  await assert.rejects(submit(ownOrder, true), /row-level security/i);
  const [{ id }] = (await submit(ownOrder)).rows;
  const uniqueness = await readFile(new URL('../supabase/migrations/20240101000148_unique_customer_release_order.sql', import.meta.url), 'utf8');
  await upload(extraImage);
  const [{ id: duplicateId }] = (await submit(ownOrder, false, extraImage)).rows;
  await db.exec('reset role');
  await assert.rejects(db.exec(uniqueness), { code: '23505', detail: 'NJET-000014 (2 photos)' });
  await db.query('delete from customer_releases where id = $1', [duplicateId]);
  await db.exec(uniqueness);

  const links = (ids, exclude = null) => db.query(
    'select order_id from public.linked_customer_release_orders($1, $2)', [ids, exclude],
  );
  await as('anon');
  await assert.rejects(links([ownOrder]), { code: '42501' });
  await as('authenticated', customer);
  assert.deepEqual((await links([ownOrder])).rows, []);
  await as('authenticated', staff);
  await assert.rejects(submit(ownOrder, false, extraImage), {
    code: '23505', constraint: 'customer_releases_order_id_unique',
  });
  assert.deepEqual((await links([ownOrder, otherOrder])).rows, [{ order_id: ownOrder }]);
  await as('authenticated', admin);
  assert.deepEqual((await links([ownOrder], id)).rows, []);
  await db.exec('reset role');
  await db.query('update customer_releases set uploaded_by = $1 where id = $2', [admin, id]);
  await as('authenticated', staff);
  assert.deepEqual((await visible()).rows, []);
  assert.deepEqual((await links([ownOrder])).rows, [{ order_id: ownOrder }]);
  await db.exec('reset role');
  await db.query('update customer_releases set uploaded_by = $1 where id = $2', [staff, id]);
  await as('authenticated', staff);

  assert.deepEqual((await visible()).rows, [{ image_path: image }]);
  assert.equal((await deleteImage()).rows.length, 0);

  await as('anon');
  assert.equal((await visible()).rows.length, 0);
  assert.equal((await db.query('select name from storage.objects')).rows.length, 0);
  await as('authenticated', admin);
  await db.query('update customer_releases set is_approved = true where id = $1', [id]);
  await as('anon');
  assert.deepEqual((await visible()).rows, [{ image_path: image }]);
  assert.deepEqual((await db.query('select name from storage.objects')).rows, [{ name: image }]);
  await as('authenticated', staff);
  assert.equal((await db.query('delete from customer_releases where id = $1 returning id', [id])).rows.length, 0);
  await as('authenticated', admin);
  assert.equal((await deleteImage()).rows.length, 0);
  await db.query('delete from customer_releases where id = $1', [id]);
  assert.deepEqual((await deleteImage()).rows, [{ name: image }]);

  await as('authenticated', staff);
  await upload(image);
  await submit(null);
  const [{ id: unlinked }] = (await submit(null, false, extraImage)).rows;
  await as('authenticated', admin);
  await db.query('update customer_releases set order_id = $1 where id = $2', [ownOrder, unlinked]);
  await assert.rejects(
    db.query('update customer_releases set order_id = $1 where image_path = $2', [ownOrder, image]),
    { code: '23505', constraint: 'customer_releases_order_id_unique' },
  );
  await db.query('update customer_releases set order_id = null where id = $1', [unlinked]);
  await as('authenticated', staff);
  assert.equal((await db.query('delete from customer_releases returning id')).rows.length, 2);
  assert.deepEqual((await deleteImage()).rows, [{ name: image }]);
});
