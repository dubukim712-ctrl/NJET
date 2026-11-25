import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('public callers can read the latest published version but cannot enumerate policy history', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create table public.storefront_legal_policy_versions (
      id bigint primary key, slug text, version text, intro text, sections jsonb, created_at timestamptz
    );
    create unique index public_policy_version_unique on public.storefront_legal_policy_versions (version);
    alter table public.storefront_legal_policy_versions enable row level security;
    create policy "Visitors can view legal policy versions" on public.storefront_legal_policy_versions
      for select to anon, authenticated using (true);
    grant select on public.storefront_legal_policy_versions to anon, authenticated;
    create function public.current_user_is_full_access() returns boolean language sql stable as $$
      select current_setting('test.full_access', true) = 'on'
    $$;
    insert into public.storefront_legal_policy_versions values
      (1, 'terms', 'old-terms', 'Old wording', '[]', now()),
      (2, 'terms', 'new-terms', 'New wording', '[]', now()),
      (3, 'privacy', 'current-privacy', 'Privacy wording', '[]', now());
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20240101000133_current_storefront_legal_policy.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20240101000134_current_legal_policy_legacy_reads.sql', import.meta.url), 'utf8'));
  const current = "select version from public.current_storefront_legal_policy('terms')";
  const history = 'select version from public.storefront_legal_policy_versions order by id';
  await db.exec('set role anon');
  assert.deepEqual((await db.query(current)).rows, [{ version: 'new-terms' }]);
  assert.deepEqual((await db.query(history)).rows, [{ version: 'new-terms' }, { version: 'current-privacy' }]);
  await db.exec('set role authenticated');
  assert.deepEqual((await db.query(current)).rows, [{ version: 'new-terms' }]);
  const legacyCheckout = "select version from public.storefront_legal_policy_versions where slug = 'terms' order by id desc limit 1";
  assert.deepEqual((await db.query(legacyCheckout)).rows, (await db.query(current)).rows);
  assert.deepEqual((await db.query(history)).rows, [{ version: 'new-terms' }, { version: 'current-privacy' }]);
  await db.exec("select set_config('test.full_access','on',false)");
  assert.equal((await db.query(history)).rows.length, 3);
});
