create table public.branch_service_hours (
  branch_id uuid not null references public.branches(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null,
  opens_at time,
  closes_at time,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (branch_id, day_of_week),
  check (
    (is_open and opens_at is not null and closes_at is not null and opens_at < closes_at)
    or (not is_open and opens_at is null and closes_at is null)
  )
);

alter table public.branch_service_hours enable row level security;
create policy "Branch managers view service hours"
  on public.branch_service_hours for select to authenticated
  using (
    public.current_user_has_permission('branches.manage')
    and public.current_user_can_access_branch(branch_id)
  );
grant select on public.branch_service_hours to authenticated;
revoke insert, update, delete on public.branch_service_hours from public, anon, authenticated;

create table public.service_appointment_closures (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (length(reason) <= 300),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (ends_at > starts_at)
);

create index service_appointment_closures_branch_time_idx
  on public.service_appointment_closures (branch_id, starts_at, ends_at);
alter table public.service_appointment_closures enable row level security;
create policy "Appointment managers view branch closures"
  on public.service_appointment_closures for select to authenticated
  using (
    public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(branch_id)
  );
create policy "Appointment managers create branch closures"
  on public.service_appointment_closures for insert to authenticated
  with check (
    public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(branch_id)
    and created_by = auth.uid()
  );
create policy "Appointment managers remove branch closures"
  on public.service_appointment_closures for delete to authenticated
  using (
    public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(branch_id)
  );
grant select, insert, delete on public.service_appointment_closures to authenticated;
revoke update on public.service_appointment_closures from public, anon, authenticated;

create or replace function public.prevent_closure_over_scheduled_appointments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if extract(minute from new.starts_at at time zone 'Asia/Manila')::integer not in (0, 30)
    or extract(second from new.starts_at at time zone 'Asia/Manila') <> 0
    or extract(minute from new.ends_at at time zone 'Asia/Manila')::integer not in (0, 30)
    or extract(second from new.ends_at at time zone 'Asia/Manila') <> 0 then
    raise exception 'Closure times must use 30-minute boundaries.';
  end if;
  if exists (
    select 1
    from public.service_appointments a
    where a.branch_id = new.branch_id
      and a.status in ('confirmed', 'in_service')
      and a.scheduled_at < new.ends_at
      and a.scheduled_at + interval '30 minutes' > new.starts_at
  ) then
    raise exception 'Reschedule confirmed appointments before blocking this time.';
  end if;
  return new;
end;
$$;

create trigger service_appointment_closures_validate
  before insert on public.service_appointment_closures
  for each row execute procedure public.prevent_closure_over_scheduled_appointments();

create or replace function public.save_branch_service_hours(
  p_branch_id uuid,
  p_hours jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('branches.manage')
    or not public.current_user_can_access_branch(p_branch_id)
    or p_branch_id is null
    or not exists (select 1 from public.branches b where b.id = p_branch_id)
    or p_hours is null
    or jsonb_typeof(p_hours) <> 'array'
    or jsonb_array_length(p_hours) <> 7
    or (
      select count(distinct day_of_week) <> 7
      from jsonb_to_recordset(p_hours) as item(
        day_of_week smallint, is_open boolean, opens_at time, closes_at time
      )
    ) then
    raise exception 'Choose a valid branch schedule with all seven days.';
  end if;

  delete from public.branch_service_hours where branch_id = p_branch_id;
  insert into public.branch_service_hours (
    branch_id, day_of_week, is_open, opens_at, closes_at, updated_by
  )
  select p_branch_id, item.day_of_week, item.is_open, item.opens_at, item.closes_at, auth.uid()
  from jsonb_to_recordset(p_hours) as item(
    day_of_week smallint, is_open boolean, opens_at time, closes_at time
  );
end;
$$;

create or replace function public.customer_service_appointment_availability(
  p_branch_id uuid,
  p_slot_start timestamptz
)
returns table (
  branch_name text,
  hours_configured boolean,
  branch_open boolean,
  closure_active boolean,
  technician_id uuid,
  technician_name text,
  technician_available boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_local_start timestamp := p_slot_start at time zone 'Asia/Manila';
  v_local_end timestamp := v_local_start + interval '30 minutes';
  v_branch_name text;
  v_hours_configured boolean;
  v_branch_open boolean;
  v_closure_active boolean;
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in with a customer account to check service availability.';
  end if;
  if p_slot_start is null then
    raise exception 'Choose a preferred appointment time.';
  end if;
  if extract(minute from v_local_start)::integer not in (0, 30)
    or extract(second from v_local_start) <> 0 then
    raise exception 'Choose a time at the start of a 30-minute service slot.';
  end if;

  select b.name into v_branch_name
  from public.branches b
  where b.id = p_branch_id and b.active;
  if v_branch_name is null then
    raise exception 'Choose an active service branch.';
  end if;

  select count(*) = 7 into v_hours_configured
  from public.branch_service_hours h where h.branch_id = p_branch_id;
  select exists (
    select 1
    from public.branch_service_hours h
    where h.branch_id = p_branch_id
      and h.day_of_week = extract(dow from v_local_start)::smallint
      and h.is_open
      and v_local_start::date = v_local_end::date
      and v_local_start::time >= h.opens_at
      and v_local_end::time <= h.closes_at
  ) into v_branch_open;
  select exists (
    select 1 from public.service_appointment_closures c
    where c.branch_id = p_branch_id
      and c.starts_at < p_slot_start + interval '30 minutes'
      and c.ends_at > p_slot_start
  ) into v_closure_active;

  return query
  with technicians as (
    select u.id, trim(u.full_name) as name
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.branch_id = p_branch_id
      and r.scope = 'staff'
      and nullif(trim(u.full_name), '') is not null
      and (
        r.slug = 'technician'
        or exists (
          select 1 from public.role_permissions rp
          where rp.role_id = r.id
            and rp.permission_key = 'service_appointments.work'
        )
      )
    order by u.full_name
    limit 100
  )
  select
    v_branch_name,
    v_hours_configured,
    v_branch_open,
    v_closure_active,
    t.id,
    t.name,
    coalesce(
      t.id is not null
      and v_branch_open
      and not v_closure_active
      and not exists (
        select 1
        from public.service_appointments a
        where a.assigned_technician_id = t.id
          and a.status in ('confirmed', 'in_service')
          and a.scheduled_at < p_slot_start + interval '30 minutes'
          and a.scheduled_at + interval '30 minutes' > p_slot_start
      ),
      false
    )
  from (select 1) seed
  left join technicians t on true;
end;
$$;

create or replace function public.prevent_service_appointment_slot_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slot_changed boolean;
begin
  if tg_op = 'INSERT' then
    if
      extract(minute from new.preferred_start_at at time zone 'Asia/Manila')::integer not in (0, 30)
      or extract(second from new.preferred_start_at at time zone 'Asia/Manila') <> 0
    then
      raise exception 'Appointment requests must start on a 30-minute slot.';
    end if;
  end if;

  if new.status in ('confirmed', 'in_service')
    and new.scheduled_at is not null
    and new.assigned_technician_id is not null then
    v_slot_changed := tg_op = 'INSERT';
    if tg_op = 'UPDATE' then
      v_slot_changed :=
        new.scheduled_at is distinct from old.scheduled_at
        or new.assigned_technician_id is distinct from old.assigned_technician_id;
    end if;
    if v_slot_changed then
      if extract(minute from new.scheduled_at at time zone 'Asia/Manila')::integer not in (0, 30)
        or extract(second from new.scheduled_at at time zone 'Asia/Manila') <> 0 then
        raise exception 'Scheduled appointments must start on a 30-minute slot.';
      end if;

      perform pg_advisory_xact_lock(hashtext(new.assigned_technician_id::text)::bigint);
      if exists (
        select 1
        from public.service_appointments a
        where a.id <> new.id
          and a.assigned_technician_id = new.assigned_technician_id
          and a.status in ('confirmed', 'in_service')
          and a.scheduled_at < new.scheduled_at + interval '30 minutes'
          and a.scheduled_at + interval '30 minutes' > new.scheduled_at
      ) then
        raise exception 'This technician already has an appointment in that 30-minute slot.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger service_appointments_slot_overlap
  before insert or update on public.service_appointments
  for each row execute procedure public.prevent_service_appointment_slot_overlap();

revoke all on function public.save_branch_service_hours(uuid, jsonb) from public, anon;
revoke all on function public.customer_service_appointment_availability(uuid, timestamptz) from public, anon;
revoke all on function public.prevent_service_appointment_slot_overlap() from public, anon, authenticated;
revoke all on function public.prevent_closure_over_scheduled_appointments() from public, anon, authenticated;
grant execute on function public.save_branch_service_hours(uuid, jsonb) to authenticated;
grant execute on function public.customer_service_appointment_availability(uuid, timestamptz) to authenticated;

notify pgrst, 'reload schema';
