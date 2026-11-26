create or replace function public.storefront_home_reviews()
returns table (
  id uuid, product_name text, slug text, rating smallint, comment text,
  reviewer_name text, branch_name text
)
language sql stable security definer set search_path = ''
as $$
  select r.id, p.name, p.slug, r.rating, r.comment,
    case when not r.is_anonymous then nullif(btrim(u.full_name), '') end,
    b.name
  from public.product_reviews r
  join public.products p on p.id = r.product_id
  join public.users u on u.id = r.customer_id
  join public.order_items i on i.id = r.order_item_id
  join public.product_variants v on v.id = i.variant_id and v.product_id = p.id
  join public.orders o on o.id = i.order_id and o.customer_id = r.customer_id
  join public.branches b on b.id = o.branch_id
  where r.status = 'published'
    and char_length(btrim(r.comment, E' \t\n\r')) >= 5
    and r.comment ~ '[[:alpha:]]'
    and btrim(r.comment, E' \t\n\r') !~* '^((test(ing)?|placeholder|sample|demo|dummy|asdf|qwerty|lorem ipsum|review|comment|feedback|text|copy|data|here)[[:space:][:punct:][:digit:]]*)+$'
    and btrim(r.comment, E' \t\n\r') !~* '^lorem ipsum'
    and o.status = 'completed' and p.active and not p.is_demo and p.product_type = 'ebike'
    and concat_ws(' ', b.name, b.address) ~* '\mCavite\M'
  order by r.rating desc, r.created_at desc, r.id desc
  limit 3;
$$;

revoke all on function public.storefront_home_reviews() from public, anon, authenticated;
grant execute on function public.storefront_home_reviews() to anon, authenticated;

notify pgrst, 'reload schema';
