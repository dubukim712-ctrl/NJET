create policy "Authenticated users receive service availability updates"
  on realtime.messages for select to authenticated
  using (realtime.topic() like 'service-availability:%');

create or replace function public.broadcast_service_availability_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform realtime.send(
      payload => jsonb_build_object('branchId', old.branch_id),
      event => 'availability_changed',
      topic => 'service-availability:' || old.branch_id::text,
      private => true
    );
  elsif tg_op = 'INSERT' then
    perform realtime.send(
      payload => jsonb_build_object('branchId', new.branch_id),
      event => 'availability_changed',
      topic => 'service-availability:' || new.branch_id::text,
      private => true
    );
  else
    perform realtime.send(
      payload => jsonb_build_object('branchId', old.branch_id),
      event => 'availability_changed',
      topic => 'service-availability:' || old.branch_id::text,
      private => true
    );
    if old.branch_id is distinct from new.branch_id then
      perform realtime.send(
        payload => jsonb_build_object('branchId', new.branch_id),
        event => 'availability_changed',
        topic => 'service-availability:' || new.branch_id::text,
        private => true
      );
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.broadcast_service_availability_change()
  from public, anon, authenticated;

create trigger service_appointments_broadcast_availability
  after insert or update or delete on public.service_appointments
  for each row execute function public.broadcast_service_availability_change();

create trigger service_appointment_closures_broadcast_availability
  after insert or update or delete on public.service_appointment_closures
  for each row execute function public.broadcast_service_availability_change();

create trigger branch_service_hours_broadcast_availability
  after insert or update or delete on public.branch_service_hours
  for each row execute function public.broadcast_service_availability_change();
