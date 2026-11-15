create or replace function public.support_chat_account_thread()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_thread_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to open customer chat.';
  end if;

  select nullif(btrim(u.full_name), '')
  into v_name
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid()
    and r.scope = 'customer'
    and public.current_user_has_permission('storefront.access');

  if not found then
    raise exception 'Customer chat is not available for this account.';
  end if;

  insert into public.support_chat_threads (
    customer_kind, customer_user_id, customer_name
  )
  values ('account', auth.uid(), coalesce(v_name, 'Customer'))
  on conflict (customer_user_id) where customer_user_id is not null
  do update set customer_name = excluded.customer_name
  returning id into v_thread_id;

  return v_thread_id;
end;
$$;

create or replace function public.support_chat_start_guest(
  p_name text,
  p_email text,
  p_phone text,
  p_token_hash text,
  p_realtime_key text
)
returns table (
  thread_id uuid,
  guest_session_id uuid,
  realtime_key text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(p_name);
  v_phone text := nullif(btrim(p_phone), '');
  v_thread_id uuid;
  v_session_id uuid;
  v_realtime_key text;
begin
  if auth.uid() is not null
    or p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_realtime_key is null
    or p_realtime_key !~ '^[a-f0-9]{64}$'
    or v_name is null
    or length(v_name) not between 1 and 120
    or nullif(btrim(p_email), '') is not null
    or v_phone is null then
    raise exception 'Enter a name and phone number to start a phone-only guest chat.';
  end if;

  select s.id, s.thread_id, s.realtime_key
  into v_session_id, v_thread_id, v_realtime_key
  from public.support_chat_guest_sessions s
  where s.token_hash = p_token_hash and s.expires_at > now();
  if found then
    return query select v_thread_id, v_session_id, v_realtime_key;
    return;
  end if;

  insert into public.support_chat_threads (
    customer_kind, customer_name, guest_phone
  )
  values ('guest', v_name, v_phone)
  returning id into v_thread_id;

  delete from public.support_chat_guest_sessions
  where thread_id = v_thread_id and expires_at <= now();

  insert into public.support_chat_guest_sessions as gs (
    thread_id, token_hash, realtime_key, expires_at
  )
  values (v_thread_id, p_token_hash, p_realtime_key, now() + interval '180 days')
  returning gs.id, gs.realtime_key
  into v_session_id, v_realtime_key;

  return query select v_thread_id, v_session_id, v_realtime_key;
end;
$$;

create or replace function public.support_chat_guest_thread(p_token_hash text)
returns table (
  thread_id uuid,
  customer_name text,
  guest_email text,
  guest_phone text,
  status text,
  last_message_at timestamptz,
  guest_session_id uuid,
  realtime_key text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
  v_thread_id uuid;
  v_realtime_key text;
begin
  if auth.uid() is not null
    or p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  select s.id, s.thread_id, s.realtime_key
  into v_session_id, v_thread_id, v_realtime_key
  from public.support_chat_guest_sessions s
  where s.token_hash = p_token_hash and s.expires_at > now();
  if not found then
    return;
  end if;

  update public.support_chat_guest_sessions
  set last_used_at = now()
  where id = v_session_id;

  return query
  select t.id, t.customer_name, t.guest_email, t.guest_phone,
    t.status, t.last_message_at, v_session_id, v_realtime_key
  from public.support_chat_threads t
  where t.id = v_thread_id;
end;
$$;

create or replace function public.support_chat_guest_messages(
  p_token_hash text,
  p_before_created_at timestamptz,
  p_before_id uuid,
  p_limit integer
)
returns table (
  id uuid,
  sender_role text,
  sender_user_id uuid,
  sender_name text,
  body text,
  deleted_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread_id uuid;
begin
  if auth.uid() is not null
    or p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_limit not between 1 and 50
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'Invalid chat history request.';
  end if;

  select s.thread_id into v_thread_id
  from public.support_chat_guest_sessions s
  where s.token_hash = p_token_hash and s.expires_at > now();
  if not found then
    raise exception 'Guest chat access expired. Recover access using your email.';
  end if;

  update public.support_chat_guest_sessions
  set last_used_at = now()
  where token_hash = p_token_hash;

  return query
  select m.id, m.sender_role, m.sender_user_id, m.sender_name,
    m.body, m.deleted_at, m.created_at
  from public.support_chat_messages m
  where m.thread_id = v_thread_id
    and (
      p_before_created_at is null
      or (m.created_at, m.id) < (p_before_created_at, p_before_id)
    )
    and not exists (
      select 1
      from public.support_chat_message_hides h
      where h.message_id = m.id and h.guest_thread_id = v_thread_id
    )
  order by m.created_at desc, m.id desc
  limit p_limit;
end;
$$;

revoke all on function public.support_chat_account_thread() from public, anon, authenticated;
revoke all on function public.support_chat_start_guest(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.support_chat_guest_thread(text) from public, anon, authenticated;
revoke all on function public.support_chat_guest_messages(text, timestamptz, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.support_chat_account_thread() to authenticated;
grant execute on function public.support_chat_start_guest(text, text, text, text, text)
  to anon;
grant execute on function public.support_chat_guest_thread(text) to anon;
grant execute on function public.support_chat_guest_messages(text, timestamptz, uuid, integer)
  to anon;

notify pgrst, 'reload schema';
