-- Require proof only when a storefront Home Credit order has a downpayment.

create or replace function public.require_configured_payment_recipient()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient_id uuid;
  v_provider text;
  v_downpayment bigint;
begin
  if tg_op = 'INSERT'
    and new.order_source = 'online'
    and new.payment_method = 'home_credit' then
    v_downpayment := coalesce(
      nullif(current_setting('app.home_credit_downpayment_due_minor', true), '')::bigint,
      0
    );
    if v_downpayment < 0 or v_downpayment > new.total_minor then
      raise exception 'The Home Credit downpayment is invalid.';
    end if;
    new.home_credit_downpayment_due_minor := v_downpayment::integer;
    new.reservation_due_minor := 0;
    new.balance_due_minor := (new.total_minor - v_downpayment)::integer;
    v_provider := nullif(current_setting('app.payment_provider', true), '');
    v_recipient_id := nullif(
      current_setting('app.payment_recipient_id', true),
      ''
    )::uuid;
    new.payment_provider := v_provider;
    new.payment_recipient_id := v_recipient_id;
  end if;

  if new.payment_method = 'online' and new.order_source = 'walk_in' then
    if new.payment_provider is null
      or nullif(btrim(new.payment_reference), '') is null
      or new.payment_recipient_id is not null then
      raise exception 'Enter the online payment provider and reference number.';
    end if;
  elsif new.payment_method = 'online'
    or (
      new.payment_method = 'home_credit'
      and new.home_credit_downpayment_due_minor > 0
    ) then
    if new.payment_recipient_id is null then
      v_recipient_id := nullif(
        current_setting('app.payment_recipient_id', true),
        ''
      )::uuid;
      new.payment_recipient_id := v_recipient_id;
    end if;
    if new.payment_provider is null or new.payment_recipient_id is null then
      raise exception 'Choose an active recipient for the downpayment.';
    end if;
    select r.id into v_recipient_id
    from public.payment_recipients r
    where r.id = new.payment_recipient_id
      and r.provider = new.payment_provider
      and r.active
    for share;
    if not found then
      raise exception 'Choose an active recipient for the downpayment.';
    end if;
  elsif new.payment_provider is not null or new.payment_recipient_id is not null then
    raise exception 'A payment recipient is only valid when a payment is due online.';
  end if;
  return new;
end;
$$;

revoke all on function public.require_configured_payment_recipient()
  from public, anon, authenticated;

create or replace function public.create_commerce_order_with_recipient(
  p_customer_name text,
  p_contact_number text,
  p_fulfillment text,
  p_branch_id uuid,
  p_delivery_zone_id uuid,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_payment_method text,
  p_payment_provider text,
  p_payment_recipient_id uuid,
  p_payment_reference text,
  p_terms_version text,
  p_privacy_version text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_items jsonb,
  p_documents jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_home_credit_due bigint := 0;
  v_recipient_required boolean;
begin
  if p_payment_method = 'home_credit' then
    select coalesce(sum(v.home_credit_downpayment_minor::bigint * i.quantity), 0)
    into v_home_credit_due
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
    join public.product_variants v on v.id = i.variant_id and v.active;
    if v_home_credit_due > 2147483647 then
      raise exception 'The Home Credit downpayment is too large to process.';
    end if;
  end if;

  v_recipient_required := p_payment_method = 'online'
    or (p_payment_method = 'home_credit' and v_home_credit_due > 0);
  if v_recipient_required then
    if p_payment_recipient_id is null
      or p_payment_provider is null
      or p_payment_provider not in ('gcash', 'bank_transfer', 'card')
      or not exists (
        select 1
        from public.payment_recipients r
        where r.id = p_payment_recipient_id
          and r.provider = p_payment_provider
          and r.active
      ) then
      raise exception 'Choose an active recipient for the selected payment provider.';
    end if;
  elsif p_payment_provider is not null or p_payment_recipient_id is not null then
    raise exception 'A recipient is only valid when a payment is due online.';
  end if;

  perform set_config(
    'app.payment_recipient_id',
    coalesce(p_payment_recipient_id::text, ''),
    true
  );
  perform set_config(
    'app.payment_provider',
    coalesce(p_payment_provider, ''),
    true
  );
  perform set_config(
    'app.home_credit_downpayment_due_minor',
    case when v_home_credit_due > 0 then v_home_credit_due::text else '' end,
    true
  );
  v_order_id := public.create_commerce_order(
    p_customer_name,
    p_contact_number,
    p_fulfillment,
    p_branch_id,
    p_delivery_zone_id,
    p_address_line1,
    p_barangay,
    p_city,
    p_province,
    p_postal_code,
    p_payment_method,
    case when p_payment_method = 'home_credit' then null else p_payment_provider end,
    p_payment_reference,
    p_terms_version,
    p_privacy_version,
    p_terms_accepted,
    p_privacy_accepted,
    p_items,
    p_documents
  );
  perform set_config('app.payment_recipient_id', '', true);
  perform set_config('app.payment_provider', '', true);
  perform set_config('app.home_credit_downpayment_due_minor', '', true);
  return v_order_id;
end;
$$;

revoke all on function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, boolean, boolean, jsonb, jsonb
) from public, anon;
grant execute on function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, boolean, boolean, jsonb, jsonb
) to authenticated;

create or replace function public.set_online_order_payment_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.order_source = 'online' and (
    new.payment_method = 'online'
    or (
      new.payment_method = 'home_credit'
      and new.home_credit_downpayment_due_minor > 0
    )
  ) then
    new.status := 'awaiting_payment';
    new.payment_expires_at := coalesce(
      new.payment_expires_at,
      now() + interval '1 hour'
    );
  else
    new.payment_expires_at := null;
  end if;
  return new;
end;
$$;

drop function if exists public.customer_order_payment_details(uuid);
create function public.customer_order_payment_details(p_order_id uuid)
returns table (
  order_id uuid,
  order_number text,
  payment_method text,
  status text,
  total_minor integer,
  payment_due_minor integer,
  payment_expires_at timestamptz,
  payment_provider text,
  payment_reference text,
  recipient_name text,
  account_details text,
  payment_qr_path text,
  has_payment_proof boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in to view this order.';
  end if;
  return query
  select
    o.id, o.order_number, o.payment_method, o.status, o.total_minor,
    case when o.payment_method = 'home_credit'
      then o.home_credit_downpayment_due_minor
      else o.online_due_minor
    end,
    o.payment_expires_at, o.payment_provider, o.payment_reference,
    r.recipient_name, r.account_details, r.payment_qr_path,
    exists (
      select 1 from public.order_documents d
      where d.order_id = o.id and d.kind = 'payment_proof'
    )
  from public.orders o
  join public.payment_recipients r on r.id = o.payment_recipient_id
  where o.id = p_order_id
    and o.customer_id = auth.uid()
    and (
      o.payment_method = 'online'
      or (
        o.payment_method = 'home_credit'
        and o.home_credit_downpayment_due_minor > 0
      )
    );
end;
$$;

revoke all on function public.customer_order_payment_details(uuid)
  from public, anon;
grant execute on function public.customer_order_payment_details(uuid)
  to authenticated;

do $$
declare
  v_function text;
  v_old text := 'if not found or v_order.payment_method <> ''online''';
  v_new text := 'if not found or (v_order.payment_method <> ''online'' and not (v_order.payment_method = ''home_credit'' and v_order.home_credit_downpayment_due_minor > 0))';
begin
  v_function := pg_get_functiondef(
    'public.attach_order_payment_proof(uuid,text,text)'::regprocedure
  );
  if position(v_old in v_function) > 0 then
    v_function := replace(v_function, v_old, v_new);
  elsif position(v_new in v_function) = 0 then
    raise exception 'Could not safely enable Home Credit downpayment proof.';
  end if;
  execute v_function;
end;
$$;

notify pgrst, 'reload schema';
