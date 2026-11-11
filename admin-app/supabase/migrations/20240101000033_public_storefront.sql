-- Public-safe storefront catalog and availability reads.
-- Run after 20240101000032_walk_in_sale_rpcs.sql.

create or replace function public.storefront_catalog(
  p_slug text default null,
  p_variant_ids uuid[] default null
)
returns table (
  product_id uuid,
  product_slug text,
  product_name text,
  product_description text,
  product_type text,
  category_id uuid,
  category_name text,
  subcategory_id uuid,
  subcategory_name text,
  product_image_path text,
  is_demo boolean,
  variant_id uuid,
  variant_name text,
  sku text,
  price_minor integer,
  reservation_minor integer,
  variant_image_path text,
  specifications jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_slug is not null and (
    length(trim(p_slug)) not between 1 and 120
  ) then
    raise exception 'Choose a valid product slug.';
  end if;

  if p_variant_ids is not null and (
    cardinality(p_variant_ids) not between 1 and 500
    or array_position(p_variant_ids, null::uuid) is not null
  ) then
    raise exception 'Choose between 1 and 500 product variants.';
  end if;

  return query
  with selected_products as (
    select
      p.id,
      p.slug,
      p.name,
      p.description,
      p.product_type,
      p.category_id,
      c.name as category_name,
      p.subcategory_id,
      s.name as subcategory_name,
      p.image_path,
      p.is_demo
    from public.products p
    left join public.product_categories c on c.id = p.category_id
    left join public.product_subcategories s
      on s.id = p.subcategory_id and s.active
    where p.active
      and (p_slug is null or p.slug = p_slug)
    order by p.name, p.id
    limit 100
  ),
  selected_variants as (
    select
      v.id,
      v.product_id,
      v.name,
      v.sku,
      v.price_minor,
      v.reservation_minor,
      v.image_path,
      v.specifications
    from public.product_variants v
    join selected_products p on p.id = v.product_id
    where v.active
      and (p_variant_ids is null or v.id = any(p_variant_ids))
    order by p.name, v.name, v.id
    limit 500
  )
  select
    p.id,
    p.slug,
    p.name,
    p.description,
    p.product_type,
    p.category_id,
    p.category_name,
    p.subcategory_id,
    p.subcategory_name,
    p.image_path,
    p.is_demo,
    v.id,
    v.name,
    v.sku,
    v.price_minor,
    v.reservation_minor,
    v.image_path,
    v.specifications
  from selected_products p
  left join selected_variants v on v.product_id = p.id
  where p_variant_ids is null or v.id is not null
  order by p.name, v.name nulls first, v.id;
end;
$$;

create or replace function public.storefront_branch_options()
returns table (id uuid, name text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.name
  from public.branches b
  where b.active
  order by b.name, b.id
  limit 100;
$$;

create or replace function public.storefront_variant_availability(
  p_variant_ids uuid[]
)
returns table (
  variant_id uuid,
  branch_id uuid,
  available boolean,
  stock integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  can_view_exact_stock boolean;
begin
  if p_variant_ids is null
    or cardinality(p_variant_ids) not between 1 and 500
    or array_position(p_variant_ids, null::uuid) is not null then
    raise exception 'Choose between 1 and 500 product variants.';
  end if;

  can_view_exact_stock :=
    public.current_user_has_permission('storefront.access')
    or public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage');

  return query
  with requested_variants as (
    select distinct requested.id
    from unnest(p_variant_ids) as requested(id)
    where requested.id is not null
  ),
  active_branches as (
    select b.id, b.name
    from public.branches b
    where b.active
    order by b.name, b.id
    limit 100
  )
  select
    requested.id,
    b.id,
    computed.quantity > 0,
    case
      when can_view_exact_stock
        and public.current_user_can_access_branch(b.id)
        then computed.quantity
      else null::integer
    end
  from requested_variants requested
  join public.product_variants v on v.id = requested.id and v.active
  join public.products p on p.id = v.product_id and p.active
  cross join active_branches b
  left join public.branch_inventory i
    on i.variant_id = v.id and i.branch_id = b.id
  left join lateral (
    select count(*)::integer as quantity
    from public.ebike_units u
    where u.variant_id = v.id
      and u.branch_id = b.id
      and u.status = 'in_stock'
  ) serial_stock on p.product_type = 'ebike'
  cross join lateral (
    select case
      when p.product_type = 'ebike' then coalesce(serial_stock.quantity, 0)
      else coalesce(i.stock, 0)
    end as quantity
  ) computed
  order by requested.id, b.name, b.id;
end;
$$;

revoke all on function public.storefront_catalog(text, uuid[]) from public, anon, authenticated;
revoke all on function public.storefront_branch_options() from public, anon, authenticated;
revoke all on function public.storefront_variant_availability(uuid[]) from public, anon, authenticated;
grant execute on function public.storefront_catalog(text, uuid[]) to anon, authenticated;
grant execute on function public.storefront_branch_options() to anon, authenticated;
grant execute on function public.storefront_variant_availability(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
