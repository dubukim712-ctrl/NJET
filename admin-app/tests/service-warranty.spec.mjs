import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

test('warranty assessment checks ownership, keeps the handover clock, and records a manual exchange once', async (t) => {
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

});
