create table public.warranty_return_updates (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.service_warranty_exchanges(appointment_id) on delete restrict,
  reason text not null check (reason in ('awaiting_inspection', 'damaged', 'defective', 'other')),
  disposition text not null check (disposition in ('held_at_branch', 'sent_for_repair', 'returned_to_supplier', 'written_off')),
  note text check (char_length(note) <= 1000),
  actor_id uuid references public.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index warranty_return_updates_latest_idx on public.warranty_return_updates (appointment_id, id desc);
create index service_warranty_exchanges_received_idx on public.service_warranty_exchanges (received_at desc, appointment_id desc);
alter table public.warranty_return_updates enable row level security;
revoke all on table public.warranty_return_updates from public, anon, authenticated;

create function public.list_warranty_returns(p_before_at timestamptz, p_before_id uuid)
returns table (appointment_id uuid, appointment_number text, branch_name text, product_name text,
  original_serial text, returned_condition text, received_at timestamptz, reason text, disposition text,
  note text, recorded_at timestamptz, recorded_by text, update_id text)
language sql stable security definer set search_path = ''
as $$
  select e.appointment_id, a.appointment_number, a.branch_name, i.product_name, u.serial_number,
    e.returned_condition, e.received_at, recent.reason, recent.disposition, recent.note,
    recent.recorded_at, actor.full_name, recent.id::text
  from public.service_warranty_exchanges e
  join public.service_appointments a on a.id = e.appointment_id
  join public.ebike_units u on u.id = e.original_unit_id
  join public.order_items i on i.id = u.order_item_id
  left join lateral (
    select r.* from public.warranty_return_updates r
    where r.appointment_id = e.appointment_id order by r.id desc limit 1
  ) recent on true
  left join public.users actor on actor.id = recent.actor_id
  where auth.uid() is not null and public.current_user_has_permission('products.manage')
    and public.current_user_can_access_branch(e.branch_id)
    and ((p_before_at is null and p_before_id is null)
      or (e.received_at, e.appointment_id) < (p_before_at, p_before_id))
  order by e.received_at desc, e.appointment_id desc
  limit 26;
$$;

create function public.record_warranty_return_update(
  p_appointment_id uuid, p_reason text, p_disposition text, p_note text, p_previous_id text
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_previous public.warranty_return_updates%rowtype;
  v_note text := nullif(btrim(p_note), '');
begin
  if auth.uid() is null or not coalesce(public.current_user_has_permission('products.manage'), false) then
    raise exception 'Inventory management permission is required.';
  end if;

  perform 1 from public.service_warranty_exchanges e
  where e.appointment_id = p_appointment_id and public.current_user_can_access_branch(e.branch_id)
  for update;
  if not found then raise exception 'The warranty return is unavailable.'; end if;

  select * into v_previous from public.warranty_return_updates
  where appointment_id = p_appointment_id order by id desc limit 1;
  if v_previous.reason = p_reason and v_previous.disposition = p_disposition
    and v_previous.note is not distinct from v_note then return true; end if;
  if v_previous.id::text is distinct from p_previous_id then return false; end if;

  insert into public.warranty_return_updates (appointment_id, reason, disposition, note, actor_id)
  values (p_appointment_id, p_reason, p_disposition, v_note, auth.uid());
  return true;
end;
$$;

revoke all on function public.list_warranty_returns(timestamptz, uuid),
  public.record_warranty_return_update(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.list_warranty_returns(timestamptz, uuid),
  public.record_warranty_return_update(uuid, text, text, text, text) to authenticated;
notify pgrst, 'reload schema';
