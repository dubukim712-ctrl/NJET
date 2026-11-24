import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { toUserFriendlyError } from '../data/supabase/user-friendly-errors.ts';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const readMigration = (name) => readFile(new URL(name, migrations), 'utf8');
const slot = '2099-01-01T10:00:00+08:00';
const slotEnd = '2099-01-01T10:30:00+08:00';

const schema = `
  create table public.service_appointments (
    id integer primary key, branch_id integer not null, status text not null,
    preferred_start_at timestamptz not null, scheduled_at timestamptz,
    assigned_technician_id integer
  );
  create table public.service_appointment_closures (
    branch_id integer not null, starts_at timestamptz not null, ends_at timestamptz not null
  );
  create table public.product_categories (id integer primary key);
  create table public.product_subcategories (
    id integer primary key, category_id integer not null references public.product_categories(id),
    active boolean not null default true
  );
  create table public.products (
    id integer primary key, category_id integer not null references public.product_categories(id),
    subcategory_id integer references public.product_subcategories(id) on delete set null
  );
`;

async function setup(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(schema);
  const availability = await readMigration('20240101000042_service_appointment_availability.sql');
  const catalog = await readMigration('20240101000020_dynamic_product_categories.sql');
  for (const [sql, fn, trigger] of [
    [availability, 'prevent_service_appointment_slot_overlap', 'service_appointments_slot_overlap'],
    [availability, 'prevent_closure_over_scheduled_appointments', 'service_appointment_closures_validate'],
    [catalog, 'guard_product_subcategory', 'product_subcategory_guard'],
  ]) {
    const definition = sql.match(new RegExp(
      `create or replace function public\\.${fn}\\(\\)[\\s\\S]+?create trigger ${trigger}\\b[^;]+;`,
    ));
    assert.ok(definition, `Missing existing trigger ${trigger}`);
    await db.exec(definition[0]);
  }
  return db;
}

async function migrate(db) {
  await db.exec(await readMigration('20240101000102_appointment_locks_and_category_fk.sql'));
}

function appointment(db, id, status, branch = 1, technician = 7) {
  return db.query('insert into service_appointments values ($1, $2, $3, $4, $4, $5)',
    [id, branch, status, slot, technician]);
}

function closure(db, branch = 1) {
  return db.query('insert into service_appointment_closures values ($1, $2, $3)',
    [branch, slot, slotEnd]);
}

test('status-only activation rejects an overlapping appointment for the same technician', async (t) => {
  const db = await setup(t);
  await migrate(db);
  await appointment(db, 1, 'confirmed');
  await appointment(db, 2, 'requested');
  for (const status of ['confirmed', 'in_service']) {
    await assert.rejects(
      db.query('update service_appointments set status = $1 where id = 2', [status]),
      /This technician already has an appointment/,
    );
  }
  await db.query("update service_appointments set status = 'cancelled' where id = 1");
  await db.query("update service_appointments set status = 'confirmed' where id = 2");
});

test('active appointments and branch closures reject overlaps in both write orders', async (t) => {
  const db = await setup(t);
  await migrate(db);
  await appointment(db, 1, 'confirmed', 1, null);
  await assert.rejects(closure(db), /Reschedule confirmed appointments/);
  await closure(db, 2);
  await appointment(db, 2, 'requested', 2, null);
  await assert.rejects(
    db.query("update service_appointments set status = 'in_service' where id = 2"),
    (error) => {
      assert.equal(toUserFriendlyError(error, 'Could not update appointment.'),
        'This time is blocked by a branch closure. Choose another time.');
      return true;
    },
  );
});

test('repairs existing mismatches, cascades reparenting, and clears only the subcategory on deletion', async (t) => {
  const db = await setup(t);
  await db.exec(`
    insert into product_categories values (1), (2);
    insert into product_subcategories values (1, 1, false);
    -- Seed an existing link before deactivation and reparenting.
    update product_subcategories set active = true;
    insert into products values (1, 1, 1), (2, 1, null);
    update product_subcategories set category_id = 2, active = false where id = 1;
  `);
  await migrate(db);
  const product = async () => (await db.query('select * from products where id = 1')).rows[0];
  assert.deepEqual(await product(), { id: 1, category_id: 2, subcategory_id: 1 });
  await db.exec('update product_subcategories set category_id = 1 where id = 1');
  assert.deepEqual(await product(), { id: 1, category_id: 1, subcategory_id: 1 });

  await db.exec('alter table products disable trigger product_subcategory_guard');
  await assert.rejects(db.exec('update products set category_id = 2 where id = 1'), (error) => {
    assert.equal(error.constraint, 'products_category_subcategory_fkey');
    assert.equal(toUserFriendlyError(error, 'Could not save product.'),
      'Choose a subcategory that belongs to the selected main category.');
    return true;
  });
  await db.exec('alter table products enable trigger product_subcategory_guard');
  await db.exec('delete from product_subcategories where id = 1');
  assert.deepEqual(await product(), { id: 1, category_id: 1, subcategory_id: null });
});
