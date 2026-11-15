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

  delete from public.support_chat_guest_sessions as s
  where s.thread_id = v_thread_id and s.expires_at <= now();

  insert into public.support_chat_guest_sessions (
    thread_id, token_hash, realtime_key, expires_at
  )
  values (
    v_thread_id, p_token_hash, p_realtime_key, now() + interval '180 days'
  );

  return query select v_thread_id, p_realtime_key;
end;
$$;

revoke all on function public.support_chat_verify_guest_email_access(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.support_chat_verify_guest_email_access(text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
