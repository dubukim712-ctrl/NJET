create or replace function public.support_chat_can_read_message(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.support_chat_messages m
    join public.support_chat_threads t on t.id = m.thread_id
    where m.id = p_message_id
      and (
        public.current_user_has_permission('support.chat.manage')
        or (
          t.customer_user_id = auth.uid()
          and public.current_user_has_permission('storefront.access')
        )
      )
      and not exists (
        select 1
        from public.support_chat_message_hides h
        where h.message_id = m.id and h.user_id = auth.uid()
      )
  );
$$;

revoke all on function public.support_chat_can_read_message(uuid)
  from public, anon, authenticated;
grant execute on function public.support_chat_can_read_message(uuid) to authenticated;

create policy "Support staff and customers read their chat threads"
  on public.support_chat_threads for select to authenticated
  using (
    public.current_user_has_permission('support.chat.manage')
    or customer_user_id = auth.uid()
  );

create policy "Participants read visible support chat messages"
  on public.support_chat_messages for select to authenticated
  using (public.support_chat_can_read_message(id));

grant select on public.support_chat_threads, public.support_chat_messages to authenticated;

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

create or replace function public.support_chat_delete_message(
  p_message_id uuid,
  p_scope text,
  p_guest_token_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_message public.support_chat_messages%rowtype;
  v_thread public.support_chat_threads%rowtype;
  v_actor_role text;
  v_is_guest boolean := false;
begin
  if p_scope is null or p_scope not in ('for_you', 'for_everyone') then
    raise exception 'Choose a valid delete option.';
  end if;

  select * into v_message
  from public.support_chat_messages
  where id = p_message_id
  for update;
  if not found then
    raise exception 'Message not found.';
  end if;

  select * into v_thread
  from public.support_chat_threads
  where id = v_message.thread_id;

  if p_guest_token_hash is not null then
    if auth.uid() is not null or p_guest_token_hash !~ '^[a-f0-9]{64}$'
      or not exists (
        select 1
        from public.support_chat_guest_sessions s
        where s.thread_id = v_thread.id
          and s.token_hash = p_guest_token_hash
          and s.expires_at > now()
      ) then
      raise exception 'Guest chat access is invalid or expired.';
    end if;
    v_actor_role := 'customer';
    v_is_guest := true;
  elsif auth.uid() is null then
    raise exception 'You must be signed in to manage this message.';
  elsif public.current_user_has_permission('support.chat.manage') then
    v_actor_role := 'staff';
  elsif v_thread.customer_user_id = auth.uid()
    and public.current_user_has_permission('storefront.access')
    and exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid() and r.scope = 'customer'
    ) then
    v_actor_role := 'customer';
  else
    raise exception 'You cannot manage this message.';
  end if;

  if p_scope = 'for_you' then
    if v_is_guest then
      insert into public.support_chat_message_hides (message_id, guest_thread_id)
      values (p_message_id, v_thread.id)
      on conflict (message_id, guest_thread_id)
        where guest_thread_id is not null do nothing;
    else
      insert into public.support_chat_message_hides (message_id, user_id)
      values (p_message_id, auth.uid())
      on conflict (message_id, user_id)
        where user_id is not null do nothing;
    end if;
    return true;
  end if;

  if v_message.sender_role <> v_actor_role
    or (not v_is_guest and v_message.sender_user_id <> auth.uid()) then
    raise exception 'Only the sender can delete a message for everyone.';
  end if;

  update public.support_chat_messages
  set body = null, deleted_at = coalesce(deleted_at, now()),
      deleted_by_user_id = auth.uid()
  where id = p_message_id and deleted_at is null;
  return true;
end;
$$;

create or replace function public.support_chat_set_status(
  p_thread_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('support.chat.manage') then
    raise exception 'You do not have permission to manage customer chats.';
  end if;
  if p_status not in ('open', 'resolved') then
    raise exception 'Choose a valid chat status.';
  end if;

  update public.support_chat_threads
  set status = p_status,
      resolved_at = case when p_status = 'resolved' then now() else null end,
      resolved_by = case when p_status = 'resolved' then auth.uid() else null end
  where id = p_thread_id;
  if not found then
    raise exception 'Chat not found.';
  end if;
end;
$$;

revoke all on function public.support_chat_send_message(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.support_chat_delete_message(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.support_chat_set_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.support_chat_send_message(uuid, text, text)
  to anon, authenticated;
grant execute on function public.support_chat_delete_message(uuid, text, text)
  to anon, authenticated;
grant execute on function public.support_chat_set_status(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
