create or replace function public.normalize_philippine_mobile(p_phone text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if v_digits ~ '^09[0-9]{9}$' then
    return '+63' || substr(v_digits, 2);
  elsif v_digits ~ '^9[0-9]{9}$' then
    return '+63' || v_digits;
  elsif v_digits ~ '^639[0-9]{9}$' then
    return '+' || v_digits;
  end if;
  return null;
end;
$$;

revoke all on function public.normalize_philippine_mobile(text)
  from public, anon, authenticated;

create or replace function public.create_phone_verification_challenge(
  p_user_id uuid,
  p_challenge_id uuid,
  p_phone_number text,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := public.normalize_philippine_mobile(p_phone_number);
begin
  if p_user_id is null
    or p_challenge_id is null
    or v_phone is null
    or p_code_hash is null
    or p_code_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Enter a valid Philippine mobile number.';
  end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Customer account not found.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(v_phone, 1));

  delete from public.phone_verification_challenges
  where created_at < now() - interval '1 day';

  if exists (
    select 1
    from public.phone_verification_challenges
    where (user_id = p_user_id or phone_number = v_phone)
      and created_at > now() - interval '60 seconds'
  ) or (
    select count(*)
    from public.phone_verification_challenges
    where (user_id = p_user_id or phone_number = v_phone)
      and created_at > now() - interval '15 minutes'
  ) >= 3 then
    return false;
  end if;

  update public.phone_verification_challenges
  set invalidated_at = now()
  where user_id = p_user_id
    and consumed_at is null
    and invalidated_at is null;

  insert into public.phone_verification_challenges (
    id, user_id, phone_number, code_hash, expires_at
  )
  values (
    p_challenge_id, p_user_id, v_phone, p_code_hash, now() + interval '5 minutes'
  );
  return true;
end;
$$;

create or replace function public.invalidate_phone_verification_challenge(
  p_user_id uuid,
  p_challenge_id uuid
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.phone_verification_challenges
  set invalidated_at = now()
  where user_id = p_user_id
    and id = p_challenge_id
    and consumed_at is null
    and invalidated_at is null;
$$;

create or replace function public.verify_phone_verification_challenge(
  p_user_id uuid,
  p_challenge_id uuid,
  p_code_hash text
)
returns table (verification_status text, verified_phone_number text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenge public.phone_verification_challenges%rowtype;
begin
  if p_user_id is null
    or p_challenge_id is null
    or p_code_hash is null
    or p_code_hash !~ '^[a-f0-9]{64}$' then
    return query select 'invalid'::text, null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_challenge
  from public.phone_verification_challenges
  where id = p_challenge_id and user_id = p_user_id
  for update;
  if not found
    or v_challenge.consumed_at is not null
    or v_challenge.invalidated_at is not null
    or v_challenge.expires_at <= now() then
    return query select 'invalid'::text, null::text;
    return;
  end if;
  if v_challenge.attempt_count >= 5 then
    return query select 'locked'::text, null::text;
    return;
  end if;
  if v_challenge.code_hash <> p_code_hash then
    update public.phone_verification_challenges
    set attempt_count = attempt_count + 1,
        invalidated_at = case when attempt_count + 1 >= 5 then now() else null end
    where id = p_challenge_id;
    return query select
      case when v_challenge.attempt_count + 1 >= 5 then 'locked' else 'invalid' end,
      null::text;
    return;
  end if;

  update public.users
  set phone_number = v_challenge.phone_number,
      phone_verified_at = now()
  where id = p_user_id;
  if not found then
    return query select 'invalid'::text, null::text;
    return;
  end if;

  update public.phone_verification_challenges
  set consumed_at = now()
  where id = p_challenge_id;
  update public.phone_verification_challenges
  set invalidated_at = now()
  where user_id = p_user_id
    and id <> p_challenge_id
    and consumed_at is null
    and invalidated_at is null;
  return query select 'verified'::text, v_challenge.phone_number;
end;
$$;

revoke all on function public.create_phone_verification_challenge(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.invalidate_phone_verification_challenge(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.verify_phone_verification_challenge(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_phone_verification_challenge(uuid, uuid, text, text)
  to service_role;
grant execute on function public.invalidate_phone_verification_challenge(uuid, uuid)
  to service_role;
grant execute on function public.verify_phone_verification_challenge(uuid, uuid, text)
  to service_role;

create or replace function public.enforce_storefront_phone_verification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_required boolean;
  v_phone text;
  v_verified_at timestamptz;
  v_normalized text := public.normalize_philippine_mobile(new.contact_number);
begin
  if new.order_source <> 'online' or new.customer_id is null then
    new.phone_verification_status := 'not_required';
    new.phone_verified_at := null;
    new.phone_verified_by := null;
    return new;
  end if;

  select phone_verification_required into v_required
  from public.business_settings
  where id = 1
  for share;
  if not found then
    raise exception 'Checkout settings are unavailable.';
  end if;

  if v_required then
    select phone_number, phone_verified_at
    into v_phone, v_verified_at
    from public.users
    where id = new.customer_id
    for share;
    if v_normalized is null
      or v_phone is distinct from v_normalized
      or v_verified_at is null then
      raise exception 'Verify this mobile number before placing your order.';
    end if;
    new.phone_verification_status := 'otp_verified';
    new.phone_verified_at := v_verified_at;
    new.phone_verified_by := null;
  else
    new.phone_verification_status := 'manual_pending';
    new.phone_verified_at := null;
    new.phone_verified_by := null;
  end if;
  return new;
end;
$$;

create trigger orders_enforce_storefront_phone_verification
  before insert on public.orders
  for each row execute function public.enforce_storefront_phone_verification();
revoke all on function public.enforce_storefront_phone_verification()
  from public, anon, authenticated;

create or replace function public.guard_order_confirmation_phone_verification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed'
    and old.status is distinct from new.status
    and new.phone_verification_status = 'manual_pending' then
    raise exception 'Staff must verify this order contact number before confirming the order.';
  end if;
  return new;
end;
$$;

create trigger orders_guard_phone_verification_before_confirmation
  before update of status on public.orders
  for each row execute function public.guard_order_confirmation_phone_verification();
revoke all on function public.guard_order_confirmation_phone_verification()
  from public, anon, authenticated;

create or replace function public.mark_order_phone_manually_verified(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to verify order contact numbers.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found or v_order.order_source <> 'online'
    or v_order.phone_verification_status <> 'manual_pending'
    or v_order.status <> 'awaiting_confirmation' then
    raise exception 'This order is not awaiting manual phone verification.';
  end if;
  if not public.current_user_can_access_branch(v_order.branch_id) then
    raise exception 'You are not allowed to manage this branch order.';
  end if;

  update public.orders
  set phone_verification_status = 'manual_verified',
      phone_verified_at = now(),
      phone_verified_by = auth.uid()
  where id = p_order_id;
end;
$$;

revoke all on function public.mark_order_phone_manually_verified(uuid)
  from public, anon;
grant execute on function public.mark_order_phone_manually_verified(uuid)
  to authenticated;

notify pgrst, 'reload schema';
