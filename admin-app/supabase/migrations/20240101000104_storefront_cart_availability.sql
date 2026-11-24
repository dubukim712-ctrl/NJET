create function public.storefront_can_order_quantity(
  p_variant_id uuid,
  p_branch_id uuid,
  p_quantity integer
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_quantity between 1 and 99 and exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id and p.active
    join public.branches b on b.active and (p_branch_id is null or b.id = p_branch_id)
    where v.id = p_variant_id and v.active
      and case when p.product_type = 'ebike' then (
        select count(*) from (
          select 1 from public.ebike_units u
          where u.variant_id = v.id and u.branch_id = b.id and u.status = 'in_stock'
          limit greatest(0, least(p_quantity, 99))
        ) as available_units
      ) >= p_quantity
      else exists (
        select 1 from public.branch_inventory i
        where i.variant_id = v.id and i.branch_id = b.id and i.stock >= p_quantity
      ) end
  );
$$;

revoke all on function public.storefront_can_order_quantity(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.storefront_can_order_quantity(uuid, uuid, integer)
  to anon, authenticated;

notify pgrst, 'reload schema';
