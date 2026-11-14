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
    or p_status not in ('in_service', 'ready_for_pickup', 'completed', 'no_show') then
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
