-- Service appointment requests and staff scheduling.
insert into public.permissions (key, name, description, group_name, surface, sort_order)
values
  ('service_appointments.read', 'View service appointments', 'View appointments at accessible branches.', 'Service appointments', 'admin', 100),
  ('service_appointments.manage', 'Manage service appointments', 'Create, schedule, assign, and update appointments.', 'Service appointments', 'admin', 101),
  ('service_appointments.work', 'Update assigned appointments', 'Update the status and notes of assigned appointments.', 'Service appointments', 'admin', 102)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in (
  'service_appointments.read', 'service_appointments.manage'
)
where r.slug = 'sales'
on conflict (role_id, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in (
  'service_appointments.read', 'service_appointments.work'
)
where r.slug = 'technician'
on conflict (role_id, permission_key) do nothing;

create sequence public.service_appointment_number_seq;
grant usage on sequence public.service_appointment_number_seq to authenticated;

create table public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_number text not null unique
    default ('SVC-' || lpad(nextval('public.service_appointment_number_seq')::text, 6, '0')),
  customer_id uuid references public.users(id) on delete set null,
  customer_name text not null check (length(trim(customer_name)) between 2 and 100),
  contact_number text not null check (contact_number ~ '^[+0-9][0-9 ()-]{6,19}$'),
  branch_id uuid not null references public.branches(id) on delete restrict,
  branch_name text not null,
  service_mode text not null check (service_mode in ('branch_visit', 'home_service')),
  service_type text not null check (service_type in ('maintenance', 'repair', 'inspection', 'other')),
  bike_make text not null check (length(trim(bike_make)) between 1 and 80),
  bike_model text not null check (length(trim(bike_model)) between 1 and 100),
  bike_serial_number text check (bike_serial_number is null or length(bike_serial_number) <= 100),
  issue_description text not null check (length(trim(issue_description)) between 5 and 2000),
  address_line1 text,
  barangay text,
  city text,
  province text,
  postal_code text,
  preferred_start_at timestamptz not null,
  scheduled_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'in_service', 'ready_for_pickup', 'completed', 'cancelled', 'no_show')),
  assigned_technician_id uuid references public.users(id) on delete set null,
  estimate_minor integer check (estimate_minor is null or estimate_minor >= 0),
  final_total_minor integer check (final_total_minor is null or final_total_minor >= 0),
  created_by uuid not null references public.users(id) on delete restrict,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (
    (service_mode = 'branch_visit'
      and address_line1 is null and barangay is null and city is null and province is null and postal_code is null)
    or (service_mode = 'home_service'
      and nullif(trim(address_line1), '') is not null
      and nullif(trim(barangay), '') is not null
      and nullif(trim(city), '') is not null
      and nullif(trim(province), '') is not null)
  ),
  check (
    (status = 'requested' and scheduled_at is null and assigned_technician_id is null)
    or status = 'cancelled'
    or (status <> 'requested' and status <> 'cancelled'
      and scheduled_at is not null and assigned_technician_id is not null)
  ),
  check (
    address_line1 is null or length(address_line1) <= 200
  ),
  check (
    coalesce(length(barangay), 0) <= 100
    and coalesce(length(city), 0) <= 100
    and coalesce(length(province), 0) <= 100
    and coalesce(length(postal_code), 0) <= 20
  )
);

create table public.service_appointment_internal_notes (
  appointment_id uuid primary key references public.service_appointments(id) on delete cascade,
  note text not null check (length(note) <= 4000),
  updated_by uuid not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index service_appointments_branch_schedule_idx
  on public.service_appointments (branch_id, scheduled_at desc);
create index service_appointments_customer_created_idx
  on public.service_appointments (customer_id, created_at desc);
create index service_appointments_technician_schedule_idx
  on public.service_appointments (assigned_technician_id, scheduled_at)
  where assigned_technician_id is not null;
create index service_appointments_status_schedule_idx
  on public.service_appointments (status, scheduled_at);

create or replace function public.validate_service_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_technician_branch uuid;
  v_technician_scope text;
  v_technician_full_access boolean;
begin
  if tg_op = 'UPDATE' then
    if new.appointment_number is distinct from old.appointment_number
      or (
        new.customer_id is distinct from old.customer_id
        and not (
          new.customer_id is null
          and not exists (select 1 from public.users where id = old.customer_id)
        )
      )
      or new.customer_name is distinct from old.customer_name
      or new.contact_number is distinct from old.contact_number
      or new.branch_id is distinct from old.branch_id
      or new.branch_name is distinct from old.branch_name
      or new.service_mode is distinct from old.service_mode
      or new.service_type is distinct from old.service_type
      or new.bike_make is distinct from old.bike_make
      or new.bike_model is distinct from old.bike_model
      or new.bike_serial_number is distinct from old.bike_serial_number
      or new.issue_description is distinct from old.issue_description
      or new.address_line1 is distinct from old.address_line1
      or new.barangay is distinct from old.barangay
      or new.city is distinct from old.city
      or new.province is distinct from old.province
      or new.postal_code is distinct from old.postal_code
      or new.preferred_start_at is distinct from old.preferred_start_at
      or new.created_by is distinct from old.created_by then
      raise exception 'Customer and service details cannot be changed after booking.';
    end if;
    new.updated_by := auth.uid();
  end if;

  if tg_op = 'INSERT' and new.status <> 'requested'
    and new.scheduled_at <= now() then
    raise exception 'Choose a future scheduled time.';
  end if;
  if tg_op = 'UPDATE' and new.scheduled_at is distinct from old.scheduled_at
    and new.status not in ('completed', 'cancelled', 'no_show')
    and new.scheduled_at <= now() then
    raise exception 'Choose a future scheduled time.';
  end if;

  if new.assigned_technician_id is not null then
    select u.branch_id, r.scope, r.is_full_access
    into v_technician_branch, v_technician_scope, v_technician_full_access
    from public.users u join public.roles r on r.id = u.role_id
    where u.id = new.assigned_technician_id;
    if not found or v_technician_scope <> 'staff'
      or v_technician_branch is distinct from new.branch_id
      or (not v_technician_full_access and not exists (
        select 1 from public.role_permissions rp
        where rp.role_id = (select role_id from public.users where id = new.assigned_technician_id)
          and rp.permission_key = 'service_appointments.work'
      )) then
      raise exception 'Choose a technician assigned to this branch.';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
      (old.status = 'requested' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('in_service', 'cancelled', 'no_show'))
      or (old.status = 'in_service' and new.status in ('ready_for_pickup', 'completed'))
      or (old.status = 'ready_for_pickup' and new.status = 'completed')
    ) then
      raise exception 'This appointment status cannot be changed that way.';
    end if;
    if new.status = 'ready_for_pickup' and new.service_mode = 'home_service' then
      raise exception 'Home service appointments cannot be marked ready for pickup.';
    end if;
  end if;
  return new;
end;
$$;

create trigger service_appointments_validate
  before insert or update on public.service_appointments
  for each row execute procedure public.validate_service_appointment();
create trigger service_appointments_updated_at
  before update on public.service_appointments
  for each row execute procedure public.handle_updated_at();
create trigger service_appointment_notes_updated_at
  before update on public.service_appointment_internal_notes
  for each row execute procedure public.handle_updated_at();

create or replace function public.audit_service_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_actor_email text;
begin
  if tg_op <> 'INSERT' then
    v_old := jsonb_build_object(
      'id', old.id, 'status', old.status, 'branch_id', old.branch_id,
      'service_mode', old.service_mode, 'service_type', old.service_type,
      'scheduled_at', old.scheduled_at,
      'assigned_technician_id', old.assigned_technician_id,
      'estimate_minor', old.estimate_minor, 'final_total_minor', old.final_total_minor
    );
  end if;
  if tg_op <> 'DELETE' then
    v_new := jsonb_build_object(
      'id', new.id, 'status', new.status, 'branch_id', new.branch_id,
      'service_mode', new.service_mode, 'service_type', new.service_type,
      'scheduled_at', new.scheduled_at,
      'assigned_technician_id', new.assigned_technician_id,
      'estimate_minor', new.estimate_minor, 'final_total_minor', new.final_total_minor
    );
  end if;
  select email into v_actor_email from public.users where id = auth.uid();
  insert into public.audit_logs (
    actor_id, actor_email, action, table_name, record_id, old_data, new_data
  ) values (
    auth.uid(), v_actor_email, lower(tg_op), tg_table_name,
    coalesce(v_new->>'id', v_old->>'id'), v_old, v_new
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger service_appointments_audit
  after insert or update or delete on public.service_appointments
  for each row execute procedure public.audit_service_appointment_change();

alter table public.service_appointments enable row level security;
alter table public.service_appointment_internal_notes enable row level security;

create policy "Appointment readers see manageable or assigned branch records"
  on public.service_appointments for select to authenticated
  using (
    public.current_user_has_permission('service_appointments.read')
    and public.current_user_can_access_branch(branch_id)
    and (
      public.current_user_has_permission('service_appointments.manage')
      or assigned_technician_id = auth.uid()
    )
  );
create policy "Appointment managers create accessible branch records"
  on public.service_appointments for insert to authenticated
  with check (
    public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(branch_id)
    and created_by = auth.uid()
    and status = 'confirmed'
  );
create policy "Appointment managers update accessible branch records"
  on public.service_appointments for update to authenticated
  using (
    public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(branch_id)
  )
  with check (
    public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(branch_id)
  );

create policy "Assigned staff read internal appointment notes"
  on public.service_appointment_internal_notes for select to authenticated
  using (exists (
    select 1 from public.service_appointments a
    where a.id = appointment_id
      and public.current_user_can_access_branch(a.branch_id)
      and (public.current_user_has_permission('service_appointments.manage')
        or (a.assigned_technician_id = auth.uid()
          and public.current_user_has_permission('service_appointments.work')))
  ));
create policy "Assigned staff write internal appointment notes"
  on public.service_appointment_internal_notes for all to authenticated
  using (exists (
    select 1 from public.service_appointments a
    where a.id = appointment_id
      and public.current_user_can_access_branch(a.branch_id)
      and (public.current_user_has_permission('service_appointments.manage')
        or (a.assigned_technician_id = auth.uid()
          and public.current_user_has_permission('service_appointments.work')))
  ))
  with check (exists (
    select 1 from public.service_appointments a
    where a.id = appointment_id
      and public.current_user_can_access_branch(a.branch_id)
      and (public.current_user_has_permission('service_appointments.manage')
        or (a.assigned_technician_id = auth.uid()
          and public.current_user_has_permission('service_appointments.work')))
      and public.service_appointment_internal_notes.updated_by = auth.uid()
  ));

grant select, insert, update on public.service_appointments to authenticated;
grant select, insert, update on public.service_appointment_internal_notes to authenticated;
revoke delete on public.service_appointments, public.service_appointment_internal_notes
  from public, anon, authenticated;
revoke all on public.service_appointments, public.service_appointment_internal_notes from anon;
revoke all on function public.validate_service_appointment() from public, anon, authenticated;
revoke all on function public.audit_service_appointment_change() from public, anon, authenticated;

notify pgrst, 'reload schema';
