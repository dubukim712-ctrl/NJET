import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { buildAppointmentStatusEmail } from '../data/email/appointment-status-email-content.ts';
import { deliverBrevoEmail } from '../data/email/brevo-email.mjs';

const details = {
  appointment_id: 'appointment-id',
  appointment_number: 'SVC-000004',
  email: 'customer@example.test',
  customer_name: 'Sam & Co',
  branch_name: 'Main branch',
  scheduled_at: '2026-11-25T17:00:00Z',
  service_type: 'repair',
  service_mode: 'branch_visit',
  bike_serial_number: 'SN-42',
};

function render(event, data = details) {
  return buildAppointmentStatusEmail(event, data, 'Avia Cruiser', 'service@example.test', 'https://shop.example.test');
}

test('schedule emails include the Philippine time slot, branch, service and bike details', () => {
  const confirmed = render('confirmed');
  assert.match(confirmed.subject, /confirmed.*SVC-000004/);
  assert.match(confirmed.textContent, /November 26, 2026.*1:00.*1:30.*Philippine time/);
  assert.match(confirmed.textContent, /Branch: Main branch/);
  assert.match(confirmed.textContent, /Repair \(Branch visit\)/);
  assert.match(confirmed.textContent, /Avia Cruiser/);
  assert.match(confirmed.textContent, /SN-42/);
  assert.match(confirmed.htmlContent, /Sam &amp; Co/);
  assert.match(confirmed.htmlContent, /href="https:\/\/shop\.example\.test\/appointments\/appointment-id"/);
  const moved = render('rescheduled', { ...details, service_mode: 'home_service' });
  assert.match(moved.subject, /rescheduled/);
  assert.match(moved.textContent, /Home service/);
});

test('cancellation emails explain each decision and escape optional staff notes', () => {
  const approved = render('approved', { ...details, scheduled_at: null });
  assert.match(approved.subject, /cancellation approved/);
  assert.match(approved.textContent, /appointment has been cancelled/);
  assert.doesNotMatch(approved.textContent, /Staff response/);
  const rejected = render('rejected', { ...details, response_note: '<Please call>' });
  assert.match(rejected.subject, /cancellation rejected/);
  assert.match(rejected.textContent, /keep your appointment/);
  assert.match(rejected.htmlContent, /&lt;Please call&gt;/);
});

test('missing Brevo key skips the appointment lookup and email request', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const prepare = t.mock.fn(async () => render('confirmed'));
  const send = t.mock.fn(async () => new Response(null, { status: 201 }));
  await deliverBrevoEmail({ label: 'Appointment status email', senderEmail: 'service@example.test', prepare, send });
  assert.equal(prepare.mock.callCount(), 0);
  assert.equal(send.mock.callCount(), 0);
});

test('recipient lookup requires the service role and matches the schedule or reviewed request', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec([
    'create role anon; create role authenticated; create role service_role;',
    'create schema auth;',
    'create table auth.users (id uuid, email text, email_confirmed_at timestamptz);',
    'create table public.service_appointments (id uuid, customer_id uuid, appointment_number text, customer_name text,',
    'branch_name text, scheduled_at timestamptz, service_type text, service_mode text, bike_make text,',
    'bike_model text, bike_serial_number text, status text);',
    'create table public.service_appointment_cancellation_requests (id uuid, appointment_id uuid, customer_id uuid, status text);',
  ].join(' '));
  const appointmentId = '00000000-0000-4000-8000-000000000001';
  const requestId = '00000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users values ($1, $2, now())', [appointmentId, details.email]);
  await db.query(
    "insert into public.service_appointments (id, customer_id, scheduled_at, status) values ($1, $1, $2, 'confirmed')",
    [appointmentId, details.scheduled_at],
  );
  await db.query(
    "insert into public.service_appointment_cancellation_requests values ($1, $2, $2, 'rejected')",
    [requestId, appointmentId],
  );

  const migration = new URL('../supabase/migrations/20240101000116_appointment_status_email_details.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  const lookup = 'select email, appointment_id from public.appointment_status_email_details($1, $2, $3)';
  const confirmed = [appointmentId, 'confirmed', details.scheduled_at];
  await db.exec('set role authenticated');
  await assert.rejects(db.query(lookup, confirmed), /permission denied/);
  await db.exec('set role service_role');
  const recipient = [{ email: details.email, appointment_id: appointmentId }];
  assert.deepEqual((await db.query(lookup, confirmed)).rows, recipient);
  assert.deepEqual((await db.query(lookup, [appointmentId, 'rescheduled', '2026-11-27T01:00:00Z'])).rows, []);
  assert.deepEqual((await db.query(lookup, [requestId, 'rejected', null])).rows, recipient);
  assert.deepEqual((await db.query(lookup, [requestId, 'approved', null])).rows, []);
});
