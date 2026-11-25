create function public.manage_service_warranty_exchange(
  p_appointment_id uuid, p_operation text, p_value text, p_handover_on date, p_original_serial text
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_case public.service_warranty_cases%rowtype;
  v_appointment public.service_appointments%rowtype;
  v_exchange public.service_warranty_exchanges%rowtype;
  v_original public.ebike_units%rowtype;
  v_replacement public.ebike_units%rowtype;
  v_stock integer;
  v_serial text := nullif(btrim(p_value), '');
  v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if auth.uid() is null or not public.current_user_has_permission('service_appointments.manage')
    or not public.current_user_has_permission('products.manage') then
    raise exception 'You need service and inventory permissions to process warranty exchanges.';
  end if;

  select * into v_appointment from public.service_appointments
  where id = p_appointment_id and public.current_user_can_access_branch(branch_id) for update;
  if not found or v_appointment.customer_id is null then
    raise exception 'Choose a customer appointment from an accessible branch.';
  end if;
  select * into v_case from public.service_warranty_cases
  where appointment_id = p_appointment_id and decision = 'replacement_approved' for update;
  if not found or v_case.unit_id is null or v_case.original_order_id is null then
    raise exception 'Approve the replacement and verify the original purchase first.';
  end if;
  select * into v_exchange from public.service_warranty_exchanges
  where appointment_id = p_appointment_id for update;
  if v_case.replacement_handover_on is not null then
    if p_operation = 'handover' and v_exchange.completed_at is not null
      and v_case.replacement_handover_on = p_handover_on then return; end if;
    raise exception 'The replacement handover has already been recorded.';
  end if;

  select * into v_original from public.ebike_units where id = v_case.unit_id;
  if not found then raise exception 'The original serialized unit is unavailable.'; end if;

  if p_operation = 'receive' then
    if v_exchange.appointment_id is not null then return; end if;
    if p_original_serial is null or upper(btrim(p_original_serial)) <> upper(btrim(v_case.original_serial)) then
      raise exception 'Confirm the serial number printed on the returned unit.';
    end if;
    if v_serial is null or char_length(v_serial) > 1500 then
      raise exception 'Describe the condition of the original unit.';
    end if;
    perform 1 from public.ebike_units e
    join public.order_items i on i.id = e.order_item_id
    join public.orders o on o.id = i.order_id
    where e.id = v_original.id and e.status = 'sold' and o.status = 'completed'
      and o.id = v_case.original_order_id and o.customer_id = v_appointment.customer_id
      and e.serial_number = v_case.original_serial
    for update of e;
    if not found then raise exception 'The original unit no longer matches the verified purchase.'; end if;
    if exists (select 1 from public.service_warranty_exchanges e where e.original_unit_id = v_original.id) then
      raise exception 'The original unit was already received for another exchange.';
    end if;
    insert into public.service_warranty_exchanges(
      appointment_id, original_unit_id, branch_id, customer_id, returned_condition, received_by
    ) values (p_appointment_id, v_original.id, v_appointment.branch_id, v_appointment.customer_id, v_serial, auth.uid());
    insert into public.inventory_movements(branch_id, variant_id, quantity_delta, movement_type, reference_id, actor_id, note)
    values (v_appointment.branch_id, v_original.variant_id, 0, 'warranty_return_received', p_appointment_id, auth.uid(),
      'Original unit received for assessment and kept out of sellable stock.');
    return;
  end if;

  if v_exchange.appointment_id is null or v_exchange.branch_id <> v_appointment.branch_id then
    raise exception 'Receive the original unit before processing the replacement.';
  end if;

  if p_operation = 'reserve' then
    if v_serial is null or char_length(v_serial) > 100 then raise exception 'Enter a replacement serial.'; end if;
    if v_exchange.replacement_unit_id is not null then
      if exists (select 1 from public.ebike_units where id = v_exchange.replacement_unit_id
        and upper(serial_number) = upper(v_serial) and status = 'warranty_reserved') then return; end if;
      raise exception 'Release the current reservation before choosing another unit.';
    end if;
    -- Commerce and transfers lock stock counts before locking sellable serials.
    select stock into v_stock from public.branch_inventory where branch_id = v_exchange.branch_id
      and variant_id = v_original.variant_id for update;
    if not found or v_stock < 1 then raise exception 'No replacement stock is available at this branch.'; end if;
    select * into v_replacement from public.ebike_units where branch_id = v_exchange.branch_id
      and variant_id = v_original.variant_id and upper(serial_number) = upper(v_serial)
      and status = 'in_stock' and order_item_id is null and transfer_id is null for update;
    if not found then raise exception 'Choose an in-stock serial for the original variant at this branch.'; end if;

    update public.ebike_units set status = 'warranty_reserved' where id = v_replacement.id;
    perform set_config('njet.inventory_type', 'warranty_replacement_reserved', true);
    perform set_config('njet.inventory_reference', p_appointment_id::text, true);
    update public.branch_inventory set stock = stock - 1
      where branch_id = v_exchange.branch_id and variant_id = v_original.variant_id;
    update public.service_warranty_exchanges set replacement_unit_id = v_replacement.id,
      reserved_at = now(), reserved_by = auth.uid() where appointment_id = p_appointment_id;
    return;
  end if;

  if p_operation not in ('release', 'handover') or p_operation is null then
    raise exception 'Choose a valid exchange action.';
  end if;
  if v_exchange.replacement_unit_id is null then
    if p_operation = 'release' then return; end if;
    raise exception 'Reserve a replacement unit first.';
  end if;
  if p_operation = 'release' then
    perform 1 from public.branch_inventory where branch_id = v_exchange.branch_id
      and variant_id = v_original.variant_id for update;
    if not found then raise exception 'The replacement stock record is missing.'; end if;
  end if;
  select * into v_replacement from public.ebike_units where id = v_exchange.replacement_unit_id
    and branch_id = v_exchange.branch_id and variant_id = v_original.variant_id
    and status = 'warranty_reserved' for update;
  if not found then raise exception 'The replacement reservation could not be verified.'; end if;

  if p_operation = 'release' then
    update public.ebike_units set status = 'in_stock' where id = v_replacement.id;
    perform set_config('njet.inventory_type', 'warranty_reservation_released', true);
    perform set_config('njet.inventory_reference', p_appointment_id::text, true);
    update public.branch_inventory set stock = stock + 1
      where branch_id = v_exchange.branch_id and variant_id = v_original.variant_id;
    update public.service_warranty_exchanges set replacement_unit_id = null, reserved_at = null, reserved_by = null
      where appointment_id = p_appointment_id;
    return;
  end if;

  if p_handover_on is null or p_handover_on > v_today
    or p_handover_on < (v_exchange.reserved_at at time zone 'Asia/Manila')::date then
    raise exception 'Choose a handover date between reservation and today.';
  end if;
  update public.ebike_units set status = 'warranty_replacement' where id = v_replacement.id;
  update public.service_warranty_cases set replacement_serial = v_replacement.serial_number,
    replacement_handover_on = p_handover_on, replacement_recorded_by = auth.uid(), replacement_recorded_at = now()
    where appointment_id = p_appointment_id;
  update public.service_warranty_exchanges set completed_at = now() where appointment_id = p_appointment_id;
  insert into public.inventory_movements(branch_id, variant_id, quantity_delta, movement_type, reference_id, actor_id)
  values (v_exchange.branch_id, v_original.variant_id, 0, 'warranty_replacement_handed_over', p_appointment_id, auth.uid());
end;
$$;

revoke all on function public.manage_service_warranty_exchange(uuid, text, text, date, text) from public, anon, authenticated;
grant execute on function public.manage_service_warranty_exchange(uuid, text, text, date, text) to authenticated;
