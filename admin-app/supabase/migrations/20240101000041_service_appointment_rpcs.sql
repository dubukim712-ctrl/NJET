create or replace function public.request_service_appointment(
  p_branch_id uuid,
  p_service_mode text,
  p_service_type text,
  p_bike_make text,
  p_bike_model text,
  p_bike_serial_number text,
  p_issue_description text,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_contact_number text,
  p_preferred_start_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_appointment_id uuid;
  v_customer_name text;
  v_branch_name text;
begin
  if v_user_id is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in with a customer account to request an appointment.';
  end if;
  if p_preferred_start_at <= now() then
    raise exception 'Choose a future preferred appointment time.';
  end if;
  select coalesce(nullif(trim(full_name), ''), email) into v_customer_name
  from public.users where id = v_user_id;
  select name into v_branch_name from public.branches where id = p_branch_id and active;
  if v_branch_name is null then
    raise exception 'Choose an active service branch.';
  end if;
  insert into public.service_appointments (
    customer_id, customer_name, contact_number, branch_id, branch_name,
    service_mode, service_type, bike_make, bike_model, bike_serial_number,
    issue_description, address_line1, barangay, city, province, postal_code,
    preferred_start_at, created_by
  ) values (
    v_user_id, v_customer_name, p_contact_number, p_branch_id, v_branch_name,
    p_service_mode, p_service_type, p_bike_make, p_bike_model, p_bike_serial_number,
    p_issue_description, nullif(trim(p_address_line1), ''), nullif(trim(p_barangay), ''),
    nullif(trim(p_city), ''), nullif(trim(p_province), ''), nullif(trim(p_postal_code), ''),
    p_preferred_start_at, v_user_id
  ) returning id into v_appointment_id;
  return v_appointment_id;
end;
$$;

create or replace function public.customer_service_appointments()
returns table (
  id uuid, appointment_number text, branch_name text, service_mode text,
  service_type text, bike_make text, bike_model text, issue_description text,
  address_line1 text, barangay text, city text, province text,
  preferred_start_at timestamptz, scheduled_at timestamptz, status text,
  estimate_minor integer, final_total_minor integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in with a customer account to view appointments.';
  end if;
  return query
  select a.id, a.appointment_number, a.branch_name, a.service_mode, a.service_type,
    a.bike_make, a.bike_model, a.issue_description, a.address_line1, a.barangay,
    a.city, a.province, a.preferred_start_at, a.scheduled_at, a.status,
    a.estimate_minor, a.final_total_minor, a.created_at
  from public.service_appointments a
  where a.customer_id = auth.uid()
  order by a.created_at desc
  limit 50;
end;
$$;

create or replace function public.service_appointment_branch_options()
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('service_appointments.read') then
    raise exception 'You do not have permission to view service appointment branches.';
  end if;
  return query
  select b.id, b.name
  from public.branches b
  where b.active and public.current_user_can_access_branch(b.id)
    and (public.current_user_has_permission('service_appointments.manage')
      or exists (
        select 1 from public.service_appointments a
        where a.branch_id = b.id and a.assigned_technician_id = auth.uid()
      ))
  order by b.name
  limit 100;
end;
$$;

create or replace function public.service_appointment_technician_options(p_branch_id uuid)
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('service_appointments.manage')
    or not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You do not have permission to assign technicians at this branch.';
  end if;
  return query
  select u.id, coalesce(nullif(trim(u.full_name), ''), u.email)
  from public.users u
  join public.roles r on r.id = u.role_id
  where r.scope = 'staff' and u.branch_id = p_branch_id
    and (r.slug = 'technician' or exists (
      select 1 from public.role_permissions rp
      where rp.role_id = r.id and rp.permission_key = 'service_appointments.work'
    ))
  order by u.full_name nulls last, u.email
  limit 100;
end;
$$;

create or replace function public.service_appointment_technician_names(p_technician_ids uuid[])
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('service_appointments.read')
    or cardinality(p_technician_ids) > 100 then
    raise exception 'You do not have permission to view technician assignments.';
  end if;
  return query
  select u.id, coalesce(nullif(trim(u.full_name), ''), u.email)
  from public.users u
  where u.id = any(p_technician_ids)
    and public.current_user_can_access_branch(u.branch_id)
    and (public.current_user_has_permission('service_appointments.manage')
      or u.id = auth.uid())
  limit 100;
end;
$$;

create or replace function public.set_assigned_service_appointment_status(
  p_appointment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('service_appointments.work')
    or p_status not in ('in_service', 'ready_for_pickup', 'completed') then
    raise exception 'You do not have permission to set this appointment status.';
  end if;
  update public.service_appointments
  set status = p_status, updated_by = auth.uid()
  where id = p_appointment_id
    and assigned_technician_id = auth.uid()
    and public.current_user_can_access_branch(branch_id);
  if not found then
    raise exception 'This appointment is not assigned to you or is unavailable.';
  end if;
end;
$$;

revoke all on function public.request_service_appointment(uuid, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz)
  from public, anon;
revoke all on function public.customer_service_appointments() from public, anon;
revoke all on function public.service_appointment_branch_options() from public, anon;
revoke all on function public.service_appointment_technician_options(uuid) from public, anon;
revoke all on function public.service_appointment_technician_names(uuid[]) from public, anon;
revoke all on function public.set_assigned_service_appointment_status(uuid, text) from public, anon;
grant execute on function public.request_service_appointment(uuid, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.customer_service_appointments() to authenticated;
grant execute on function public.service_appointment_branch_options() to authenticated;
grant execute on function public.service_appointment_technician_options(uuid) to authenticated;
grant execute on function public.service_appointment_technician_names(uuid[]) to authenticated;
grant execute on function public.set_assigned_service_appointment_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
