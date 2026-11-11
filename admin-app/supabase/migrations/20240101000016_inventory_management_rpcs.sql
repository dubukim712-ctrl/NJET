-- Permission-checked inventory adjustment and e-bike identification RPCs.
-- Run after 20240101000015_branch_transfer_schema.sql.

create or replace function public.save_batch_inventory(
  p_branch_id uuid,
  p_variant_id uuid,
  p_stock integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_type text;
begin
  if not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to manage inventory.';
  end if;
  if p_stock is null or p_stock not between 0 and 1000000 then
    raise exception 'Stock must be between 0 and 1,000,000.';
  end if;
  select p.product_type into v_product_type
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = p_variant_id
  for update of v;
  if not found then
    raise exception 'Choose a valid product variant.';
  end if;
  if v_product_type = 'ebike' then
    raise exception 'E-bike inventory must be entered with serial and motor numbers.';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Choose a valid branch.';
  end if;
  perform set_config('njet.inventory_type', 'adjustment', true);
  perform set_config('njet.inventory_reference', '', true);
  insert into public.branch_inventory (branch_id, variant_id, stock)
  values (p_branch_id, p_variant_id, p_stock)
  on conflict (branch_id, variant_id) do update set stock = excluded.stock;
end;
$$;

create or replace function public.register_ebike_units(
  p_branch_id uuid,
  p_variant_id uuid,
  p_units jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text;
  v_row record;
  v_added integer := 0;
begin
  if not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to manage inventory.';
  end if;
  if coalesce(jsonb_typeof(p_units), '') <> 'array' then
    raise exception 'Unit data must be an array.';
  end if;
  if jsonb_array_length(p_units) not between 1 and 50 then
    raise exception 'Enter between 1 and 50 e-bike units at a time.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_units) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or jsonb_typeof(e.value->'serial_number') <> 'string'
      or jsonb_typeof(e.value->'motor_number') <> 'string'
      or coalesce(length(trim(e.value->>'serial_number')), 0) not between 1 and 100
      or coalesce(length(trim(e.value->>'motor_number')), 0) not between 1 and 100
      or trim(e.value->>'serial_number') !~ '^[A-Za-z0-9._/-]+$'
      or trim(e.value->>'motor_number') !~ '^[A-Za-z0-9._/-]+$'
      or (e.value ? 'unit_id' and jsonb_typeof(e.value->'unit_id') not in ('string', 'null'))
  ) then
    raise exception 'Enter valid serial and motor numbers for every unit.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_units) as x(unit_id text, serial_number text, motor_number text)
    group by upper(trim(x.serial_number)) having count(*) > 1
  ) or exists (
    select 1 from jsonb_to_recordset(p_units) as x(unit_id text, serial_number text, motor_number text)
    group by upper(trim(x.motor_number)) having count(*) > 1
  ) then
    raise exception 'Serial and motor numbers must be unique in this entry.';
  end if;
  select p.product_type into v_type
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = p_variant_id
  for update of v;
  if not found or v_type <> 'ebike' then
    raise exception 'Choose an e-bike variant.';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Choose a valid branch.';
  end if;

  for v_row in
    select nullif(x.unit_id, '')::uuid as unit_id,
      upper(trim(x.serial_number)) as serial_number,
      upper(trim(x.motor_number)) as motor_number
    from jsonb_to_recordset(p_units) as x(unit_id text, serial_number text, motor_number text)
  loop
    if v_row.unit_id is null then
      insert into public.ebike_units (
        variant_id, branch_id, serial_number, motor_number, status
      ) values (
        p_variant_id, p_branch_id, v_row.serial_number, v_row.motor_number, 'in_stock'
      );
      v_added := v_added + 1;
    else
      update public.ebike_units
      set serial_number = v_row.serial_number,
          motor_number = v_row.motor_number,
          status = 'in_stock'
      where id = v_row.unit_id and variant_id = p_variant_id
        and branch_id = p_branch_id and status = 'needs_identification';
      if not found then
        raise exception 'An unassigned e-bike unit was changed or is no longer available.';
      end if;
      insert into public.inventory_movements (
        branch_id, variant_id, quantity_delta, movement_type, reference_id, actor_id
      ) values (
        p_branch_id, p_variant_id, 0, 'serial_identified', v_row.unit_id, auth.uid()
      );
    end if;
  end loop;
  if v_added > 0 then
    perform set_config('njet.inventory_type', 'serial_stock_received', true);
    perform set_config('njet.inventory_reference', '', true);
    insert into public.branch_inventory (branch_id, variant_id, stock)
    values (p_branch_id, p_variant_id, v_added)
    on conflict (branch_id, variant_id)
    do update set stock = public.branch_inventory.stock + excluded.stock;
  end if;
end;
$$;

create or replace function public.validate_ebike_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_branch_id uuid;
begin
  if new.product_type <> 'ebike' then
    return new;
  end if;
  select o.branch_id into v_branch_id from public.orders o where o.id = new.order_id;
  if (select count(*) from public.ebike_units u
      where u.variant_id = new.variant_id and u.branch_id = v_branch_id
        and u.status = 'in_stock') < new.quantity then
    raise exception 'This e-bike does not have enough identified units available at the selected branch.';
  end if;
  return new;
end;
$$;
create trigger order_item_ebike_stock_guard
  before insert on public.order_items
  for each row execute procedure public.validate_ebike_order_item_stock();

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
    and (
      public.current_user_has_permission('products.read')
      or public.current_user_has_permission('products.manage')
      or (v.active and p.active and b.active)
    )
  group by u.variant_id, u.branch_id;
end;
$$;

revoke all on function public.save_batch_inventory(uuid, uuid, integer) from public, anon;
revoke all on function public.register_ebike_units(uuid, uuid, jsonb) from public, anon;
revoke all on function public.available_ebike_stock(uuid[]) from public, anon;
revoke all on function public.validate_ebike_order_item_stock() from public, anon, authenticated;
grant execute on function public.save_batch_inventory(uuid, uuid, integer) to authenticated;
grant execute on function public.register_ebike_units(uuid, uuid, jsonb) to authenticated;
grant execute on function public.available_ebike_stock(uuid[]) to authenticated;

notify pgrst, 'reload schema';
