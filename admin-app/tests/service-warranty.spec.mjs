import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

test('warranty assessment preserves the original purchase and exchanges a reserved serial once', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec([
    'create role authenticated; create role anon; create schema auth;',
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user', true), '')::uuid $$;",
    'create table public.users (id uuid primary key, full_name text);',
    'create table public.orders (id uuid primary key, customer_id uuid, branch_id uuid, status text,',
    'order_number text, created_at timestamptz, completed_at timestamptz);',
    'create table public.order_items (id uuid primary key, order_id uuid, product_type text, product_name text);',
    'create table public.ebike_units (id uuid primary key, order_item_id uuid, serial_number text, status text);',
    'create table public.service_appointments (id uuid primary key default gen_random_uuid(), customer_id uuid,',
    'branch_id uuid, status text, bike_serial_number text, created_at timestamptz not null default now());',
    'create function public.current_user_has_permission(k text) returns boolean language sql stable as $$',
    "select k = any(string_to_array(current_setting('test.permissions', true), ',')) $$;",
    'create function public.current_user_can_access_branch(b uuid) returns boolean language sql stable as $$',
    "select b::text = current_setting('test.branch', true) $$;",
    'create function public.request_service_appointment(p_branch uuid, text, text, text, text, p_serial text,',
    'text, text, text, text, text, text, text, timestamptz) returns uuid language sql security definer as $$',
    "insert into public.service_appointments (customer_id, branch_id, status, bike_serial_number) values",
    "(auth.uid(), p_branch, 'requested', p_serial) returning id $$;",
  ].join(' '));

  await db.query("insert into public.users values ($1,'Customer'),($2,'Other'),($3,'Staff')", [id(1), id(2), id(3)]);
  const order = id(4), branch = id(5), item = id(6), unit = id(7);
  await db.query("insert into public.orders values ($1,$2,$3,'completed','NJET-000001',now()-interval '1 day',now())", [order, id(1), branch]);
  await db.query("insert into public.order_items values ($1,$2,'ebike','Cruiser')", [item, order]);
  await db.query("insert into public.ebike_units values ($1,$2,'OLD-SERIAL','sold')", [unit, item]);
  for (const name of ['20240101000121_service_warranty_records.sql', '20240101000122_service_warranty_workflow.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
  }

  const deadlines = await db.query(
    "select public.service_warranty_deadline(date '2026-01-31',2::smallint)::text as two, " +
    "public.service_warranty_deadline(date '2026-01-31',3::smallint)::text as three, " +
    "public.service_warranty_deadline(date '2026-01-31',4::smallint)::text as four",
  );
  assert.deepEqual(deadlines.rows, [{ two: '2026-02-07', three: '2026-04-30', four: '2026-04-30' }]);

  const act = (actor, permissions, scope) => db.query(
    "select set_config('test.user',$1,false),set_config('test.permissions',$2,false),set_config('test.branch',$3,false)",
    [actor, permissions, scope],
  );
  const today = (await db.query("select (now() at time zone 'Asia/Manila')::date::text as today")).rows[0].today;
  const record = 'select public.record_ebike_warranty_handover($1,$2,$3,$4::smallint)';
  await db.exec('set role authenticated');
  await act(id(3), 'orders.manage,service_appointments.manage', id(8));
  await assert.rejects(db.query(record, [order, unit, today, 2]), /accessible completed order/);
  await act(id(3), 'orders.manage,service_appointments.manage', branch);
  await db.query(record, [order, unit, today, 2]);
  await assert.rejects(db.query(record, [order, unit, today, 2]), /already been recorded/);

  const booking = JSON.stringify({ p_branch_id: branch, p_bike_model: 'Cruiser' });
  const request = 'select public.request_service_warranty_appointment($1,$2) as id';
  await act(id(2), 'storefront.access', '');
  await assert.rejects(db.query(request, [booking, unit]), /own completed purchases/);
  assert.deepEqual((await db.query('select * from public.customer_warranty_bikes()')).rows, []);
  await act(id(1), 'storefront.access', '');
  const appointmentId = (await db.query(request, [booking, unit])).rows[0].id;
  const manualId = (await db.query(request, [booking, null])).rows[0].id;
  const details = 'select timing, order_number, approver, replacement_serial from public.service_warranty_details($1)';
  assert.equal((await db.query(details, [manualId])).rows[0].timing, 'needs_review');
  assert.deepEqual((await db.query(details, [appointmentId])).rows, [
    { timing: 'within_window', order_number: 'NJET-000001', approver: null, replacement_serial: null },
  ]);

  const review = "select public.review_service_warranty($1,'replacement_approved','Replacement approved after inspection')";
  await assert.rejects(db.query(review, [appointmentId]), /permission/);
  await db.exec('reset role');
  await db.query("update public.service_appointments set status='completed' where id=$1", [appointmentId]);
  await db.query("update public.service_warranty_cases set submitted_at = now() + interval '8 days' where appointment_id = $1", [appointmentId]);
  await db.exec('set role authenticated');
  await act(id(1), 'storefront.access', '');
  assert.equal((await db.query(details, [appointmentId])).rows[0].timing, 'after_window');
  await act(id(3), 'service_appointments.manage', branch);
  await assert.rejects(db.query(review, [manualId]), /not eligible/);
  await db.query('select public.link_service_warranty_unit($1,$2)', [manualId, 'old-serial']);
  assert.equal((await db.query(details, [manualId])).rows[0].timing, 'within_window');
  await db.query(review, [appointmentId]);
  const replacement = 'select public.record_service_warranty_replacement($1,$2,$3)';
  await assert.rejects(db.query(replacement, [appointmentId, 'old-serial', today]), /Verify approval/);
  await db.query(replacement, [appointmentId, 'NEW-SERIAL', today]);
  await assert.rejects(db.query(replacement, [appointmentId, 'NEW-SERIAL', today]), /Verify approval/);
  await act(id(2), 'storefront.access', '');
  assert.deepEqual((await db.query(details, [appointmentId])).rows, []);
  await act(id(1), 'storefront.access', '');
  assert.equal((await db.query(details, [appointmentId])).rows[0].replacement_serial, 'NEW-SERIAL');
  await db.exec('reset role');
  assert.deepEqual((await db.query('select serial_number, status from public.ebike_units')).rows, [{ serial_number: 'OLD-SERIAL', status: 'sold' }]);
  const startMigration = new URL('../supabase/migrations/20240101000123_staff_initiated_warranty_reviews.sql', import.meta.url);
  await db.exec(await readFile(startMigration, 'utf8'));
  const standardAppointment = id(9);
  const createdAt = '2026-11-25T15:59:00Z';
  await db.query(
    "insert into public.service_appointments (id, customer_id, branch_id, status, created_at) values ($1,$2,$3,'confirmed',$4)",
    [standardAppointment, id(1), branch, createdAt],
  );

  const start = 'select public.start_service_warranty_review($1) as id';
  await db.exec('set role authenticated');
  await act(id(1), 'storefront.access', '');
  await assert.rejects(db.query(request, [booking, null]), /permission denied/);
  await assert.rejects(db.query(start, [standardAppointment]), /permission to start/);
  await act(id(3), 'service_appointments.manage', id(8));
  await assert.rejects(db.query(start, [standardAppointment]), /accessible branch/);
  await act(id(3), 'service_appointments.manage', branch);
  await assert.rejects(db.query(start, [standardAppointment]), /Start the service inspection/);
  await db.exec('reset role');
  await db.query("update public.service_appointments set status = 'in_service' where id = $1", [standardAppointment]);

  await db.exec('set role authenticated');
  await db.query(start, [standardAppointment]);
  assert.deepEqual((await db.query(start, [standardAppointment])).rows, [{ id: standardAppointment }]);
  const started = await db.query("select submitted_at = $2::timestamptz as original_timestamp, decision from public.service_warranty_details($1)", [standardAppointment, createdAt]);
  assert.deepEqual(started.rows, [{ original_timestamp: true, decision: 'under_review' }]);
  await db.query(start, [appointmentId]);
  assert.equal((await db.query(details, [appointmentId])).rows[0].replacement_serial, 'NEW-SERIAL');


  await db.exec('reset role');
  await db.exec(`
    create table public.branches (id uuid primary key);
    alter table public.ebike_units
      add column variant_id uuid, add column branch_id uuid, add column transfer_id uuid,
      add column motor_number text,
      add constraint ebike_units_status_check check (status in ('sold','in_stock')),
      add check ((status = 'sold') = (order_item_id is not null));
    alter table public.service_appointments add column branch_name text, add column customer_name text, add column appointment_number text;
    create table public.branch_inventory (branch_id uuid, variant_id uuid, stock integer check (stock >= 0));
    create table public.inventory_movements (
      id bigint generated always as identity,
      branch_id uuid, variant_id uuid, quantity_delta integer, movement_type text check (movement_type = 'adjustment'),
      reference_id uuid, actor_id uuid, note text
    );
  `);
  const migration = (name) => readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
  const inventory = await migration('20240101000014_product_media_and_serial_inventory.sql');
  const movementFunction = inventory.match(/create or replace function public\.record_inventory_movement\(\)[\s\S]*?\$\$;/i);
  assert.ok(movementFunction);
  await db.exec(movementFunction[0]);
  await db.exec(`create trigger record_stock_change after update of stock on public.branch_inventory
    for each row execute function public.record_inventory_movement()`);
  for (const name of ['20240101000124_warranty_exchange_inventory.sql', '20240101000125_warranty_exchange_workflow.sql',
    '20240101000126_warranty_exchange_records.sql']) {
    await db.exec(await migration(name));
  }

  await db.exec(`
    create table public.roles (id uuid primary key, scope text);
    alter table public.users add column role_id uuid, add column email text, add column phone_number text,
      add column phone_verified_at timestamptz, add column street_address text, add column barangay_name text,
      add column city_name text, add column province_name text, add column postal_code text;
    alter table public.orders add column branch_name text;
    alter table public.order_items add column variant_name text;
    alter table public.service_appointments add column scheduled_at timestamptz, add column preferred_start_at timestamptz;
    create table public.crm_follow_ups (customer_id uuid, branch_id uuid, status text);
    create table public.support_chat_threads (id uuid, status text, last_message_at timestamptz, customer_user_id uuid);
    create table public.support_chat_messages (thread_id uuid, sender_role text);
    create function public.crm_can_access_customer(c uuid) returns boolean language sql stable as $$
      select public.current_user_has_permission('crm.read') $$;
    insert into public.roles values (gen_random_uuid(), 'customer');
    update public.users set role_id = (select id from public.roles) where full_name = 'Customer';
  `);
  for (const name of ['20240101000127_warranty_return_dispositions.sql',
    '20240101000128_bind_warranty_exchange_reservation.sql', '20240101000129_warranty_replacement_lookup.sql']) {
    await db.exec(await migration(name));
  }
  await db.exec('grant execute on function public.crm_customers(uuid,text,integer), public.crm_customer_activity(uuid) to authenticated');

  const variant = id(10), newUnit = id(11), alternateUnit = id(12);
  await db.query('insert into public.branches values ($1)', [branch]);
  await db.query('update public.ebike_units set variant_id=$1,branch_id=$2 where id=$3', [variant, branch, unit]);
  await db.query("insert into public.ebike_units (id,serial_number,status,variant_id,branch_id,motor_number) values ($1,'IN-STOCK','in_stock',$2,$3,'MOTOR'),($4,'ALTERNATE','in_stock',$2,$3,'MOTOR-2')",
    [newUnit, variant, branch, alternateUnit]);
  await db.query('insert into public.branch_inventory values ($1,$2,2)', [branch, variant]);
  await db.query("update public.service_appointments set status='completed', branch_name='Main Branch', customer_name='Customer' where id=$1",
    [standardAppointment]);
  await db.query("update public.service_warranty_cases set unit_id=$2, original_order_id=$3, original_serial='OLD-SERIAL', decision='replacement_approved' where appointment_id=$1",
    [standardAppointment, unit, order]);

  const manage = (operation, value = null, date = null, serial = null, expected = null) => db.query(
    'select public.manage_service_warranty_exchange($1,$2,$3,$4,$5,$6)', [standardAppointment, operation, value, date, serial, expected],
  );
  const exchangeDetails = 'select * from public.service_warranty_exchange_details($1)';
  const manager = 'service_appointments.manage,products.manage,orders.read,crm.read';
  await db.exec('set role authenticated');
  await act(id(3), 'service_appointments.manage', branch);
  await assert.rejects(manage('receive', 'Damage noted', null, 'OLD-SERIAL'), /service and inventory permissions/);
  await act(id(3), manager, id(8));
  await assert.rejects(manage('receive', 'Damage noted', null, 'OLD-SERIAL'), /accessible branch/);
  await act(id(3), manager, branch);
  await assert.rejects(manage('receive', 'Damage noted', null, 'WRONG'), /Confirm the serial/);
  await manage('receive', 'Damage noted', null, 'old-serial');
  await manage('receive', 'Damage noted', null, 'old-serial');
  const options = 'select * from public.service_warranty_replacement_options($1)';
  assert.deepEqual((await db.query(options, [standardAppointment])).rows, [{ serial: 'ALTERNATE', motor: 'MOTOR-2' }, { serial: 'IN-STOCK', motor: 'MOTOR' }]);
  await assert.rejects(manage('reserve', 'OLD-SERIAL'), /in-stock serial/);
  await manage('reserve', 'IN-STOCK');
  await manage('reserve', 'IN-STOCK');
  await act(id(1), 'storefront.access', '');
  assert.deepEqual((await db.query(exchangeDetails, [standardAppointment])).rows, []);
  await act(id(3), manager, branch);
  const crmSearch = "select id from public.crm_customers(null,'ALTERNATE',0)";
  assert.deepEqual((await db.query(crmSearch)).rows, []);
  await act(id(2), manager, branch); // Another staff session replaces the reservation.
  await manage('release', null, null, null, newUnit);
  await manage('reserve', 'ALTERNATE');
  await act(id(3), manager, branch);
  await assert.rejects(manage('release', null, null, null, newUnit), /Reload the exchange/);
  await assert.rejects(manage('handover', null, today, null, newUnit), /Reload the exchange/);
  await assert.rejects(manage('handover', null, today), /Reload the exchange/);
  await assert.rejects(manage('handover', null, '9999-01-01', null, alternateUnit), /between reservation and today/);
  assert.equal((await db.query(exchangeDetails, [standardAppointment])).rows[0].replacement_unit_id, alternateUnit);
  await manage('handover', null, today, null, alternateUnit);
  await manage('handover', null, today, null, alternateUnit);
  assert.deepEqual((await db.query(crmSearch)).rows, [{ id: id(1) }]);
  const [purchase] = (await db.query("select reference, bikes from public.crm_customer_activity($1) where kind = 'Order'", [id(1)])).rows;
  assert.equal(purchase.reference, 'NJET-000001');
  assert.deepEqual(purchase.bikes.map((bike) => [bike.serial, bike.replacement]), [['OLD-SERIAL', false], ['ALTERNATE', true]]);
  await assert.rejects(db.query(replacement, [standardAppointment, 'MANUAL', today]), /permission denied/);

  await act(id(2), 'storefront.access', '');
  assert.deepEqual((await db.query(exchangeDetails, [standardAppointment])).rows, []);
  await act(id(1), 'storefront.access', '');
  const [exchange] = (await db.query(exchangeDetails, [standardAppointment])).rows;
  assert.equal(exchange.original_serial, 'OLD-SERIAL');
  assert.equal(exchange.replacement_serial, 'ALTERNATE');
  assert.equal(exchange.replacement_unit_id, null);
  assert.equal(exchange.returned_condition, null);
  await db.exec('reset role');
  const followUpId = id(13);
  await db.query("insert into public.service_appointments (id, customer_id, branch_id, status) values ($1,$2,$3,'in_service')",
    [followUpId, id(1), branch]);
  await db.exec('set role authenticated');
  await act(id(3), manager, id(8));
  await assert.rejects(db.query('select public.link_service_warranty_unit($1,$2)', [followUpId, 'ALTERNATE']), /completed purchase/);
  await act(id(3), manager, branch);
  await db.query(start, [followUpId]);
  await db.query('select public.link_service_warranty_unit($1,$2)', [followUpId, 'alternate']);
  assert.deepEqual((await db.query('select timing, order_number, unit_id from public.service_warranty_details($1)', [followUpId])).rows,
    [{ timing: 'needs_review', order_number: 'NJET-000001', unit_id: alternateUnit }]);
  await assert.rejects(db.query(review, [followUpId]), /not eligible/);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select stock from public.branch_inventory')).rows, [{ stock: 1 }]);
  assert.deepEqual((await db.query('select serial_number, status, order_item_id from public.ebike_units order by serial_number')).rows, [
    { serial_number: 'ALTERNATE', status: 'warranty_replacement', order_item_id: null },
    { serial_number: 'IN-STOCK', status: 'in_stock', order_item_id: null },
    { serial_number: 'OLD-SERIAL', status: 'sold', order_item_id: item },
  ]);
  assert.deepEqual((await db.query('select quantity_delta from public.inventory_movements order by id')).rows.map(row => row.quantity_delta),
    [0, -1, 1, -1, 0]);

  await db.query("update public.service_appointments set appointment_number = 'SVC-000009' where id = $1", [standardAppointment]);
  const returns = 'select * from public.list_warranty_returns(null, null)';
  const recordReturn = (reason, disposition, note, previous = null) => db.query(
    'select public.record_warranty_return_update($1,$2,$3,$4,$5) as saved',
    [standardAppointment, reason, disposition, note, previous],
  );

  await db.exec('set role authenticated');
  await act(id(1), 'storefront.access', '');
  assert.deepEqual((await db.query(returns)).rows, []);
  await assert.rejects(recordReturn('damaged', 'held_at_branch', ''), /permission/);
  await act(id(3), manager, id(8));
  assert.deepEqual((await db.query(returns)).rows, []);
  await assert.rejects(recordReturn('damaged', 'held_at_branch', ''), /unavailable/);
  await act(id(3), manager, branch);
  const [initial] = (await db.query(returns)).rows;
  assert.equal(initial.original_serial, 'OLD-SERIAL');
  assert.equal(initial.returned_condition, 'Damage noted');
  assert.equal(initial.disposition, null);
  await recordReturn('damaged', 'held_at_branch', 'Waiting on supplier');
  await recordReturn('damaged', 'held_at_branch', 'Waiting on supplier'); // Safe retry
  const [held] = (await db.query(returns)).rows;
  assert.equal(held.reason, 'damaged');
  assert.equal(held.recorded_by, 'Staff');
  assert.deepEqual((await recordReturn('damaged', 'written_off', '')).rows, [{ saved: false }]);
  await assert.rejects(recordReturn('damaged', 'sellable', '', held.update_id), /check constraint/);
  await recordReturn('damaged', 'returned_to_supplier', 'Pickup confirmed', held.update_id);
  const [returned] = (await db.query(returns)).rows;
  assert.equal(returned.disposition, 'returned_to_supplier');
  assert.equal(returned.note, 'Pickup confirmed');
  assert.deepEqual((await db.query('select * from public.list_warranty_returns($1,$2)',
    [returned.received_at, returned.appointment_id])).rows, []);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as count from public.warranty_return_updates')).rows[0].count, 2);
  assert.equal((await db.query('select stock from public.branch_inventory')).rows[0].stock, 1);
  assert.equal((await db.query("select status from public.ebike_units where serial_number = 'OLD-SERIAL'")).rows[0].status, 'sold');
});
