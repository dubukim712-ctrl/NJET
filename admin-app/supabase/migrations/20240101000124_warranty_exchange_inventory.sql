alter table public.ebike_units drop constraint ebike_units_status_check;
alter table public.ebike_units add constraint ebike_units_status_check check (status in (
  'needs_identification', 'in_stock', 'in_transit', 'sold', 'warranty_reserved', 'warranty_replacement'
));

alter table public.inventory_movements drop constraint inventory_movements_movement_type_check;
alter table public.inventory_movements add constraint inventory_movements_movement_type_check check (movement_type in (
  'opening_balance', 'adjustment', 'order_confirmed', 'order_cancelled',
  'serial_identified', 'serial_stock_received', 'stock_received', 'transfer_dispatched', 'transfer_received',
  'warranty_return_received', 'warranty_replacement_reserved', 'warranty_reservation_released', 'warranty_replacement_handed_over'
));

create table public.service_warranty_exchanges (
  appointment_id uuid primary key references public.service_warranty_cases(appointment_id) on delete restrict,
  original_unit_id uuid not null unique references public.ebike_units(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  customer_id uuid references public.users(id) on delete set null,
  returned_condition text not null check (char_length(btrim(returned_condition)) between 1 and 1500),
  received_at timestamptz not null default now(),
  received_by uuid references public.users(id) on delete set null,
  replacement_unit_id uuid unique references public.ebike_units(id) on delete restrict,
  reserved_at timestamptz,
  reserved_by uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  check ((replacement_unit_id is null) = (reserved_at is null)),
  check (completed_at is null or replacement_unit_id is not null),
  check (replacement_unit_id is null or replacement_unit_id <> original_unit_id)
);

create index service_warranty_exchanges_customer_idx on public.service_warranty_exchanges(customer_id);
alter table public.service_warranty_exchanges enable row level security;
revoke all on table public.service_warranty_exchanges from public, anon, authenticated;

create function public.guard_warranty_exchange_decision()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.decision is distinct from old.decision and exists (
    select 1 from public.service_warranty_exchanges e where e.appointment_id = old.appointment_id
  ) then
    raise exception 'The replacement decision is locked once the original unit is received.';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_warranty_exchange_decision() from public, anon, authenticated;
create trigger service_warranty_exchange_guard before update of decision on public.service_warranty_cases
for each row execute function public.guard_warranty_exchange_decision();

-- Existing manual handovers are retained. New exchanges must use the inventory workflow.
revoke all on function public.record_service_warranty_replacement(uuid, text, date) from public, anon, authenticated;
