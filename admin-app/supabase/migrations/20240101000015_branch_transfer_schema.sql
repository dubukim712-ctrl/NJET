-- Branch transfer records for batch stock and individually tracked e-bikes.
-- Run after 20240101000014_product_media_and_serial_inventory.sql.

create table public.branch_transfers (
  id uuid primary key default gen_random_uuid(),
  source_branch_id uuid not null references public.branches(id) on delete restrict,
  destination_branch_id uuid not null references public.branches(id) on delete restrict,
  status text not null default 'in_transit' check (status in ('in_transit', 'received')),
  note text check (note is null or length(note) <= 500),
  dispatched_by uuid not null references public.users(id) on delete restrict,
  dispatched_at timestamptz not null default timezone('utc'::text, now()),
  received_by uuid references public.users(id) on delete set null,
  received_at timestamptz,
  check (source_branch_id <> destination_branch_id),
  check ((status = 'in_transit' and received_at is null and received_by is null)
    or (status = 'received' and received_at is not null and received_by is not null))
);

create table public.branch_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.branch_transfers(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 1000),
  unique (transfer_id, variant_id)
);

create table public.branch_transfer_units (
  transfer_item_id uuid not null references public.branch_transfer_items(id) on delete restrict,
  unit_id uuid not null unique references public.ebike_units(id) on delete restrict,
  primary key (transfer_item_id, unit_id)
);

alter table public.ebike_units add column transfer_id uuid
  references public.branch_transfers(id) on delete restrict;
create index branch_transfers_status_idx
  on public.branch_transfers (status, dispatched_at desc);
create index branch_transfer_items_transfer_idx
  on public.branch_transfer_items (transfer_id);

alter table public.branch_transfers enable row level security;
alter table public.branch_transfer_items enable row level security;
alter table public.branch_transfer_units enable row level security;
create policy "Product managers can view branch transfers"
  on public.branch_transfers for select to authenticated
  using (public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage'));
create policy "Product managers can view transfer items"
  on public.branch_transfer_items for select to authenticated
  using (public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage'));
create policy "Product managers can view transferred units"
  on public.branch_transfer_units for select to authenticated
  using (public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage'));
revoke all on public.branch_transfers, public.branch_transfer_items,
  public.branch_transfer_units from public, anon, authenticated;
grant select on public.branch_transfers, public.branch_transfer_items,
  public.branch_transfer_units to authenticated;

notify pgrst, 'reload schema';
