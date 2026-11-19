create or replace function public.published_product_rating_summaries(
  p_product_ids uuid[]
)
returns table (
  product_id uuid,
  average_rating numeric,
  review_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_product_ids is null
    or cardinality(p_product_ids) not between 1 and 100
    or array_position(p_product_ids, null::uuid) is not null then
    raise exception 'Choose between 1 and 100 valid products.';
  end if;

  return query
  select
    requested.product_id,
    coalesce(round(avg(r.rating)::numeric, 1), 0),
    count(r.id)
  from (
    select distinct unnest(p_product_ids) as product_id
  ) requested
  left join public.product_reviews r
    on r.product_id = requested.product_id
    and r.status = 'published'
  group by requested.product_id;
end;
$$;

revoke all on function public.published_product_rating_summaries(uuid[])
  from public, anon, authenticated;
grant execute on function public.published_product_rating_summaries(uuid[])
  to anon, authenticated;
