-- ============================================================================
-- RBAC management: hierarchy guards, role assignment RPC, and role hardening
-- Run after 20240101000001_create_users_table.sql
-- and 20240101000002_create_audit_logs.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Capability consistency
-- ----------------------------------------------------------------------------
-- A super admin always has admin access. Normalize existing rows first so the
-- constraint can be added safely.
update public.roles
set is_admin = true
where is_super_admin and not is_admin;

alter table public.roles
  add constraint roles_super_admin_requires_admin
  check (not is_super_admin or is_admin);

-- Defense in depth: treat super admins as admins even if data is changed
-- outside the constraint (for example by a future migration).
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select r.is_admin or r.is_super_admin
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
    ),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Role column privileges
-- ----------------------------------------------------------------------------
-- Clients may create and edit role definitions, but cannot set is_system or
-- change a slug after creation. RLS still limits writes to super admins.
revoke insert, update on table public.roles from authenticated;
grant insert (slug, name, description, is_admin, is_super_admin)
  on table public.roles to authenticated;
grant update (name, description, is_admin, is_super_admin)
  on table public.roles to authenticated;

-- ----------------------------------------------------------------------------
-- Protect system roles from deletion
-- ----------------------------------------------------------------------------
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

-- The base schema blocks slug, capability, and is_system changes on system
-- roles. Tighten it further so display fields are read-only too.
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
    new.is_system = false or
    new.is_admin <> old.is_admin or
    new.is_super_admin <> old.is_super_admin
  ) then
    raise exception 'System roles are read-only.';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Last super admin protection
-- ----------------------------------------------------------------------------
create or replace function public.protect_last_super_admin()
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
      select 1 from public.roles
      where id = old.role_id and is_super_admin
    ) then
      select count(*) into v_remaining
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_super_admin and u.id <> old.id;

      if v_remaining = 0 then
        raise exception 'At least one super admin is required.';
      end if;
    end if;
    return old;
  end if;

  if old.role_id is distinct from new.role_id then
    if exists (
      select 1 from public.roles
      where id = old.role_id and is_super_admin
    ) and not exists (
      select 1 from public.roles
      where id = new.role_id and is_super_admin
    ) then
      select count(*) into v_remaining
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_super_admin and u.id <> old.id;

      if v_remaining = 0 then
        raise exception 'At least one super admin is required.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_user_protect_last_super_admin on public.users;
create trigger on_user_protect_last_super_admin
  before update of role_id or delete on public.users
  for each row execute procedure public.protect_last_super_admin();

-- Changing a role's is_super_admin flag can demote every user on that role at
-- once, so it must respect the same last-super-admin rule.
create or replace function public.protect_role_super_admin_capability()
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

  if old.is_super_admin and not new.is_super_admin then
    select count(*) into v_remaining
    from public.users u
    join public.roles r on r.id = u.role_id
    where r.is_super_admin and r.id <> old.id;

    if v_remaining = 0 then
      raise exception 'At least one super admin is required.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_role_protect_last_super_admin on public.roles;
create trigger on_role_protect_last_super_admin
  before update of is_super_admin on public.roles
  for each row execute procedure public.protect_role_super_admin_capability();

-- ----------------------------------------------------------------------------
-- Role assignment RPC
-- ----------------------------------------------------------------------------
-- Direct role_id updates are intentionally not granted to clients. This
-- function is the only supported path and enforces the admin hierarchy.
create or replace function public.assign_user_role(
  p_user_id uuid,
  p_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_is_super boolean;
  v_target_role_id uuid;
  v_target_role public.roles%rowtype;
  v_new_role public.roles%rowtype;
begin
  if v_actor is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'You do not have permission to manage users.';
  end if;

  v_actor_is_super := public.current_user_is_super_admin();

  select role_id into v_target_role_id
  from public.users
  where id = p_user_id;

  if v_target_role_id is null then
    raise exception 'User not found.';
  end if;

  select * into v_new_role
  from public.roles
  where id = p_role_id;

  if not found then
    raise exception 'Role not found.';
  end if;

  select * into v_target_role
  from public.roles
  where id = v_target_role_id;

  if not found then
    raise exception 'The user''s current role could not be found.';
  end if;

  -- Submitting the same role is a no-op; avoid a misleading audit entry.
  if v_target_role_id = p_role_id then
    return;
  end if;

  if p_user_id = v_actor then
    raise exception 'You cannot change your own role.';
  end if;

  if not v_actor_is_super then
    if v_new_role.is_admin or v_new_role.is_super_admin then
      raise exception 'Only super admins can assign administrative roles.';
    end if;

    if v_target_role.is_admin or v_target_role.is_super_admin then
      raise exception 'Only super admins can change an administrator''s role.';
    end if;
  end if;

  if v_target_role.is_super_admin and not v_new_role.is_super_admin then
    if not exists (
      select 1
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_super_admin and u.id <> p_user_id
    ) then
      raise exception 'At least one super admin is required.';
    end if;
  end if;

  update public.users
  set role_id = p_role_id
  where id = p_user_id;
end;
$$;

revoke all on function public.assign_user_role(uuid, uuid) from public, anon;
grant execute on function public.assign_user_role(uuid, uuid) to authenticated;

-- Ask PostgREST to pick up the new function immediately.
notify pgrst, 'reload schema';
