alter table public.product_reviews
  add column is_anonymous boolean not null default true;

alter table public.product_reviews
  alter column is_anonymous set default false;

drop function public.published_product_reviews(uuid, integer, integer);
create function public.published_product_reviews(
  p_product_id uuid,
  p_limit integer,
  p_offset integer
)
returns table (
  review_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  reviewer_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_limit < 1 or p_limit > 50 or p_offset < 0 or p_offset > 10000 then
    raise exception 'Choose a valid review page.';
  end if;

  return query
  select
    r.id,
    r.rating,
    r.comment,
    r.created_at,
    case
      when r.is_anonymous then null
      else coalesce(nullif(btrim(u.full_name), ''), 'Customer')
    end
  from public.product_reviews r
  join public.users u on u.id = r.customer_id
  where r.product_id = p_product_id and r.status = 'published'
  order by r.created_at desc, r.id desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.customer_product_review_details(
  p_product_id uuid
)
returns table (
  eligible boolean,
  review_id uuid,
  rating smallint,
  comment text,
  status text,
  is_anonymous boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    review.eligible,
    review.review_id,
    review.rating,
    review.comment,
    review.status,
    product_review.is_anonymous
  from public.customer_product_review(p_product_id) review
  left join public.product_reviews product_review
    on product_review.id = review.review_id;
$$;

drop function public.submit_product_review(uuid, smallint, text);
create function public.submit_product_review(
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
  v_order_item_id uuid;
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
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;
  if p_is_anonymous is null then
    raise exception 'Choose whether your review is anonymous.';
  end if;
  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'Keep your review under 2000 characters.';
  end if;

  select i.id into v_order_item_id
  from public.orders o
  join public.order_items i on i.order_id = o.id
  join public.product_variants v on v.id = i.variant_id
  where o.customer_id = v_customer_id
    and o.order_source = 'online'
    and o.status = 'completed'
    and v.product_id = p_product_id
  order by coalesce(o.completed_at, o.updated_at) desc, o.id desc
  limit 1
  for share of o;
  if not found then
    raise exception 'A completed online purchase is required to review this product.';
  end if;

  insert into public.product_reviews (
    product_id, customer_id, order_item_id, rating, comment, is_anonymous
  ) values (
    p_product_id, v_customer_id, v_order_item_id, p_rating, v_comment, p_is_anonymous
  )
  on conflict (product_id, customer_id) do update
  set order_item_id = excluded.order_item_id,
    rating = excluded.rating,
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

revoke all on function public.published_product_reviews(uuid, integer, integer)
  from public, authenticated;
grant execute on function public.published_product_reviews(uuid, integer, integer)
  to anon, authenticated;
revoke all on function public.customer_product_review_details(uuid)
  from public, anon;
grant execute on function public.customer_product_review_details(uuid)
  to authenticated;
revoke all on function public.submit_product_review(uuid, smallint, text, boolean)
  from public, anon;
grant execute on function public.submit_product_review(uuid, smallint, text, boolean)
  to authenticated;

notify pgrst, 'reload schema';
