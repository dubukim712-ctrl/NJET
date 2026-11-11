-- Add a per-variant Home Credit downpayment and expose it to storefront checkout.

alter table public.product_variants
  add column if not exists home_credit_downpayment_minor integer not null default 0;

alter table public.orders
  add column if not exists home_credit_downpayment_due_minor integer not null default 0;

alter table public.product_variants
  drop constraint if exists product_variants_home_credit_downpayment_check;
alter table public.product_variants
  add constraint product_variants_home_credit_downpayment_check
  check (
    home_credit_downpayment_minor >= 0
    and home_credit_downpayment_minor <= price_minor
  );
alter table public.orders
  drop constraint if exists orders_home_credit_downpayment_due_check;
alter table public.orders
  add constraint orders_home_credit_downpayment_due_check
  check (home_credit_downpayment_due_minor >= 0);

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%online_due_minor%'
        and pg_get_constraintdef(oid) like '%balance_due_minor%'
        or pg_get_constraintdef(oid) like '%payment_provider%'
      )
  loop
    execute format(
      'alter table public.orders drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public.orders
  drop constraint if exists orders_payment_amounts_check;
alter table public.orders
  add constraint orders_payment_amounts_check
  check (
    (
      payment_method = 'online'
      and order_source = 'online'
      and home_credit_downpayment_due_minor = 0
      and online_due_minor + balance_due_minor = total_minor
    )
    or (
      payment_method = 'home_credit'
      and online_due_minor = 0
      and home_credit_downpayment_due_minor
        + reservation_due_minor + balance_due_minor = total_minor
    )
    or (
      payment_method = 'cash'
      and online_due_minor = 0
      and home_credit_downpayment_due_minor = 0
      and reservation_due_minor + balance_due_minor = total_minor
    )
    or (
      order_source = 'walk_in'
      and payment_method in ('cash', 'online')
      and online_due_minor = 0
      and home_credit_downpayment_due_minor = 0
      and reservation_due_minor = 0
      and balance_due_minor = 0
    )
  );

alter table public.orders
  drop constraint if exists orders_payment_provider_check;
alter table public.orders
  add constraint orders_payment_provider_check
  check (
    (payment_method = 'online' and payment_provider is not null)
    or (
      payment_method = 'home_credit'
      and home_credit_downpayment_due_minor > 0
      and payment_provider is not null
    )
    or (
      payment_method = 'cash'
      and payment_provider is null
    )
    or (
      payment_method = 'home_credit'
      and home_credit_downpayment_due_minor = 0
      and payment_provider is null
    )
  );

alter table public.orders
  drop constraint if exists orders_non_online_payment_recipient_check;
alter table public.orders
  drop constraint if exists orders_payment_recipient_check;
alter table public.orders
  add constraint orders_payment_recipient_check
  check (
    (
      payment_method = 'online'
      and order_source = 'online'
      and payment_recipient_id is not null
    )
    or (
      payment_method = 'online'
      and order_source = 'walk_in'
      and payment_recipient_id is null
    )
    or (
      payment_method = 'home_credit'
      and home_credit_downpayment_due_minor > 0
      and payment_recipient_id is not null
    )
    or (
      payment_method = 'cash'
      and payment_recipient_id is null
    )
    or (
      payment_method = 'home_credit'
      and home_credit_downpayment_due_minor = 0
      and payment_recipient_id is null
    )
  );

drop function if exists public.storefront_catalog(text, uuid[]);

create function public.storefront_catalog(
  p_slug text default null,
  p_variant_ids uuid[] default null
)
returns table (
  product_id uuid,
  product_slug text,
  product_name text,
  product_description text,
  product_type text,
  category_id uuid,
  category_name text,
  subcategory_id uuid,
  subcategory_name text,
  product_image_path text,
  is_demo boolean,
  variant_id uuid,
  variant_name text,
  sku text,
  price_minor integer,
  reservation_minor integer,
  home_credit_downpayment_minor integer,
  variant_image_path text,
  specifications jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_slug is not null and length(trim(p_slug)) not between 1 and 120 then
    raise exception 'Choose a valid product slug.';
  end if;

  if p_variant_ids is not null and (
    cardinality(p_variant_ids) not between 1 and 500
    or array_position(p_variant_ids, null::uuid) is not null
  ) then
    raise exception 'Choose between 1 and 500 product variants.';
  end if;

  return query
  with selected_products as (
    select
      p.id, p.slug, p.name, p.description, p.product_type, p.category_id,
      c.name as category_name, p.subcategory_id, s.name as subcategory_name,
      p.image_path, p.is_demo
    from public.products p
    left join public.product_categories c on c.id = p.category_id
    left join public.product_subcategories s
      on s.id = p.subcategory_id and s.active
    where p.active and (p_slug is null or p.slug = p_slug)
    order by p.name, p.id
    limit 100
  ),
  selected_variants as (
    select
      v.id, v.product_id, v.name, v.sku, v.price_minor, v.reservation_minor,
      v.home_credit_downpayment_minor, v.image_path, v.specifications
    from public.product_variants v
    join selected_products p on p.id = v.product_id
    where v.active
      and (p_variant_ids is null or v.id = any(p_variant_ids))
    order by p.name, v.name, v.id
    limit 500
  )
  select
    p.id, p.slug, p.name, p.description, p.product_type, p.category_id,
    p.category_name, p.subcategory_id, p.subcategory_name, p.image_path,
    p.is_demo, v.id, v.name, v.sku, v.price_minor, v.reservation_minor,
    v.home_credit_downpayment_minor, v.image_path, v.specifications
  from selected_products p
  left join selected_variants v on v.product_id = p.id
  where p_variant_ids is null or v.id is not null
  order by p.name, v.name nulls first, v.id;
end;
$$;

revoke all on function public.storefront_catalog(text, uuid[])
  from public, anon, authenticated;
grant execute on function public.storefront_catalog(text, uuid[])
  to anon, authenticated;

notify pgrst, 'reload schema';
