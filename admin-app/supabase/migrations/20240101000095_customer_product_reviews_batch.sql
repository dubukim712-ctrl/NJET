create or replace function public.customer_product_reviews(
  p_product_ids uuid[]
)
returns table (
  product_id uuid,
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
begin
  if p_product_ids is null
    or cardinality(p_product_ids) not between 1 and 100
    or array_position(p_product_ids, null::uuid) is not null then
    raise exception 'Choose between 1 and 100 valid products.';
  end if;

  return query
  select
    requested.product_id,
    review.eligible,
    review.review_id,
    review.rating,
    review.comment,
    review.status
  from (
    select distinct unnest(p_product_ids) as product_id
  ) requested
  cross join lateral public.customer_product_review(requested.product_id) review;
end;
$$;

revoke all on function public.customer_product_reviews(uuid[])
  from public, anon, authenticated;
grant execute on function public.customer_product_reviews(uuid[])
  to authenticated;
