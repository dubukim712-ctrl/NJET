-- Assign staff to one branch and restrict access to branch-owned data.
-- Run after 20240101000023_branch_audit_logging.sql.

alter table public.users
  add column branch_id uuid references public.branches(id) on delete set null;
create index users_branch_id_idx on public.users (branch_id);

create or replace function public.current_user_is_branch_scoped()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and r.scope = 'staff'
      and not r.is_full_access
  );
$$;

create or replace function public.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.branch_id from public.users u where u.id = auth.uid();
$$;

create or replace function public.current_user_can_access_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.current_user_is_branch_scoped()
    or (p_branch_id is not null and p_branch_id = public.current_user_branch_id());
$$;

revoke all on function public.current_user_is_branch_scoped() from public, anon;
revoke all on function public.current_user_branch_id() from public, anon;
revoke all on function public.current_user_can_access_branch(uuid) from public, anon;
grant execute on function public.current_user_is_branch_scoped() to authenticated;
grant execute on function public.current_user_branch_id() to authenticated;
grant execute on function public.current_user_can_access_branch(uuid) to authenticated;

create or replace function public.guard_user_branch_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_assign_branch boolean;
begin
  select r.scope = 'staff' and not r.is_full_access
  into v_can_assign_branch
  from public.roles r where r.id = new.role_id;
  if new.branch_id is not null and not coalesce(v_can_assign_branch, false) then
    if tg_op = 'UPDATE' and new.role_id is distinct from old.role_id
      and new.branch_id is not distinct from old.branch_id then
      new.branch_id := null;
    else
      raise exception 'Only non-full-access staff roles can be assigned to a branch.';
    end if;
  end if;
  return new;
end;
$$;

create trigger users_branch_assignment_guard
  before insert or update of role_id, branch_id on public.users
  for each row execute procedure public.guard_user_branch_assignment();

create or replace function public.assign_user_branch(
  p_user_id uuid,
  p_branch_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_scope text;
  v_is_full_access boolean;
begin
  if not public.current_user_has_permission('users.manage') then
    raise exception 'You do not have permission to manage users.';
  end if;
  select r.scope, r.is_full_access into v_role_scope, v_is_full_access
  from public.users u join public.roles r on r.id = u.role_id
  where u.id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;
  if v_role_scope <> 'staff' or v_is_full_access then
    raise exception 'Only non-full-access staff roles can be assigned to a branch.';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.branches where id = p_branch_id and active
  ) then
    raise exception 'Choose an active branch.';
  end if;
  update public.users set branch_id = p_branch_id where id = p_user_id;
end;
$$;

revoke all on function public.assign_user_branch(uuid, uuid) from public, anon;
grant execute on function public.assign_user_branch(uuid, uuid) to authenticated;
revoke all on function public.guard_user_branch_assignment() from public, anon, authenticated;

create or replace function public.user_branch_options()
returns table(id uuid, name text, active boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('users.manage') then
    raise exception 'You do not have permission to manage users.';
  end if;
  return query
  select b.id, b.name, b.active
  from public.branches b
  order by b.name
  limit 200;
end;
$$;
revoke all on function public.user_branch_options() from public, anon;
grant execute on function public.user_branch_options() to authenticated;

drop view if exists public.user_profiles;
create view public.user_profiles
with (security_invoker = true)
as
select
  u.id, u.email, u.full_name, u.avatar_url, u.role_id, u.branch_id,
  b.name as branch_name,
  r.slug as role, r.name as role_name, r.scope, r.is_full_access,
  public.role_permission_keys(u.role_id) as permissions,
  u.created_at, u.updated_at
from public.users u
join public.roles r on r.id = u.role_id
left join public.branches b on b.id = u.branch_id;
-- Branch labels are included for user administration; inventory remains scoped
-- separately by row-level security on branch-owned tables.
revoke all on public.user_profiles from anon;
grant select on public.user_profiles to authenticated;

drop policy if exists "Staff can manage branches" on public.branches;
create policy "Staff can update accessible branches"
  on public.branches for update to authenticated
  using (public.current_user_has_permission('branches.manage')
    and public.current_user_can_access_branch(id))
  with check (public.current_user_has_permission('branches.manage')
    and public.current_user_can_access_branch(id));
create policy "Unscoped staff can create branches"
  on public.branches for insert to authenticated
  with check (public.current_user_has_permission('branches.manage')
    and not public.current_user_is_branch_scoped());
create policy "Unscoped staff can delete branches"
  on public.branches for delete to authenticated
  using (public.current_user_has_permission('branches.manage')
    and not public.current_user_is_branch_scoped());

drop policy if exists "Storefront and staff can view branch stock" on public.branch_inventory;
create policy "Storefront and staff can view branch stock"
  on public.branch_inventory for select to authenticated
  using (
    (
      (public.current_user_has_permission('products.read')
        or public.current_user_has_permission('products.manage'))
      and public.current_user_can_access_branch(branch_id)
    )
    or (
      public.current_user_has_permission('storefront.access')
      and public.current_user_can_access_branch(branch_id)
      and exists (select 1 from public.branches b where b.id = branch_id and b.active)
      and exists (
        select 1 from public.product_variants v
        join public.products p on p.id = v.product_id
        where v.id = variant_id and v.active and p.active
      )
    )
  );
drop policy if exists "Staff can manage branch stock" on public.branch_inventory;
create policy "Staff can manage accessible branch stock"
  on public.branch_inventory for all to authenticated
  using (public.current_user_has_permission('products.manage')
    and public.current_user_can_access_branch(branch_id))
  with check (public.current_user_has_permission('products.manage')
    and public.current_user_can_access_branch(branch_id));

drop policy if exists "Customers and order readers can view orders" on public.orders;
create policy "Customers and order readers can view orders"
  on public.orders for select to authenticated
  using (
    (
      customer_id = auth.uid()
      and public.current_user_can_access_branch(branch_id)
    )
    or (
      (public.current_user_has_permission('orders.read')
        or public.current_user_has_permission('orders.manage'))
      and public.current_user_can_access_branch(branch_id)
    )
  );

drop policy if exists "Customers and order readers can view order items" on public.order_items;
create policy "Customers and order readers can view order items"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
drop policy if exists "Customers and order readers can view order documents" on public.order_documents;
create policy "Customers and order readers can view order documents"
  on public.order_documents for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

drop policy if exists "Staff can view e-bike unit records" on public.ebike_units;
create policy "Staff can view accessible e-bike unit records"
  on public.ebike_units for select to authenticated
  using (
    (public.current_user_has_permission('products.read')
      or public.current_user_has_permission('products.manage'))
    and (
      public.current_user_can_access_branch(branch_id)
      or exists (
        select 1 from public.branch_transfers t
        where t.id = transfer_id
          and (public.current_user_can_access_branch(t.source_branch_id)
            or public.current_user_can_access_branch(t.destination_branch_id))
      )
    )
  );
drop policy if exists "Staff can view inventory movements" on public.inventory_movements;
create policy "Staff can view accessible inventory movements"
  on public.inventory_movements for select to authenticated
  using (
    (public.current_user_has_permission('products.read')
      or public.current_user_has_permission('products.manage'))
    and public.current_user_can_access_branch(branch_id)
  );

drop policy if exists "Product managers can view branch transfers" on public.branch_transfers;
create policy "Staff can view accessible branch transfers"
  on public.branch_transfers for select to authenticated
  using (
    (public.current_user_has_permission('products.read')
      or public.current_user_has_permission('products.manage'))
    and (public.current_user_can_access_branch(source_branch_id)
      or public.current_user_can_access_branch(destination_branch_id))
  );
drop policy if exists "Product managers can view transfer items" on public.branch_transfer_items;
create policy "Staff can view accessible transfer items"
  on public.branch_transfer_items for select to authenticated
  using (exists (select 1 from public.branch_transfers t where t.id = transfer_id));
drop policy if exists "Product managers can view transferred units" on public.branch_transfer_units;
create policy "Staff can view accessible transferred units"
  on public.branch_transfer_units for select to authenticated
  using (exists (
    select 1 from public.branch_transfer_items i
    where i.id = transfer_item_id
  ));

drop policy if exists "Customers and order readers can view order documents" on storage.objects;
create policy "Customers and order readers can view order documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'njet-order-documents'
    and (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        and not public.current_user_is_branch_scoped()
      )
      or exists (
        select 1 from public.order_documents d where d.object_path = name
      )
    )
  );

notify pgrst, 'reload schema';
