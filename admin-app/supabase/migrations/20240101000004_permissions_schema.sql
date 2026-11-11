-- ============================================================================
-- Granular permissions: catalog, role scope, and role-permission seeds
-- Run after 20240101000003_rbac_management.sql
-- ============================================================================

-- The role merge below deletes legacy system roles. Remove the old guards
-- temporarily; 20240101000006_permissions_guards.sql installs replacements.
drop trigger if exists on_role_protect_system on public.roles;
drop trigger if exists on_role_protect_system_delete on public.roles;
drop trigger if exists on_user_protect_last_super_admin on public.users;
drop trigger if exists on_role_protect_last_super_admin on public.roles;

-- ----------------------------------------------------------------------------
-- Permission catalog
-- ----------------------------------------------------------------------------
create table public.permissions (
  key text primary key check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  name text not null,
  description text,
  group_name text not null,
  surface text not null check (surface in ('admin', 'storefront')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.permissions (key, name, description, group_name, surface, sort_order)
values
  ('admin.access', 'Admin panel', 'Open the staff admin panel.', 'Admin panel', 'admin', 10),
  ('users.read', 'View users', 'View accounts and their assigned roles.', 'Users', 'admin', 20),
  ('users.manage', 'Manage users', 'Edit accounts and assign roles.', 'Users', 'admin', 21),
  ('roles.read', 'View roles', 'View roles and their permissions.', 'Roles', 'admin', 30),
  ('roles.manage', 'Manage roles', 'Create, edit, and delete roles and assign permissions.', 'Roles', 'admin', 31),
  ('audit_logs.read', 'View audit logs', 'Review recorded changes and their before/after data.', 'Audit logs', 'admin', 40),
  ('storefront.access', 'Storefront', 'Open the customer storefront.', 'Storefront', 'storefront', 50);

-- ----------------------------------------------------------------------------
-- Role-permission join
-- ----------------------------------------------------------------------------
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (role_id, permission_key)
);

create index role_permissions_role_id_idx on public.role_permissions (role_id);
create index role_permissions_permission_key_idx on public.role_permissions (permission_key);

-- ----------------------------------------------------------------------------
-- Role scope and full-access flag
-- ----------------------------------------------------------------------------
alter table public.roles
  add column scope text not null default 'staff'
    check (scope in ('staff', 'customer')),
  add column is_full_access boolean not null default false;

alter table public.roles
  add constraint roles_full_access_is_staff
  check (not is_full_access or scope = 'staff');

-- ----------------------------------------------------------------------------
-- Seed and normalize system roles
-- ----------------------------------------------------------------------------
insert into public.roles (slug, name, description, is_system, scope, is_full_access)
values
  ('sales', 'Sales', 'Limited staff access for sales work.', true, 'staff', false),
  ('technician', 'Technician', 'Limited staff access for technical work.', true, 'staff', false),
  ('customer', 'Customer', 'Storefront access for customers.', true, 'customer', false)
on conflict (slug) do nothing;

update public.roles
set scope = 'staff', is_full_access = true, is_system = true
where slug = 'admin';

update public.roles
set scope = 'staff', is_full_access = false, is_system = true
where slug in ('sales', 'technician');

update public.roles
set scope = 'customer', is_full_access = false, is_system = true
where slug = 'customer';

-- ----------------------------------------------------------------------------
-- Migrate custom roles from the old capability flags
-- ----------------------------------------------------------------------------
-- super-admin roles become staff roles with every admin permission.
-- admin-only roles become staff roles with the management set they could use.
-- everything else becomes a customer role.
update public.roles
set scope = case
  when is_super_admin or is_admin then 'staff'
  else 'customer'
end
where slug not in ('admin', 'sales', 'technician', 'customer', 'user', 'super_admin');

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.slug not in ('admin', 'sales', 'technician', 'customer', 'user', 'super_admin')
  and r.is_super_admin
  and p.surface = 'admin'
on conflict (role_id, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in (
  'admin.access', 'users.read', 'users.manage', 'audit_logs.read'
)
where r.slug not in ('admin', 'sales', 'technician', 'customer', 'user', 'super_admin')
  and r.is_admin
  and not r.is_super_admin
on conflict (role_id, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key = 'storefront.access'
where r.slug not in ('admin', 'sales', 'technician', 'customer', 'user', 'super_admin')
  and not r.is_admin
  and not r.is_super_admin
on conflict (role_id, permission_key) do nothing;

-- ----------------------------------------------------------------------------
-- Starter permissions for the built-in roles
-- ----------------------------------------------------------------------------
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in ('admin.access', 'users.read')
where r.slug = 'sales'
on conflict (role_id, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key = 'admin.access'
where r.slug = 'technician'
on conflict (role_id, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key = 'storefront.access'
where r.slug = 'customer'
on conflict (role_id, permission_key) do nothing;

-- Full-access roles never store explicit rows; they inherit every permission.
delete from public.role_permissions
where role_id = (select id from public.roles where slug = 'admin');

-- ----------------------------------------------------------------------------
-- Merge legacy roles into customer and admin
-- ----------------------------------------------------------------------------
update public.users
set role_id = (select id from public.roles where slug = 'customer')
where role_id in (select id from public.roles where slug = 'user');

update public.users
set role_id = (select id from public.roles where slug = 'admin')
where role_id in (select id from public.roles where slug = 'super_admin');

delete from public.roles where slug in ('user', 'super_admin');

-- ----------------------------------------------------------------------------
-- New signups are customers
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, role_id)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    (select id from public.roles where slug = 'customer')
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS and grants
-- ----------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

create policy "Authenticated users can view permissions"
  on public.permissions for select
  to authenticated
  using (true);

create policy "Authenticated users can view role permissions"
  on public.role_permissions for select
  to authenticated
  using (true);

revoke all on table public.permissions from anon, authenticated;
grant select on table public.permissions to authenticated;

revoke all on table public.role_permissions from anon, authenticated;
grant select on table public.role_permissions to authenticated;

-- Role writes go through the security-definer RPCs. Direct updates are limited
-- to display fields so a client cannot change scope or full access.
revoke insert, update on table public.roles from authenticated;
grant update (name, description) on table public.roles to authenticated;

notify pgrst, 'reload schema';
