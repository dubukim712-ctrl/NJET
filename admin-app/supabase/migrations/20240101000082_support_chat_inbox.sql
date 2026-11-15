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
  last_sender_name text
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
    m.sender_role, m.sender_name
  from public.support_chat_threads t
  left join lateral (
    select sm.body, sm.deleted_at, sm.sender_role, sm.sender_name
    from public.support_chat_messages sm
    where sm.thread_id = t.id
    order by sm.created_at desc, sm.id desc
    limit 1
  ) m on true
  where (p_status is null or t.status = p_status)
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
