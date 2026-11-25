-- Internal lookup. Each caller applies its own ownership and branch permissions.
create view public.completed_warranty_replacement_units with (security_invoker = true) as
select e.customer_id, e.branch_id, c.original_order_id as order_id, i.id as item_id,
  u.id as unit_id, u.serial_number, i.product_name, i.variant_name
from public.service_warranty_exchanges e
join public.service_warranty_cases c on c.appointment_id = e.appointment_id
join public.orders o on o.id = c.original_order_id and o.customer_id = e.customer_id and o.status = 'completed'
join public.ebike_units original on original.id = e.original_unit_id
join public.order_items i on i.id = original.order_item_id and i.order_id = o.id
join public.ebike_units u on u.id = e.replacement_unit_id and u.status = 'warranty_replacement'
where e.completed_at is not null and i.product_type = 'ebike';
revoke all on public.completed_warranty_replacement_units from public, anon, authenticated;

create or replace function public.crm_customers(p_customer_id uuid, p_search text, p_offset integer)
returns table (id uuid, full_name text, email text, phone_number text, phone_verified_at timestamptz,
  address text, recent_branch_name text, last_interaction_at timestamptz, open_follow_ups integer)
language sql stable security definer set search_path = ''
as $$
  with customers as (
    select u.id, coalesce(nullif(btrim(u.full_name), ''), 'Customer') as full_name,
      u.email, u.phone_number, u.phone_verified_at,
      case when p_customer_id is not null then
        concat_ws(', ', nullif(u.street_address, ''), nullif(u.barangay_name, ''),
          nullif(u.city_name, ''), nullif(u.province_name, ''), nullif(u.postal_code, ''))
      end as address
    from public.users u join public.roles r on r.id = u.role_id
    cross join lateral (select '%' || replace(replace(replace(btrim(coalesce(p_search, '')), chr(92),
      chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' as pattern) s
    where r.scope = 'customer' and public.crm_can_access_customer(u.id)
      and (p_customer_id is null or p_customer_id = u.id)
      and (coalesce(btrim(p_search), '') = '' or u.full_name ilike s.pattern
        or u.phone_number ilike s.pattern or u.email ilike s.pattern
        or (public.current_user_has_permission('orders.read') and exists (
          select 1 from public.orders o where o.customer_id = u.id
            and public.current_user_can_access_branch(o.branch_id)
            and (o.order_number ilike s.pattern or exists (
              select 1 from public.order_items i join public.ebike_units e on e.order_item_id = i.id
              where i.order_id = o.id and e.serial_number ilike s.pattern
            ) or exists (
              select 1 from public.completed_warranty_replacement_units r
              where r.order_id = o.id and public.current_user_can_access_branch(r.branch_id)
                and r.serial_number ilike s.pattern
            ))
        )))
    order by lower(coalesce(nullif(btrim(u.full_name), ''), 'Customer')), u.id
    limit 51 offset greatest(p_offset, 0)
  )
  select c.*, latest.branch_name, latest.interaction_at,
    (select count(*)::integer from public.crm_follow_ups f
      where f.customer_id = c.id and f.status = 'open'
        and public.current_user_can_access_branch(f.branch_id))
  from customers c
  left join lateral (
    select touch.branch_name, touch.interaction_at from (
      select o.branch_name, o.created_at as interaction_at from public.orders o
      where o.customer_id = c.id and public.current_user_has_permission('orders.read')
        and public.current_user_can_access_branch(o.branch_id)
      union all
      select a.branch_name, a.created_at from public.service_appointments a
      where a.customer_id = c.id and public.current_user_has_permission('service_appointments.read')
        and public.current_user_can_access_branch(a.branch_id)
    ) touch
    order by touch.interaction_at desc, touch.branch_name
    limit 1
  ) latest on true
  order by lower(c.full_name), c.id;
$$;

create or replace function public.crm_customer_activity(p_customer_id uuid)
returns table (id uuid, kind text, reference text, detail text, status text, occurred_at timestamptz, bikes jsonb)
language sql stable security definer set search_path = ''
as $$
  select activity.* from (
    select o.id, 'Order'::text as kind, o.order_number as reference, o.branch_name as detail,
      o.status, o.created_at as occurred_at,
      case when o.status = 'completed' then (
        select jsonb_agg(jsonb_build_object(
          'name', b.product_name, 'variant', b.variant_name, 'serial', b.serial_number,
          'replacement', b.is_replacement
        ) order by b.item_id, b.is_replacement, b.unit_id)
        from (
          select i.id as item_id, e.id as unit_id, i.product_name, i.variant_name, e.serial_number, false as is_replacement
          from public.order_items i left join public.ebike_units e on e.order_item_id = i.id and e.status = 'sold'
          where i.order_id = o.id and i.product_type = 'ebike'
          union all
          select r.item_id, r.unit_id, r.product_name, r.variant_name, r.serial_number, true
          from public.completed_warranty_replacement_units r
          where r.order_id = o.id and public.current_user_can_access_branch(r.branch_id)
        ) b
      ) end as bikes
    from public.orders o where o.customer_id = p_customer_id
      and public.current_user_has_permission('orders.read') and public.current_user_can_access_branch(o.branch_id)
    union all
    select a.id, 'Service', a.appointment_number, a.branch_name, a.status,
      coalesce(a.scheduled_at, a.preferred_start_at), null::jsonb
    from public.service_appointments a where a.customer_id = p_customer_id
      and public.current_user_has_permission('service_appointments.read') and public.current_user_can_access_branch(a.branch_id)
    union all
    select t.id, 'Chat', 'Support conversation', '', t.status, t.last_message_at, null::jsonb
    from public.support_chat_threads t where t.customer_user_id = p_customer_id
      and public.current_user_has_permission('support.chat.manage') and exists (
        select 1 from public.support_chat_messages m where m.thread_id = t.id and m.sender_role = 'customer'
      )
  ) activity
  where public.crm_can_access_customer(p_customer_id)
  order by activity.occurred_at desc, activity.id desc
  limit 50;
$$;

create or replace function public.link_service_warranty_unit(p_appointment_id uuid, p_serial text)
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
  select bike.unit_id, bike.order_id, bike.serial_number into strict v_unit_id, v_order_id, v_serial
  from public.service_appointments a
  cross join lateral (
    select e.id as unit_id, o.id as order_id, e.serial_number
    from public.orders o join public.order_items i on i.order_id = o.id
    join public.ebike_units e on e.order_item_id = i.id
    where o.customer_id = a.customer_id and o.status = 'completed'
      and i.product_type = 'ebike' and e.status = 'sold'
      and lower(btrim(e.serial_number)) = lower(btrim(p_serial))
    union all
    select r.unit_id, r.order_id, r.serial_number
    from public.completed_warranty_replacement_units r where r.customer_id = a.customer_id
      and lower(btrim(r.serial_number)) = lower(btrim(p_serial))
  ) bike
  where a.id = p_appointment_id and public.current_user_can_access_branch(a.branch_id);
  update public.service_warranty_cases set unit_id = v_unit_id, original_order_id = v_order_id, original_serial = v_serial
  where appointment_id = p_appointment_id and unit_id is null and replacement_serial is null
    and decision in ('under_review', 'further_review');
  if not found then raise exception 'This warranty assessment already has a verified bike or decision.'; end if;
exception when no_data_found or too_many_rows then
  raise exception 'The serial must match one completed purchase for this customer.';
end;
$$;

create or replace function public.review_service_warranty(p_appointment_id uuid, p_decision text, p_note text)
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
    and c.replacement_serial is null and (p_decision <> 'replacement_approved' or exists (
      select 1 from public.ebike_units e where e.id = c.unit_id and e.status = 'sold'
    ));
  if not found then raise exception 'The appointment is not eligible for that decision.'; end if;
end;
$$;

notify pgrst, 'reload schema';
