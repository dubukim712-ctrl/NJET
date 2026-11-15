create policy "Support staff receive chat invalidations"
  on realtime.messages for select to authenticated
  using (
    realtime.topic() = 'support-chat:staff-inbox'
    and public.current_user_has_permission('support.chat.manage')
  );

create policy "Chat participants receive thread invalidations"
  on realtime.messages for select to authenticated
  using (
    realtime.topic() ~ '^support-chat:thread:[0-9a-f-]{36}$'
    and (
      public.current_user_has_permission('support.chat.manage')
      or exists (
        select 1
        from public.support_chat_threads t
        where t.id::text = split_part(realtime.topic(), ':', 3)
          and t.customer_user_id = auth.uid()
      )
    )
  );

create policy "Guest sessions receive chat invalidations"
  on realtime.messages for select to anon
  using (realtime.topic() ~ '^support-chat:guest:[a-f0-9]{64}$');

create or replace function public.broadcast_support_chat_thread_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
declare
  v_session record;
begin
  perform realtime.send(
    payload => '{}'::jsonb,
    event => 'chat_changed',
    topic => 'support-chat:staff-inbox',
    private => true
  );

  perform realtime.send(
    payload => '{}'::jsonb,
    event => 'chat_changed',
    topic => 'support-chat:thread:' || new.id::text,
    private => true
  );

  if new.customer_kind = 'guest' then
    for v_session in
      select s.realtime_key
      from public.support_chat_guest_sessions s
      where s.thread_id = new.id and s.expires_at > now()
    loop
      perform realtime.send(
        payload => '{}'::jsonb,
        event => 'chat_changed',
        topic => 'support-chat:guest:' || v_session.realtime_key,
        private => true
      );
    end loop;
  end if;

  return null;
end;
$$;

create or replace function public.broadcast_support_chat_message_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
declare
  v_thread_id uuid := coalesce(new.thread_id, old.thread_id);
begin
  if tg_op = 'INSERT' then
    update public.support_chat_threads
    set last_message_at = greatest(last_message_at, new.created_at)
    where id = new.thread_id;
  else
    perform realtime.send(
      payload => '{}'::jsonb,
      event => 'chat_changed',
      topic => 'support-chat:staff-inbox',
      private => true
    );
    perform realtime.send(
      payload => '{}'::jsonb,
      event => 'chat_changed',
      topic => 'support-chat:thread:' || v_thread_id::text,
      private => true
    );

    perform realtime.send(
      payload => '{}'::jsonb,
      event => 'chat_changed',
      topic => 'support-chat:guest:' || s.realtime_key,
      private => true
    )
    from public.support_chat_guest_sessions s
    where s.thread_id = v_thread_id and s.expires_at > now();
  end if;
  return null;
end;
$$;

create or replace function public.broadcast_support_chat_hide()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
declare
  v_thread_id uuid;
  v_session record;
begin
  select m.thread_id into v_thread_id
  from public.support_chat_messages m
  where m.id = new.message_id;

  perform realtime.send(
    payload => '{}'::jsonb,
    event => 'chat_changed',
    topic => 'support-chat:thread:' || v_thread_id::text,
    private => true
  );

  if new.guest_thread_id is not null then
    for v_session in
      select s.realtime_key
      from public.support_chat_guest_sessions s
      where s.thread_id = new.guest_thread_id and s.expires_at > now()
    loop
      perform realtime.send(
        payload => '{}'::jsonb,
        event => 'chat_changed',
        topic => 'support-chat:guest:' || v_session.realtime_key,
        private => true
      );
    end loop;
  end if;

  return null;
end;
$$;

revoke all on function public.broadcast_support_chat_thread_change()
  from public, anon, authenticated;
revoke all on function public.broadcast_support_chat_message_change()
  from public, anon, authenticated;
revoke all on function public.broadcast_support_chat_hide()
  from public, anon, authenticated;

create trigger support_chat_threads_broadcast_update
  after update on public.support_chat_threads
  for each row execute function public.broadcast_support_chat_thread_change();

create trigger support_chat_messages_update_last_message
  after insert or update on public.support_chat_messages
  for each row execute function public.broadcast_support_chat_message_change();

create trigger support_chat_hides_broadcast
  after insert on public.support_chat_message_hides
  for each row execute function public.broadcast_support_chat_hide();

notify pgrst, 'reload schema';
