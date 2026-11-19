create or replace function public.admin_product_discounts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('products.read') then
    raise exception 'You are not allowed to view product discounts.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'name', d.name,
    'discount_type', d.discount_type,
    'value', d.value,
    'coupon_code', d.coupon_code,
    'active', d.active,
    'starts_at', d.starts_at,
    'ends_at', d.ends_at,
    'max_redemptions', d.max_redemptions,
    'created_at', d.created_at,
    'updated_at', d.updated_at,
    'redemptions', (
      select count(*) from public.product_discount_redemptions r
      where r.discount_id = d.id and r.status <> 'released'
    ),
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_variant_id', t.product_variant_id,
        'product_category_id', t.product_category_id
      )), '[]'::jsonb)
      from public.product_discount_targets t
      where t.discount_id = d.id
    )
  ) order by d.created_at desc), '[]'::jsonb)
  into v_result
  from public.product_discounts d;
  return v_result;
end;
$$;

create or replace function public.save_product_discount(
  p_discount_id uuid,
  p_name text,
  p_discount_type text,
  p_value integer,
  p_coupon_code text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_max_redemptions integer,
  p_active boolean,
  p_targets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_discount_id uuid;
  v_coupon_code text := nullif(upper(btrim(p_coupon_code)), '');
  v_target_count integer;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to manage product discounts.';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 120
    or p_discount_type not in ('percentage', 'fixed')
    or p_value is null or p_value <= 0
    or (p_discount_type = 'percentage' and p_value > 10000)
    or (p_discount_type = 'fixed' and p_value > 2147483647)
    or (v_coupon_code is not null and v_coupon_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$')
    or (p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at)
    or (p_max_redemptions is not null and p_max_redemptions < 1)
    or (v_coupon_code is null and p_max_redemptions is not null)
    or p_active is null then
    raise exception 'Review the discount details and date range.';
  end if;
  if coalesce(jsonb_typeof(p_targets), '') <> 'array' then
    raise exception 'Choose at least one product or category target.';
  end if;
  select count(*) into v_target_count from jsonb_array_elements(p_targets);
  if v_target_count not between 1 and 100 then
    raise exception 'A discount must target between 1 and 100 variants or categories.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_targets) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or (
        nullif(e.value->>'product_variant_id', '') is null
        and nullif(e.value->>'product_category_id', '') is null
      )
      or (
        nullif(e.value->>'product_variant_id', '') is not null
        and nullif(e.value->>'product_category_id', '') is not null
      )
  ) then
    raise exception 'Each target must be exactly one product variant or category.';
  end if;

  if p_discount_id is null then
    insert into public.product_discounts (
      name, discount_type, value, coupon_code, active, starts_at, ends_at,
      max_redemptions, created_by, updated_by
    ) values (
      btrim(p_name), p_discount_type, p_value, v_coupon_code, p_active,
      p_starts_at, p_ends_at, p_max_redemptions, auth.uid(), auth.uid()
    ) returning id into v_discount_id;
  else
    update public.product_discounts
    set name = btrim(p_name), discount_type = p_discount_type,
      value = p_value, coupon_code = v_coupon_code, active = p_active,
      starts_at = p_starts_at, ends_at = p_ends_at,
      max_redemptions = p_max_redemptions, updated_by = auth.uid(),
      updated_at = now()
    where id = p_discount_id
    returning id into v_discount_id;
    if not found then
      raise exception 'This discount no longer exists.';
    end if;
  end if;

  delete from public.product_discount_targets
  where discount_id = v_discount_id;
  insert into public.product_discount_targets (
    discount_id, product_variant_id, product_category_id
  )
  select v_discount_id, i.product_variant_id, i.product_category_id
  from jsonb_to_recordset(p_targets) as i(
    product_variant_id uuid,
    product_category_id uuid
  );

  if exists (
    select 1 from public.product_discount_targets t
    left join public.product_variants v on v.id = t.product_variant_id
    left join public.product_categories c on c.id = t.product_category_id
    where t.discount_id = v_discount_id
      and (t.product_variant_id is not null and v.id is null
        or t.product_category_id is not null and c.id is null)
  ) then
    raise exception 'A selected product or category no longer exists.';
  end if;
  return v_discount_id;
end;
$$;

revoke all on function public.admin_product_discounts()
  from public, anon, authenticated;
revoke all on function public.save_product_discount(
  uuid, text, text, integer, text, timestamptz, timestamptz, integer, boolean, jsonb
) from public, anon, authenticated;
grant execute on function public.admin_product_discounts() to authenticated;
grant execute on function public.save_product_discount(
  uuid, text, text, integer, text, timestamptz, timestamptz, integer, boolean, jsonb
) to authenticated;

notify pgrst, 'reload schema';
