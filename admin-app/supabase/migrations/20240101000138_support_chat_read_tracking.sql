alter table public.support_chat_thread_reads add column last_read_message_id uuid;

create function public.support_chat_thread_is_unread(p_thread_id uuid, p_user_id uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.support_chat_messages m
    left join public.support_chat_thread_reads r
      on r.thread_id = m.thread_id and r.user_id = p_user_id
    where m.thread_id = p_thread_id
      and m.sender_role = 'customer'
      and m.deleted_at is null
      and (
        r.thread_id is null
        or m.created_at > r.last_read_at
        or (m.created_at = r.last_read_at and m.id > r.last_read_message_id)
      )
      and not exists (
        select 1 from public.support_chat_message_hides h
        where h.message_id = m.id and h.user_id = p_user_id
      )
  );
$$;

revoke all on function public.support_chat_thread_is_unread(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.support_chat_unread_count()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('support.chat.manage') then
    raise exception 'You do not have permission to view customer chats.';
  end if;

  return (
    select count(*)::integer from public.support_chat_threads t
    where public.support_chat_thread_is_unread(t.id, auth.uid())
  );
end;
$$;

drop function public.support_chat_mark_thread_read(uuid);

create function public.support_chat_mark_thread_read(p_thread_id uuid, p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_message_created_at timestamptz;
begin
  if v_user_id is null or not public.current_user_has_permission('support.chat.manage') then
    raise exception 'You do not have permission to manage customer chats.';
  end if;

  select m.created_at into v_message_created_at
  from public.support_chat_messages m
  where m.id = p_message_id and m.thread_id = p_thread_id
    and public.support_chat_can_read_message(m.id);
  if not found then return; end if;

  insert into public.support_chat_thread_reads as r (thread_id, user_id, last_read_at, last_read_message_id)
  values (p_thread_id, v_user_id, v_message_created_at, p_message_id)
  on conflict (thread_id, user_id) do update
  set last_read_at = excluded.last_read_at, last_read_message_id = excluded.last_read_message_id
  where (r.last_read_at, r.last_read_message_id) < (excluded.last_read_at, excluded.last_read_message_id);

  if found then
    perform realtime.send(
      payload => '{}'::jsonb,
      event => 'chat_changed',
      topic => 'support-chat:staff-inbox',
      private => true
    );
  end if;
end;
$$;

revoke all on function public.support_chat_mark_thread_read(uuid, uuid) from public, anon, authenticated;
grant execute on function public.support_chat_mark_thread_read(uuid, uuid) to authenticated;

drop function public.support_chat_list_threads(text, text, timestamptz, uuid, integer);


create or replace function public.support_chat_list_threads(
  p_status text default null,
  p_search text default null,
  p_before_last_message_at timestamptz default null,
  p_before_thread_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  customer_kind text,
  customer_name text,
  guest_email text,
  guest_phone text,
  status text,
  last_message_at timestamptz,
  last_message_body text,
  last_message_deleted boolean,
  last_sender_role text,
  last_sender_name text,
  channel text,
  is_unread boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('support.chat.manage') then
    raise exception 'You do not have permission to view customer chats.';
  end if;
  if (p_status is not null and p_status not in ('open', 'resolved'))
    or (p_search is not null and length(btrim(p_search)) > 100)
    or p_limit not between 1 and 50
    or ((p_before_last_message_at is null) <> (p_before_thread_id is null)) then
    raise exception 'Invalid chat inbox request.';
  end if;

  return query
  select t.id, t.customer_kind, t.customer_name, t.guest_email, t.guest_phone,
    t.status, t.last_message_at, m.body, m.deleted_at is not null,
    m.sender_role, m.sender_name, t.channel,
    public.support_chat_thread_is_unread(t.id, auth.uid())
  from public.support_chat_threads t
  left join lateral (
    select sm.body, sm.deleted_at, sm.sender_role, sm.sender_name
    from public.support_chat_messages sm
    where sm.thread_id = t.id
    order by sm.created_at desc, sm.id desc
    limit 1
  ) m on true
  where exists (
      select 1 from public.support_chat_messages customer_message
      where customer_message.thread_id = t.id and customer_message.sender_role = 'customer'
    )
    and (p_status is null or t.status = p_status)
    and (
      nullif(btrim(p_search), '') is null
      or t.customer_name ilike '%' || btrim(p_search) || '%'
      or coalesce(t.guest_email, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(t.guest_phone, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(m.body, '') ilike '%' || btrim(p_search) || '%'
    )
    and (
      p_before_last_message_at is null
      or (t.last_message_at, t.id) < (p_before_last_message_at, p_before_thread_id)
    )
  order by t.last_message_at desc, t.id desc
  limit p_limit;
end;
$$;

revoke all on function public.support_chat_list_threads(text, text, timestamptz, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.support_chat_list_threads(text, text, timestamptz, uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';
