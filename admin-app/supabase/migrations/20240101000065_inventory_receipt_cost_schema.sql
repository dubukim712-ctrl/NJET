alter table public.ebike_units
  add column if not exists unit_cost_minor integer
    check (unit_cost_minor is null or unit_cost_minor >= 0),
  add column if not exists receipt_item_id uuid;

alter table public.order_items
  add column if not exists cost_total_minor bigint
    check (cost_total_minor is null or cost_total_minor >= 0);

create table public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  supplier_name text not null check (length(btrim(supplier_name)) between 2 and 120),
  document_reference text check (
    document_reference is null or length(btrim(document_reference)) <= 120
  ),
  received_at timestamptz not null,
  shared_cost_minor integer not null default 0 check (shared_cost_minor >= 0),
  allocation_method text not null default 'value_proportional'
    check (allocation_method = 'value_proportional'),
  received_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.inventory_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.inventory_receipts(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity_received integer not null check (quantity_received between 1 and 1000000),
  supplier_unit_cost_minor integer not null check (supplier_unit_cost_minor >= 0),
  allocated_extra_cost_minor integer not null default 0
    check (allocated_extra_cost_minor >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (receipt_id, variant_id)
);

alter table public.ebike_units
  add constraint ebike_units_receipt_item_id_fkey
  foreign key (receipt_item_id)
  references public.inventory_receipt_items(id) on delete restrict;

create table public.inventory_stock_batches (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  receipt_item_id uuid references public.inventory_receipt_items(id) on delete restrict,
  parent_batch_id uuid references public.inventory_stock_batches(id) on delete restrict,
  transfer_item_id uuid references public.branch_transfer_items(id) on delete restrict,
  source text not null check (
    source in ('receipt', 'opening_balance', 'adjustment', 'transfer')
  ),
  received_at timestamptz,
  quantity_received integer not null check (quantity_received > 0),
  quantity_remaining integer not null check (
    quantity_remaining between 0 and quantity_received
  ),
  unit_cost_minor integer check (unit_cost_minor is null or unit_cost_minor >= 0),
  is_in_transit boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check ((source = 'receipt') = (receipt_item_id is not null)),
  check ((source = 'transfer') = (parent_batch_id is not null)),
  check ((source = 'transfer') = (transfer_item_id is not null)),
  check (not is_in_transit or source = 'transfer')
);

create index inventory_stock_batches_fifo_idx
  on public.inventory_stock_batches (
    branch_id, variant_id, received_at asc nulls first, created_at, id
  )
  where quantity_remaining > 0 and not is_in_transit;
create index inventory_stock_batches_transfer_idx
  on public.inventory_stock_batches (transfer_item_id)
  where is_in_transit;
create index inventory_receipts_branch_date_idx
  on public.inventory_receipts (branch_id, received_at desc);
create index inventory_receipt_items_variant_idx
  on public.inventory_receipt_items (variant_id, receipt_id);

insert into public.inventory_stock_batches (
  branch_id, variant_id, source, quantity_received, quantity_remaining
)
select stock.branch_id, stock.variant_id, 'opening_balance',
  stock.stock, stock.stock
from public.branch_inventory stock
join public.product_variants variant on variant.id = stock.variant_id
join public.products product on product.id = variant.product_id
where stock.stock > 0 and product.product_type <> 'ebike';

create table public.order_item_cost_allocations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  stock_batch_id uuid references public.inventory_stock_batches(id) on delete restrict,
  ebike_unit_id uuid references public.ebike_units(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost_minor integer check (unit_cost_minor is null or unit_cost_minor >= 0),
  status text not null default 'allocated'
    check (status in ('allocated', 'released', 'sold')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (
    (stock_batch_id is not null and ebike_unit_id is null)
    or (stock_batch_id is null and ebike_unit_id is not null and quantity = 1)
  )
);

create unique index order_item_cost_allocations_active_unit_idx
  on public.order_item_cost_allocations (ebike_unit_id)
  where ebike_unit_id is not null and status in ('allocated', 'sold');
create index order_item_cost_allocations_order_idx
  on public.order_item_cost_allocations (order_item_id, status);
create index order_item_cost_allocations_batch_idx
  on public.order_item_cost_allocations (stock_batch_id)
  where stock_batch_id is not null;

alter table public.inventory_receipts enable row level security;
alter table public.inventory_receipt_items enable row level security;
alter table public.inventory_stock_batches enable row level security;
alter table public.order_item_cost_allocations enable row level security;
revoke all on public.inventory_receipts, public.inventory_receipt_items,
  public.inventory_stock_batches, public.order_item_cost_allocations
  from public, anon, authenticated;

revoke select on public.ebike_units from authenticated;
grant select (
  id, variant_id, branch_id, serial_number, motor_number, status,
  order_item_id, transfer_id, created_at
) on public.ebike_units to authenticated;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in (
    'opening_balance', 'adjustment', 'order_confirmed', 'order_cancelled',
    'serial_identified', 'serial_stock_received', 'stock_received',
    'transfer_dispatched', 'transfer_received'
  ));

create or replace function public.guard_variant_receipt_cost()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    (tg_op = 'INSERT' and new.cost_minor is not null)
    or (tg_op = 'UPDATE' and new.cost_minor is distinct from old.cost_minor)
  ) and coalesce(current_setting('njet.receipt_cost_update', true), '') <> 'on' then
    raise exception 'Variant cost is maintained by stock receipts.';
  end if;
  return new;
end;
$$;

create trigger product_variants_receipt_cost_guard
  before insert or update of cost_minor on public.product_variants
  for each row execute function public.guard_variant_receipt_cost();
revoke all on function public.guard_variant_receipt_cost()
  from public, anon, authenticated;

create or replace function public.guard_new_ebike_receipt_cost()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('njet.receipt_cost_update', true), '') <> 'on'
    or new.unit_cost_minor is null or new.receipt_item_id is null then
    raise exception 'New e-bike units must be recorded through a stock receipt.';
  end if;
  return new;
end;
$$;

create trigger ebike_units_require_receipt_cost
  before insert on public.ebike_units
  for each row execute function public.guard_new_ebike_receipt_cost();
revoke all on function public.guard_new_ebike_receipt_cost()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
