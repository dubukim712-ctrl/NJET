-- Atomic dispatch/receipt for inter-branch inventory transfers.
-- Run after 20240101000016_inventory_management_rpcs.sql.

create or replace function public.dispatch_branch_transfer(
  p_source_branch_id uuid,
  p_destination_branch_id uuid,
  p_items jsonb,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transfer_id uuid;
  v_item record;
  v_variant_type text;
  v_stock integer;
  v_updated integer;
begin
  if not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to dispatch inventory transfers.';
  end if;
  if p_source_branch_id = p_destination_branch_id
    or not exists (select 1 from public.branches where id = p_source_branch_id and active)
    or not exists (select 1 from public.branches where id = p_destination_branch_id and active) then
    raise exception 'Choose two different active branches.';
  end if;
  if p_note is not null and length(trim(p_note)) > 500 then
    raise exception 'Transfer notes must be 500 characters or fewer.';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Transfer items must be a list.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Transfer between 1 and 30 product variants at a time.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or coalesce(jsonb_typeof(e.value->'variant_id'), '') <> 'string'
      or coalesce(jsonb_typeof(e.value->'quantity'), '') <> 'number'
      or coalesce(jsonb_typeof(e.value->'unit_ids'), '') <> 'array'
      or not case
        when coalesce(e.value->>'quantity', '') ~ '^[0-9]{1,4}$'
          then (e.value->>'quantity')::integer between 1 and 1000
        else false
      end
  ) then
    raise exception 'A transfer item is invalid.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(value)
    cross join lateral jsonb_array_elements(e.value->'unit_ids') as u(value)
    where jsonb_typeof(u.value) <> 'string'
      or u.value #>> '{}' !~ '^[0-9a-f-]{8}-[0-9a-f-]{4}-[1-8][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}$'
  ) then
    raise exception 'A selected e-bike unit is invalid.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items)
      as i(variant_id uuid, quantity integer, unit_ids jsonb)
    group by i.variant_id having count(*) > 1
  ) then
    raise exception 'Add each product variant only once per transfer.';
  end if;
  if exists (
    select u.value from jsonb_array_elements(p_items) as e(value)
    cross join lateral jsonb_array_elements(e.value->'unit_ids') as u(value)
    group by u.value having count(*) > 1
  ) then
    raise exception 'Select each e-bike unit only once.';
  end if;

  insert into public.branch_transfers (
    source_branch_id, destination_branch_id, note, dispatched_by
  ) values (
    p_source_branch_id, p_destination_branch_id, nullif(trim(p_note), ''), auth.uid()
  ) returning id into v_transfer_id;

  perform set_config('njet.inventory_type', 'transfer_dispatched', true);
  perform set_config('njet.inventory_reference', v_transfer_id::text, true);
  for v_item in
    select i.variant_id, i.quantity, i.unit_ids
    from jsonb_to_recordset(p_items) as i(
      variant_id uuid, quantity integer, unit_ids jsonb
    )
    order by i.variant_id
  loop
    select p.product_type into v_variant_type
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_item.variant_id
    for update of v;
    if not found then
      raise exception 'A selected product variant no longer exists.';
    end if;
    if (v_variant_type = 'ebike'
      and jsonb_array_length(v_item.unit_ids) <> v_item.quantity)
      or (v_variant_type <> 'ebike' and jsonb_array_length(v_item.unit_ids) <> 0) then
      raise exception 'Select one serial-numbered unit for each e-bike; batch items use quantity only.';
    end if;
    select i.stock into v_stock from public.branch_inventory i
    where i.branch_id = p_source_branch_id and i.variant_id = v_item.variant_id
    for update;
    if v_stock is null or v_stock < v_item.quantity then
      raise exception 'The source branch does not have enough stock for this transfer.';
    end if;

    insert into public.branch_transfer_items (transfer_id, variant_id, quantity)
    values (v_transfer_id, v_item.variant_id, v_item.quantity);

    if v_variant_type = 'ebike' then
      update public.ebike_units
      set status = 'in_transit', transfer_id = v_transfer_id
      where id in (
        select nullif(u.value #>> '{}', '')::uuid
        from jsonb_array_elements(v_item.unit_ids) as u(value)
      )
        and variant_id = v_item.variant_id
        and branch_id = p_source_branch_id
        and status = 'in_stock'
        and order_item_id is null;
      get diagnostics v_updated = row_count;
      if v_updated <> v_item.quantity then
        raise exception 'An e-bike unit is no longer available at the source branch.';
      end if;
      insert into public.branch_transfer_units (transfer_item_id, unit_id)
      select i.id, nullif(u.value #>> '{}', '')::uuid
      from public.branch_transfer_items i
      cross join lateral jsonb_array_elements(v_item.unit_ids) as u(value)
      where i.transfer_id = v_transfer_id and i.variant_id = v_item.variant_id;
    end if;

    update public.branch_inventory
    set stock = stock - v_item.quantity
    where branch_id = p_source_branch_id and variant_id = v_item.variant_id;
  end loop;
  return v_transfer_id;
end;
$$;

create or replace function public.receive_branch_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transfer public.branch_transfers%rowtype;
  v_item record;
  v_variant_type text;
  v_updated integer;
begin
  if not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to receive inventory transfers.';
  end if;
  select * into v_transfer from public.branch_transfers
  where id = p_transfer_id for update;
  if not found or v_transfer.status <> 'in_transit' then
    raise exception 'This transfer is not awaiting receipt.';
  end if;
  perform 1
  from public.branch_inventory stock
  join public.branch_transfer_items item on item.variant_id = stock.variant_id
  where item.transfer_id = p_transfer_id
    and stock.branch_id = v_transfer.destination_branch_id
  order by stock.variant_id
  for update of stock;
  perform set_config('njet.inventory_type', 'transfer_received', true);
  perform set_config('njet.inventory_reference', p_transfer_id::text, true);
  for v_item in
    select i.id, i.variant_id, i.quantity
    from public.branch_transfer_items i
    where i.transfer_id = p_transfer_id
    order by i.variant_id
  loop
    select p.product_type into v_variant_type
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_item.variant_id;
    if v_variant_type = 'ebike' then
      update public.ebike_units u
      set branch_id = v_transfer.destination_branch_id,
          status = 'in_stock', transfer_id = null
      from public.branch_transfer_units tu
      where tu.transfer_item_id = v_item.id and u.id = tu.unit_id
        and u.status = 'in_transit' and u.transfer_id = p_transfer_id;
      get diagnostics v_updated = row_count;
      if v_updated <> v_item.quantity then
        raise exception 'The transferred e-bike units could not be verified.';
      end if;
    end if;
    insert into public.branch_inventory (branch_id, variant_id, stock)
    values (v_transfer.destination_branch_id, v_item.variant_id, v_item.quantity)
    on conflict (branch_id, variant_id)
    do update set stock = public.branch_inventory.stock + excluded.stock;
  end loop;
  update public.branch_transfers
  set status = 'received', received_by = auth.uid(), received_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function public.dispatch_branch_transfer(uuid, uuid, jsonb, text) from public, anon;
revoke all on function public.receive_branch_transfer(uuid) from public, anon;
grant execute on function public.dispatch_branch_transfer(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.receive_branch_transfer(uuid) to authenticated;

notify pgrst, 'reload schema';
