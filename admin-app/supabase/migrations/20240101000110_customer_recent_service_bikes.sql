create function public.customer_recent_service_bikes()
returns table (make text, model text, serial text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with recent as (
    select btrim(a.bike_make) as make, btrim(a.bike_model) as model,
      nullif(btrim(a.bike_serial_number), '') as serial, a.created_at, a.id
    from public.service_appointments a
    where auth.uid() is not null
      and a.customer_id = auth.uid()
      and public.current_user_has_permission('storefront.access')
      and a.status in ('completed', 'ready_for_pickup')
      and btrim(a.bike_make) <> '' and btrim(a.bike_model) <> ''
    order by a.created_at desc, a.id desc
    limit 50
  ), distinct_bikes as (
    select distinct on (lower(r.make), lower(r.model), lower(r.serial)) r.*
    from recent r
    order by lower(r.make), lower(r.model), lower(r.serial), r.created_at desc, r.id desc
  )
  select b.make, b.model, b.serial
  from distinct_bikes b
  order by b.created_at desc, b.id desc
  limit 6;
$$;

revoke all on function public.customer_recent_service_bikes() from public, anon, authenticated;
grant execute on function public.customer_recent_service_bikes() to authenticated;

notify pgrst, 'reload schema';
