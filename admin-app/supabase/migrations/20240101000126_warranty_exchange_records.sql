create function public.service_warranty_exchange_details(p_appointment_id uuid)
returns table (appointment_id uuid, appointment_number text, customer_name text, order_number text,
  branch_name text, product_name text, original_serial text, replacement_serial text, returned_condition text,
  received_at timestamptz, reserved_at timestamptz, completed_at timestamptz, replacement_handover_on date)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.appointment_number, a.customer_name, o.order_number, a.branch_name, i.product_name, c.original_serial,
    u.serial_number,
    case when public.current_user_has_permission('service_appointments.manage') and public.current_user_can_access_branch(e.branch_id)
      then e.returned_condition end,
    e.received_at, e.reserved_at, e.completed_at, c.replacement_handover_on
  from public.service_warranty_exchanges e
  join public.service_warranty_cases c on c.appointment_id = e.appointment_id
  join public.service_appointments a on a.id = e.appointment_id
  join public.orders o on o.id = c.original_order_id
  join public.ebike_units original on original.id = e.original_unit_id
  join public.order_items i on i.id = original.order_item_id
  left join public.ebike_units u on u.id = e.replacement_unit_id
  where e.appointment_id = p_appointment_id and (
    (e.customer_id = auth.uid() and e.completed_at is not null and public.current_user_has_permission('storefront.access'))
    or (public.current_user_has_permission('service_appointments.manage') and public.current_user_can_access_branch(e.branch_id))
  );
$$;

create function public.service_warranty_replacement_options(p_appointment_id uuid)
returns table (serial text, motor text)
language sql stable security definer set search_path = ''
as $$
  select candidate.serial_number, candidate.motor_number
  from public.service_warranty_exchanges e
  join public.ebike_units original on original.id = e.original_unit_id
  join public.ebike_units candidate on candidate.variant_id = original.variant_id and candidate.branch_id = e.branch_id
  join public.branch_inventory stock on stock.variant_id = candidate.variant_id and stock.branch_id = candidate.branch_id
  where e.appointment_id = p_appointment_id and e.completed_at is null and e.replacement_unit_id is null
    and public.current_user_has_permission('service_appointments.manage')
    and public.current_user_has_permission('products.manage')
    and public.current_user_can_access_branch(e.branch_id)
    and candidate.status = 'in_stock' and stock.stock > 0
  order by candidate.serial_number
  limit 50;
$$;

revoke all on function public.service_warranty_exchange_details(uuid),
  public.service_warranty_replacement_options(uuid) from public, anon, authenticated;
grant execute on function public.service_warranty_exchange_details(uuid),
  public.service_warranty_replacement_options(uuid) to authenticated;
notify pgrst, 'reload schema';
