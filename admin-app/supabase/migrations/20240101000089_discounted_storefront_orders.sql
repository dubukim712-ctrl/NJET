alter function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb
) rename to create_commerce_order_with_recipient_unpriced;

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
  p_coupon_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
begin
  if p_coupon_code is not null and length(btrim(p_coupon_code)) > 32 then
    raise exception 'Enter a valid coupon code.';
  end if;
  v_order_id := public.create_commerce_order_with_recipient_unpriced(
    p_customer_name, p_contact_number, p_fulfillment, p_branch_id,
    p_delivery_zone_id, p_address_line1, p_barangay, p_city, p_province,
    p_postal_code, p_payment_method, p_payment_provider,
    p_payment_recipient_id, p_payment_reference, p_terms_version,
    p_return_policy_version, p_privacy_version, p_terms_accepted,
    p_privacy_accepted, p_items, p_documents
  );
  perform public.apply_product_discounts_to_order(
    v_order_id, p_coupon_code, 'storefront', null
  );
  return v_order_id;
end;
$$;

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
  p_return_policy_version text,
  p_privacy_version text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_items jsonb,
  p_documents jsonb
)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.create_commerce_order_with_discount(
    p_customer_name, p_contact_number, p_fulfillment, p_branch_id,
    p_delivery_zone_id, p_address_line1, p_barangay, p_city, p_province,
    p_postal_code, p_payment_method, p_payment_provider,
    p_payment_recipient_id, p_payment_reference, p_terms_version,
    p_return_policy_version, p_privacy_version, p_terms_accepted,
    p_privacy_accepted, p_items, p_documents, null
  )
$$;

revoke all on function public.create_commerce_order_with_recipient_unpriced(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb
) from public, anon, authenticated;
revoke all on function public.create_commerce_order_with_discount(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb, text
) from public, anon, authenticated;
revoke all on function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_commerce_order_with_discount(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb, text
) to authenticated;
grant execute on function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, text, boolean, boolean, jsonb, jsonb
) to authenticated;

revoke execute on function public.create_commerce_order(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  text, text, text, boolean, boolean, jsonb, jsonb
) from authenticated;

notify pgrst, 'reload schema';
