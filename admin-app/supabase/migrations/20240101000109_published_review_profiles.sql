begin;

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
  reviewer_name text,
  is_anonymous boolean,
  reviewer_avatar_url text,
  variant_name text
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
    end,
    r.is_anonymous,
    case when not r.is_anonymous and u.avatar_url ~* '^https?://' then u.avatar_url end,
    i.variant_name
  from public.product_reviews r
  join public.users u on u.id = r.customer_id
  left join public.order_items i on i.id = r.order_item_id
  where r.product_id = p_product_id and r.status = 'published'
  order by r.created_at desc, r.id desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.published_product_reviews(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.published_product_reviews(uuid, integer, integer)
  to anon, authenticated;

notify pgrst, 'reload schema';
commit;
