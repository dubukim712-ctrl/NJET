create role anon;
create role authenticated;
create schema auth;

create function auth.uid() returns uuid
language sql stable
as $$ select current_setting('test.customer_id', true)::uuid $$;

create function public.current_user_has_permission(permission text) returns boolean
language sql stable
as $$ select permission = 'storefront.access' $$;

create table public.users (id uuid primary key);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id),
  items jsonb not null
);

-- Stand-in for legacy checkout. Every invocation inserts a fresh order.
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
) returns uuid
language sql
as $$
  insert into public.orders (customer_id, items)
  values (auth.uid(), p_items)
  returning id
$$;
