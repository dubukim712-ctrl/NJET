create or replace function public.sync_inventory_stock_batches()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delta integer;
  v_type text;
  v_reference uuid;
  v_product_type text;
  v_item record;
  v_batch public.inventory_stock_batches%rowtype;
  v_transfer_item_id uuid;
  v_destination_branch_id uuid;
  v_remaining integer;
  v_take integer;
  v_allocated integer := 0;
begin
  if tg_op = 'INSERT' then
    v_delta := new.stock;
  else
    v_delta := new.stock - old.stock;
  end if;
  v_type := coalesce(nullif(current_setting('njet.inventory_type', true), ''), 'adjustment');
  v_reference := nullif(current_setting('njet.inventory_reference', true), '')::uuid;
  if v_delta = 0 then return new; end if;
  select p.product_type into v_product_type
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = new.variant_id;
  if v_product_type = 'ebike' then return new; end if;

  if v_type = 'stock_received' then
    return new;
  elsif v_type = 'order_confirmed' then
    if v_reference is null or v_delta >= 0 then
      raise exception 'Order stock movement is missing its reference.';
    end if;
    for v_item in
      select i.id, i.quantity
      from public.order_items i
      join public.orders o on o.id = i.order_id
      where i.order_id = v_reference and i.variant_id = new.variant_id
        and o.branch_id = new.branch_id
      order by i.id
    loop
      v_remaining := v_item.quantity;
      while v_remaining > 0 loop
        select * into v_batch
        from public.inventory_stock_batches b
        where b.branch_id = new.branch_id and b.variant_id = new.variant_id
          and b.quantity_remaining > 0 and not b.is_in_transit
        order by b.received_at nulls first, b.created_at, b.id
        limit 1 for update;
        if not found then
          raise exception 'Received-cost batches do not cover the order stock.';
        end if;
        v_take := least(v_remaining, v_batch.quantity_remaining);
        update public.inventory_stock_batches
        set quantity_remaining = quantity_remaining - v_take
        where id = v_batch.id;
        insert into public.order_item_cost_allocations (
          order_item_id, stock_batch_id, quantity, unit_cost_minor
        ) values (v_item.id, v_batch.id, v_take, v_batch.unit_cost_minor);
        v_remaining := v_remaining - v_take;
        v_allocated := v_allocated + v_take;
      end loop;
    end loop;
    if v_allocated <> -v_delta then
      raise exception 'Order quantity and received-cost batches do not match.';
    end if;
  elsif v_type = 'order_cancelled' then
    if v_reference is null or v_delta <= 0 then
      raise exception 'Order return movement is missing its reference.';
    end if;
    for v_item in
      select a.id, a.stock_batch_id, a.quantity
      from public.order_item_cost_allocations a
      join public.order_items i on i.id = a.order_item_id
      where i.order_id = v_reference and i.variant_id = new.variant_id
        and a.status = 'allocated' and a.stock_batch_id is not null
      order by a.id
      for update of a
    loop
      update public.inventory_stock_batches
      set quantity_remaining = quantity_remaining + v_item.quantity
      where id = v_item.stock_batch_id
        and quantity_remaining + v_item.quantity <= quantity_received;
      if not found then
        raise exception 'The original stock batch could not be restored.';
      end if;
      update public.order_item_cost_allocations
      set status = 'released' where id = v_item.id;
      v_allocated := v_allocated + v_item.quantity;
    end loop;
    if v_allocated = 0 then
      insert into public.inventory_stock_batches (
        branch_id, variant_id, source, received_at, quantity_received, quantity_remaining
      ) values (
        new.branch_id, new.variant_id, 'adjustment', now(), v_delta, v_delta
      );
    elsif v_allocated <> v_delta then
      raise exception 'The cancelled order stock allocation is incomplete.';
    end if;
  elsif v_type = 'transfer_dispatched' then
    if v_reference is null or v_delta >= 0 then
      raise exception 'Transfer stock movement is missing its reference.';
    end if;
    select i.id, t.destination_branch_id
    into v_transfer_item_id, v_destination_branch_id
    from public.branch_transfer_items i
    join public.branch_transfers t on t.id = i.transfer_id
    where i.transfer_id = v_reference and i.variant_id = new.variant_id
      and t.source_branch_id = new.branch_id;
    if not found then raise exception 'The transfer item could not be matched.'; end if;
    v_remaining := -v_delta;
    while v_remaining > 0 loop
      select * into v_batch
      from public.inventory_stock_batches b
      where b.branch_id = new.branch_id and b.variant_id = new.variant_id
        and b.quantity_remaining > 0 and not b.is_in_transit
      order by b.received_at nulls first, b.created_at, b.id
      limit 1 for update;
      if not found then raise exception 'Received-cost batches do not cover the transfer.'; end if;
      v_take := least(v_remaining, v_batch.quantity_remaining);
      update public.inventory_stock_batches
      set quantity_remaining = quantity_remaining - v_take where id = v_batch.id;
      insert into public.inventory_stock_batches (
        branch_id, variant_id, parent_batch_id, transfer_item_id, source,
        received_at, quantity_received, quantity_remaining,
        unit_cost_minor, is_in_transit
      ) values (
        v_destination_branch_id, new.variant_id, v_batch.id, v_transfer_item_id,
        'transfer', v_batch.received_at, v_take, v_take,
        v_batch.unit_cost_minor, true
      );
      v_remaining := v_remaining - v_take;
    end loop;
  elsif v_type = 'transfer_received' then
    select i.id into v_transfer_item_id
    from public.branch_transfer_items i
    join public.branch_transfers t on t.id = i.transfer_id
    where i.transfer_id = v_reference and i.variant_id = new.variant_id
      and t.destination_branch_id = new.branch_id;
    if not found then raise exception 'The received transfer item could not be matched.'; end if;
    perform 1 from public.inventory_stock_batches b
    where b.transfer_item_id = v_transfer_item_id and b.is_in_transit
    for update;
    select coalesce(sum(b.quantity_remaining), 0) into v_allocated
    from public.inventory_stock_batches b
    where b.transfer_item_id = v_transfer_item_id and b.is_in_transit;
    if v_allocated <> v_delta then
      raise exception 'The received quantity does not match the transferred batches.';
    end if;
    update public.inventory_stock_batches
    set is_in_transit = false
    where transfer_item_id = v_transfer_item_id and is_in_transit;
  elsif v_delta > 0 then
    insert into public.inventory_stock_batches (
      branch_id, variant_id, source, received_at, quantity_received, quantity_remaining
    ) values (
      new.branch_id, new.variant_id, 'adjustment', now(), v_delta, v_delta
    );
  else
    v_remaining := -v_delta;
    while v_remaining > 0 loop
      select * into v_batch
      from public.inventory_stock_batches b
      where b.branch_id = new.branch_id and b.variant_id = new.variant_id
        and b.quantity_remaining > 0 and not b.is_in_transit
      order by b.received_at nulls first, b.created_at, b.id
      limit 1 for update;
      if not found then raise exception 'The stock adjustment exceeds available batches.'; end if;
      v_take := least(v_remaining, v_batch.quantity_remaining);
      update public.inventory_stock_batches
      set quantity_remaining = quantity_remaining - v_take where id = v_batch.id;
      v_remaining := v_remaining - v_take;
    end loop;
  end if;
  return new;
end;
$$;

create trigger branch_inventory_sync_stock_batches
  after insert or update of stock on public.branch_inventory
  for each row execute function public.sync_inventory_stock_batches();
revoke all on function public.sync_inventory_stock_batches()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
