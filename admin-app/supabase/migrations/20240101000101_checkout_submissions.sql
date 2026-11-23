create table public.checkout_submissions (
  customer_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  primary key (customer_id, submission_id)
);

alter table public.checkout_submissions enable row level security;
revoke all on table public.checkout_submissions from public, anon, authenticated;

-- Keep the original signature for clients deployed before this migration.
create function public.create_commerce_order_with_discount(
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
  p_return_policy_version text,
  p_privacy_version text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_items jsonb,
  p_documents jsonb,
  p_coupon_code text,
  p_submission_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order_id uuid;
begin
  if v_customer_id is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'You do not have permission to place customer orders.';
  end if;
  if p_submission_id is null then
    raise exception 'A checkout submission ID is required.';
  end if;

  -- Serialize concurrent submissions by this customer and key until commit.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('checkout:' || v_customer_id::text || ':' || p_submission_id::text, 0)
  );
  select order_id into v_order_id
    from public.checkout_submissions
    where customer_id = v_customer_id and submission_id = p_submission_id;
  if found then
    return v_order_id;
  end if;

  v_order_id := public.create_commerce_order_with_discount(
    p_customer_name, p_contact_number, p_fulfillment, p_branch_id,
    p_delivery_zone_id, p_address_line1, p_barangay, p_city, p_province,
    p_postal_code, p_payment_method, p_payment_provider, p_payment_recipient_id,
    p_payment_reference, p_terms_version, p_return_policy_version, p_privacy_version,
    p_terms_accepted, p_privacy_accepted, p_items, p_documents, p_coupon_code
  );
  insert into public.checkout_submissions (customer_id, submission_id, order_id)
    values (v_customer_id, p_submission_id, v_order_id);
  return v_order_id;
end;
$$;

revoke all on function public.create_commerce_order_with_discount(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_commerce_order_with_discount(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb, text, uuid
) to authenticated;

notify pgrst, 'reload schema';
