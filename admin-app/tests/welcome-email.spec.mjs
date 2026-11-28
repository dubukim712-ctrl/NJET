import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { buildWelcomeEmail, deliverWelcomeEmail } from '../data/email/welcome-email-delivery.ts';

const recipient = { email: 'customer@example.test', name: '  <Customer & Co>  ' };
const getOrigin = () => 'https://shop.example.test';
const senderEmail = 'welcome@example.test';

test('builds HTML and plain-text versions with safe names and storefront links', () => {
  const payload = buildWelcomeEmail(recipient, senderEmail, getOrigin());
  assert.deepEqual(payload.to, [{ email: recipient.email }]);
  assert.match(payload.htmlContent, /&lt;Customer &amp; Co&gt;/);
  assert.match(payload.textContent, /Hi <Customer & Co>,/);
  for (const path of ['/shop', '/appointments/new', '/help']) {
    const href = new URL(path, getOrigin()).href;
    assert.ok(payload.htmlContent.includes('href="' + href + '"'));
    assert.ok(payload.textContent.includes(href));
  }
  assert.match(buildWelcomeEmail({ ...recipient, name: ' ' }, senderEmail, getOrigin()).textContent,
    /Valued Customer/);
});

test('skips an unconfigured sender before claiming and only sends once per customer', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  t.mock.method(console, 'warn', () => {});
  const customerId = '00000000-0000-4000-8000-000000000001';
  const staffId = '00000000-0000-4000-8000-000000000002';
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.roles (id integer primary key, scope text not null);
    create table public.users (id uuid primary key, role_id integer references public.roles(id));
    insert into public.roles values (1, 'customer'), (2, 'staff');
    insert into public.users values ('${customerId}', 1), ('${staffId}', 2);
  `);
  for (const name of [
    '20240101000113_user_welcome_email_sent_at.sql',
    '20240101000114_claim_customer_welcome_email.sql',
  ]) {
    const migration = new URL('../supabase/migrations/' + name, import.meta.url);
    await db.exec(await readFile(migration, 'utf8'));
  }

  const queryClaim = 'select public.claim_customer_welcome_email($1) as claimed';
  for (const role of ['anon', 'authenticated']) {
    await db.exec('set role ' + role);
    await assert.rejects(db.query(queryClaim, [customerId]), /permission denied/);
  }
  await db.exec('set role service_role');
  await assert.rejects(db.query('select id from public.users limit 0'), /permission denied/);
  assert.deepEqual((await db.query(queryClaim, [staffId])).rows, [{ claimed: false }]);

  const claim = t.mock.fn(async () => {
    const { rows } = await db.query(queryClaim, [customerId]);
    return rows[0].claimed;
  });
  const send = t.mock.fn(async () => new Response(null, { status: 201 }));
  const options = { recipient, senderEmail, getOrigin, claim, send };
  await deliverWelcomeEmail(options);
  assert.equal(claim.mock.callCount(), 0);
  assert.equal(send.mock.callCount(), 0);

  const configured = { ...options, apiKey: 'test-key' };
  await Promise.all([deliverWelcomeEmail(configured), deliverWelcomeEmail(configured)]);
  await deliverWelcomeEmail(configured);
  assert.equal(claim.mock.callCount(), 3);
  assert.equal(send.mock.callCount(), 1);
  const [url, request] = send.mock.calls[0].arguments;
  assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
  assert.deepEqual(JSON.parse(request.body), buildWelcomeEmail(recipient, senderEmail, getOrigin()));
});

test('a transport failure is logged without rejecting the background task', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  await deliverWelcomeEmail({
    recipient, senderEmail, getOrigin, apiKey: 'test-key', claim: async () => true,
    send: async () => { throw new Error('Provider unavailable'); },
  });
  assert.deepEqual(warn.mock.calls[0].arguments, ['Welcome email could not be sent.']);
});
