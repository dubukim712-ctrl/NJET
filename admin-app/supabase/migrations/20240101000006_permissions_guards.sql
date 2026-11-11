-- ============================================================================
-- Permission guards, RLS, audit coverage, and legacy flag removal
-- Run after 20240101000005_permissions_functions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Replace role guards
-- ----------------------------------------------------------------------------
create or replace function public.protect_system_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_system and (
    new.slug <> old.slug or
    new.name <> old.name or
    new.description is distinct from old.description or
    new.scope <> old.scope or
    new.is_system = false or
    new.is_full_access <> old.is_full_access
  ) then
    raise exception 'System role details are read-only. Permissions can still be edited.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_role_protect_system on public.roles;
create trigger on_role_protect_system
  before update on public.roles
  for each row execute procedure public.protect_system_roles();

create or replace function public.protect_system_role_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_system then
    raise exception 'System roles cannot be deleted.';
  end if;
  return old;
end;
$$;

drop trigger if exists on_role_protect_system_delete on public.roles;
create trigger on_role_protect_system_delete
  before delete on public.roles
  for each row execute procedure public.protect_system_role_delete();

-- ----------------------------------------------------------------------------
-- Last full-access admin protection
-- ----------------------------------------------------------------------------
create or replace function public.protect_last_full_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.roles where id = old.role_id and is_full_access
    ) then
      select count(*) into v_remaining
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_full_access and u.id <> old.id;

      if v_remaining = 0 then
        raise exception 'At least one full-access admin is required.';
      end if;
    end if;
    return old;
  end if;

  if old.role_id is distinct from new.role_id then
    if exists (
      select 1 from public.roles where id = old.role_id and is_full_access
    ) and not exists (
      select 1 from public.roles where id = new.role_id and is_full_access
    ) then
      select count(*) into v_remaining
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_full_access and u.id <> old.id;

      if v_remaining = 0 then
        raise exception 'At least one full-access admin is required.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_user_protect_last_super_admin on public.users;
drop trigger if exists on_user_protect_last_full_access on public.users;
create trigger on_user_protect_last_full_access
  before update of role_id or delete on public.users
  for each row execute procedure public.protect_last_full_access();

-- Removing full access from a role can demote every user on that role at once.
drop trigger if exists on_role_protect_last_super_admin on public.roles;
drop function if exists public.protect_role_super_admin_capability();

create or replace function public.protect_role_full_access_capability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  -- System roles are already protected by protect_system_roles().
  if old.is_system then
    return new;
  end if;

  if old.is_full_access and not new.is_full_access then
    if exists (select 1 from public.users where role_id = old.id) then
      select count(*) into v_remaining
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_full_access and r.id <> old.id;

      if v_remaining = 0 then
        raise exception 'At least one full-access admin is required.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_role_protect_last_full_access on public.roles;
create trigger on_role_protect_last_full_access
  before update of is_full_access on public.roles
  for each row execute procedure public.protect_role_full_access_capability();

-- ----------------------------------------------------------------------------
-- Role-permission validation
-- ----------------------------------------------------------------------------
create or replace function public.validate_role_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.roles%rowtype;
begin
  select * into v_role from public.roles where id = new.role_id;

  if not found then
    raise exception 'Role not found.';
  end if;

  if v_role.is_full_access then
    raise exception 'Full-access roles cannot have explicit permission rows.';
  end if;

  if not exists (
    select 1
    from public.permissions p
    where p.key = new.permission_key
      and (
        (v_role.scope = 'staff' and p.surface = 'admin')
        or (v_role.scope = 'customer' and p.surface = 'storefront')
      )
  ) then
    raise exception 'That permission does not match the role scope.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_role_permission_validate on public.role_permissions;
create trigger on_role_permission_validate
  before insert or update on public.role_permissions
  for each row execute procedure public.validate_role_permission();

create or replace function public.protect_role_permission_baseline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text;
begin
  select scope into v_scope from public.roles where id = old.role_id;

  if (v_scope = 'staff' and old.permission_key = 'admin.access')
     or (v_scope = 'customer' and old.permission_key = 'storefront.access') then
    raise exception 'The baseline access permission cannot be removed.';
  end if;

  return old;
end;
$$;

drop trigger if exists on_role_permission_baseline on public.role_permissions;
create trigger on_role_permission_baseline
  before delete on public.role_permissions
  for each row execute procedure public.protect_role_permission_baseline();

-- ----------------------------------------------------------------------------
-- Audit role-permission changes
-- ----------------------------------------------------------------------------
drop trigger if exists audit_role_permissions_changes on public.role_permissions;
create trigger audit_role_permissions_changes
  after insert or update or delete on public.role_permissions
  for each row execute procedure public.log_audit_event();

-- ----------------------------------------------------------------------------
-- RLS policies
-- ----------------------------------------------------------------------------
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Admins can view all profiles" on public.users;
drop policy if exists "Admins can update all profiles" on public.users;
drop policy if exists "Super admins can delete users" on public.users;

create policy "Users can view own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "Users with permission can view all profiles"
  on public.users for select
  to authenticated
  using (public.current_user_has_permission('users.read'));

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users with permission can update all profiles"
  on public.users for update
  to authenticated
  using (public.current_user_has_permission('users.manage'))
  with check (public.current_user_has_permission('users.manage'));

create policy "Full-access admins can delete users"
  on public.users for delete
  to authenticated
  using (public.current_user_is_full_access());

drop policy if exists "Authenticated users can view roles" on public.roles;
drop policy if exists "Super admins can create roles" on public.roles;
drop policy if exists "Super admins can update roles" on public.roles;
drop policy if exists "Super admins can delete roles" on public.roles;

create policy "Authenticated users can view roles"
  on public.roles for select
  to authenticated
  using (true);

create policy "Role managers can create roles"
  on public.roles for insert
  to authenticated
  with check (public.current_user_has_permission('roles.manage'));

create policy "Role managers can update roles"
  on public.roles for update
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

create policy "Role managers can delete roles"
  on public.roles for delete
  to authenticated
  using (
    public.current_user_has_permission('roles.manage')
    and not is_system
  );

drop policy if exists "Admins can view audit logs" on public.audit_logs;

create policy "Audit readers can view audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.current_user_has_permission('audit_logs.read'));

-- ----------------------------------------------------------------------------
-- Remove the legacy capability flags
-- ----------------------------------------------------------------------------
drop trigger if exists on_role_protect_last_super_admin on public.roles;
drop function if exists public.protect_last_super_admin();

alter table public.roles
  drop constraint if exists roles_super_admin_requires_admin;

alter table public.roles drop column if exists is_admin;
alter table public.roles drop column if exists is_super_admin;

notify pgrst, 'reload schema';
