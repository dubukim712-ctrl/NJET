-- ============================================================================
-- Permission helpers, role RPCs, and the permission-aware profile view
-- Run after 20240101000004_permissions_schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Permission helpers
-- ----------------------------------------------------------------------------
create or replace function public.current_user_has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when r.is_full_access then exists (
          select 1 from public.permissions p where p.key = p_key
        )
        else exists (
          select 1
          from public.role_permissions rp
          where rp.role_id = u.role_id
            and rp.permission_key = p_key
        )
      end
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_user_is_full_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select r.is_full_access
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_user_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when r.is_full_access then array(
          select p.key
          from public.permissions p
          order by p.sort_order, p.key
        )
        else array(
          select rp.permission_key
          from public.role_permissions rp
          where rp.role_id = u.role_id
          order by rp.permission_key
        )
      end
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
    ),
    '{}'::text[]
  );
$$;

create or replace function public.role_permission_keys(p_role_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when r.is_full_access then array(
          select p.key
          from public.permissions p
          order by p.sort_order, p.key
        )
        else array(
          select rp.permission_key
          from public.role_permissions rp
          where rp.role_id = r.id
          order by rp.permission_key
        )
      end
      from public.roles r
      where r.id = p_role_id
    ),
    '{}'::text[]
  );
$$;

-- Deprecated aliases kept for one release so older policies keep working.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_permission('admin.access');
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_full_access();
$$;

-- ----------------------------------------------------------------------------
-- Validation helpers
-- ----------------------------------------------------------------------------
create or replace function public.validate_role_permission_set(
  p_scope text,
  p_permission_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keys text[] := coalesce(p_permission_keys, '{}'::text[]);
begin
  if p_scope not in ('staff', 'customer') then
    raise exception 'Invalid role scope.';
  end if;

  if exists (
    select 1
    from unnest(v_keys) as k(permission_key)
    where not exists (
      select 1 from public.permissions p where p.key = k.permission_key
    )
  ) then
    raise exception 'One or more permissions do not exist.';
  end if;

  if exists (
    select 1
    from unnest(v_keys) as k(permission_key)
    join public.permissions p on p.key = k.permission_key
    where (p_scope = 'staff' and p.surface <> 'admin')
       or (p_scope = 'customer' and p.surface <> 'storefront')
  ) then
    raise exception 'Permissions must match the role scope.';
  end if;

  if p_scope = 'staff' and not ('admin.access' = any(v_keys)) then
    raise exception 'Staff roles must include admin.access.';
  end if;

  if p_scope = 'customer' and not ('storefront.access' = any(v_keys)) then
    raise exception 'Customer roles must include storefront.access.';
  end if;

  if exists (
    select 1
    from unnest(v_keys) as k(permission_key)
    where k.permission_key like '%.manage'
      and not (
        regexp_replace(k.permission_key, '\.manage$', '.read') = any(v_keys)
      )
  ) then
    raise exception 'Manage permissions require the matching read permission.';
  end if;
end;
$$;

create or replace function public.assert_can_grant_permissions(
  p_permission_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_permissions text[];
begin
  if public.current_user_is_full_access() then
    return;
  end if;

  v_actor_permissions := public.current_user_permissions();

  if exists (
    select 1
    from unnest(coalesce(p_permission_keys, '{}'::text[])) as k(permission_key)
    where not (k.permission_key = any(v_actor_permissions))
  ) then
    raise exception 'You cannot grant permissions you do not have.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Role RPCs
-- ----------------------------------------------------------------------------
create or replace function public.create_role(
  p_slug text,
  p_name text,
  p_description text,
  p_scope text,
  p_permission_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_keys text[] := coalesce(p_permission_keys, '{}'::text[]);
begin
  if not public.current_user_has_permission('roles.manage') then
    raise exception 'You do not have permission to manage roles.';
  end if;

  if p_slug !~ '^[a-z0-9_]+$' then
    raise exception 'Use lowercase letters, numbers, and underscores for the slug.';
  end if;

  perform public.validate_role_permission_set(p_scope, v_keys);
  perform public.assert_can_grant_permissions(v_keys);

  insert into public.roles (slug, name, description, scope, is_system, is_full_access)
  values (p_slug, p_name, p_description, p_scope, false, false)
  returning id into v_role_id;

  insert into public.role_permissions (role_id, permission_key)
  select v_role_id, k.permission_key
  from unnest(v_keys) as k(permission_key)
  on conflict (role_id, permission_key) do nothing;

  return v_role_id;
end;
$$;

create or replace function public.set_role_permissions(
  p_role_id uuid,
  p_permission_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.roles%rowtype;
  v_keys text[] := coalesce(p_permission_keys, '{}'::text[]);
  v_actor_permissions text[];
  v_current_keys text[];
begin
  if not public.current_user_has_permission('roles.manage') then
    raise exception 'You do not have permission to manage roles.';
  end if;

  select * into v_role from public.roles where id = p_role_id;
  if not found then
    raise exception 'Role not found.';
  end if;

  if v_role.is_full_access then
    raise exception 'Full-access roles always have every permission and cannot be edited.';
  end if;

  perform public.validate_role_permission_set(v_role.scope, v_keys);

  if not public.current_user_is_full_access() then
    v_actor_permissions := public.current_user_permissions();
    v_current_keys := public.role_permission_keys(p_role_id);

    if exists (
      select 1
      from unnest(v_current_keys) as k(permission_key)
      where not (k.permission_key = any(v_actor_permissions))
    ) then
      raise exception 'You cannot manage a role with permissions you do not have.';
    end if;
  end if;

  perform public.assert_can_grant_permissions(v_keys);

  delete from public.role_permissions
  where role_id = p_role_id
    and not (permission_key = any(v_keys));

  insert into public.role_permissions (role_id, permission_key)
  select p_role_id, k.permission_key
  from unnest(v_keys) as k(permission_key)
  on conflict (role_id, permission_key) do nothing;
end;
$$;

-- ----------------------------------------------------------------------------
-- Role assignment RPC
-- ----------------------------------------------------------------------------
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
  v_actor_is_full boolean;
  v_target_role_id uuid;
  v_target_role public.roles%rowtype;
  v_new_role public.roles%rowtype;
  v_actor_permissions text[];
  v_target_permissions text[];
  v_new_permissions text[];
begin
  if v_actor is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.current_user_has_permission('users.manage') then
    raise exception 'You do not have permission to manage users.';
  end if;

  v_actor_is_full := public.current_user_is_full_access();

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

  if not v_actor_is_full then
    if v_new_role.is_full_access then
      raise exception 'Only full-access admins can assign a full-access role.';
    end if;

    if v_target_role.is_full_access then
      raise exception 'Only full-access admins can change a full-access user''s role.';
    end if;

    if v_new_role.scope <> v_target_role.scope then
      raise exception 'You cannot move a user between staff and customer roles.';
    end if;

    v_actor_permissions := public.current_user_permissions();
    v_new_permissions := public.role_permission_keys(p_role_id);

    if exists (
      select 1
      from unnest(v_new_permissions) as k(permission_key)
      where not (k.permission_key = any(v_actor_permissions))
    ) then
      raise exception 'You cannot assign a role with permissions you do not have.';
    end if;

    v_target_permissions := public.role_permission_keys(v_target_role_id);

    if exists (
      select 1
      from unnest(v_target_permissions) as k(permission_key)
      where not (k.permission_key = any(v_actor_permissions))
    ) then
      raise exception 'You cannot change a user whose role has permissions you do not have.';
    end if;
  end if;

  if v_target_role.is_full_access and not v_new_role.is_full_access then
    if not exists (
      select 1
      from public.users u
      join public.roles r on r.id = u.role_id
      where r.is_full_access and u.id <> p_user_id
    ) then
      raise exception 'At least one full-access admin is required.';
    end if;
  end if;

  update public.users
  set role_id = p_role_id
  where id = p_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Profile read model
-- ----------------------------------------------------------------------------
drop view if exists public.user_profiles;

create view public.user_profiles
with (security_invoker = true)
as
select
  u.id,
  u.email,
  u.full_name,
  u.avatar_url,
  u.role_id,
  r.slug as role,
  r.name as role_name,
  r.scope,
  r.is_full_access,
  public.role_permission_keys(u.role_id) as permissions,
  u.created_at,
  u.updated_at
from public.users u
join public.roles r on r.id = u.role_id;

revoke all on public.user_profiles from anon;
grant select on public.user_profiles to authenticated;

-- ----------------------------------------------------------------------------
-- Function grants
-- ----------------------------------------------------------------------------
revoke all on function public.current_user_has_permission(text) from public, anon;
revoke all on function public.current_user_is_full_access() from public, anon;
revoke all on function public.current_user_permissions() from public, anon;
revoke all on function public.role_permission_keys(uuid) from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.current_user_is_super_admin() from public, anon;

grant execute on function public.current_user_has_permission(text) to authenticated;
grant execute on function public.current_user_is_full_access() to authenticated;
grant execute on function public.current_user_permissions() to authenticated;
grant execute on function public.role_permission_keys(uuid) to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_super_admin() to authenticated;

revoke all on function public.validate_role_permission_set(text, text[]) from public, anon, authenticated;
revoke all on function public.assert_can_grant_permissions(text[]) from public, anon, authenticated;

revoke all on function public.create_role(text, text, text, text, text[]) from public, anon;
revoke all on function public.set_role_permissions(uuid, text[]) from public, anon;
revoke all on function public.assign_user_role(uuid, uuid) from public, anon;

grant execute on function public.create_role(text, text, text, text, text[]) to authenticated;
grant execute on function public.set_role_permissions(uuid, text[]) to authenticated;
grant execute on function public.assign_user_role(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
