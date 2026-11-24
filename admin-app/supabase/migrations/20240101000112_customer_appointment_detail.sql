create function public.customer_service_appointment_detail(p_appointment_id uuid)
returns table (
  id uuid, appointment_number text, branch_name text, service_mode text,
  service_type text, bike_make text, bike_model text, issue_description text,
  address_line1 text, barangay text, city text, province text,
  preferred_start_at timestamptz, scheduled_at timestamptz, status text,
  estimate_minor integer, final_total_minor integer, created_at timestamptz,
  bike_serial_number text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id, a.appointment_number, a.branch_name, a.service_mode, a.service_type,
    a.bike_make, a.bike_model, a.issue_description, a.address_line1, a.barangay,
    a.city, a.province, a.preferred_start_at, a.scheduled_at, a.status,
    a.estimate_minor, a.final_total_minor, a.created_at, a.bike_serial_number
  from public.service_appointments a
  where a.id = p_appointment_id
    and a.customer_id = auth.uid()
    and public.current_user_has_permission('storefront.access');
$$;

revoke all on function public.customer_service_appointment_detail(uuid) from public, anon, authenticated;
grant execute on function public.customer_service_appointment_detail(uuid) to authenticated;

notify pgrst, 'reload schema';
