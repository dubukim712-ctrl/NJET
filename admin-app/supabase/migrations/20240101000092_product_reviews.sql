insert into public.permissions (key, name, description, group_name, surface, sort_order)
values (
  'product_reviews.moderate',
  'Moderate product reviews',
  'Approve or reject customer product reviews.',
  'Product reviews',
  'admin',
  95
)
on conflict (key) do nothing;

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create index product_reviews_published_product_idx
  on public.product_reviews (product_id, created_at desc)
  where status = 'published';
create index product_reviews_pending_idx
  on public.product_reviews (created_at desc)
  where status = 'pending';

alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from public, anon, authenticated;
grant select (id, product_id, rating, comment, status, created_at, updated_at)
  on public.product_reviews to anon, authenticated;

create policy product_reviews_published_read
  on public.product_reviews for select to anon, authenticated
  using (status = 'published');
create policy product_reviews_owner_read
  on public.product_reviews for select to authenticated
  using (customer_id = auth.uid());
create policy product_reviews_moderation_read
  on public.product_reviews for select to authenticated
  using (public.current_user_has_permission('product_reviews.moderate'));

create or replace function public.published_product_rating_summary(
  p_product_id uuid
)
returns table (average_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(round(avg(r.rating)::numeric, 1), 0), count(*)
  from public.product_reviews r
  where r.product_id = p_product_id and r.status = 'published';
$$;

create or replace function public.published_product_reviews(
  p_product_id uuid,
  p_limit integer,
  p_offset integer
)
returns table (review_id uuid, rating smallint, comment text, created_at timestamptz)
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
  select r.id, r.rating, r.comment, r.created_at
  from public.product_reviews r
  where r.product_id = p_product_id and r.status = 'published'
  order by r.created_at desc, r.id desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.customer_product_review(p_product_id uuid)
returns table (
  eligible boolean,
  review_id uuid,
  rating smallint,
  comment text,
  status text
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
      join public.product_variants v on v.id = i.variant_id
      where o.customer_id = v_customer_id
        and o.order_source = 'online'
        and o.status = 'completed'
        and v.product_id = p_product_id
    ) then
    return query select false, null::uuid, null::smallint, null::text, null::text;
    return;
  end if;

  return query
  select true, r.id, r.rating, r.comment, r.status
  from public.product_reviews r
  where r.product_id = p_product_id and r.customer_id = v_customer_id;

  if not found then
    return query select true, null::uuid, null::smallint, null::text, null::text;
  end if;
end;
$$;

create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating smallint,
  p_comment text
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
    product_id, customer_id, order_item_id, rating, comment
  ) values (
    p_product_id, v_customer_id, v_order_item_id, p_rating, v_comment
  )
  on conflict (product_id, customer_id) do update
  set order_item_id = excluded.order_item_id,
    rating = excluded.rating,
    comment = excluded.comment,
    status = 'pending',
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now()
  returning status into v_status;

  return v_status;
end;
$$;

create or replace function public.admin_product_reviews(
  p_limit integer,
  p_offset integer
)
returns table (
  review_id uuid,
  product_id uuid,
  product_name text,
  rating smallint,
  comment text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_limit < 1 or p_limit > 50 or p_offset < 0 or p_offset > 10000 then
    raise exception 'Choose a valid moderation page.';
  end if;
  if not public.current_user_has_permission('product_reviews.moderate') then
    raise exception 'You do not have permission to moderate product reviews.';
  end if;

  return query
  select r.id, r.product_id, p.name, r.rating, r.comment, r.created_at
  from public.product_reviews r
  join public.products p on p.id = r.product_id
  where r.status = 'pending'
  order by r.created_at desc, r.id desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.moderate_product_review(
  p_review_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('product_reviews.moderate') then
    raise exception 'You do not have permission to moderate product reviews.';
  end if;
  if p_status is null or p_status not in ('published', 'rejected') then
    raise exception 'Choose approve or reject.';
  end if;

  update public.product_reviews
  set status = p_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = p_review_id and status = 'pending';
  if not found then
    raise exception 'This review is no longer awaiting moderation.';
  end if;
end;
$$;

revoke all on function public.published_product_rating_summary(uuid)
  from public, authenticated;
grant execute on function public.published_product_rating_summary(uuid)
  to anon, authenticated;
revoke all on function public.published_product_reviews(uuid, integer, integer)
  from public, authenticated;
grant execute on function public.published_product_reviews(uuid, integer, integer)
  to anon, authenticated;
revoke all on function public.customer_product_review(uuid)
  from public, anon;
grant execute on function public.customer_product_review(uuid)
  to authenticated;
revoke all on function public.submit_product_review(uuid, smallint, text)
  from public, anon;
grant execute on function public.submit_product_review(uuid, smallint, text)
  to authenticated;
revoke all on function public.admin_product_reviews(integer, integer)
  from public, anon;
grant execute on function public.admin_product_reviews(integer, integer)
  to authenticated;
revoke all on function public.moderate_product_review(uuid, text)
  from public, anon;
grant execute on function public.moderate_product_review(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
