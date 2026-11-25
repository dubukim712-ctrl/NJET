import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('the staff inbox and status actions require a customer message', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec([
    'create role anon; create role authenticated; create schema auth;',
    'create function auth.uid() returns uuid language sql as $$ select null::uuid $$;',
    "create function public.current_user_has_permission(text) returns boolean language sql as $$ select current_setting('test.chat_manage', true) = 'on' $$;",
    'create table public.support_chat_threads (id uuid primary key, customer_kind text, customer_name text,',
    'guest_email text, guest_phone text, status text, last_message_at timestamptz default now(),',
    'resolved_at timestamptz, resolved_by uuid);',
    'create table public.support_chat_messages (id uuid default gen_random_uuid(), thread_id uuid,',
    'body text, deleted_at timestamptz, sender_role text, sender_name text, created_at timestamptz default now());',
  ].join(' '));
  const account = '00000000-0000-4000-8000-000000000001';
  const guest = '00000000-0000-4000-8000-000000000002';
  const migration = new URL('../supabase/migrations/20240101000117_support_chat_started_conversations.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  await db.query(
    "insert into public.support_chat_threads (id, customer_kind, customer_name, status) values ($1, 'account', 'New customer', 'open'), ($2, 'guest', 'Legacy guest', 'resolved')",
    [account, guest],
  );

  const list = 'select id from public.support_chat_list_threads($1, $2)';
  const setStatus = 'select public.support_chat_set_status($1, $2)';
  await db.exec("set test.chat_manage = 'off'; set role authenticated;");
  await assert.rejects(db.query(list, [null, null]), /permission to view/);
  await assert.rejects(db.query(setStatus, [account, 'resolved']), /permission to manage/);
  await db.exec("set test.chat_manage = 'on'");
  for (const status of [null, 'open', 'resolved']) {
    assert.deepEqual((await db.query(list, [status, null])).rows, []);
  }
  await assert.rejects(db.query(setStatus, [account, 'resolved']), /customer message/);

  await db.exec('reset role');
  await db.query(
    "insert into public.support_chat_messages (thread_id, body, sender_role) values ($1, 'Staff-only message', 'staff'), ($2, 'Need help', 'customer')",
    [guest, account],
  );
  await db.exec('set role authenticated');
  assert.deepEqual((await db.query(list, ['open', 'Need help'])).rows, [{ id: account }]);
  assert.deepEqual((await db.query(list, [null, 'Legacy'])).rows, []);
  await assert.rejects(db.query(setStatus, [guest, 'open']), /customer message/);
  await db.query(setStatus, [account, 'resolved']);
  assert.deepEqual((await db.query(list, ['resolved', null])).rows, [{ id: account }]);
  await db.query(setStatus, [account, 'open']);
  assert.deepEqual((await db.query(list, ['open', null])).rows, [{ id: account }]);
});
