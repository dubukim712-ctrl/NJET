-- Allocate and restore individually tracked e-bikes with order stock movements.
-- Run after 20240101000017_branch_transfer_rpcs.sql.

create or replace function public.confirm_commerce_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to confirm orders.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'awaiting_confirmation' then
    raise exception 'This order is not awaiting confirmation.';
  end if;
  if exists (
    select 1 from public.order_items i
    where i.order_id = p_order_id and i.product_type = 'ebike'
  ) and not exists (
    select 1 from public.order_documents d
    where d.order_id = p_order_id and d.kind = 'identity'
  ) then
    raise exception 'Verify the e-bike customer identity documents before confirming.';
  end if;
  if v_order.payment_method = 'online' and not exists (
    select 1 from public.order_documents d
    where d.order_id = p_order_id and d.kind = 'payment_proof'
  ) then
    raise exception 'Verify the payment proof before confirming.';
  end if;

  perform 1
  from public.branch_inventory stock
  join public.order_items item on item.variant_id = stock.variant_id
  where item.order_id = p_order_id and stock.branch_id = v_order.branch_id
  order by stock.variant_id
  for update of stock;
  if exists (
    select 1 from public.order_items item
    left join public.branch_inventory stock
      on stock.branch_id = v_order.branch_id and stock.variant_id = item.variant_id
    where item.order_id = p_order_id
      and (stock.stock is null or stock.stock < item.quantity)
  ) then
    raise exception 'Stock changed before confirmation. Adjust inventory or cancel this order.';
  end if;

  for v_item in
    select id, variant_id, quantity from public.order_items
    where order_id = p_order_id and product_type = 'ebike'
    order by variant_id
  loop
    update public.ebike_units
    set status = 'sold', order_item_id = v_item.id
    where id in (
      select u.id from public.ebike_units u
      where u.variant_id = v_item.variant_id
        and u.branch_id = v_order.branch_id
        and u.status = 'in_stock' and u.order_item_id is null
      order by u.created_at, u.id
      for update skip locked
      limit v_item.quantity
    );
    get diagnostics v_updated = row_count;
    if v_updated <> v_item.quantity then
      raise exception 'There are not enough identified e-bike units to confirm this order.';
    end if;
  end loop;

  perform set_config('njet.inventory_type', 'order_confirmed', true);
  perform set_config('njet.inventory_reference', p_order_id::text, true);
  update public.branch_inventory stock
  set stock = stock.stock - item.quantity
  from public.order_items item
  where item.order_id = p_order_id
    and stock.branch_id = v_order.branch_id
    and stock.variant_id = item.variant_id;
  update public.orders
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.cancel_commerce_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to cancel orders.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status not in ('awaiting_confirmation', 'confirmed') then
    raise exception 'This order can no longer be cancelled.';
  end if;
  if v_order.status = 'confirmed' then
    if exists (
      select 1
      from public.order_items item
      left join public.branch_inventory stock
        on stock.branch_id = v_order.branch_id and stock.variant_id = item.variant_id
      where item.order_id = p_order_id and stock.stock is null
    ) then
      raise exception 'Inventory records are missing; the order was not cancelled.';
    end if;
    perform 1
    from public.branch_inventory stock
    join public.order_items item on item.variant_id = stock.variant_id
    where item.order_id = p_order_id and stock.branch_id = v_order.branch_id
    order by stock.variant_id
    for update of stock;
    for v_item in
      select id, quantity from public.order_items
      where order_id = p_order_id and product_type = 'ebike'
    loop
      update public.ebike_units
      set status = 'in_stock', order_item_id = null
      where order_item_id = v_item.id and status = 'sold';
      get diagnostics v_updated = row_count;
      if v_updated <> v_item.quantity then
        raise exception 'Sold e-bike unit records are incomplete; the order was not cancelled.';
      end if;
    end loop;
    perform set_config('njet.inventory_type', 'order_cancelled', true);
    perform set_config('njet.inventory_reference', p_order_id::text, true);
    update public.branch_inventory stock
    set stock = stock.stock + item.quantity
    from public.order_items item
    where item.order_id = p_order_id
      and stock.branch_id = v_order.branch_id
      and stock.variant_id = item.variant_id;
  end if;
  update public.orders
  set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.confirm_commerce_order(uuid) from public, anon;
revoke all on function public.cancel_commerce_order(uuid) from public, anon;
grant execute on function public.confirm_commerce_order(uuid) to authenticated;
grant execute on function public.cancel_commerce_order(uuid) to authenticated;

notify pgrst, 'reload schema';
