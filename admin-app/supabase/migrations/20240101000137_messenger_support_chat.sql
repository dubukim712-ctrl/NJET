alter table public.support_chat_threads
  add column channel text not null default 'web' check (channel in ('web', 'messenger')),
  add column messenger_psid text unique,
  add column messenger_avatar_url text;

alter table public.support_chat_messages
  add column external_message_id text unique,
  add constraint support_chat_messages_external_not_deleted
    check (external_message_id is null or deleted_at is null);

alter table public.support_chat_threads
  drop constraint support_chat_threads_check,
  add constraint support_chat_threads_channel_identity_check check (
    (channel = 'messenger' and messenger_psid is not null
      and customer_kind = 'guest' and customer_user_id is null
      and guest_email is null and guest_phone is null and guest_email_verified_at is null)
    or (channel = 'web' and messenger_psid is null and messenger_avatar_url is null and (
      (customer_kind = 'account' and guest_email is null and guest_phone is null)
      or (
        customer_kind = 'guest'
        and customer_user_id is null
        and (
          (
            guest_email is not null
            and guest_phone is null
            and guest_email = lower(btrim(guest_email))
            and guest_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          )
          or (
            guest_email is null
            and guest_phone is not null
            and guest_phone ~ '^\+?[0-9][0-9() .-]{5,23}$'
            and length(regexp_replace(guest_phone, '[^0-9]', '', 'g')) between 7 and 15
          )
        )
      )
    ))
  );

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
  channel text
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
    m.sender_role, m.sender_name, t.channel
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

create or replace function public.support_chat_send_message(
  p_thread_id uuid,
  p_body text,
  p_guest_token_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread public.support_chat_threads%rowtype;
  v_sender_role text;
  v_sender_user_id uuid := auth.uid();
  v_sender_name text;
  v_message_id uuid;
begin
  if p_body is null or length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'Messages must contain between 1 and 4000 characters.';
  end if;

  select * into v_thread
  from public.support_chat_threads
  where id = p_thread_id
  for update;
  if not found then
    raise exception 'Chat not found.';
  end if;

  if v_thread.channel <> 'web' then
    raise exception 'Messenger replies must use the Messenger send flow.';
  end if;

  if p_guest_token_hash is not null then
    if auth.uid() is not null or p_guest_token_hash !~ '^[a-f0-9]{64}$'
      or not exists (
        select 1
        from public.support_chat_guest_sessions s
        where s.thread_id = p_thread_id
          and s.token_hash = p_guest_token_hash
          and s.expires_at > now()
      ) then
      raise exception 'Guest chat access is invalid or expired.';
    end if;
    v_sender_role := 'customer';
    v_sender_user_id := null;
    v_sender_name := v_thread.customer_name;
  elsif auth.uid() is null then
    raise exception 'Sign in or recover guest chat access before sending messages.';
  elsif public.current_user_has_permission('support.chat.manage') then
    v_sender_role := 'staff';
    select coalesce(nullif(btrim(full_name), ''), 'Staff')
    into v_sender_name
    from public.users
    where id = auth.uid();
  elsif v_thread.customer_user_id = auth.uid()
    and public.current_user_has_permission('storefront.access')
    and exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid() and r.scope = 'customer'
    ) then
    v_sender_role := 'customer';
    select coalesce(nullif(btrim(full_name), ''), 'Customer')
    into v_sender_name
    from public.users
    where id = auth.uid();
  else
    raise exception 'You cannot send messages in this chat.';
  end if;

  if exists (
    select 1
    from public.support_chat_messages m
    where m.thread_id = p_thread_id
      and m.sender_role = v_sender_role
      and m.sender_user_id is not distinct from v_sender_user_id
      and m.created_at > now() - interval '1 second'
  ) then
    raise exception 'Please wait a moment before sending another message.';
  end if;

  insert into public.support_chat_messages (
    thread_id, sender_role, sender_user_id, sender_name, body
  )
  values (
    p_thread_id, v_sender_role, v_sender_user_id, v_sender_name, btrim(p_body)
  )
  returning id into v_message_id;

  if v_sender_role = 'customer' then
    update public.support_chat_threads
    set status = 'open', resolved_at = null, resolved_by = null
    where id = p_thread_id and status = 'resolved';
  end if;

  return v_message_id;
end;
$$;

create function public.support_chat_receive_messenger(
  p_psid text, p_mid text, p_body text, p_name text, p_avatar text
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_thread public.support_chat_threads%rowtype;
begin
  if exists (select 1 from public.support_chat_messages where external_message_id = p_mid) then
    return;
  end if;

  insert into public.support_chat_threads as t (
    channel, messenger_psid, messenger_avatar_url, customer_kind, customer_name
  )
  values ('messenger', p_psid, p_avatar, 'guest', p_name)
  on conflict (messenger_psid) do update
    set customer_name = case
      when t.customer_name = 'Messenger customer' then excluded.customer_name
      else t.customer_name end,
        messenger_avatar_url = coalesce(t.messenger_avatar_url, excluded.messenger_avatar_url)
  returning * into v_thread;

  insert into public.support_chat_messages (
    thread_id, sender_role, sender_name, body, external_message_id
  )
  values (v_thread.id, 'customer', v_thread.customer_name, p_body, p_mid)
  on conflict (external_message_id) do nothing;

  if found and v_thread.status = 'resolved' then
    update public.support_chat_threads
    set status = 'open', resolved_at = null, resolved_by = null
    where id = v_thread.id;
  end if;
end;
$$;

revoke all on function public.support_chat_receive_messenger(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.support_chat_receive_messenger(text, text, text, text, text)
  to service_role;
grant select, insert, update on public.support_chat_threads to service_role;
grant select, insert on public.support_chat_messages to service_role;

notify pgrst, 'reload schema';
