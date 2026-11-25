create function public.storefront_catalog_page(
  p_search text, p_category text, p_subcategory text, p_in_stock boolean,
  p_sort text, p_page integer, p_page_size integer, p_slug text default null
)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with catalog as materialized (
    select p.id, p.slug, p.name, p.description, p.product_type, p.category_id,
      c.name as category_name, p.subcategory_id, s.name as subcategory_name, p.image_path, p.is_demo
    from public.products p
    left join public.product_categories c on c.id = p.category_id
    left join public.product_subcategories s on s.id = p.subcategory_id and s.active
    where p.active and (p_slug is null or p.slug = p_slug)
  ), matching as materialized (
    select p.*
    from catalog p
    where (p_category is null or p.category_id::text = p_category)
      and (p_subcategory is null or p.subcategory_id::text = p_subcategory
        or (p_subcategory = 'uncategorized' and p.subcategory_id is null))
      and (nullif(btrim(p_search), '') is null or strpos(lower(concat_ws(' ', p.name, p.description, p.category_name, p.subcategory_name)),
        lower(left(btrim(coalesce(p_search, '')), 120))) > 0)
      and (not coalesce(p_in_stock, false) or exists (
        select 1 from public.product_variants v
        where v.product_id = p.id and v.active and (
          (p.product_type = 'ebike' and exists (
            select 1 from public.ebike_units u join public.branches b on b.id = u.branch_id and b.active
            where u.variant_id = v.id and u.status = 'in_stock'
          )) or (p.product_type <> 'ebike' and exists (
            select 1 from public.branch_inventory i join public.branches b on b.id = i.branch_id and b.active
            where i.variant_id = v.id and i.stock > 0
          ))
        )
      ))
  ), ranked as (
    select p.*, prices.starting_price
    from matching p
    left join lateral (
      select min(coalesce(d.unit_price_minor, v.price_minor)) as starting_price
      from public.product_variants v
      left join lateral public.resolve_product_discount(v.id) d on true
      where p_sort in ('price-asc', 'price-desc') and v.product_id = p.id and v.active
    ) prices on true
  ), page as materialized (
    select p.*, row_number() over (
      order by case when p_sort = 'price-asc' then p.starting_price end asc nulls last,
        case when p_sort = 'price-desc' then p.starting_price end desc nulls last, p.name, p.id
    ) as position
    from ranked p
    order by position
    limit greatest(1, least(coalesce(p_page_size, 24), 24))
    offset (greatest(coalesce(p_page, 1), 1)::bigint - 1) * greatest(1, least(coalesce(p_page_size, 24), 24))
  ), page_variants as materialized (
    select v.*, p.product_type
    from page p join public.product_variants v on v.product_id = p.id and v.active
  ), quantity_by_branch as materialized (
    select v.product_id, v.variant_id, v.branch_id, sum(v.quantity) as quantity
    from (
      select v.product_id, v.id as variant_id, b.id as branch_id, i.stock::bigint as quantity
      from page_variants v join public.branch_inventory i on i.variant_id = v.id
      join public.branches b on b.id = i.branch_id and b.active
      where v.product_type <> 'ebike'
      union all
      select v.product_id, v.id, b.id, 1::bigint
      from page_variants v join public.ebike_units u on u.variant_id = v.id and u.status = 'in_stock'
      join public.branches b on b.id = u.branch_id and b.active
      where v.product_type = 'ebike'
    ) v
    group by v.product_id, v.variant_id, v.branch_id
  ), stock as (
    select q.product_id, sum(q.quantity) as quantity from quantity_by_branch q group by q.product_id
  ), branch_stock as (
    select q.variant_id, jsonb_agg(jsonb_build_object(
      'branchId', q.branch_id, 'available', q.quantity > 0,
      'stock', case when auth.uid() is not null then q.quantity end
    ) order by q.branch_id) as items
    from quantity_by_branch q where p_slug is not null group by q.variant_id
  ), variants as (
    select v.product_id, jsonb_agg(jsonb_build_object(
      'id', v.id, 'product_id', v.product_id, 'name', v.name, 'sku', v.sku,
      'price_minor', coalesce(d.unit_price_minor, v.price_minor), 'list_price_minor', v.price_minor,
      'discount_unit_minor', coalesce(d.discount_unit_minor, 0), 'discount_name', d.discount_name,
      'reservation_minor', v.reservation_minor, 'home_credit_downpayment_minor', v.home_credit_downpayment_minor,
      'image_path', v.image_path, 'specifications', v.specifications, 'stockByBranch', coalesce(b.items, '[]'::jsonb)
    ) order by v.name, v.id) as items
    from page_variants v
    left join lateral public.resolve_product_discount(v.id) d on true
    left join branch_stock b on b.variant_id = v.id
    group by v.product_id
  ), products as (
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'slug', p.slug, 'name', p.name, 'description', p.description, 'product_type', p.product_type,
      'category_id', p.category_id, 'categoryName', p.category_name, 'subcategory_id', p.subcategory_id,
      'subcategoryName', p.subcategory_name, 'image_path', p.image_path, 'is_demo', p.is_demo,
      'stockSummary', jsonb_build_object('available', coalesce(s.quantity, 0) > 0,
        'stock', case when auth.uid() is not null then coalesce(s.quantity, 0) end),
      'ratingSummary', jsonb_build_object('averageRating', coalesce(r.average_rating, 0),
        'reviewCount', coalesce(r.review_count, 0)),
      'variants', coalesce(v.items, '[]'::jsonb)
    ) order by p.position) as items
    from page p
    left join variants v on v.product_id = p.id
    left join stock s on s.product_id = p.id
    left join lateral (
      select round(avg(r.rating)::numeric, 1) as average_rating, count(*) as review_count
      from public.product_reviews r where r.product_id = p.id and r.status = 'published'
    ) r on true
  ), facets as (
    select distinct p.category_id, coalesce(p.category_name, 'Uncategorized') as category_name,
      coalesce(p.subcategory_id::text, 'uncategorized') as subcategory_id,
      coalesce(p.subcategory_name, 'Uncategorized') as subcategory_name
    from catalog p
  )
  select jsonb_build_object(
    'products', coalesce((select items from products), '[]'::jsonb),
    'total', (select count(*) from matching),
    'facets', coalesce((select jsonb_agg(to_jsonb(f) order by f.category_name, f.subcategory_name, f.subcategory_id) from facets f), '[]'::jsonb)
  );
$$;

revoke all on function public.storefront_catalog_page(text, text, text, boolean, text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.storefront_catalog_page(text, text, text, boolean, text, integer, integer, text)
  to anon, authenticated;
-- Resolve cart variants by ID before applying the legacy catalog cap.
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
  home_credit_downpayment_minor integer,
  variant_image_path text,
  specifications jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_slug is not null and length(trim(p_slug)) not between 1 and 120 then
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
      p.id, p.slug, p.name, p.description, p.product_type, p.category_id,
      c.name as category_name, p.subcategory_id, s.name as subcategory_name,
      p.image_path, p.is_demo
    from public.products p
    left join public.product_categories c on c.id = p.category_id
    left join public.product_subcategories s
      on s.id = p.subcategory_id and s.active
    where p.active and (p_slug is null or p.slug = p_slug)
      and (p_variant_ids is null or exists (
        select 1 from public.product_variants requested
        where requested.product_id = p.id and requested.active and requested.id = any(p_variant_ids)
      ))
    order by p.name, p.id
    limit case when p_variant_ids is null then 100 else cardinality(p_variant_ids) end
  ),
  selected_variants as (
    select
      v.id, v.product_id, v.name, v.sku, v.price_minor, v.reservation_minor,
      v.home_credit_downpayment_minor, v.image_path, v.specifications
    from public.product_variants v
    join selected_products p on p.id = v.product_id
    where v.active
      and (p_variant_ids is null or v.id = any(p_variant_ids))
    order by p.name, v.name, v.id
    limit 500
  )
  select
    p.id, p.slug, p.name, p.description, p.product_type, p.category_id,
    p.category_name, p.subcategory_id, p.subcategory_name, p.image_path,
    p.is_demo, v.id, v.name, v.sku, v.price_minor, v.reservation_minor,
    v.home_credit_downpayment_minor, v.image_path, v.specifications
  from selected_products p
  left join selected_variants v on v.product_id = p.id
  where p_variant_ids is null or v.id is not null
  order by p.name, v.name nulls first, v.id;
end;
$$;

notify pgrst, 'reload schema';
