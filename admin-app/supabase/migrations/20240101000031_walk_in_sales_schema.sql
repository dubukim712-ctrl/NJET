-- Add walk-in sale metadata while keeping storefront orders online by default.
-- Run after 20240101000030_business_profile_settings.sql.

alter table public.orders
  add column order_source text not null default 'online'
    check (order_source in ('online', 'walk_in')),
  add column cash_tendered_minor integer;

alter table public.orders
  alter column customer_id drop not null,
  alter column terms_version drop not null,
  alter column privacy_version drop not null,
  alter column terms_accepted_at drop not null,
  alter column privacy_accepted_at drop not null;

alter table public.orders
  add constraint orders_source_customer_terms_check
  check (
    (
      order_source = 'online'
      and customer_id is not null
      and terms_version is not null
      and privacy_version is not null
      and terms_accepted_at is not null
      and privacy_accepted_at is not null
    )
    or (
      order_source = 'walk_in'
      and customer_id is null
      and terms_version is null
      and privacy_version is null
      and terms_accepted_at is null
      and privacy_accepted_at is null
    )
  ),
  add constraint orders_walk_in_cash_tender_check
  check (
    (
      order_source = 'walk_in'
      and payment_method = 'cash'
      and cash_tendered_minor is not null
      and cash_tendered_minor >= total_minor
    )
    or (
      not (order_source = 'walk_in' and payment_method = 'cash')
      and cash_tendered_minor is null
    )
  );

create or replace function public.require_configured_payment_recipient()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient_id uuid;
begin
  if new.payment_method = 'online' and new.order_source = 'walk_in' then
    if new.payment_provider is null
      or nullif(btrim(new.payment_reference), '') is null
      or new.payment_recipient_id is not null then
      raise exception 'Enter the online payment provider and reference number.';
    end if;
  elsif new.payment_method = 'online' then
    if new.payment_recipient_id is null then
      v_recipient_id := nullif(
        current_setting('app.payment_recipient_id', true),
        ''
      )::uuid;
      new.payment_recipient_id := v_recipient_id;
    end if;
    if new.payment_provider is null or new.payment_recipient_id is null then
      raise exception 'Choose an active recipient for the selected payment provider.';
    end if;
    select r.id into v_recipient_id
    from public.payment_recipients r
    where r.id = new.payment_recipient_id
      and r.provider = new.payment_provider
      and r.active
    for share;
    if not found then
      raise exception 'Choose an active recipient for the selected payment provider.';
    end if;
  elsif new.payment_recipient_id is not null then
    raise exception 'A payment recipient can only be selected for online payment.';
  end if;
  return new;
end;
$$;

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
  if v_order.order_source = 'online' and exists (
    select 1 from public.order_items i
    where i.order_id = p_order_id and i.product_type = 'ebike'
  ) and not exists (
    select 1 from public.order_documents d
    where d.order_id = p_order_id and d.kind = 'identity'
  ) then
    raise exception 'Verify the e-bike customer identity documents before confirming.';
  end if;
  if v_order.order_source = 'online'
    and v_order.payment_method = 'online' and not exists (
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

revoke all on function public.require_configured_payment_recipient()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
