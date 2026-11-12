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
    'product_categories',
    'product_subcategories',
    'ebike_units',
    'inventory_movements',
    'branch_transfers',
    'branch_transfer_items',
    'branch_transfer_units'
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
