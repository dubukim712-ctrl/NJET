create function public.start_service_warranty_review(p_appointment_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_submitted_at timestamptz;
begin
  if auth.uid() is null or not public.current_user_has_permission('service_appointments.manage') then
    raise exception 'You do not have permission to start warranty reviews.';
  end if;

  select a.status, a.created_at into v_status, v_submitted_at
  from public.service_appointments a
  where a.id = p_appointment_id and public.current_user_can_access_branch(a.branch_id)
  for update;
  if not found then raise exception 'Choose an appointment from an accessible branch.'; end if;

  if exists (select 1 from public.service_warranty_cases c where c.appointment_id = p_appointment_id) then
    return p_appointment_id;
  end if;
  if v_status not in ('in_service', 'ready_for_pickup', 'completed') then
    raise exception 'Start the service inspection before opening a warranty review.';
  end if;

  insert into public.service_warranty_cases(appointment_id, submitted_at)
    values (p_appointment_id, v_submitted_at)
    on conflict (appointment_id) do nothing;
  return p_appointment_id;
end;
$$;

revoke all on function public.start_service_warranty_review(uuid) from public, anon, authenticated;
grant execute on function public.start_service_warranty_review(uuid) to authenticated;

revoke all on function public.request_service_warranty_appointment(jsonb, uuid) from public, anon, authenticated;
notify pgrst, 'reload schema';
