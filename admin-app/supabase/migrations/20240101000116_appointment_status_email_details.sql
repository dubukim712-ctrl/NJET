create function public.appointment_status_email_details(
  p_id uuid, p_event text, p_scheduled_at timestamptz
)
returns table (
  email text, appointment_id uuid, appointment_number text,
  customer_name text, branch_name text, scheduled_at timestamptz,
  service_type text, service_mode text, bike_make text,
  bike_model text, bike_serial_number text
)
language sql
stable
security definer
set search_path = ''
as $$
  select au.email::text, a.id, a.appointment_number, a.customer_name,
    a.branch_name, a.scheduled_at, a.service_type, a.service_mode,
    a.bike_make, a.bike_model, a.bike_serial_number
  from public.service_appointments a
  join auth.users au on au.id = a.customer_id
  where au.email_confirmed_at is not null and nullif(au.email, '') is not null
    and (
      (p_event in ('confirmed', 'rescheduled') and a.id = p_id
        and a.status in ('confirmed', 'in_service', 'ready_for_pickup')
        and a.scheduled_at = p_scheduled_at)
      or (p_event in ('approved', 'rejected') and exists (
        select 1 from public.service_appointment_cancellation_requests r
        where r.id = p_id and r.appointment_id = a.id
          and r.customer_id = a.customer_id and r.status = p_event
      ))
    );
$$;

revoke all on function public.appointment_status_email_details(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.appointment_status_email_details(uuid, text, timestamptz)
  to service_role;

notify pgrst, 'reload schema';
