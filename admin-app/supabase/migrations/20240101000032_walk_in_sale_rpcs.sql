-- Scoped catalog access and atomic walk-in sale creation.
-- Run after 20240101000031_walk_in_sales_schema.sql.

create or replace function public.walk_in_branch_options()
returns table(id uuid, name text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to create walk-in sales.';
  end if;
  return query
  select b.id, b.name
  from public.branches b
  where b.active and public.current_user_can_access_branch(b.id)
  order by b.name
  limit 200;
end;
$$;

create or replace function public.walk_in_catalog(p_branch_id uuid)
returns table(
  product_id uuid,
  product_name text,
  product_type text,
  product_image_path text,
  variant_id uuid,
  variant_name text,
  sku text,
  price_minor integer,
  variant_image_path text,
  stock integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to view the walk-in catalog.';
  end if;
  if not public.current_user_can_access_branch(p_branch_id)
    or not exists (
      select 1 from public.branches b
      where b.id = p_branch_id and b.active
    ) then
    raise exception 'Choose an active branch you can access.';
  end if;
  return query
  select p.id, p.name, p.product_type, p.image_path,
    v.id, v.name, v.sku, v.price_minor, v.image_path,
    case
      when p.product_type = 'ebike' then
        least(coalesce(stock.stock, 0)::bigint, coalesce(units.available, 0))::integer
      else coalesce(stock.stock, 0)
    end
  from public.products p
  join public.product_variants v on v.product_id = p.id and v.active
  left join public.branch_inventory stock
    on stock.branch_id = p_branch_id and stock.variant_id = v.id
  left join lateral (
    select count(*) as available
    from public.ebike_units u
    where u.branch_id = p_branch_id
      and u.variant_id = v.id
      and u.status = 'in_stock'
      and u.order_item_id is null
  ) units on p.product_type = 'ebike'
  where p.active
  order by p.name, v.name
  limit 1000;
end;
$$;

create or replace function public.create_walk_in_sale(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_payment_method text,
  p_payment_provider text,
  p_payment_reference text,
  p_cash_tendered_minor integer,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_branch_name text;
  v_total bigint;
  v_reservation bigint;
  v_item_count integer;
  v_unique_item_count integer;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to create walk-in sales.';
  end if;
  if p_customer_name is null
    or length(btrim(p_customer_name)) not between 2 and 100
    or p_customer_name ~ '[[:cntrl:]]'
    or p_contact_number is null
    or btrim(p_contact_number) !~ '^[+0-9][0-9 ()-]{6,19}$' then
    raise exception 'Enter a valid customer name and contact number.';
  end if;
  if not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You can only create sales for branches you can access.';
  end if;
  select b.name into v_branch_name
  from public.branches b
  where b.id = p_branch_id and b.active
  for share;
  if not found then
    raise exception 'Choose an active branch.';
  end if;
  if p_payment_method is null
    or p_payment_method not in ('cash', 'online', 'home_credit') then
    raise exception 'Choose a valid payment method.';
  end if;
  if p_payment_method = 'online' then
    if p_payment_provider is null
      or p_payment_provider not in ('gcash', 'bank_transfer', 'card')
      or nullif(btrim(p_payment_reference), '') is null
      or length(btrim(p_payment_reference)) > 120
      or p_cash_tendered_minor is not null then
      raise exception 'Enter the online payment provider and reference number.';
    end if;
  elsif p_payment_method = 'cash' then
    if p_payment_provider is not null
      or p_payment_reference is not null
      or p_cash_tendered_minor is null then
      raise exception 'Enter the cash tendered amount.';
    end if;
  elsif p_payment_provider is not null
    or p_payment_reference is not null
    or p_cash_tendered_minor is not null then
    raise exception 'Remove payment details that do not match Home Credit.';
  end if;
  if p_payment_method = 'home_credit' then
    if nullif(btrim(p_address_line1), '') is null
      or nullif(btrim(p_barangay), '') is null
      or nullif(btrim(p_city), '') is null
      or nullif(btrim(p_province), '') is null then
      raise exception 'Complete the address fields for Home Credit.';
    end if;
  elsif nullif(btrim(p_address_line1), '') is not null
    or nullif(btrim(p_barangay), '') is not null
    or nullif(btrim(p_city), '') is not null
    or nullif(btrim(p_province), '') is not null
    or nullif(btrim(p_postal_code), '') is not null then
    raise exception 'Address details are only used for Home Credit.';
  end if;
  if length(coalesce(p_postal_code, '')) > 20 then
    raise exception 'The postal code is too long.';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Add between 1 and 30 items to the sale.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Add between 1 and 30 items to the sale.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or coalesce(e.value->>'variant_id', '') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(e.value->'quantity') <> 'number'
      or not case
        when coalesce(e.value->>'quantity', '') ~ '^[0-9]{1,2}$'
          then (e.value->>'quantity')::integer between 1 and 99
        else false
      end
  ) then
    raise exception 'The sale contains an invalid item.';
  end if;
  select count(*), count(distinct i.variant_id)
  into v_item_count, v_unique_item_count
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer);
  if v_item_count <> v_unique_item_count then
    raise exception 'The sale contains a duplicate item.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
    left join public.product_variants v on v.id = i.variant_id and v.active
    left join public.products p on p.id = v.product_id and p.active
    where v.id is null or p.id is null
  ) then
    raise exception 'A sale item is no longer available.';
  end if;
  select sum(v.price_minor::bigint * i.quantity),
    sum(case when p.product_type = 'ebike'
      then v.reservation_minor::bigint * i.quantity else 0 end)
  into v_total, v_reservation
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
  join public.product_variants v on v.id = i.variant_id
  join public.products p on p.id = v.product_id;
  if v_total > 2147483647
    or v_reservation > 2147483647
    or v_reservation > v_total then
    raise exception 'The sale total is too large to process.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
    left join public.branch_inventory stock
      on stock.branch_id = p_branch_id and stock.variant_id = i.variant_id
    where stock.stock is null or stock.stock < i.quantity
  ) then
    raise exception 'The selected branch does not have enough stock for this sale.';
  end if;
  if p_payment_method = 'cash' and p_cash_tendered_minor < v_total then
    raise exception 'Cash tendered must cover the sale total.';
  end if;

  insert into public.orders (
    order_source, customer_id, customer_name, contact_number, fulfillment,
    branch_id, branch_name, address_line1, barangay, city, province, postal_code,
    payment_method, payment_provider, payment_reference, cash_tendered_minor,
    total_minor, reservation_due_minor, balance_due_minor, online_due_minor,
    terms_version, privacy_version, terms_accepted_at, privacy_accepted_at
  ) values (
    'walk_in', null, btrim(p_customer_name), btrim(p_contact_number), 'pickup',
    p_branch_id, v_branch_name, nullif(btrim(p_address_line1), ''),
    nullif(btrim(p_barangay), ''), nullif(btrim(p_city), ''),
    nullif(btrim(p_province), ''), nullif(btrim(p_postal_code), ''),
    p_payment_method, p_payment_provider, nullif(btrim(p_payment_reference), ''),
    p_cash_tendered_minor, v_total::integer,
    case when p_payment_method = 'home_credit' then v_reservation::integer else 0 end,
    case when p_payment_method = 'home_credit'
      then (v_total - v_reservation)::integer else 0 end,
    0, null, null, null, null
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, product_name, product_type, variant_name, sku,
    quantity, unit_price_minor, reservation_unit_minor
  )
  select v_order_id, v.id, p.name, p.product_type, v.name, v.sku,
    i.quantity, v.price_minor, v.reservation_minor
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
  join public.product_variants v on v.id = i.variant_id
  join public.products p on p.id = v.product_id;

  perform public.confirm_commerce_order(v_order_id);
  perform public.complete_commerce_order(v_order_id);
  return v_order_id;
end;
$$;

revoke all on function public.walk_in_branch_options() from public, anon;
revoke all on function public.walk_in_catalog(uuid) from public, anon;
revoke all on function public.create_walk_in_sale(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.walk_in_branch_options() to authenticated;
grant execute on function public.walk_in_catalog(uuid) to authenticated;
grant execute on function public.create_walk_in_sale(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb
) to authenticated;

notify pgrst, 'reload schema';
