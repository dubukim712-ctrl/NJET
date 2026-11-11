-- ============================================================================
-- Commerce catalog, stock, delivery, orders, and private order documents
-- Run after 20240101000008_clear_audit_logs_without_logging.sql
-- ============================================================================

insert into public.permissions (key, name, description, group_name, surface, sort_order)
values
  ('products.read', 'View products', 'View the product catalog and stock.', 'Products', 'admin', 60),
  ('products.manage', 'Manage products', 'Manage products, variants, prices, and stock.', 'Products', 'admin', 61),
  ('branches.read', 'View branches', 'View branch information.', 'Branches', 'admin', 70),
  ('branches.manage', 'Manage branches', 'Manage store branches.', 'Branches', 'admin', 71),
  ('delivery_zones.read', 'View delivery zones', 'View delivery zones and fees.', 'Delivery zones', 'admin', 80),
  ('delivery_zones.manage', 'Manage delivery zones', 'Manage delivery zones and fees.', 'Delivery zones', 'admin', 81),
  ('orders.read', 'View orders', 'View customer orders and submitted documents.', 'Orders', 'admin', 90),
  ('orders.manage', 'Manage orders', 'Confirm and cancel customer orders.', 'Orders', 'admin', 91)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.slug = 'sales'
  and p.key in (
    'products.read', 'products.manage',
    'branches.read', 'branches.manage',
    'delivery_zones.read', 'delivery_zones.manage',
    'orders.read', 'orders.manage'
  )
on conflict (role_id, permission_key) do nothing;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  address text not null,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  product_type text not null check (product_type in ('ebike', 'part', 'accessory')),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null unique,
  name text not null,
  price_minor integer not null check (price_minor >= 0),
  reservation_minor integer not null default 0
    check (reservation_minor >= 0 and reservation_minor <= price_minor),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.branch_inventory (
  branch_id uuid not null references public.branches(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  stock integer not null default 0 check (stock >= 0),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (branch_id, variant_id)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee_minor integer not null default 0 check (fee_minor >= 0),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create sequence public.njet_order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('NJET-' || lpad(nextval('public.njet_order_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.users(id) on delete restrict,
  customer_name text not null,
  contact_number text not null,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  branch_id uuid references public.branches(id) on delete restrict,
  branch_name text not null,
  delivery_zone_id uuid references public.delivery_zones(id) on delete restrict,
  delivery_zone_name text,
  address_line1 text,
  barangay text,
  city text,
  province text,
  postal_code text,
  payment_method text not null check (payment_method in ('cash', 'online', 'home_credit')),
  payment_provider text check (payment_provider in ('gcash', 'bank_transfer', 'card')),
  payment_reference text check (payment_reference is null or length(payment_reference) <= 120),
  status text not null default 'awaiting_confirmation'
    check (status in ('awaiting_confirmation', 'confirmed', 'cancelled', 'completed')),
  total_minor integer not null check (total_minor >= 0),
  delivery_fee_minor integer not null default 0 check (delivery_fee_minor >= 0),
  reservation_due_minor integer not null default 0 check (reservation_due_minor >= 0),
  balance_due_minor integer not null check (balance_due_minor >= 0),
  online_due_minor integer not null default 0 check (online_due_minor >= 0),
  terms_version text not null,
  privacy_version text not null,
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  confirmed_by uuid references public.users(id) on delete set null,
  confirmed_at timestamptz,
  cancelled_by uuid references public.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (
    (fulfillment = 'pickup' and branch_id is not null and delivery_zone_id is null)
    or (fulfillment = 'delivery' and delivery_zone_id is not null)
  ),
  check (payment_method <> 'home_credit' or fulfillment = 'pickup'),
  check (
    coalesce(length(address_line1), 0) <= 200
    and coalesce(length(barangay), 0) <= 200
    and coalesce(length(city), 0) <= 200
    and coalesce(length(province), 0) <= 200
    and coalesce(length(postal_code), 0) <= 20
  ),
  check (
    (
      (fulfillment = 'delivery' or payment_method = 'home_credit')
      and nullif(trim(address_line1), '') is not null
      and nullif(trim(barangay), '') is not null
      and nullif(trim(city), '') is not null
      and nullif(trim(province), '') is not null
    )
    or (
      fulfillment = 'pickup'
      and payment_method <> 'home_credit'
      and (
        (
          address_line1 is null
          and barangay is null
          and city is null
          and province is null
          and postal_code is null
        )
        or (
          nullif(trim(address_line1), '') is not null
          and nullif(trim(barangay), '') is not null
          and nullif(trim(city), '') is not null
          and nullif(trim(province), '') is not null
        )
      )
    )
  ),
  check (
    (payment_method = 'online' and payment_provider is not null)
    or (payment_method <> 'online' and payment_provider is null)
  ),
  check (reservation_due_minor <= total_minor),
  check (
    (payment_method = 'online' and online_due_minor + balance_due_minor = total_minor)
    or (
      payment_method <> 'online'
      and online_due_minor = 0
      and reservation_due_minor + balance_due_minor = total_minor
    )
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,
  product_type text not null check (product_type in ('ebike', 'part', 'accessory')),
  variant_name text not null,
  sku text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_price_minor integer not null check (unit_price_minor >= 0),
  reservation_unit_minor integer not null default 0 check (reservation_unit_minor >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (order_id, variant_id)
);

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('payment_proof', 'identity')),
  object_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size between 1 and 5242880),
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index products_active_type_idx on public.products (active, product_type);
create index product_variants_product_active_idx on public.product_variants (product_id, active);
create index branch_inventory_variant_idx on public.branch_inventory (variant_id, branch_id);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index order_documents_order_idx on public.order_documents (order_id, kind);

create or replace function public.validate_product_variant_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_type text;
begin
  select p.product_type into v_product_type
  from public.products p
  where p.id = new.product_id
  for update;

  if new.reservation_minor > 0 and v_product_type <> 'ebike' then
    raise exception 'Only e-bike variants can have a reservation amount.';
  end if;
  return new;
end;
$$;

create trigger product_variant_reservation_guard
  before insert or update of product_id, reservation_minor
  on public.product_variants
  for each row execute procedure public.validate_product_variant_reservation();

create or replace function public.prevent_product_type_reservation_conflict()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.product_type <> 'ebike' and exists (
    select 1 from public.product_variants v
    where v.product_id = new.id and v.reservation_minor > 0
  ) then
    raise exception 'Remove e-bike reservation amounts before changing product type.';
  end if;
  return new;
end;
$$;

create trigger product_type_reservation_guard
  before update of product_type on public.products
  for each row execute procedure public.prevent_product_type_reservation_conflict();

create trigger branches_updated_at before update on public.branches
  for each row execute procedure public.handle_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute procedure public.handle_updated_at();
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute procedure public.handle_updated_at();
create trigger branch_inventory_updated_at before update on public.branch_inventory
  for each row execute procedure public.handle_updated_at();
create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute procedure public.handle_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.handle_updated_at();
