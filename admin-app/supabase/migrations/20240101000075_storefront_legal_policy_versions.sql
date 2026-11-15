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
  if p_terms_version is distinct from 'NJET-TERMS-2026-1'
    or p_privacy_version is distinct from 'NJET-PRIVACY-2026-1' then
    raise exception 'Accept the current terms and privacy notice before ordering.';
  end if;

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
  -- The inner RPC still enforces the original versions; store the versions the customer accepted.
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
    'NJET-TERMS-DRAFT-1',
    'NJET-PRIVACY-DRAFT-1',
    p_terms_accepted,
    p_privacy_accepted,
    p_items,
    p_documents
  );
  update public.orders
  set terms_version = p_terms_version,
      privacy_version = p_privacy_version
  where id = v_order_id;
  perform set_config('app.payment_recipient_id', '', true);
  perform set_config('app.payment_provider', '', true);
  perform set_config('app.home_credit_downpayment_due_minor', '', true);
  return v_order_id;
end;
$$;

notify pgrst, 'reload schema';
