alter function public.create_walk_in_sale(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb
) rename to create_walk_in_sale_unpriced;

alter function public.create_walk_in_home_credit_sale(
  text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer
) rename to create_walk_in_home_credit_sale_unpriced;

create or replace function public.create_walk_in_home_credit_sale_unpriced(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb,
  p_home_credit_acc_no text,
  p_downpayment_minor integer,
  p_terms_months integer,
  p_monthly_payment_minor integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
    or not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to create walk-in sales.';
  end if;

  perform set_config('app.home_credit_account_no', coalesce(p_home_credit_acc_no, ''), true);
  perform set_config('app.home_credit_downpayment_minor', coalesce(p_downpayment_minor::text, ''), true);
  perform set_config('app.home_credit_terms_months', coalesce(p_terms_months::text, ''), true);
  perform set_config('app.home_credit_monthly_payment_minor', coalesce(p_monthly_payment_minor::text, ''), true);
  return public.create_walk_in_sale_unpriced(
    p_customer_name => p_customer_name,
    p_contact_number => p_contact_number,
    p_branch_id => p_branch_id,
    p_payment_method => 'home_credit',
    p_payment_provider => null,
    p_payment_reference => null,
    p_cash_tendered_minor => null,
    p_address_line1 => p_address_line1,
    p_barangay => p_barangay,
    p_city => p_city,
    p_province => p_province,
    p_postal_code => p_postal_code,
    p_items => p_items
  );
end;
$$;

create function public.create_walk_in_sale_with_discount(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_payment_method text,
  p_payment_provider text,
  p_payment_reference text,
  p_cash_tendered_minor integer,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb,
  p_coupon_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_gross bigint;
  v_forward_cash integer := p_cash_tendered_minor;
  v_code text := coalesce(
    nullif(upper(btrim(p_coupon_code)), ''),
    nullif(current_setting('app.product_discount_coupon_code', true), '')
  );
begin
  if p_coupon_code is not null and length(btrim(p_coupon_code)) > 32 then
    raise exception 'Enter a valid coupon code.';
  end if;
  if p_payment_method = 'cash' then
    if coalesce(jsonb_typeof(p_items), '') <> 'array' then
      raise exception 'Add products to the sale before completing it.';
    end if;
    select coalesce(sum(v.price_minor::bigint * i.quantity), 0)
      into v_gross
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)
    join public.product_variants v on v.id = i.variant_id and v.active
    join public.products p on p.id = v.product_id and p.active;
    if v_gross > 2147483647 then
      raise exception 'The sale total is too large to process.';
    end if;
    v_forward_cash := greatest(coalesce(p_cash_tendered_minor, 0), v_gross::integer);
  end if;

  v_order_id := public.create_walk_in_sale_unpriced(
    p_customer_name, p_contact_number, p_branch_id, p_payment_method,
    p_payment_provider, p_payment_reference, v_forward_cash,
    p_address_line1, p_barangay, p_city, p_province, p_postal_code, p_items
  );
  perform public.apply_product_discounts_to_order(
    v_order_id, v_code, 'walk_in', p_cash_tendered_minor
  );
  return v_order_id;
end;
$$;

create function public.create_walk_in_sale(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_payment_method text,
  p_payment_provider text,
  p_payment_reference text,
  p_cash_tendered_minor integer,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb
)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.create_walk_in_sale_with_discount(
    p_customer_name, p_contact_number, p_branch_id, p_payment_method,
    p_payment_provider, p_payment_reference, p_cash_tendered_minor,
    p_address_line1, p_barangay, p_city, p_province, p_postal_code,
    p_items, null
  )
$$;

create function public.create_walk_in_home_credit_sale_with_discount(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb,
  p_home_credit_acc_no text,
  p_downpayment_minor integer,
  p_terms_months integer,
  p_monthly_payment_minor integer,
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
  v_order_id := public.create_walk_in_home_credit_sale_unpriced(
    p_customer_name, p_contact_number, p_branch_id, p_address_line1,
    p_barangay, p_city, p_province, p_postal_code, p_items,
    p_home_credit_acc_no, p_downpayment_minor, p_terms_months,
    p_monthly_payment_minor
  );
  perform public.apply_product_discounts_to_order(
    v_order_id, p_coupon_code, 'walk_in', null
  );
  return v_order_id;
end;
$$;

create function public.create_walk_in_home_credit_sale(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb,
  p_home_credit_acc_no text,
  p_downpayment_minor integer,
  p_terms_months integer,
  p_monthly_payment_minor integer
)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.create_walk_in_home_credit_sale_with_discount(
    p_customer_name, p_contact_number, p_branch_id, p_address_line1,
    p_barangay, p_city, p_province, p_postal_code, p_items,
    p_home_credit_acc_no, p_downpayment_minor, p_terms_months,
    p_monthly_payment_minor, null
  )
$$;

revoke all on function public.create_walk_in_sale_unpriced(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.create_walk_in_home_credit_sale_unpriced(
  text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer
) from public, anon, authenticated;
revoke all on function public.create_walk_in_sale_with_discount(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
revoke all on function public.create_walk_in_home_credit_sale_with_discount(
  text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer, text
) from public, anon, authenticated;
revoke all on function public.create_walk_in_sale(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.create_walk_in_home_credit_sale(
  text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.create_walk_in_sale_with_discount(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb, text
) to authenticated;
grant execute on function public.create_walk_in_home_credit_sale_with_discount(
  text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer, text
) to authenticated;
grant execute on function public.create_walk_in_sale(
  text, text, uuid, text, text, text, integer, text, text, text, text, text, jsonb
) to authenticated;
grant execute on function public.create_walk_in_home_credit_sale(
  text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer
) to authenticated;

notify pgrst, 'reload schema';
