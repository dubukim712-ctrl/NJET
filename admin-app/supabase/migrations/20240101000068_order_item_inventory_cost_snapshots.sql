create or replace function public.record_ebike_cost_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status and new.status = 'sold'
    and new.order_item_id is not null then
    insert into public.order_item_cost_allocations (
      order_item_id, ebike_unit_id, quantity, unit_cost_minor
    ) values (new.order_item_id, new.id, 1, new.unit_cost_minor);
  elsif old.status = 'sold' and new.status = 'in_stock'
    and old.order_item_id is not null then
    update public.order_item_cost_allocations
    set status = 'released'
    where ebike_unit_id = old.id and status = 'allocated';
  end if;
  return new;
end;
$$;

create trigger ebike_units_record_cost_allocation
  after update of status on public.ebike_units
  for each row execute function public.record_ebike_cost_allocation();
revoke all on function public.record_ebike_cost_allocation()
  from public, anon, authenticated;

create or replace function public.snapshot_confirmed_order_costs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status and new.status = 'confirmed' then
    perform set_config('njet.order_cost_snapshot', 'on', true);
    update public.order_items i
    set cost_total_minor = case
          when costs.allocated_quantity = i.quantity and not costs.has_unknown_cost
            then costs.total_cost_minor
          else null
        end,
        unit_cost_minor = case
          when costs.allocated_quantity = i.quantity and not costs.has_unknown_cost
            then round(costs.total_cost_minor::numeric / i.quantity)::integer
          else null
        end
    from (
      select i.id,
        coalesce(sum(a.quantity) filter (where a.status = 'allocated'), 0) as allocated_quantity,
        coalesce(bool_or(a.unit_cost_minor is null)
          filter (where a.status = 'allocated'), false) as has_unknown_cost,
        coalesce(sum(a.unit_cost_minor::bigint * a.quantity)
          filter (where a.status = 'allocated' and a.unit_cost_minor is not null), 0)
          as total_cost_minor
      from public.order_items i
      left join public.order_item_cost_allocations a on a.order_item_id = i.id
      where i.order_id = new.id
      group by i.id
    ) costs
    where i.id = costs.id;
    perform set_config('njet.order_cost_snapshot', 'off', true);
  end if;
  return new;
end;
$$;

create or replace function public.guard_order_item_cost_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    new.unit_cost_minor is distinct from old.unit_cost_minor
    or new.cost_total_minor is distinct from old.cost_total_minor
  ) and coalesce(current_setting('njet.order_cost_snapshot', true), '') <> 'on' then
    raise exception 'Order item costs are fixed when inventory is committed.';
  end if;
  return new;
end;
$$;

create trigger order_items_cost_snapshot_guard
  before update of unit_cost_minor, cost_total_minor on public.order_items
  for each row execute function public.guard_order_item_cost_snapshot();
revoke all on function public.guard_order_item_cost_snapshot()
  from public, anon, authenticated;

create trigger orders_snapshot_confirmed_costs
  after update of status on public.orders
  for each row execute function public.snapshot_confirmed_order_costs();
revoke all on function public.snapshot_confirmed_order_costs()
  from public, anon, authenticated;

create or replace function public.mark_completed_order_costs_sold()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status and new.status = 'completed' then
    update public.order_item_cost_allocations a
    set status = 'sold'
    from public.order_items i
    where i.order_id = new.id and a.order_item_id = i.id
      and a.status = 'allocated';
  end if;
  return new;
end;
$$;

create trigger orders_mark_completed_costs_sold
  after update of status on public.orders
  for each row execute function public.mark_completed_order_costs_sold();
revoke all on function public.mark_completed_order_costs_sold()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
