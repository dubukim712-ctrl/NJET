create or replace function public.support_chat_request_guest_email_access(
  p_name text,
  p_email text,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(p_name);
  v_email text := nullif(lower(btrim(p_email)), '');
  v_thread_id uuid;
  v_recent_requests integer;
begin
  if v_name is null
    or length(v_name) not between 1 and 120
    or v_email is null
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_code_hash is null
    or p_code_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid guest email access request.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));

  delete from public.support_chat_recovery_challenges
  where expires_at <= now() or created_at < now() - interval '1 day';

  select id into v_thread_id
  from public.support_chat_threads
  where customer_kind = 'guest' and guest_email = v_email;

  select count(*) into v_recent_requests
  from public.support_chat_recovery_challenges
  where guest_email = v_email
    and created_at > now() - interval '15 minutes';
  if v_recent_requests >= 3 then
    return false;
  end if;

  update public.support_chat_recovery_challenges
  set consumed_at = now()
  where guest_email = v_email and consumed_at is null;

  insert into public.support_chat_recovery_challenges (
    thread_id, guest_email, customer_name, code_hash, expires_at
  )
  values (
    v_thread_id, v_email, v_name, p_code_hash, now() + interval '10 minutes'
  );
  return true;
end;
$$;

create or replace function public.support_chat_verify_guest_email_access(
  p_email text,
  p_code_hash text,
  p_token_hash text,
  p_realtime_key text
)
returns table (thread_id uuid, realtime_key text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := nullif(lower(btrim(p_email)), '');
  v_challenge_id uuid;
  v_thread_id uuid;
  v_customer_name text;
  v_stored_hash text;
begin
  if v_email is null
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_code_hash is null
    or p_code_hash !~ '^[a-f0-9]{64}$'
    or p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_realtime_key is null
    or p_realtime_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid guest email access request.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));

  select c.id, c.thread_id, c.customer_name, c.code_hash
  into v_challenge_id, v_thread_id, v_customer_name, v_stored_hash
  from public.support_chat_recovery_challenges c
  where c.guest_email = v_email
    and c.consumed_at is null
    and c.expires_at > now()
    and c.attempt_count < 5
  order by c.created_at desc
  limit 1
  for update;

  if not found then
    return;
  end if;

  if v_stored_hash <> p_code_hash then
    update public.support_chat_recovery_challenges
    set attempt_count = attempt_count + 1
    where id = v_challenge_id;
    return;
  end if;

  update public.support_chat_recovery_challenges
  set consumed_at = now()
  where id = v_challenge_id;

  if v_thread_id is null then
    insert into public.support_chat_threads (
      customer_kind, customer_name, guest_email, guest_email_verified_at
    )
    values ('guest', v_customer_name, v_email, now())
    on conflict (lower(guest_email)) where guest_email is not null
    do nothing
    returning id into v_thread_id;

    if v_thread_id is null then
      select t.id into v_thread_id
      from public.support_chat_threads t
      where t.guest_email = v_email;
    end if;
  else
    update public.support_chat_threads
    set guest_email_verified_at = coalesce(guest_email_verified_at, now())
    where id = v_thread_id;
  end if;

  delete from public.support_chat_guest_sessions
  where thread_id = v_thread_id and expires_at <= now();

  insert into public.support_chat_guest_sessions (
    thread_id, token_hash, realtime_key, expires_at
  )
  values (v_thread_id, p_token_hash, p_realtime_key, now() + interval '180 days');

  return query select v_thread_id, p_realtime_key;
end;
$$;

revoke all on function public.support_chat_request_guest_email_access(text, text, text)
  from public, anon, authenticated;
revoke all on function public.support_chat_verify_guest_email_access(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.support_chat_request_guest_email_access(text, text, text)
  to service_role;
grant execute on function public.support_chat_verify_guest_email_access(text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
