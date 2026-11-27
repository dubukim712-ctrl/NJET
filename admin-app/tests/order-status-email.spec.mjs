import { getCustomerEmailSiteUrl, getSiteUrl } from '../lib/site-url.ts';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrderStatusEmail } from '../data/email/order-status-email-content.ts';
import { deliverBrevoEmail } from '../data/email/brevo-email.mjs';

const order = {
  email: 'customer@example.test',
  customer_name: 'Sam & Co',
  order_number: 'NJET-000012',
  fulfillment: 'pickup',
  branch_name: 'Main branch',
  branch_address: '12 Main Street',
  delivery_address: null,
  total_minor: 150000,
  balance_due_minor: 100000,
};

function render(status, details = order) {
  return buildOrderStatusEmail(status, 'order-id', details, 'sales@example.test', 'https://shop.example.test');
}

test('confirmed email shows reservation, pickup balance, and delivery details when applicable', () => {
  const pickup = render('confirmed');
  assert.match(pickup.subject, /confirmed and stock reserved.*NJET-000012/i);
  assert.match(pickup.textContent, /Pick up at store: Main branch, 12 Main Street/);
  assert.match(pickup.htmlContent, /Balance due at the store: .*1,000\.00/);
  assert.match(pickup.htmlContent, /Order total: .*1,500\.00/);
  assert.match(pickup.htmlContent, /Sam &amp; Co/);
  assert.match(pickup.htmlContent, /href="https:\/\/shop\.example\.test\/dashboard\/orders\/order-id"/);
  const delivery = render('confirmed', { ...order, fulfillment: 'delivery', delivery_address: '27 Market Road' });
  assert.match(delivery.textContent, /Delivery: 27 Market Road/);
  assert.doesNotMatch(delivery.textContent, /Balance due at the store/);
});

test('completed email points customers to their printable receipt', () => {
  const email = render('completed');
  assert.match(email.textContent, /view or print your Sales Receipt/);
  assert.doesNotMatch(email.htmlContent, /Ownership Certificate/);
});


test('cancelled email asks for no further payment and safely includes a recorded reason', () => {
  const cancelled = render('cancelled', { ...order, cancellation_reason: '<Stock issue>' });
  assert.match(cancelled.subject, /Order cancelled/);
  assert.match(cancelled.textContent, /do not send any further payment/);
  assert.match(cancelled.htmlContent, /Cancellation reason: &lt;Stock issue&gt;/);
  assert.doesNotMatch(render('cancelled').textContent, /Cancellation reason/);
});

test('missing Brevo key skips order lookup and sending', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const prepare = t.mock.fn(async () => render('confirmed'));
  const send = t.mock.fn(async () => new Response(null, { status: 201 }));
  await deliverBrevoEmail({ label: 'Order status email', senderEmail: 'sales@example.test', prepare, send });
  assert.equal(prepare.mock.callCount(), 0);
  assert.equal(send.mock.callCount(), 0);
});

test('email lookup is service-only and excludes the financed Home Credit pickup balance', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const orderId = '00000000-0000-4000-8000-000000000001';
  await db.exec([
    'create role anon; create role authenticated; create role service_role;',
    'create schema auth;',
    'create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);',
    'create table public.branches (id uuid primary key, address text);',
    'create table public.orders (id uuid primary key, customer_id uuid, branch_id uuid,',
    'order_number text, customer_name text, fulfillment text, branch_name text,',
    'address_line1 text, barangay text, city text, province text, postal_code text,',
    'total_minor integer, balance_due_minor integer, status text, payment_method text);',
    'create table public.order_items (order_id uuid, product_type text);',
  ].join(' '));
  await db.query('insert into auth.users values ($1, $2, now())', [orderId, order.email]);
  await db.query(
    'insert into public.orders (id, customer_id, order_number, status, payment_method, balance_due_minor) values ($1, $1, $2, $3, $4, $5)',
    [orderId, order.order_number, 'confirmed', 'home_credit', order.balance_due_minor],
  );

  const migration = new URL('../supabase/migrations/20240101000115_order_status_email_details.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  const query = 'select email, balance_due_minor from public.order_status_email_details($1, $2)';
  await db.exec('set role authenticated');
  await assert.rejects(db.query(query, [orderId, 'confirmed']), /permission denied/);
  await db.exec('set role service_role');
  assert.deepEqual((await db.query(query, [orderId, 'confirmed'])).rows, [
    { email: order.email, balance_due_minor: 0 },
  ]);
  assert.deepEqual((await db.query(query, [orderId, 'cancelled'])).rows, []);
});

test('customer email links require a public HTTPS origin even during local development', (t) => {
  const original = process.env;
  t.after(() => { process.env = original; });
  process.env = { NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' };
  assert.equal(getSiteUrl(), 'http://localhost:3000');
  assert.throws(getCustomerEmailSiteUrl, /public HTTPS origin/);
  process.env.CUSTOMER_EMAIL_SITE_URL = 'https://localhost:3000';
  assert.throws(getCustomerEmailSiteUrl, /public HTTPS origin/);
  process.env.CUSTOMER_EMAIL_SITE_URL = 'https://store.example.test/';
  assert.equal(getCustomerEmailSiteUrl(), 'https://store.example.test');
  delete process.env.CUSTOMER_EMAIL_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://store.example.test';
  assert.equal(getCustomerEmailSiteUrl(), 'https://store.example.test');
});
