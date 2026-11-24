create or replace function public.customer_recent_service_bikes()
returns table (make text, model text, serial text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with customer as (
    select auth.uid() as id
    where auth.uid() is not null
      and public.current_user_has_permission('storefront.access')
  ), serviced as (
    select btrim(a.bike_make) as make, btrim(a.bike_model) as model,
      nullif(btrim(a.bike_serial_number), '') as serial, a.created_at as recorded_at,
      a.id, true as from_service
    from public.service_appointments a
    join customer c on c.id = a.customer_id
    where a.status in ('completed', 'ready_for_pickup')
      and btrim(a.bike_make) <> '' and btrim(a.bike_model) <> ''
    order by a.created_at desc, a.id desc
    limit 50
  ), purchased as (
    -- Order snapshots identify the model. They have no maker field.
    select ''::text as make, btrim(i.product_name) as model,
      nullif(btrim(u.serial_number), '') as serial,
      coalesce(o.completed_at, o.created_at) as recorded_at, u.id, false as from_service
    from public.orders o
    join customer c on c.id = o.customer_id
    join public.order_items i on i.order_id = o.id and i.product_type = 'ebike'
    join public.ebike_units u on u.order_item_id = i.id and u.status = 'sold'
    where o.status = 'completed'
      and nullif(btrim(u.serial_number), '') is not null
      and btrim(i.product_name) <> ''
    order by recorded_at desc, u.id desc
    limit 50
  ), bikes as (
    select * from serviced
    union all
    select * from purchased
  ), identified as (
    select distinct on (lower(b.serial)) b.*
    from bikes b
    where b.serial is not null
    order by lower(b.serial), b.from_service desc, b.recorded_at desc, b.id desc
  ), unidentified as (
    select distinct on (lower(b.make), lower(b.model)) b.*
    from bikes b
    where b.serial is null
      and not exists (
        select 1 from identified known
        where lower(known.model) = lower(b.model)
          and (known.make = '' or lower(known.make) = lower(b.make))
      )
    order by lower(b.make), lower(b.model), b.recorded_at desc, b.id desc
  )
  select b.make, b.model, b.serial
  from (
    select * from identified
    union all
    select * from unidentified
  ) b
  order by b.recorded_at desc, b.id desc
  limit 6;
$$;

revoke all on function public.customer_recent_service_bikes() from public, anon, authenticated;
grant execute on function public.customer_recent_service_bikes() to authenticated;

notify pgrst, 'reload schema';
