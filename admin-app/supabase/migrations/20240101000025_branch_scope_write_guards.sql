-- Guard writes made through security-definer commerce RPCs.
-- Run after 20240101000024_user_branch_assignment.sql.

create or replace function public.guard_branch_scoped_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_branch_id uuid;
begin
  if not public.current_user_is_branch_scoped() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  v_branch_id := case when tg_op = 'DELETE' then old.branch_id else new.branch_id end;
  if v_branch_id is distinct from public.current_user_branch_id() then
    raise exception 'You can only access your assigned branch.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger branch_inventory_scope_guard
  before insert or update or delete on public.branch_inventory
  for each row execute procedure public.guard_branch_scoped_write();
create trigger ebike_units_scope_guard
  before insert or update or delete on public.ebike_units
  for each row execute procedure public.guard_branch_scoped_write();
create trigger inventory_movements_scope_guard
  before insert or update or delete on public.inventory_movements
  for each row execute procedure public.guard_branch_scoped_write();
create trigger orders_scope_guard
  before insert or update or delete on public.orders
  for each row execute procedure public.guard_branch_scoped_write();

create or replace function public.guard_branch_transfer_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_branch_id uuid := public.current_user_branch_id();
begin
  if not public.current_user_is_branch_scoped() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'INSERT' and new.source_branch_id is distinct from v_branch_id then
    raise exception 'You can only dispatch transfers from your assigned branch.';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status
    and (new.status <> 'received' or new.destination_branch_id is distinct from v_branch_id) then
    raise exception 'You can only receive transfers at your assigned branch.';
  end if;
  if tg_op = 'DELETE'
    and old.source_branch_id is distinct from v_branch_id
    and old.destination_branch_id is distinct from v_branch_id then
    raise exception 'You can only access transfers involving your assigned branch.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger branch_transfers_scope_guard
  before insert or update or delete on public.branch_transfers
  for each row execute procedure public.guard_branch_transfer_scope();

revoke all on function public.guard_branch_scoped_write() from public, anon, authenticated;
revoke all on function public.guard_branch_transfer_scope() from public, anon, authenticated;

create or replace function public.available_ebike_stock(p_variant_ids uuid[])
returns table(variant_id uuid, branch_id uuid, stock bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (
    public.current_user_has_permission('storefront.access')
    or public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
  ) then
    raise exception 'You are not allowed to view inventory availability.';
  end if;
  if p_variant_ids is null or cardinality(p_variant_ids) > 500 then
    raise exception 'Choose no more than 500 product variants.';
  end if;
  return query
  select u.variant_id, u.branch_id, count(*)::bigint
  from public.ebike_units u
  join public.product_variants v on v.id = u.variant_id
  join public.products p on p.id = v.product_id
  join public.branches b on b.id = u.branch_id
  where u.status = 'in_stock'
    and u.variant_id = any(p_variant_ids)
    and public.current_user_can_access_branch(u.branch_id)
    and (
      public.current_user_has_permission('products.read')
      or public.current_user_has_permission('products.manage')
      or (v.active and p.active and b.active)
    )
  group by u.variant_id, u.branch_id;
end;
$$;

revoke all on function public.available_ebike_stock(uuid[]) from public, anon;
grant execute on function public.available_ebike_stock(uuid[]) to authenticated;

notify pgrst, 'reload schema';
