-- ============================================================================
-- Commerce order creation and stock-safe staff actions
-- Run after 20240101000010_commerce_access.sql
-- ============================================================================
create or replace function public.create_commerce_order(
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
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_branch_id uuid;
  v_branch_name text;
  v_zone_name text;
  v_delivery_fee integer := 0;
  v_subtotal bigint;
  v_total bigint;
  v_reservation bigint := 0;
  v_online_due bigint := 0;
  v_ebike boolean;
  v_item_count integer;
  v_document_count integer;
  v_proof_count integer;
  v_identity_count integer;
  v_document jsonb;
  v_path text;
  v_kind text;
  v_metadata jsonb;
  v_file_size integer;
  v_content_type text;
begin
  if v_user_id is null then
    raise exception 'Sign in before placing an order.';
  end if;
  if not public.current_user_has_permission('storefront.access') then
    raise exception 'You are not allowed to place storefront orders.';
  end if;
  if p_terms_accepted is not true or p_privacy_accepted is not true
    or p_terms_version is distinct from 'NJET-TERMS-DRAFT-1'
    or p_privacy_version is distinct from 'NJET-PRIVACY-DRAFT-1' then
    raise exception 'Accept the current terms and privacy notice before ordering.';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) not between 2 and 100
    or p_contact_number is null
    or p_contact_number !~ '^[+0-9][0-9 ()-]{6,19}$' then
    raise exception 'Enter a valid name and contact number.';
  end if;
  if p_fulfillment is null or p_fulfillment not in ('pickup', 'delivery')
    or p_payment_method is null
    or p_payment_method not in ('cash', 'online', 'home_credit') then
    raise exception 'Choose a valid fulfillment and payment method.';
  end if;
  if p_payment_method = 'home_credit' and p_fulfillment <> 'pickup' then
    raise exception 'Home Credit is available for store pickup only.';
  end if;
  if p_payment_method = 'online'
    and (p_payment_provider is null or p_payment_provider not in ('gcash', 'bank_transfer', 'card'))
    or p_payment_method <> 'online' and p_payment_provider is not null then
    raise exception 'Choose a valid online payment platform.';
  end if;
  if p_payment_reference is not null and length(trim(p_payment_reference)) > 120 then
    raise exception 'Payment reference numbers must be 120 characters or fewer.';
  end if;
  if p_fulfillment = 'delivery' or p_payment_method = 'home_credit' then
    if nullif(trim(p_address_line1), '') is null
      or nullif(trim(p_barangay), '') is null
      or nullif(trim(p_city), '') is null
      or nullif(trim(p_province), '') is null then
      raise exception 'Complete the address fields for this order.';
    end if;
  elsif nullif(trim(p_address_line1), '') is not null
    or nullif(trim(p_barangay), '') is not null
    or nullif(trim(p_city), '') is not null
    or nullif(trim(p_province), '') is not null
    or nullif(trim(p_postal_code), '') is not null then
    if nullif(trim(p_address_line1), '') is null
      or nullif(trim(p_barangay), '') is null
      or nullif(trim(p_city), '') is null
      or nullif(trim(p_province), '') is null then
      raise exception 'Complete the address or leave it blank.';
    end if;
  end if;

  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'The cart must be a list of items.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Add between 1 and 30 items to your cart.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or jsonb_typeof(e.value->'variant_id') <> 'string'
      or jsonb_typeof(e.value->'quantity') <> 'number'
      or not case
        when coalesce(e.value->>'quantity', '') ~ '^[0-9]{1,2}$'
          then (e.value->>'quantity')::integer between 1 and 99
        else false
      end
  ) then
    raise exception 'The cart contains an invalid item.';
  end if;
  select count(*), count(distinct i.variant_id)
  into v_item_count, v_document_count
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer);
  if v_item_count <> v_document_count then
    raise exception 'The cart contains a duplicate item.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
    left join public.product_variants v on v.id = i.variant_id and v.active
    left join public.products p on p.id = v.product_id and p.active
    where v.id is null or p.id is null
  ) then
    raise exception 'A cart item is no longer available.';
  end if;

  select sum(v.price_minor::bigint * i.quantity),
    sum(case when p.product_type = 'ebike' and p_fulfillment = 'pickup'
      then v.reservation_minor::bigint * i.quantity else 0 end),
    bool_or(p.product_type = 'ebike')
  into v_subtotal, v_reservation, v_ebike
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
  join public.product_variants v on v.id = i.variant_id
  join public.products p on p.id = v.product_id;

  if v_subtotal > 2147483647 then
    raise exception 'The order total is too large to process.';
  end if;
  if p_fulfillment = 'pickup' then
    if p_branch_id is null or p_delivery_zone_id is not null
      or not exists (select 1 from public.branches b where b.id = p_branch_id and b.active) then
      raise exception 'Choose an active pickup branch.';
    end if;
    select b.id, b.name into v_branch_id, v_branch_name
    from public.branches b where b.id = p_branch_id;
  else
    if p_branch_id is not null or p_delivery_zone_id is null then
      raise exception 'Choose a delivery zone.';
    end if;
    select z.fee_minor, z.name into v_delivery_fee, v_zone_name
    from public.delivery_zones z where z.id = p_delivery_zone_id and z.active;
    if not found then
      raise exception 'The selected delivery zone is no longer available.';
    end if;
    select b.id, b.name into v_branch_id, v_branch_name
    from public.branches b
    where b.active and not exists (
      select 1
      from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
      left join public.branch_inventory stock
        on stock.branch_id = b.id and stock.variant_id = i.variant_id
      where stock.stock is null or stock.stock < i.quantity
    )
    order by b.name
    limit 1;
    if v_branch_id is null then
      raise exception 'No branch currently has all items available for delivery.';
    end if;
  end if;
  if p_fulfillment = 'pickup' and exists (
    select 1
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
    left join public.branch_inventory stock
      on stock.branch_id = v_branch_id and stock.variant_id = i.variant_id
    where stock.stock is null or stock.stock < i.quantity
  ) then
    raise exception 'The selected branch does not have enough stock for this cart.';
  end if;

  if p_payment_method = 'online' and v_ebike
    and p_fulfillment = 'pickup' and v_reservation = 0 then
    raise exception 'Online payment is unavailable when the e-bike reservation amount is zero.';
  end if;
  v_total := v_subtotal + v_delivery_fee;
  if v_total > 2147483647 then
    raise exception 'The order total is too large to process.';
  end if;
  if p_payment_method = 'online' then
    v_online_due := case
      when v_ebike and p_fulfillment = 'pickup' then v_reservation
      else v_total
    end;
  end if;

  if coalesce(jsonb_typeof(p_documents), '') <> 'array' then
    raise exception 'Order documents must be a list of files.';
  end if;
  if jsonb_array_length(p_documents) > 6 then
    raise exception 'Upload no more than six order documents.';
  end if;
  select count(*),
    count(*) filter (where value->>'kind' = 'payment_proof'),
    count(*) filter (where value->>'kind' = 'identity')
  into v_document_count, v_proof_count, v_identity_count
  from jsonb_array_elements(p_documents);
  if (p_payment_method = 'online' and v_proof_count <> 1)
    or (p_payment_method <> 'online' and v_proof_count <> 0)
    or (v_ebike and v_identity_count < 1)
    or (not v_ebike and v_identity_count <> 0) then
    raise exception 'Upload the required payment proof and identity documents.';
  end if;

  insert into public.orders (
    customer_id, customer_name, contact_number, fulfillment, branch_id, branch_name,
    delivery_zone_id, delivery_zone_name,
    address_line1, barangay, city, province, postal_code, payment_method, payment_provider,
    payment_reference, total_minor, delivery_fee_minor, reservation_due_minor,
    balance_due_minor, online_due_minor, terms_version, privacy_version,
    terms_accepted_at, privacy_accepted_at
  ) values (
    v_user_id, trim(p_customer_name), trim(p_contact_number), p_fulfillment, v_branch_id,
    v_branch_name, p_delivery_zone_id, v_zone_name,
    nullif(trim(p_address_line1), ''), nullif(trim(p_barangay), ''),
    nullif(trim(p_city), ''), nullif(trim(p_province), ''), nullif(trim(p_postal_code), ''),
    p_payment_method, p_payment_provider, nullif(trim(p_payment_reference), ''),
    v_total::integer, v_delivery_fee, v_reservation::integer,
    (v_total - case
      when p_payment_method = 'online' then v_online_due
      else v_reservation
    end)::integer,
    v_online_due::integer,
    p_terms_version, p_privacy_version, now(), now()
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, product_name, product_type, variant_name, sku,
    quantity, unit_price_minor, reservation_unit_minor
  )
  select v_order_id, v.id, p.name, p.product_type, v.name, v.sku,
    i.quantity, v.price_minor, v.reservation_minor
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
  join public.product_variants v on v.id = i.variant_id
  join public.products p on p.id = v.product_id;

  for v_document in select value from jsonb_array_elements(p_documents)
  loop
    v_kind := v_document->>'kind';
    v_path := nullif(trim(v_document->>'object_path'), '');
    if v_kind not in ('payment_proof', 'identity')
      or v_path is null
      or split_part(v_path, '/', 1) <> v_user_id::text
      or split_part(v_path, '/', 3) <> ''
      or split_part(v_path, '/', 2) !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$' then
      raise exception 'An uploaded document is invalid.';
    end if;
    select o.metadata into v_metadata
    from storage.objects o
    where o.bucket_id = 'njet-order-documents' and o.name = v_path;
    if not found then
      raise exception 'An uploaded document could not be found.';
    end if;
    if coalesce(v_metadata->>'size', '') !~ '^[0-9]{1,7}$' then
      raise exception 'An uploaded document has invalid file details.';
    end if;
    v_file_size := (v_metadata->>'size')::integer;
    v_content_type := v_metadata->>'mimetype';
    if v_file_size not between 1 and 5242880
      or v_content_type not in ('image/jpeg', 'image/png', 'image/webp') then
      raise exception 'Documents must be JPG, PNG, or WebP images up to 5 MB.';
    end if;
    insert into public.order_documents (
      order_id, kind, object_path, content_type, file_size, uploaded_by
    ) values (
      v_order_id, v_kind, v_path, v_content_type, v_file_size, v_user_id
    );
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_commerce_order(text, text, text, uuid, uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, jsonb, jsonb) from public, anon;
grant execute on function public.create_commerce_order(text, text, text, uuid, uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
