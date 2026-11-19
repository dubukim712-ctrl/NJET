create or replace function public.normalize_discount_phone(p_phone text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  with phone as (
    select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as digits
  )
  select case
    when length(digits) = 11 and left(digits, 1) = '0'
      then '63' || substr(digits, 2)
    when length(digits) = 10 and left(digits, 1) = '9'
      then '63' || digits
    else digits
  end
  from phone
$$;

create or replace function public.resolve_product_discount(
  p_variant_id uuid,
  p_coupon_code text default null
)
returns table (
  discount_id uuid,
  discount_name text,
  discount_code text,
  list_price_minor integer,
  unit_price_minor integer,
  discount_unit_minor integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with variant as (
    select v.id, v.price_minor, v.reservation_minor,
      v.home_credit_downpayment_minor, p.category_id
    from public.product_variants v
    join public.products p on p.id = v.product_id and p.active
    where v.id = p_variant_id and v.active
  ),
  eligible as (
    select d.id, d.name, d.coupon_code, v.price_minor,
      greatest(v.reservation_minor, v.home_credit_downpayment_minor) as price_floor,
      exists (
        select 1 from public.product_discount_targets t
        where t.discount_id = d.id and t.product_variant_id = v.id
      ) as variant_target,
      case
        when d.discount_type = 'percentage'
          then round(v.price_minor::numeric * d.value / 10000)::integer
        else least(d.value, v.price_minor)
      end as amount_minor
    from variant v
    join public.product_discount_targets t
      on t.product_variant_id = v.id or t.product_category_id = v.category_id
    join public.product_discounts d on d.id = t.discount_id
    where d.active
      and (d.starts_at is null or d.starts_at <= now())
      and (d.ends_at is null or d.ends_at > now())
      and (
        (p_coupon_code is null and d.coupon_code is null)
        or (
          p_coupon_code is not null
          and (d.coupon_code is null or d.coupon_code = upper(btrim(p_coupon_code)))
        )
      )
  )
  select e.id, e.name, e.coupon_code, e.price_minor,
    (e.price_minor - e.amount_minor)::integer, e.amount_minor
  from eligible e
  where e.amount_minor > 0
    and e.price_minor - e.amount_minor >= e.price_floor
  order by e.amount_minor desc, (e.coupon_code is not null) desc,
    e.variant_target desc, e.id
  limit 1
$$;

create or replace function public.active_variant_discounts(
  p_variant_ids uuid[],
  p_channel text
)
returns table (
  variant_id uuid,
  list_price_minor integer,
  unit_price_minor integer,
  discount_unit_minor integer,
  discount_id uuid,
  discount_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_channel not in ('storefront', 'walk_in') then
    raise exception 'Choose a valid sales channel.';
  end if;
  if coalesce(cardinality(p_variant_ids), 0) > 500 then
    raise exception 'Request no more than 500 variants at a time.';
  end if;

  return query
  select v.id, v.price_minor,
    coalesce(d.unit_price_minor, v.price_minor),
    coalesce(d.discount_unit_minor, 0),
    d.discount_id, d.discount_name
  from public.product_variants v
  join public.products p on p.id = v.product_id and p.active
  left join lateral public.resolve_product_discount(v.id) d on true
  where v.active and (
    p_variant_ids is null or v.id = any(p_variant_ids)
  )
  order by v.id
  limit 500;
end;
$$;

create or replace function public.preview_product_discount_cart(
  p_items jsonb,
  p_coupon_code text,
  p_channel text,
  p_phone text default null
)
returns table (
  variant_id uuid,
  quantity integer,
  list_price_minor integer,
  unit_price_minor integer,
  discount_unit_minor integer,
  discount_id uuid,
  discount_name text,
  discount_code text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := nullif(upper(btrim(p_coupon_code)), '');
  v_customer_id uuid := auth.uid();
  v_phone text := public.normalize_discount_phone(p_phone);
  v_discount_id uuid;
  v_max_redemptions integer;
  v_used_count integer;
  v_coupon_applied boolean := false;
begin
  if p_channel = 'storefront' then
    if v_customer_id is null
      or not public.current_user_has_permission('storefront.access') then
      raise exception 'Sign in before checking a coupon code.';
    end if;
  elsif p_channel = 'walk_in' then
    if v_customer_id is null
      or not public.current_user_has_permission('orders.manage') then
      raise exception 'You are not allowed to check walk-in discounts.';
    end if;
    if length(v_phone) not between 7 and 15 then
      raise exception 'Enter a valid customer phone number before checking the code.';
    end if;
  else
    raise exception 'Choose a valid sales channel.';
  end if;

  if coalesce(jsonb_typeof(p_items), '') <> 'array'
    or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'The cart must contain between 1 and 30 items.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or coalesce(e.value->>'variant_id', '') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(e.value->>'quantity', '') !~ '^[1-9][0-9]?$'
  ) then
    raise exception 'The cart contains an invalid item.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items)
      as i(variant_id uuid, quantity integer)
    group by i.variant_id having count(*) > 1
  ) then
    raise exception 'The cart contains duplicate items.';
  end if;

  if v_code is not null then
    if length(v_code) > 32 then
      raise exception 'Enter a valid coupon code.';
    end if;
    select d.id, d.max_redemptions into v_discount_id, v_max_redemptions
    from public.product_discounts d
    where d.coupon_code = v_code and d.active
      and (d.starts_at is null or d.starts_at <= now())
      and (d.ends_at is null or d.ends_at > now());
    if not found then
      raise exception 'This coupon code is invalid or inactive.';
    end if;
    select count(*) into v_used_count
    from public.product_discount_redemptions r
    where r.discount_id = v_discount_id and r.status <> 'released';
    if v_max_redemptions is not null and v_used_count >= v_max_redemptions then
      raise exception 'This coupon has reached its redemption limit.';
    end if;
    if exists (
      select 1 from public.product_discount_redemptions r
      where r.discount_id = v_discount_id and r.status <> 'released'
        and (
          (p_channel = 'storefront' and r.customer_id = v_customer_id)
          or (p_channel = 'walk_in' and r.normalized_phone = v_phone)
        )
    ) then
      raise exception 'This coupon has already been used by this customer.';
    end if;
  end if;

  return query
  select i.variant_id, i.quantity,
    coalesce(d.list_price_minor, v.price_minor),
    coalesce(d.unit_price_minor, v.price_minor),
    coalesce(d.discount_unit_minor, 0),
    d.discount_id, d.discount_name, d.discount_code
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
  join public.product_variants v on v.id = i.variant_id and v.active
  join public.products p on p.id = v.product_id and p.active
  left join lateral public.resolve_product_discount(i.variant_id, v_code) d on true
  order by i.variant_id;

  if v_code is not null then
    select exists (
      select 1
      from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
      cross join lateral public.resolve_product_discount(i.variant_id, v_code) d
      where d.discount_id = v_discount_id
    ) into v_coupon_applied;
    if not v_coupon_applied then
      raise exception 'This coupon does not apply to the items in your cart.';
    end if;
  end if;
end;
$$;

revoke all on function public.normalize_discount_phone(text) from public, anon, authenticated;
revoke all on function public.resolve_product_discount(uuid, text) from public, anon, authenticated;
revoke all on function public.active_variant_discounts(uuid[], text) from public, anon;
revoke all on function public.preview_product_discount_cart(jsonb, text, text, text)
  from public, anon;
grant execute on function public.active_variant_discounts(uuid[], text)
  to anon, authenticated;
grant execute on function public.preview_product_discount_cart(jsonb, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
