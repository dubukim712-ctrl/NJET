create or replace function public.storefront_branch_locations()
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.name, b.address, b.latitude, b.longitude
  from public.branches b
  where b.active
  order by b.name, b.id
  limit 100;
$$;

revoke all on function public.storefront_branch_locations()
  from public, anon, authenticated;
grant execute on function public.storefront_branch_locations()
  to anon, authenticated;

notify pgrst, 'reload schema';
