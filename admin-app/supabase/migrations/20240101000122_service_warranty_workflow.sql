create function public.customer_warranty_bikes()
returns table (unit_id uuid, model text, serial text, handover_on date, wheel_count smallint, deadline date)
language sql stable security definer set search_path = ''
as $$
  select e.id, i.product_name, coalesce(h.original_serial, e.serial_number), h.handover_on, h.wheel_count,
    public.service_warranty_deadline(h.handover_on, h.wheel_count)
  from public.orders o join public.order_items i on i.order_id = o.id
  join public.ebike_units e on e.order_item_id = i.id
  left join public.ebike_warranty_handovers h on h.unit_id = e.id and h.order_id = o.id
  where o.customer_id = auth.uid() and public.current_user_has_permission('storefront.access')
    and o.status = 'completed' and i.product_type = 'ebike' and e.status = 'sold'
    and nullif(btrim(e.serial_number), '') is not null
  order by o.completed_at desc nulls last, o.id, e.id
  limit 50;
$$;

create function public.request_service_warranty_appointment(p_booking jsonb, p_unit_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_model text;
  v_order_id uuid;
  v_serial text;
begin
  if p_unit_id is not null then
    select i.product_name, e.serial_number, o.id into v_model, v_serial, v_order_id
    from public.orders o join public.order_items i on i.order_id = o.id
    join public.ebike_units e on e.order_item_id = i.id
    where o.customer_id = auth.uid() and o.status = 'completed' and i.product_type = 'ebike'
      and e.id = p_unit_id and e.status = 'sold' and nullif(btrim(e.serial_number), '') is not null;
    if not found then raise exception 'Choose a bike from your own completed purchases.'; end if;
  end if;
  v_id := public.request_service_appointment(
    (p_booking->>'p_branch_id')::uuid, p_booking->>'p_service_mode', 'repair',
    p_booking->>'p_bike_make', coalesce(v_model, p_booking->>'p_bike_model'),
    coalesce(v_serial, p_booking->>'p_bike_serial_number'), p_booking->>'p_issue_description',
    p_booking->>'p_address_line1', p_booking->>'p_barangay', p_booking->>'p_city',
    p_booking->>'p_province', p_booking->>'p_postal_code', p_booking->>'p_contact_number',
    (p_booking->>'p_preferred_start_at')::timestamptz
  );
  insert into public.service_warranty_cases(appointment_id, unit_id, original_order_id, original_serial)
    values (v_id, p_unit_id, v_order_id, v_serial);
  return v_id;
end;
$$;

create function public.service_warranty_details(p_appointment_id uuid)
returns table (appointment_id uuid, submitted_at timestamptz, decision text, decision_note text, order_number text,
  original_serial text, handover_on date, wheel_count smallint, deadline date, timing text, replacement_serial text,
  replacement_handover_on date, decided_at timestamptz, approver text, unit_id uuid)
language sql stable security definer set search_path = ''
as $$
  select c.appointment_id, c.submitted_at, c.decision, c.decision_note, o.order_number,
    coalesce(c.original_serial, a.bike_serial_number),
    h.handover_on, h.wheel_count, d.deadline,
    case when d.deadline is null then 'needs_review'
      when (c.submitted_at at time zone 'Asia/Manila')::date < h.handover_on then 'needs_review'
      when (c.submitted_at at time zone 'Asia/Manila')::date <= d.deadline then 'within_window'
      else 'after_window' end,
    c.replacement_serial, c.replacement_handover_on, c.decided_at,
    case when public.current_user_has_permission('service_appointments.manage') then u.full_name end, c.unit_id
  from public.service_warranty_cases c join public.service_appointments a on a.id = c.appointment_id
  left join public.orders o on o.id = c.original_order_id and o.customer_id = a.customer_id
  left join public.ebike_warranty_handovers h on h.unit_id = c.unit_id and h.order_id = o.id
  left join public.users u on u.id = c.decided_by
  cross join lateral (select public.service_warranty_deadline(h.handover_on, h.wheel_count) as deadline) d
  where c.appointment_id = p_appointment_id and (
    (a.customer_id = auth.uid() and public.current_user_has_permission('storefront.access'))
    or (public.current_user_has_permission('service_appointments.manage') and public.current_user_can_access_branch(a.branch_id))
  );
$$;

create function public.review_service_warranty(p_appointment_id uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('service_appointments.manage') then
    raise exception 'You do not have permission to review warranty assessments.';
  end if;
  if p_decision is null or p_decision not in ('covered_repair', 'replacement_approved', 'paid_repair', 'further_review')
    or p_note is null or char_length(btrim(p_note)) not between 1 and 1500 then
    raise exception 'Choose a decision and explain the outcome.';
  end if;

  update public.service_warranty_cases c
  set decision = p_decision, decision_note = btrim(p_note), decided_at = now(), decided_by = auth.uid()
  from public.service_appointments a
  where c.appointment_id = p_appointment_id and a.id = c.appointment_id
    and public.current_user_can_access_branch(a.branch_id) and a.status in ('in_service', 'ready_for_pickup', 'completed')
    and c.replacement_serial is null and (p_decision <> 'replacement_approved' or c.unit_id is not null);
  if not found then raise exception 'The appointment is not eligible for that decision.'; end if;
end;
$$;

create function public.link_service_warranty_unit(p_appointment_id uuid, p_serial text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_unit_id uuid;
  v_order_id uuid;
  v_serial text;
begin
  if auth.uid() is null or not public.current_user_has_permission('service_appointments.manage') then
    raise exception 'You do not have permission to verify warranty bikes.';
  end if;
  select e.id, o.id, e.serial_number into strict v_unit_id, v_order_id, v_serial
  from public.service_appointments a join public.orders o on o.customer_id = a.customer_id
  join public.order_items i on i.order_id = o.id join public.ebike_units e on e.order_item_id = i.id
  where a.id = p_appointment_id and public.current_user_can_access_branch(a.branch_id)
    and o.status = 'completed' and i.product_type = 'ebike' and e.status = 'sold'
    and lower(btrim(e.serial_number)) = lower(btrim(p_serial));
  update public.service_warranty_cases set unit_id = v_unit_id, original_order_id = v_order_id, original_serial = v_serial
  where appointment_id = p_appointment_id and unit_id is null and replacement_serial is null
    and decision in ('under_review', 'further_review');
  if not found then raise exception 'This warranty assessment already has a verified bike or decision.'; end if;
exception when no_data_found or too_many_rows then
  raise exception 'The serial must match one completed purchase for this customer.';
end;
$$;

create function public.record_service_warranty_replacement(p_appointment_id uuid, p_serial text, p_handover_on date)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('service_appointments.manage') then
    raise exception 'You do not have permission to record replacement handovers.';
  end if;
  if p_serial is null or char_length(btrim(p_serial)) not between 1 and 100 or p_handover_on is null
    or p_handover_on > (now() at time zone 'Asia/Manila')::date then
    raise exception 'Enter a valid replacement serial number and handover date.';
  end if;

  update public.service_warranty_cases c
  set replacement_serial = btrim(p_serial), replacement_handover_on = p_handover_on,
    replacement_recorded_by = auth.uid(), replacement_recorded_at = now()
  from public.service_appointments a
  where c.appointment_id = p_appointment_id and a.id = c.appointment_id
    and public.current_user_can_access_branch(a.branch_id)
    and c.decision = 'replacement_approved' and c.replacement_serial is null
    and lower(btrim(c.original_serial)) <> lower(btrim(p_serial))
    and p_handover_on >= (c.decided_at at time zone 'Asia/Manila')::date;
  if not found then raise exception 'Verify approval, the replacement serial, and the handover date.'; end if;
end;
$$;

revoke all on function public.customer_warranty_bikes(), public.request_service_warranty_appointment(jsonb, uuid),
  public.service_warranty_details(uuid), public.review_service_warranty(uuid, text, text),
  public.link_service_warranty_unit(uuid, text), public.record_service_warranty_replacement(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.customer_warranty_bikes(), public.request_service_warranty_appointment(jsonb, uuid),
  public.service_warranty_details(uuid), public.review_service_warranty(uuid, text, text),
  public.link_service_warranty_unit(uuid, text), public.record_service_warranty_replacement(uuid, text, date)
  to authenticated;
create function public.staff_warranty_appointment_ids(p_appointment_ids uuid[])
returns table (appointment_id uuid)
language sql stable security definer set search_path = ''
as $$
  select c.appointment_id from public.service_warranty_cases c
  join public.service_appointments a on a.id = c.appointment_id
  where c.appointment_id = any(p_appointment_ids)
    and public.current_user_has_permission('service_appointments.manage')
    and public.current_user_can_access_branch(a.branch_id);
$$;
revoke all on function public.staff_warranty_appointment_ids(uuid[]) from public, anon, authenticated;
grant execute on function public.staff_warranty_appointment_ids(uuid[]) to authenticated;
notify pgrst, 'reload schema';
