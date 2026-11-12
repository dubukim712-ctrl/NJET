create or replace function public.customer_service_appointment_slots(
  p_branch_id uuid,
  p_date date
)
returns table (
  hours_configured boolean,
  branch_open boolean,
  slot_time text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_branch_name text;
  v_hours_configured boolean;
  v_is_open boolean;
  v_opens_at time;
  v_closes_at time;
begin
  if auth.uid() is null
    or (
      not public.current_user_has_permission('storefront.access')
      and not public.current_user_has_permission('service_appointments.manage')
    ) then
    raise exception 'Sign in with a customer or appointment manager account to view service times.';
  end if;
  if public.current_user_has_permission('service_appointments.manage')
    and not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You do not have access to this service branch.';
  end if;
  if p_date is null then
    raise exception 'Choose a service date.';
  end if;

  select b.name into v_branch_name
  from public.branches b
  where b.id = p_branch_id and b.active;
  if v_branch_name is null then
    raise exception 'Choose an active service branch.';
  end if;

  select count(*) = 7 into v_hours_configured
  from public.branch_service_hours h
  where h.branch_id = p_branch_id;
  if not v_hours_configured then
    return query select false, false, null::text;
    return;
  end if;

  select h.is_open, h.opens_at, h.closes_at
  into v_is_open, v_opens_at, v_closes_at
  from public.branch_service_hours h
  where h.branch_id = p_branch_id
    and h.day_of_week = extract(dow from p_date)::smallint;
  if not coalesce(v_is_open, false) then
    return query select true, false, null::text;
    return;
  end if;

  return query
  select
    true,
    true,
    to_char(slot.local_start, 'HH24:MI')
  from generate_series(
    p_date::timestamp,
    p_date::timestamp + interval '1 day' - interval '30 minutes',
    interval '30 minutes'
  ) as slot(local_start)
  where slot.local_start::time >= v_opens_at
    and slot.local_start::time <= v_closes_at - interval '1 hour'
    and (slot.local_start at time zone 'Asia/Manila') > now()
    and not exists (
      select 1
      from public.service_appointment_closures c
      where c.branch_id = p_branch_id
        and c.starts_at < (slot.local_start at time zone 'Asia/Manila') + interval '30 minutes'
        and c.ends_at > (slot.local_start at time zone 'Asia/Manila')
    )
  order by slot.local_start;

  if not found then
    return query select true, true, null::text;
  end if;
end;
$$;

revoke all on function public.customer_service_appointment_slots(uuid, date)
  from public, anon;
grant execute on function public.customer_service_appointment_slots(uuid, date)
  to authenticated;

notify pgrst, 'reload schema';
