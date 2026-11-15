create table public.support_chat_staff_readers (
  user_id uuid primary key references public.users(id) on delete cascade,
  available_since timestamptz not null default now()
);

create table public.support_chat_thread_reads (
  thread_id uuid not null references public.support_chat_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

alter table public.support_chat_staff_readers enable row level security;
alter table public.support_chat_thread_reads enable row level security;
revoke all on public.support_chat_staff_readers from public, anon, authenticated;
revoke all on public.support_chat_thread_reads from public, anon, authenticated;

create or replace function public.support_chat_unread_count()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null
    or not public.current_user_has_permission('support.chat.manage') then
    raise exception 'You do not have permission to view customer chats.';
  end if;

  insert into public.support_chat_staff_readers (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select count(*) into v_count
  from public.support_chat_threads t
  where exists (
    select 1
    from public.support_chat_messages m
    join public.support_chat_staff_readers sr on sr.user_id = v_user_id
    left join public.support_chat_thread_reads tr
      on tr.thread_id = t.id and tr.user_id = v_user_id
    where m.thread_id = t.id
      and m.sender_role = 'customer'
      and m.deleted_at is null
      and m.created_at > coalesce(tr.last_read_at, sr.available_since)
      and not exists (
        select 1
        from public.support_chat_message_hides h
        where h.message_id = m.id and h.user_id = v_user_id
      )
  );

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.support_chat_mark_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_read_at timestamptz;
begin
  if v_user_id is null
    or not public.current_user_has_permission('support.chat.manage') then
    raise exception 'You do not have permission to manage customer chats.';
  end if;
  if not exists (
    select 1 from public.support_chat_threads t where t.id = p_thread_id
  ) then
    raise exception 'Chat not found.';
  end if;

  insert into public.support_chat_staff_readers (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select coalesce(tr.last_read_at, sr.available_since)
  into v_last_read_at
  from public.support_chat_staff_readers sr
  left join public.support_chat_thread_reads tr
    on tr.thread_id = p_thread_id and tr.user_id = v_user_id
  where sr.user_id = v_user_id;

  if exists (
    select 1
    from public.support_chat_messages m
    where m.thread_id = p_thread_id
      and m.sender_role = 'customer'
      and m.deleted_at is null
      and m.created_at > v_last_read_at
      and not exists (
        select 1
        from public.support_chat_message_hides h
        where h.message_id = m.id and h.user_id = v_user_id
      )
  ) then
    insert into public.support_chat_thread_reads (thread_id, user_id, last_read_at)
    values (p_thread_id, v_user_id, now())
    on conflict (thread_id, user_id)
    do update set last_read_at = greatest(
      public.support_chat_thread_reads.last_read_at,
      excluded.last_read_at
    );

    perform realtime.send(
      payload => '{}'::jsonb,
      event => 'chat_changed',
      topic => 'support-chat:staff-inbox',
      private => true
    );
  end if;
end;
$$;

revoke all on function public.support_chat_unread_count()
  from public, anon, authenticated;
revoke all on function public.support_chat_mark_thread_read(uuid)
  from public, anon, authenticated;
grant execute on function public.support_chat_unread_count() to authenticated;
grant execute on function public.support_chat_mark_thread_read(uuid) to authenticated;

notify pgrst, 'reload schema';
