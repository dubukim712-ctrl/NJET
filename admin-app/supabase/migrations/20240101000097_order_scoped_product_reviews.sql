alter table public.product_reviews
  drop constraint product_reviews_product_id_customer_id_key,
  add constraint product_reviews_order_item_key unique (order_item_id);

drop function public.customer_product_reviews(uuid[]);
drop function public.customer_product_review_details(uuid);
drop function public.customer_product_review(uuid);
drop function public.submit_product_review(uuid, smallint, text, boolean);

create function public.customer_order_item_review_details(
  p_order_id uuid,
  p_order_item_id uuid
)
returns table (
  eligible boolean,
  product_id uuid,
  review_id uuid,
  rating smallint,
  comment text,
  status text,
  is_anonymous boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
begin
  if v_customer_id is null
    or not public.current_user_has_permission('storefront.access')
    or not exists (
      select 1
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = v_customer_id and r.scope = 'customer'
    )
    or not exists (
      select 1
      from public.orders o
      join public.order_items i on i.order_id = o.id
      where o.id = p_order_id
        and i.id = p_order_item_id
        and o.customer_id = v_customer_id
        and o.order_source = 'online'
        and o.status = 'completed'
    ) then
    return query
      select false, null::uuid, null::uuid, null::smallint,
        null::text, null::text, null::boolean;
    return;
  end if;

  return query
  select true, v.product_id, r.id, r.rating, r.comment, r.status, r.is_anonymous
  from public.order_items i
  join public.product_variants v on v.id = i.variant_id
  left join public.product_reviews r
    on r.order_item_id = i.id and r.customer_id = v_customer_id
  where i.id = p_order_item_id and i.order_id = p_order_id;
end;
$$;

create function public.customer_order_item_reviews(
  p_order_id uuid,
  p_order_item_ids uuid[]
)
returns table (
  order_item_id uuid,
  product_id uuid,
  eligible boolean,
  review_id uuid,
  rating smallint,
  comment text,
  status text,
  is_anonymous boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_order_id is null
    or p_order_item_ids is null
    or cardinality(p_order_item_ids) not between 1 and 100
    or array_position(p_order_item_ids, null::uuid) is not null then
    raise exception 'Choose a valid order and between 1 and 100 order items.';
  end if;

  return query
  select
    requested.order_item_id,
    review.product_id,
    review.eligible,
    review.review_id,
    review.rating,
    review.comment,
    review.status,
    review.is_anonymous
  from (
    select distinct unnest(p_order_item_ids) as order_item_id
  ) requested
  cross join lateral public.customer_order_item_review_details(
    p_order_id,
    requested.order_item_id
  ) review;
end;
$$;

create function public.customer_product_review_items(
  p_product_id uuid
)
returns table (
  order_item_id uuid,
  order_id uuid,
  order_number text,
  variant_name text,
  review_id uuid,
  rating smallint,
  comment text,
  status text,
  is_anonymous boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
begin
  if v_customer_id is null
    or not public.current_user_has_permission('storefront.access')
    or not exists (
      select 1
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = v_customer_id and r.scope = 'customer'
    ) then
    return;
  end if;

  return query
  with eligible_items as (
    select
      i.id as order_item_id,
      o.id as order_id,
      o.order_number,
      i.variant_name,
      coalesce(o.completed_at, o.updated_at) as completed_at
    from public.orders o
    join public.order_items i on i.order_id = o.id
    join public.product_variants v on v.id = i.variant_id
    where o.customer_id = v_customer_id
      and o.order_source = 'online'
      and o.status = 'completed'
      and v.product_id = p_product_id
  )
  select
    items.order_item_id,
    items.order_id,
    items.order_number,
    items.variant_name,
    review.review_id,
    review.rating,
    review.comment,
    review.status,
    review.is_anonymous
  from eligible_items items
  cross join lateral public.customer_order_item_review_details(
    items.order_id,
    items.order_item_id
  ) review
  where review.eligible
  order by items.completed_at desc, items.order_id desc, items.order_item_id
  limit 100;
end;
$$;

create function public.submit_product_review(
  p_order_id uuid,
  p_order_item_id uuid,
  p_product_id uuid,
  p_rating smallint,
  p_comment text,
  p_is_anonymous boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_product_id uuid;
  v_comment text := nullif(btrim(p_comment), '');
  v_status text;
begin
  if v_customer_id is null
    or not public.current_user_has_permission('storefront.access')
    or not exists (
      select 1
      from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = v_customer_id and r.scope = 'customer'
    ) then
    raise exception 'Sign in with a customer account to submit a review.';
  end if;
  if p_order_id is null or p_order_item_id is null or p_product_id is null then
    raise exception 'Choose a valid order item.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;
  if p_is_anonymous is null then
    raise exception 'Choose whether your review is anonymous.';
  end if;
  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'Keep your review under 2000 characters.';
  end if;

  select v.product_id into v_product_id
  from public.orders o
  join public.order_items i on i.order_id = o.id
  join public.product_variants v on v.id = i.variant_id
  where o.id = p_order_id
    and i.id = p_order_item_id
    and o.customer_id = v_customer_id
    and o.order_source = 'online'
    and o.status = 'completed'
  for share of o;
  if not found or v_product_id <> p_product_id then
    raise exception 'A completed order item for this product is required to review it.';
  end if;

  insert into public.product_reviews (
    product_id, customer_id, order_item_id, rating, comment, is_anonymous
  ) values (
    p_product_id, v_customer_id, p_order_item_id, p_rating, v_comment, p_is_anonymous
  )
  on conflict (order_item_id) do update
  set rating = excluded.rating,
    comment = excluded.comment,
    is_anonymous = excluded.is_anonymous,
    status = 'pending',
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now()
  returning status into v_status;

  return v_status;
end;
$$;

revoke all on function public.customer_order_item_review_details(uuid, uuid)
  from public, anon;
grant execute on function public.customer_order_item_review_details(uuid, uuid)
  to authenticated;
revoke all on function public.customer_order_item_reviews(uuid, uuid[])
  from public, anon;
grant execute on function public.customer_order_item_reviews(uuid, uuid[])
  to authenticated;
revoke all on function public.customer_product_review_items(uuid)
  from public, anon;
grant execute on function public.customer_product_review_items(uuid)
  to authenticated;
revoke all on function public.submit_product_review(uuid, uuid, uuid, smallint, text, boolean)
  from public, anon;
grant execute on function public.submit_product_review(uuid, uuid, uuid, smallint, text, boolean)
  to authenticated;

notify pgrst, 'reload schema';
