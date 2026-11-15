create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'new_order',
    'service_request',
    'technician_assignment',
    'low_stock',
    'out_of_stock'
  )),
  title text not null check (length(title) between 1 and 120),
  message text not null check (length(message) <= 280),
  href text not null check (href like '/admin/%'),
  entity_type text not null check (entity_type in ('order', 'service_appointment', 'product_variant')),
  entity_id uuid not null,
  branch_id uuid references public.branches(id) on delete set null,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc, id desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc, id desc)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.current_user_has_permission('admin.access')
  );
create policy "Users can update their notification read state"
  on public.notifications for update to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.current_user_has_permission('admin.access')
  )
  with check (
    recipient_user_id = auth.uid()
    and public.current_user_has_permission('admin.access')
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    if not exists (
      select 1 from pg_publication where pubname = 'supabase_realtime'
    ) then
      raise exception 'Supabase realtime publication is unavailable.';
    end if;
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
