create table public.ebike_warranty_handovers (
  unit_id uuid primary key references public.ebike_units(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  handover_on date not null,
  wheel_count smallint not null check (wheel_count in (2, 3, 4)),
  original_serial text not null check (btrim(original_serial) <> ''),
  recorded_by uuid references public.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index ebike_warranty_handovers_order_idx on public.ebike_warranty_handovers(order_id);

create table public.service_warranty_cases (
  appointment_id uuid primary key references public.service_appointments(id) on delete cascade,
  unit_id uuid references public.ebike_units(id) on delete restrict,
  original_order_id uuid references public.orders(id) on delete restrict,
  original_serial text,
  policy_version text not null default 'handover-v1',
  submitted_at timestamptz not null default now(),
  decision text not null default 'under_review'
    check (decision in ('under_review', 'covered_repair', 'replacement_approved', 'paid_repair', 'further_review')),
  decision_note text check (char_length(btrim(decision_note)) between 1 and 1500),
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  replacement_serial text check (char_length(btrim(replacement_serial)) between 1 and 100),
  replacement_handover_on date,
  replacement_recorded_by uuid references public.users(id) on delete set null,
  replacement_recorded_at timestamptz,
  check ((unit_id is null and original_order_id is null and original_serial is null)
    or (unit_id is not null and original_order_id is not null and nullif(btrim(original_serial), '') is not null)),
  check ((replacement_serial is null) = (replacement_handover_on is null)),
  check (replacement_serial is null or decision = 'replacement_approved')
);
create index service_warranty_cases_unit_idx on public.service_warranty_cases(unit_id);
alter table public.ebike_warranty_handovers enable row level security;
alter table public.service_warranty_cases enable row level security;
revoke all on table public.ebike_warranty_handovers, public.service_warranty_cases from public, anon, authenticated;

create function public.service_warranty_deadline(p_handover date, p_wheels smallint)
returns date language sql immutable strict set search_path = ''
as $$
  select case when p_wheels = 2 then p_handover + 7
    when p_wheels in (3, 4) then (p_handover + interval '3 months')::date end;
$$;

create function public.order_warranty_units(p_order_id uuid)
returns table (unit_id uuid, model text, serial text, handover_on date, wheel_count smallint)
language sql stable security definer set search_path = ''
as $$
  select e.id, i.product_name, coalesce(h.original_serial, e.serial_number), h.handover_on, h.wheel_count
  from public.orders o join public.order_items i on i.order_id = o.id
  join public.ebike_units e on e.order_item_id = i.id
  left join public.ebike_warranty_handovers h on h.unit_id = e.id and h.order_id = o.id
  where o.id = p_order_id and o.status = 'completed' and i.product_type = 'ebike'
    and e.status = 'sold' and nullif(btrim(e.serial_number), '') is not null
    and public.current_user_has_permission('orders.manage')
    and public.current_user_can_access_branch(o.branch_id)
  order by i.product_name, e.serial_number, e.id;
$$;

create function public.record_ebike_warranty_handover(p_order_id uuid, p_unit_id uuid, p_handover_on date, p_wheel_count smallint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_serial text;
begin
  if auth.uid() is null or not public.current_user_has_permission('orders.manage') then
    raise exception 'You do not have permission to record a handover.';
  end if;
  select o.* into v_order from public.orders o
  where o.id = p_order_id and o.status = 'completed' and public.current_user_can_access_branch(o.branch_id)
  for update;
  if not found then raise exception 'Choose an accessible completed order.'; end if;

  select e.serial_number into v_serial from public.ebike_units e join public.order_items i on i.id = e.order_item_id
  where e.id = p_unit_id and i.order_id = p_order_id and i.product_type = 'ebike' and e.status = 'sold'
  for update of e;
  if nullif(btrim(v_serial), '') is null then raise exception 'Choose a serialized bike from this order.'; end if;
  if p_wheel_count is null or p_wheel_count not in (2, 3, 4) or p_handover_on is null
    or p_handover_on > (now() at time zone 'Asia/Manila')::date
    or p_handover_on < (v_order.created_at at time zone 'Asia/Manila')::date then
    raise exception 'Enter a valid handover date and wheel count.';
  end if;
  insert into public.ebike_warranty_handovers(unit_id, order_id, original_serial, handover_on, wheel_count, recorded_by)
    values (p_unit_id, p_order_id, v_serial, p_handover_on, p_wheel_count, auth.uid())
    on conflict (unit_id) do nothing;
  if not found then raise exception 'The verified handover has already been recorded.'; end if;
end;
$$;

revoke all on function public.service_warranty_deadline(date, smallint), public.order_warranty_units(uuid),
  public.record_ebike_warranty_handover(uuid, uuid, date, smallint) from public, anon, authenticated;
grant execute on function public.order_warranty_units(uuid),
  public.record_ebike_warranty_handover(uuid, uuid, date, smallint) to authenticated;
