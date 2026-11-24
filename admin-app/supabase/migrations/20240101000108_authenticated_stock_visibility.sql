begin;

create or replace function public.storefront_variant_availability(
  p_variant_ids uuid[]
)
returns table (
  variant_id uuid,
  branch_id uuid,
  available boolean,
  stock integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_variant_ids is null
    or cardinality(p_variant_ids) not between 1 and 500
    or array_position(p_variant_ids, null::uuid) is not null then
    raise exception 'Choose between 1 and 500 product variants.';
  end if;

  return query
  with requested_variants as (
    select distinct requested.id
    from unnest(p_variant_ids) as requested(id)
    where requested.id is not null
  ),
  active_branches as (
    select b.id, b.name
    from public.branches b
    where b.active
    order by b.name, b.id
    limit 100
  )
  select
    requested.id,
    b.id,
    computed.quantity > 0,
    case
      when auth.uid() is not null
        then computed.quantity
      else null::integer
    end
  from requested_variants requested
  join public.product_variants v on v.id = requested.id and v.active
  join public.products p on p.id = v.product_id and p.active
  cross join active_branches b
  left join public.branch_inventory i
    on i.variant_id = v.id and i.branch_id = b.id
  left join lateral (
    select count(*)::integer as quantity
    from public.ebike_units u
    where u.variant_id = v.id
      and u.branch_id = b.id
      and u.status = 'in_stock'
  ) serial_stock on p.product_type = 'ebike'
  cross join lateral (
    select case
      when p.product_type = 'ebike' then coalesce(serial_stock.quantity, 0)
      else coalesce(i.stock, 0)
    end as quantity
  ) computed
  order by requested.id, b.name, b.id;
end;
$$;

-- Keep listing responses bounded to one availability row per variant.
create function public.storefront_variant_stock_summary(p_variant_ids uuid[])
returns table (variant_id uuid, available boolean, stock bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  select a.variant_id, bool_or(a.available), sum(a.stock)
  from public.storefront_variant_availability(p_variant_ids) a
  group by a.variant_id;
$$;

revoke all on function public.storefront_variant_availability(uuid[]) from public, anon, authenticated;
grant execute on function public.storefront_variant_availability(uuid[]) to anon, authenticated;
revoke all on function public.storefront_variant_stock_summary(uuid[]) from public, anon, authenticated;
grant execute on function public.storefront_variant_stock_summary(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
