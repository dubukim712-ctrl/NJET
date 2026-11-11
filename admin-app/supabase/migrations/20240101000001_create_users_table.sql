-- ============================================================================
-- Phase 1: dynamic roles, users table, RLS policies, and signup trigger
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  -- Capability flags let new roles inherit access without code changes.
  is_admin boolean not null default false,
  is_super_admin boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.roles (slug, name, description, is_admin, is_super_admin, is_system)
values
  ('user', 'User', 'Standard customer access', false, false, true),
  ('admin', 'Admin', 'Administrative access', true, false, true),
  ('super_admin', 'Super Admin', 'Full administrative access', true, true, true)
on conflict (slug) do nothing;

alter table public.roles enable row level security;

-- ----------------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index users_email_idx on public.users (email);
create index users_role_id_idx on public.users (role_id);

alter table public.users enable row level security;

-- ----------------------------------------------------------------------------
-- Role capability helpers (security definer avoids RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.slug
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid();
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select r.is_admin
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select r.is_super_admin
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
    ),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Users policies
-- ----------------------------------------------------------------------------
create policy "Users can view own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.users for select
  to authenticated
  using (public.current_user_is_admin());

create policy "Admins can update all profiles"
  on public.users for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy "Super admins can delete users"
  on public.users for delete
  to authenticated
  using (public.current_user_is_super_admin());

-- ----------------------------------------------------------------------------
-- Roles policies: everyone can read, only super admins can manage
-- ----------------------------------------------------------------------------
create policy "Authenticated users can view roles"
  on public.roles for select
  to authenticated
  using (true);

create policy "Super admins can create roles"
  on public.roles for insert
  to authenticated
  with check (public.current_user_is_super_admin());

create policy "Super admins can update roles"
  on public.roles for update
  to authenticated
  using (public.current_user_is_super_admin())
  with check (public.current_user_is_super_admin());

create policy "Super admins can delete roles"
  on public.roles for delete
  to authenticated
  using (public.current_user_is_super_admin() and not is_system);

-- ----------------------------------------------------------------------------
-- Privilege hardening
-- ----------------------------------------------------------------------------
-- Profiles are created by the signup trigger, never directly by clients.
revoke insert on table public.users from anon, authenticated;

-- Only signed-in users can read profiles (RLS limits rows to their own).
revoke all on table public.users from anon;
grant select on table public.users to authenticated;

-- Clients may only edit display fields; role changes are privileged.
revoke update on table public.users from anon, authenticated;
grant update (full_name, avatar_url) on table public.users to authenticated;

revoke delete on table public.users from anon;
grant delete on table public.users to authenticated;

revoke all on table public.roles from anon;
grant select, insert, update, delete on table public.roles to authenticated;

-- ----------------------------------------------------------------------------
-- Signup trigger: create a profile with the default role
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
    (select id from public.roles where slug = 'user')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for accounts that already exist.
insert into public.users (id, email, full_name, avatar_url, role_id)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  (select id from public.roles where slug = 'user')
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Keep the profile email in sync when the auth email changes.
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_updated();

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger on_user_updated
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger on_role_updated
  before update on public.roles
  for each row execute procedure public.handle_updated_at();

-- System roles are referenced by the signup trigger; keep them stable.
create or replace function public.protect_system_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_system and (
    new.slug <> old.slug or
    new.is_system = false or
    new.is_admin <> old.is_admin or
    new.is_super_admin <> old.is_super_admin
  ) then
    raise exception 'System roles cannot be renamed, demoted, or have capabilities changed';
  end if;
  return new;
end;
$$;

create trigger on_role_protect_system
  before update on public.roles
  for each row execute procedure public.protect_system_roles();

-- ----------------------------------------------------------------------------
-- Read model: profiles joined with their role capabilities
-- security_invoker keeps the caller's RLS in force.
-- ----------------------------------------------------------------------------
create or replace view public.user_profiles
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
  r.is_admin,
  r.is_super_admin,
  u.created_at,
  u.updated_at
from public.users u
join public.roles r on r.id = u.role_id;

revoke all on public.user_profiles from anon;
grant select on public.user_profiles to authenticated;

-- Ask PostgREST to pick up the new tables and view immediately.
notify pgrst, 'reload schema';