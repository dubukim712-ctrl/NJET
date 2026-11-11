-- Product media, individual e-bike units, and an append-only inventory ledger.
-- Run after 20240101000013_commerce_demo_seed.sql.

alter table public.products add column image_path text;
alter table public.product_variants add column image_path text;
alter table public.products add constraint products_image_path_check
  check (image_path is null or image_path ~ '^images/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$');
alter table public.product_variants add constraint variants_image_path_check
  check (image_path is null or image_path ~ '^images/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$');

create table public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  product_type text not null check (product_type in ('ebike', 'part', 'accessory')),
  name text not null check (length(trim(name)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (product_type, slug)
);
alter table public.products add column subcategory_id uuid
  references public.product_subcategories(id) on delete set null;
create index products_subcategory_idx on public.products (subcategory_id);
create trigger product_subcategories_updated_at before update on public.product_subcategories
  for each row execute procedure public.handle_updated_at();

alter table public.product_subcategories enable row level security;
create policy "Storefront and staff can view product subcategories"
  on public.product_subcategories for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
    or (active and public.current_user_has_permission('storefront.access'))
  );
create policy "Product managers can manage product subcategories"
  on public.product_subcategories for all to authenticated
  using (public.current_user_has_permission('products.manage'))
  with check (public.current_user_has_permission('products.manage'));
grant select, insert, update on public.product_subcategories to authenticated;
revoke all on public.product_subcategories from public, anon;

create or replace function public.guard_product_subcategory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.subcategory_id is not null and not exists (
    select 1 from public.product_subcategories c
    where c.id = new.subcategory_id
      and c.product_type = new.product_type
      and (
        c.active
        or (tg_op = 'UPDATE' and c.id = old.subcategory_id)
      )
  ) then
    raise exception 'Choose an active subcategory for this product type.';
  end if;
  return new;
end;
$$;
create trigger product_subcategory_guard
  before insert or update of product_type, subcategory_id on public.products
  for each row execute procedure public.guard_product_subcategory();

create or replace function public.guard_subcategory_type_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.product_type <> old.product_type and exists (
    select 1 from public.products p where p.subcategory_id = old.id
  ) then
    raise exception 'Move or clear assigned products before changing this subcategory type.';
  end if;
  return new;
end;
$$;
create trigger product_subcategory_type_guard
  before update of product_type on public.product_subcategories
  for each row execute procedure public.guard_subcategory_type_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'njet-product-images', 'njet-product-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "NJET product images are public"
  on storage.objects for select to public
  using (bucket_id = 'njet-product-images');
create policy "Product managers upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-product-images'
    and public.current_user_has_permission('products.manage')
    and name ~ '^images/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
create policy "Product managers replace product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'njet-product-images'
    and public.current_user_has_permission('products.manage')
  )
  with check (
    bucket_id = 'njet-product-images'
    and public.current_user_has_permission('products.manage')
  );
create policy "Product managers remove product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-product-images'
    and public.current_user_has_permission('products.manage')
  );

create table public.ebike_units (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  serial_number text,
  motor_number text,
  status text not null default 'in_stock'
    check (status in ('needs_identification', 'in_stock', 'in_transit', 'sold')),
  order_item_id uuid references public.order_items(id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (
    (status = 'needs_identification' and serial_number is null and motor_number is null)
    or (status <> 'needs_identification' and serial_number is not null and motor_number is not null)
  ),
  check ((status = 'sold') = (order_item_id is not null))
);
create unique index ebike_units_serial_unique on public.ebike_units (upper(serial_number))
  where serial_number is not null;
create unique index ebike_units_motor_unique on public.ebike_units (upper(motor_number))
  where motor_number is not null;
create index ebike_units_stock_idx
  on public.ebike_units (branch_id, variant_id, status);
create index ebike_units_order_idx on public.ebike_units (order_item_id)
  where order_item_id is not null;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity_delta integer not null,
  movement_type text not null check (movement_type in (
    'opening_balance', 'adjustment', 'order_confirmed', 'order_cancelled',
    'serial_identified', 'serial_stock_received',
    'transfer_dispatched', 'transfer_received'
  )),
  reference_id uuid,
  note text,
  actor_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index inventory_movements_created_idx
  on public.inventory_movements (created_at desc);
create index inventory_movements_branch_variant_idx
  on public.inventory_movements (branch_id, variant_id, created_at desc);

alter table public.ebike_units enable row level security;
alter table public.inventory_movements enable row level security;
create policy "Staff can view e-bike unit records"
  on public.ebike_units for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
  );
create policy "Staff can view inventory movements"
  on public.inventory_movements for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
  );
revoke all on public.ebike_units, public.inventory_movements from public, anon, authenticated;
grant select on public.ebike_units, public.inventory_movements to authenticated;
revoke insert, update on public.branch_inventory from authenticated;

insert into public.ebike_units (variant_id, branch_id, status)
select i.variant_id, i.branch_id, 'needs_identification'
from public.branch_inventory i
join public.product_variants v on v.id = i.variant_id
join public.products p on p.id = v.product_id
cross join lateral generate_series(1, i.stock)
where p.product_type = 'ebike' and i.stock > 0;

insert into public.inventory_movements (branch_id, variant_id, quantity_delta, movement_type, note)
select i.branch_id, i.variant_id, i.stock, 'opening_balance',
  case when p.product_type = 'ebike'
    then 'Opening stock retained; enter each unit serial and motor number before sale.'
    else 'Opening stock recorded when inventory movement tracking was enabled.'
  end
from public.branch_inventory i
join public.product_variants v on v.id = i.variant_id
join public.products p on p.id = v.product_id
where i.stock > 0;

create or replace function public.record_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delta integer;
  v_type text := nullif(current_setting('njet.inventory_type', true), '');
  v_reference uuid := nullif(current_setting('njet.inventory_reference', true), '')::uuid;
begin
  v_delta := case when tg_op = 'INSERT' then new.stock else new.stock - old.stock end;
  if v_delta <> 0 then
    insert into public.inventory_movements (
      branch_id, variant_id, quantity_delta, movement_type, reference_id, actor_id
    ) values (
      new.branch_id, new.variant_id, v_delta, coalesce(v_type, 'adjustment'),
      v_reference, auth.uid()
    );
  end if;
  return new;
end;
$$;
create trigger branch_inventory_movement_log
  after insert or update of stock on public.branch_inventory
  for each row execute procedure public.record_inventory_movement();

create or replace function public.guard_ebike_product_type()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.product_type <> 'ebike' and old.product_type = 'ebike'
    and exists (
      select 1 from public.ebike_units u
      join public.product_variants v on v.id = u.variant_id
      where v.product_id = old.id
    ) then
    raise exception 'Remove all e-bike inventory records before changing this product type.';
  end if;
  return new;
end;
$$;
create trigger products_ebike_inventory_guard
  before update of product_type on public.products
  for each row execute procedure public.guard_ebike_product_type();

revoke all on function public.record_inventory_movement() from public, anon, authenticated;
revoke all on function public.guard_ebike_product_type() from public, anon, authenticated;
revoke all on function public.guard_product_subcategory() from public, anon, authenticated;
revoke all on function public.guard_subcategory_type_change() from public, anon, authenticated;
notify pgrst, 'reload schema';
