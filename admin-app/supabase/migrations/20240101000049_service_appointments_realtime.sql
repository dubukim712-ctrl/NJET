do $$
declare
  realtime_table text;
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception 'Supabase realtime publication is unavailable.';
  end if;

  foreach realtime_table in array array[
    'service_appointment_internal_notes',
    'service_appointment_cancellation_requests',
    'service_appointment_closures'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end;
$$;
