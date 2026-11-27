do $$
declare
  v_duplicates text;
begin
  select string_agg(format('%s (%s photos)', duplicate.order_number, duplicate.photo_count), ', ' order by duplicate.order_number)
    into v_duplicates
  from (
    select o.order_number, count(*) as photo_count
    from public.customer_releases r
    join public.orders o on o.id = r.order_id
    group by r.order_id, o.order_number
    having count(*) > 1
    order by o.order_number
    limit 20
  ) duplicate;

  if v_duplicates is not null then
    raise exception using
      errcode = '23505',
      message = 'Completed orders have more than one customer release photo.',
      detail = v_duplicates,
      hint = 'Unlink the extra releases for each order and rerun the migration.';
  end if;
end;
$$;

create unique index customer_releases_order_id_unique
  on public.customer_releases (order_id) where order_id is not null;

-- Staff can check eligible order links without seeing other uploaders' photos.
create function public.linked_customer_release_orders(
  p_order_ids uuid[],
  p_exclude_release_id uuid default null
)
returns table (order_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct r.order_id
  from public.customer_releases r
  join public.orders o on o.id = r.order_id
  where auth.uid() is not null
    and public.current_user_has_permission('admin.access')
    and (public.current_user_is_full_access() or public.current_user_has_permission('orders.read'))
    and public.current_user_can_access_branch(o.branch_id)
    and cardinality(p_order_ids) between 1 and 30
    and o.status = 'completed'
    and r.order_id = any(p_order_ids)
    and r.id is distinct from p_exclude_release_id;
$$;

revoke all on function public.linked_customer_release_orders(uuid[], uuid) from public, anon, authenticated;
grant execute on function public.linked_customer_release_orders(uuid[], uuid) to authenticated;

notify pgrst, 'reload schema';
