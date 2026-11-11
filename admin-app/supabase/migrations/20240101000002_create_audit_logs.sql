-- ============================================================================
-- Audit logs: append-only record of write actions with before/after snapshots
-- Run after 20240101000001_create_users_table.sql
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  -- Denormalized so the log stays readable if the account is removed.
  actor_email text,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_table_name_idx on public.audit_logs (table_name);
create index audit_logs_action_idx on public.audit_logs (action);

alter table public.audit_logs enable row level security;

-- Admins can read the log. There are no client write policies: rows are
-- written only by the security definer trigger below.
create policy "Admins can view audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.current_user_is_admin());

revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;

-- ----------------------------------------------------------------------------
-- Generic audit trigger
-- Captures the full row before and after each write. Attach it only to tables
-- whose rows are safe to store in the log and that have an "id" column.
-- ----------------------------------------------------------------------------
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_actor_id uuid := auth.uid();
  v_actor_email text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_new := to_jsonb(new);
  end if;

  -- Resolve a readable actor label at write time.
  select email into v_actor_email
  from public.users
  where id = v_actor_id;

  insert into public.audit_logs (
    actor_id,
    actor_email,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  )
  values (
    v_actor_id,
    v_actor_email,
    lower(tg_op),
    tg_table_name,
    coalesce(v_new->>'id', v_old->>'id'),
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_users_changes on public.users;
create trigger audit_users_changes
  after insert or update or delete on public.users
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_roles_changes on public.roles;
create trigger audit_roles_changes
  after insert or update or delete on public.roles
  for each row execute procedure public.log_audit_event();

-- Ask PostgREST to pick up the new table immediately.
notify pgrst, 'reload schema';
