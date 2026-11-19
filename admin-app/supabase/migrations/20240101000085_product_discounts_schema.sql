create table public.product_discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  value integer not null check (value > 0),
  coupon_code text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (discount_type = 'percentage' and value <= 10000)
    or (discount_type = 'fixed' and value <= 2147483647)
  ),
  check (coupon_code is null or (
    coupon_code = upper(btrim(coupon_code))
    and coupon_code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'
  )),
  check (starts_at is null or ends_at is null or ends_at > starts_at),
  check (max_redemptions is null or max_redemptions > 0),
  check (coupon_code is not null or max_redemptions is null)
);

create unique index product_discounts_coupon_code_idx
  on public.product_discounts (coupon_code)
  where coupon_code is not null;
create index product_discounts_active_dates_idx
  on public.product_discounts (active, starts_at, ends_at);

create table public.product_discount_targets (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.product_discounts(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete restrict,
  product_category_id uuid references public.product_categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((product_variant_id is null) <> (product_category_id is null))
);

create unique index product_discount_variant_target_idx
  on public.product_discount_targets (discount_id, product_variant_id)
  where product_variant_id is not null;
create unique index product_discount_category_target_idx
  on public.product_discount_targets (discount_id, product_category_id)
  where product_category_id is not null;
create index product_discount_targets_discount_idx
  on public.product_discount_targets (discount_id);

create table public.product_discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.product_discounts(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_id uuid references public.users(id) on delete restrict,
  normalized_phone text,
  status text not null check (status in ('reserved', 'redeemed', 'released')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  check ((customer_id is null) <> (normalized_phone is null))
);

create unique index product_discount_redemptions_order_idx
  on public.product_discount_redemptions (order_id);
create unique index product_discount_redemptions_customer_idx
  on public.product_discount_redemptions (discount_id, customer_id)
  where customer_id is not null and status <> 'released';
create unique index product_discount_redemptions_phone_idx
  on public.product_discount_redemptions (discount_id, normalized_phone)
  where normalized_phone is not null and status <> 'released';
create index product_discount_redemptions_active_idx
  on public.product_discount_redemptions (discount_id, status)
  where status <> 'released';

alter table public.orders
  add column discount_total_minor integer not null default 0
    check (discount_total_minor >= 0),
  add column applied_coupon_code text;

alter table public.order_items
  add column regular_unit_price_minor integer not null default 0,
  add column discount_unit_minor integer not null default 0,
  add column applied_discount_id uuid references public.product_discounts(id) on delete set null,
  add column discount_name_snapshot text,
  add column discount_code_snapshot text;

update public.order_items
set regular_unit_price_minor = unit_price_minor;

alter table public.order_items
  add constraint order_items_discount_amount_check
  check (
    regular_unit_price_minor >= unit_price_minor
    and discount_unit_minor = regular_unit_price_minor - unit_price_minor
  );

alter table public.product_discounts enable row level security;
alter table public.product_discount_targets enable row level security;
alter table public.product_discount_redemptions enable row level security;

revoke all on public.product_discounts, public.product_discount_targets,
  public.product_discount_redemptions from public, anon, authenticated;
grant select on public.product_discounts, public.product_discount_targets
  to authenticated;

create policy product_discounts_read
  on public.product_discounts for select to authenticated
  using (public.current_user_has_permission('products.read'));
create policy product_discount_targets_read
  on public.product_discount_targets for select to authenticated
  using (public.current_user_has_permission('products.read'));

create trigger audit_product_discounts
  after insert or update or delete on public.product_discounts
  for each row execute procedure public.log_audit_event();

notify pgrst, 'reload schema';
