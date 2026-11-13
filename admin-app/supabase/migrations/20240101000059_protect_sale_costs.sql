revoke select on public.product_variants from authenticated;
grant select (
  id, product_id, sku, name, specifications, price_minor, reservation_minor,
  home_credit_downpayment_minor, image_path, active, is_demo, created_at, updated_at
) on public.product_variants to authenticated;

revoke select on public.order_items from authenticated;
grant select (
  id, order_id, variant_id, product_name, product_type, variant_name, sku,
  quantity, unit_price_minor, reservation_unit_minor, created_at
) on public.order_items to authenticated;

create or replace function public.admin_product_variants()
returns setof public.product_variants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
    or not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to view product costs.';
  end if;

  return query
  select v.*
  from public.product_variants v
  order by v.name, v.id
  limit 500;
end;
$$;

revoke all on function public.admin_product_variants()
  from public, anon;
grant execute on function public.admin_product_variants()
  to authenticated;

notify pgrst, 'reload schema';
