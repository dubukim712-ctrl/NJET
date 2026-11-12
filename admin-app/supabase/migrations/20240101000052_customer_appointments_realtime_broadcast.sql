create policy "Customers receive own appointment invalidations"
  on realtime.messages for select to authenticated
  using (realtime.topic() = 'customer-service-appointments:' || auth.uid()::text);

create or replace function public.broadcast_customer_service_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.customer_id is not null then
      perform realtime.send(
        payload => '{}'::jsonb,
        event => 'appointment_changed',
        topic => 'customer-service-appointments:' || old.customer_id::text,
        private => true
      );
    end if;
  elsif tg_op = 'INSERT' then
    if new.customer_id is not null then
      perform realtime.send(
        payload => '{}'::jsonb,
        event => 'appointment_changed',
        topic => 'customer-service-appointments:' || new.customer_id::text,
        private => true
      );
    end if;
  else
    if old.customer_id is not null then
      perform realtime.send(
        payload => '{}'::jsonb,
        event => 'appointment_changed',
        topic => 'customer-service-appointments:' || old.customer_id::text,
        private => true
      );
    end if;
    if new.customer_id is not null and new.customer_id is distinct from old.customer_id then
      perform realtime.send(
        payload => '{}'::jsonb,
        event => 'appointment_changed',
        topic => 'customer-service-appointments:' || new.customer_id::text,
        private => true
      );
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.broadcast_customer_service_appointment_change()
  from public, anon, authenticated;

create trigger service_appointments_broadcast_customer_update
  after insert or update or delete on public.service_appointments
  for each row execute function public.broadcast_customer_service_appointment_change();
