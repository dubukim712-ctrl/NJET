import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  appointmentConfirmationPath, formatConfirmationSlot, isPaymentProofDue, orderConfirmationPath,
} from '../lib/customer-confirmation.ts';

test('confirmation URLs encode IDs and keep separate confirmation routes', () => {
  assert.equal(orderConfirmationPath('order&other=1'), '/checkout/success?orderId=order%26other%3D1');
  assert.equal(appointmentConfirmationPath('appointment/1'), '/dashboard/appointments/submitted?appointmentId=appointment%2F1');
});

test('payment proof is actionable only while an online payment or downpayment is outstanding', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  const order = { status: 'awaiting_payment', online_due_minor: 1500,
    home_credit_downpayment_due_minor: 0, payment_expires_at: '2026-01-01T01:00:00Z' };
  assert.equal(isPaymentProofDue(order, now), true);
  assert.equal(isPaymentProofDue({ ...order, online_due_minor: 0, home_credit_downpayment_due_minor: 500 }, now), true);
  assert.equal(isPaymentProofDue({ ...order, status: 'awaiting_confirmation' }, now), false);
  assert.equal(isPaymentProofDue(order, Date.parse(order.payment_expires_at)), false);
});

test('appointment confirmation formats the slot in Philippine time', () => {
  assert.match(formatConfirmationSlot('2026-01-01T02:30:00Z'), /10:30/);
});

test('appointment detail RPC returns only the signed-in customer appointment', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function public.current_user_has_permission(text) returns boolean language sql stable
      as $$ select $1 = 'storefront.access' $$;
    create table public.service_appointments (
      id uuid primary key, customer_id uuid, appointment_number text, branch_name text,
      service_mode text, service_type text, bike_make text, bike_model text, issue_description text,
      address_line1 text, barangay text, city text, province text, preferred_start_at timestamptz,
      scheduled_at timestamptz, status text, estimate_minor integer, final_total_minor integer,
      created_at timestamptz, bike_serial_number text
    );
    insert into public.service_appointments (id, customer_id, appointment_number, bike_serial_number)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'SVC-000004', 'SERIAL-4');
  `);
  const migration = new URL('../supabase/migrations/20240101000112_customer_appointment_detail.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  const load = () => db.query(
    'select appointment_number, bike_serial_number from public.customer_service_appointment_detail($1)',
    ['00000000-0000-4000-8000-000000000001'],
  );
  await db.exec('set role anon');
  await assert.rejects(load(), { code: '42501' });
  await db.exec("set role authenticated; select set_config('test.uid', '00000000-0000-4000-8000-000000000003', false)");
  assert.deepEqual((await load()).rows, []);
  await db.exec("select set_config('test.uid', '00000000-0000-4000-8000-000000000002', false)");
  assert.deepEqual((await load()).rows, [{ appointment_number: 'SVC-000004', bike_serial_number: 'SERIAL-4' }]);
});
