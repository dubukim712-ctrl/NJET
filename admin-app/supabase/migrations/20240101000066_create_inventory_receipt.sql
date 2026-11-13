create or replace function public.create_inventory_receipt(
  p_branch_id uuid,
  p_supplier_name text,
  p_document_reference text,
  p_received_at timestamptz,
  p_shared_cost_minor integer,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_receipt_id uuid;
  v_receipt_item_id uuid;
  v_rounding_variant_id uuid;
  v_item record;
  v_unit record;
  v_total_supplier_value numeric;
  v_line_supplier_value numeric;
  v_line_landed_value numeric;
  v_allocated_extra integer;
  v_extra_allocated bigint := 0;
  v_base_cost bigint;
  v_remainder integer;
  v_unit_cost integer;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to receive inventory.';
  end if;
  if not public.current_user_can_access_branch(p_branch_id)
    or not exists (
      select 1 from public.branches b
      where b.id = p_branch_id and b.active
    ) then
    raise exception 'Choose an active branch you can access.';
  end if;
  if p_supplier_name is null
    or length(btrim(p_supplier_name)) not between 2 and 120
    or p_supplier_name ~ '[[:cntrl:]]'
    or (p_document_reference is not null
      and (
        length(btrim(p_document_reference)) > 120
        or p_document_reference ~ '[[:cntrl:]]'
      ))
    or p_shared_cost_minor is null or p_shared_cost_minor < 0
    or p_received_at is null or p_received_at > now() + interval '1 day' then
    raise exception 'Enter valid supplier, receipt, date, and shared-cost details.';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Receipt items must be a list.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Receive between 1 and 30 product variants at a time.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    where jsonb_typeof(e.value) <> 'object'
      or coalesce(e.value->>'variant_id', '') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(jsonb_typeof(e.value->'units'), '') <> 'array'
      or not case
        when coalesce(e.value->>'quantity', '') ~ '^[0-9]{1,7}$'
          then (e.value->>'quantity')::integer between 1 and 1000000
        else false
      end
      or not case
        when coalesce(e.value->>'unit_supplier_cost_minor', '') ~ '^[0-9]{1,10}$'
          then (e.value->>'unit_supplier_cost_minor')::bigint
            between 0 and 2147483647
        else false
      end
  ) then
    raise exception 'A receipt item has invalid quantity, variant, cost, or unit data.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    cross join lateral jsonb_array_elements(e.value->'units') as u(value)
    where jsonb_typeof(u.value) <> 'object'
      or jsonb_typeof(u.value->'serial_number') <> 'string'
      or jsonb_typeof(u.value->'motor_number') <> 'string'
      or coalesce(length(btrim(u.value->>'serial_number')), 0) not between 1 and 100
      or coalesce(length(btrim(u.value->>'motor_number')), 0) not between 1 and 100
      or btrim(u.value->>'serial_number') !~ '^[A-Za-z0-9._/-]+$'
      or btrim(u.value->>'motor_number') !~ '^[A-Za-z0-9._/-]+$'
  ) then
    raise exception 'Enter a valid serial and motor number for every received e-bike.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    cross join lateral jsonb_array_elements(e.value->'units') as u(value)
    group by upper(btrim(u.value->>'serial_number'))
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    cross join lateral jsonb_array_elements(e.value->'units') as u(value)
    group by upper(btrim(u.value->>'motor_number'))
    having count(*) > 1
  ) then
    raise exception 'Serial and motor numbers must be unique in this receipt.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    group by (e.value->>'variant_id')::uuid
    having count(*) > 1
  ) then
    raise exception 'Add each product variant only once per receipt.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as i(
      variant_id uuid, quantity integer, unit_supplier_cost_minor integer, units jsonb
    )
    left join public.product_variants v on v.id = i.variant_id and v.active
    left join public.products p on p.id = v.product_id and p.active
    where v.id is null or p.id is null
      or (p.product_type = 'ebike'
        and (i.quantity > 50 or jsonb_array_length(i.units) <> i.quantity))
      or (p.product_type <> 'ebike' and jsonb_array_length(i.units) <> 0)
  ) then
    raise exception 'Receipt units do not match the selected active variants.';
  end if;

  select coalesce(sum(
    i.quantity::numeric * i.unit_supplier_cost_minor
  ), 0), (
    select i.variant_id
    from jsonb_to_recordset(p_items) as i(
      variant_id uuid, quantity integer, unit_supplier_cost_minor integer, units jsonb
    )
    where i.quantity::numeric * i.unit_supplier_cost_minor > 0
    order by i.variant_id desc
    limit 1
  )
  into v_total_supplier_value, v_rounding_variant_id
  from jsonb_to_recordset(p_items) as i(
    variant_id uuid, quantity integer, unit_supplier_cost_minor integer, units jsonb
  );
  if p_shared_cost_minor > 0 and v_total_supplier_value = 0 then
    raise exception 'Shared costs need a non-zero supplier line value for proportional allocation.';
  end if;

  insert into public.inventory_receipts (
    branch_id, supplier_name, document_reference, received_at,
    shared_cost_minor, received_by
  ) values (
    p_branch_id, btrim(p_supplier_name), nullif(btrim(p_document_reference), ''),
    p_received_at, p_shared_cost_minor, auth.uid()
  ) returning id into v_receipt_id;

  perform set_config('njet.receipt_cost_update', 'on', true);
  for v_item in
    select i.variant_id, i.quantity, i.unit_supplier_cost_minor, i.units,
      p.product_type
    from jsonb_to_recordset(p_items) as i(
      variant_id uuid, quantity integer, unit_supplier_cost_minor integer, units jsonb
    )
    join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id
    order by i.variant_id
  loop
    v_line_supplier_value := v_item.quantity::numeric * v_item.unit_supplier_cost_minor;
    if v_item.variant_id = v_rounding_variant_id then
      v_allocated_extra := p_shared_cost_minor - v_extra_allocated;
    elsif v_total_supplier_value > 0 then
      v_allocated_extra := floor(
        p_shared_cost_minor::numeric * v_line_supplier_value / v_total_supplier_value
      )::integer;
    else
      v_allocated_extra := 0;
    end if;
    v_extra_allocated := v_extra_allocated + v_allocated_extra;
    v_line_landed_value := v_line_supplier_value + v_allocated_extra;
    v_base_cost := floor(v_line_landed_value / v_item.quantity);
    v_remainder := mod(v_line_landed_value::bigint, v_item.quantity)::integer;
    if v_base_cost > 2147483647
      or (v_remainder > 0 and v_base_cost = 2147483647) then
      raise exception 'The landed unit cost exceeds the supported range.';
    end if;

    insert into public.inventory_receipt_items (
      receipt_id, variant_id, quantity_received, supplier_unit_cost_minor,
      allocated_extra_cost_minor
    ) values (
      v_receipt_id, v_item.variant_id, v_item.quantity,
      v_item.unit_supplier_cost_minor, v_allocated_extra
    ) returning id into v_receipt_item_id;

    if v_item.product_type = 'ebike' then
      for v_unit in
        select u.value->>'serial_number' as serial_number,
          u.value->>'motor_number' as motor_number, u.ordinality
        from jsonb_array_elements(v_item.units) with ordinality as u(value, ordinality)
        order by u.ordinality
      loop
        v_unit_cost := v_base_cost::integer
          + case when v_unit.ordinality <= v_remainder then 1 else 0 end;
        insert into public.ebike_units (
          variant_id, branch_id, serial_number, motor_number, status,
          unit_cost_minor, receipt_item_id
        ) values (
          v_item.variant_id, p_branch_id,
          upper(btrim(v_unit.serial_number)), upper(btrim(v_unit.motor_number)),
          'in_stock', v_unit_cost, v_receipt_item_id
        );
      end loop;
    else
      if v_remainder > 0 then
        insert into public.inventory_stock_batches (
          branch_id, variant_id, receipt_item_id, source, received_at,
          quantity_received, quantity_remaining, unit_cost_minor
        ) values (
          p_branch_id, v_item.variant_id, v_receipt_item_id, 'receipt', p_received_at,
          v_remainder, v_remainder, (v_base_cost + 1)::integer
        );
      end if;
      if v_item.quantity > v_remainder then
        insert into public.inventory_stock_batches (
          branch_id, variant_id, receipt_item_id, source, received_at,
          quantity_received, quantity_remaining, unit_cost_minor
        ) values (
          p_branch_id, v_item.variant_id, v_receipt_item_id, 'receipt', p_received_at,
          v_item.quantity - v_remainder, v_item.quantity - v_remainder,
          v_base_cost::integer
        );
      end if;
    end if;

    update public.product_variants
    set cost_minor = round(v_line_landed_value / v_item.quantity)::integer
    where id = v_item.variant_id;
    perform set_config('njet.inventory_type', 'stock_received', true);
    perform set_config('njet.inventory_reference', v_receipt_id::text, true);
    insert into public.branch_inventory (branch_id, variant_id, stock)
    values (p_branch_id, v_item.variant_id, v_item.quantity)
    on conflict (branch_id, variant_id)
    do update set stock = public.branch_inventory.stock + excluded.stock;
  end loop;
  return v_receipt_id;
end;
$$;

revoke all on function public.create_inventory_receipt(
  uuid, text, text, timestamptz, integer, jsonb
) from public, anon;
grant execute on function public.create_inventory_receipt(
  uuid, text, text, timestamptz, integer, jsonb
) to authenticated;

notify pgrst, 'reload schema';
