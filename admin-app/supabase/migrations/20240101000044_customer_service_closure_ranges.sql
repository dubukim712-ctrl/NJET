create or replace function public.customer_service_appointment_closures(
  p_branch_id uuid,
  p_date date
)
returns table (
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in with a customer account to view service closures.';
  end if;
  if p_date is null then
    raise exception 'Choose a service date.';
  end if;
  if not exists (
    select 1 from public.branches b
    where b.id = p_branch_id and b.active
  ) then
    raise exception 'Choose an active service branch.';
  end if;

  return query
  select c.starts_at, c.ends_at
  from public.service_appointment_closures c
  where c.branch_id = p_branch_id
    and c.starts_at < ((p_date + 1)::timestamp at time zone 'Asia/Manila')
    and c.ends_at > (p_date::timestamp at time zone 'Asia/Manila')
  order by c.starts_at
  limit 100;
end;
$$;

revoke all on function public.customer_service_appointment_closures(uuid, date)
  from public, anon;
grant execute on function public.customer_service_appointment_closures(uuid, date)
  to authenticated;

notify pgrst, 'reload schema';
