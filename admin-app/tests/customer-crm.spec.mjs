import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { buildCrmCustomersHref, buildCrmFollowUpsHref, getCrmDueState, getCrmQueueFilters, getCrmToday } from '../lib/crm-view.ts';

const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

test('CRM keeps customer data and follow-up mutations scoped by role and branch', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec([
    'create role anon; create role authenticated; create schema auth;',
    "create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.crm_actor', true), '')::uuid $$;",
    'create table public.permissions (key text primary key, name text, description text, group_name text, surface text, sort_order int);',
    'create table public.roles (id uuid primary key, slug text, scope text, is_full_access boolean);',
    'create table public.role_permissions (role_id uuid, permission_key text, unique(role_id, permission_key));',
    'create table public.branches (id uuid primary key, name text, active boolean);',
    'create table public.users (id uuid primary key, role_id uuid, branch_id uuid, full_name text, email text, phone_number text,',
    'phone_verified_at timestamptz, street_address text, barangay_name text, city_name text, province_name text, postal_code text);',
    'create table public.orders (id uuid, customer_id uuid, branch_id uuid, order_number text, branch_name text, status text, created_at timestamptz);',
    'create table public.order_items (id uuid, order_id uuid, product_name text, variant_name text, product_type text);',
    'create table public.ebike_units (id uuid, order_item_id uuid, status text, serial_number text);',
    'create table public.service_appointments (id uuid, customer_id uuid, branch_id uuid, branch_name text, appointment_number text,',
    'scheduled_at timestamptz, preferred_start_at timestamptz, status text, created_at timestamptz);',
    'create table public.support_chat_threads (id uuid, customer_user_id uuid, status text, last_message_at timestamptz);',
    'create table public.support_chat_messages (thread_id uuid, sender_role text);',
    'create function public.current_user_has_permission(k text) returns boolean language sql stable security definer as $$',
    'select exists (select 1 from public.users u join public.roles r on u.role_id = r.id',
    'where u.id = auth.uid() and (r.is_full_access or exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_key = k))) $$;',
    'create function public.current_user_can_access_branch(b uuid) returns boolean language sql stable security definer as $$',
    'select exists (select 1 from public.users u join public.roles r on u.role_id = r.id',
    'where u.id = auth.uid() and r.scope = \'staff\' and (r.is_full_access or u.branch_id = b)) $$;',
  ].join(' '));
  await db.query(
    "insert into public.roles values ($1,'sales','staff',false), ($2,'customer','customer',false), ($3,'admin','staff',true), ($4,'technician','staff',false)",
    [id(1), id(2), id(3), id(4)],
  );
  await db.query("insert into public.branches values ($1,'East',true), ($2,'West',true)", [id(5), id(6)]);
  await db.query(
    'insert into public.users (id, role_id, branch_id, full_name) values ' +
    "($1,$7,$10,'Sales East'), ($2,$7,$11,'Sales West'), ($3,$8,null,'Customer East')," +
    "($4,$8,null,'Customer West'), ($5,$9,null,'Admin'), ($6,$12,$10,'Technician')",
    [id(7), id(8), id(9), id(10), id(11), id(12), id(1), id(2), id(3), id(5), id(6), id(4)],
  );
  await db.query("insert into public.role_permissions values ($1,'admin.access'), ($1,'orders.read'), ($2,'admin.access')", [id(1), id(4)]);
  await db.query(
    "insert into public.orders values ($1,$3,$5,'NJET-E','East','completed',now()), ($2,$4,$6,'NJET-W','West','completed',now())",
    [id(13), id(14), id(9), id(10), id(5), id(6)],
  );
  await db.query("insert into public.order_items values ($1,$2,'Cruiser','Red','ebike')", [id(15), id(13)]);
  await db.query("insert into public.ebike_units values ($1,$2,'sold','SERIAL-42')", [id(16), id(15)]);
  for (const file of ['20240101000118_customer_crm.sql', '20240101000119_customer_crm_queries.sql', '20240101000120_crm_follow_up_views.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
  }

  const actAs = (actor) => db.query("select set_config('test.crm_actor', $1, false)", [actor]);
  const search = (term = '') => db.query('select id from public.crm_customers(null, $1, 0) order by id', [term]);
  await db.exec('set role authenticated');
  await actAs(id(9));
  assert.deepEqual((await search()).rows, []);
  await actAs(id(12));
  assert.deepEqual((await search()).rows, []);
  await actAs(id(11));
  assert.deepEqual((await search()).rows, [{ id: id(9) }, { id: id(10) }]);
  await actAs(id(7));
  assert.deepEqual((await search()).rows, [{ id: id(9) }]);
  assert.deepEqual((await search('SERIAL-42')).rows, [{ id: id(9) }]);
  assert.deepEqual((await search('%')).rows, []);
  const activity = 'select reference, bikes from public.crm_customer_activity($1)';
  assert.deepEqual((await db.query(activity, [id(10)])).rows, []);
  assert.deepEqual((await db.query(activity, [id(9)])).rows, [{
    reference: 'NJET-E', bikes: [{ name: 'Cruiser', variant: 'Red', serial: 'SERIAL-42' }],
  }]);
  const note = 'insert into public.crm_customer_notes (customer_id, branch_id, body) values ($1,$2,$3)';
  await assert.rejects(db.query(note, [id(10), id(5), 'Cross-branch']), /row-level security/);
  await db.query(note, [id(9), id(5), 'Customer asked for a callback']);
  const task = 'insert into public.crm_follow_ups (customer_id, branch_id, assignee_id, due_on, next_action) values ($1,$2,$3,$4,$5) returning id';
  await assert.rejects(db.query(task, [id(9), id(5), id(8), '2026-12-01', 'Call back']), /row-level security/);
  const created = await db.query(task, [id(9), id(5), id(7), '2026-12-01', 'Call back']);
  const taskId = created.rows[0].id;
  const dates = await db.query("select (now() at time zone 'Asia/Manila')::date::text as today, ((now() at time zone 'Asia/Manila')::date - 1)::text as yesterday");
  const { today, yesterday } = dates.rows[0];
  const [dueToday, overdue] = await Promise.all([
    db.query(task, [id(9), id(5), id(7), today, 'Check pickup']),
    db.query(task, [id(9), id(5), id(7), yesterday, 'Call about service']),
  ]);
  const queue = 'select id from public.crm_follow_up_page($1,$2,$3,$4,$5)';
  assert.deepEqual((await db.query(queue, ['open', true, 'today', 'pickup', 0])).rows, dueToday.rows);
  assert.deepEqual((await db.query(queue, ['open', true, 'overdue', 'service', 0])).rows, overdue.rows);
  assert.deepEqual((await db.query(queue, ['open', true, 'overdue', 'service', 1])).rows, []);
  await actAs(id(11));
  assert.deepEqual((await db.query(queue, ['open', true, 'today', 'pickup', 0])).rows, []);
  assert.deepEqual((await db.query(queue, ['open', false, 'today', 'pickup', 0])).rows, dueToday.rows);
  await actAs(id(7));
  const summary = await db.query('select recent_branch_name, open_follow_ups from public.crm_customers($1, $2, 0)', [id(9), '']);
  assert.deepEqual(summary.rows, [{ recent_branch_name: 'East', open_follow_ups: 3 }]);
  await assert.rejects(db.query("update public.crm_follow_ups set next_action = 'changed' where id = $1", [taskId]), /permission denied/);
  await actAs(id(8));
  assert.deepEqual((await db.query(queue, ['open', false, 'today', 'pickup', 0])).rows, []);
  assert.deepEqual((await db.query('select * from public.crm_notes($1)', [id(9)])).rows, []);
  const update = "update public.crm_follow_ups set status = 'completed' where id = $1 returning id";
  assert.deepEqual((await db.query(update, [taskId])).rows, []);
  await actAs(id(7));
  assert.deepEqual((await db.query(update, [taskId])).rows, [{ id: taskId }]);
  assert.deepEqual((await db.query("select id from public.crm_follow_up_queue(null, 'completed')")).rows, [{ id: taskId }]);
});

test('CRM due labels and URL filters use Philippine calendar days', () => {
  assert.equal(getCrmToday(new Date('2026-11-25T15:59:00Z')), '2026-11-25');
  const today = getCrmToday(new Date('2026-11-25T16:00:00Z'));
  assert.equal(today, '2026-11-26');
  assert.equal(getCrmDueState('2026-11-25', 'open', today), 'Overdue');
  assert.equal(getCrmDueState(today, 'open', today), 'Due today');
  assert.equal(getCrmDueState('2026-11-27', 'open', today), 'Upcoming');
  assert.equal(getCrmDueState('2026-11-25', 'completed', today), 'Completed');
  assert.deepEqual(getCrmQueueFilters({ status: 'completed', due: 'overdue', assignee: 'mine', page: '2', q: '  call  ' }),
    { status: 'completed', due: 'any', mine: true, page: 2, search: 'call' });
});

test('CRM filter URLs preserve active filters and reset pagination on changes', () => {
  const filters = getCrmQueueFilters({ due: 'today', assignee: 'mine', q: '  A & B  ', page: '3' });
  const paged = new URL(buildCrmFollowUpsHref(filters, filters.page), 'https://example.test');
  assert.deepEqual(getCrmQueueFilters(Object.fromEntries(paged.searchParams)), filters);

  const completed = new URL(buildCrmFollowUpsHref({ ...filters, status: 'completed' }), 'https://example.test');
  assert.equal(completed.searchParams.get('assignee'), 'mine');
  assert.equal(completed.searchParams.get('q'), 'A & B');
  assert.equal(completed.searchParams.has('page'), false);
  assert.equal(completed.searchParams.has('due'), false);
  assert.equal(buildCrmCustomersHref(' SERIAL 42 ', 2), '/admin/crm?q=SERIAL+42&page=2');
  assert.equal(buildCrmCustomersHref(''), '/admin/crm');
});
