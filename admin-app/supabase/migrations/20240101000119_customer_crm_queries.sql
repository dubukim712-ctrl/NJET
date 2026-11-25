create function public.crm_customers(p_customer_id uuid, p_search text, p_offset integer)
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

create function public.crm_customer_activity(p_customer_id uuid)
returns table (id uuid, kind text, reference text, detail text, status text, occurred_at timestamptz, bikes jsonb)
language sql stable security definer set search_path = ''
as $$
  select activity.* from (
    select o.id, 'Order'::text as kind, o.order_number as reference, o.branch_name as detail,
      o.status, o.created_at as occurred_at,
      case when o.status = 'completed' then (
        select jsonb_agg(jsonb_build_object('name', i.product_name, 'variant', i.variant_name, 'serial', e.serial_number)
          order by i.id, e.id)
        from public.order_items i left join public.ebike_units e on e.order_item_id = i.id and e.status = 'sold'
        where i.order_id = o.id and i.product_type = 'ebike'
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

create function public.crm_staff_options()
returns table (id uuid, name text, branch_id uuid, branch_name text)
language sql stable security definer set search_path = ''
as $$
  select u.id, coalesce(nullif(btrim(u.full_name), ''), 'Staff member'), b.id, b.name
  from public.users u join public.roles r on r.id = u.role_id and r.scope = 'staff'
  join public.branches b on (r.is_full_access or b.id = u.branch_id)
  where b.active and public.current_user_has_permission('admin.access')
    and public.current_user_has_permission('crm.read') and public.crm_can_assign(u.id, b.id)
  order by b.name, 2, u.id;
$$;

revoke all on function public.crm_customers(uuid, text, integer), public.crm_customer_activity(uuid),
  public.crm_staff_options() from public, anon, authenticated;
grant execute on function public.crm_customers(uuid, text, integer), public.crm_customer_activity(uuid),
  public.crm_staff_options() to authenticated;

create function public.crm_notes(p_customer_id uuid)
returns table (id uuid, body text, created_at timestamptz, author text, branch_name text)
language sql stable security definer set search_path = ''
as $$
  select n.id, n.body, n.created_at, coalesce(u.full_name, 'Staff member'), b.name
  from public.crm_customer_notes n join public.branches b on b.id = n.branch_id
  left join public.users u on u.id = n.created_by
  where n.customer_id = p_customer_id and public.crm_can_access_customer(n.customer_id)
    and public.current_user_can_access_branch(n.branch_id)
  order by n.created_at desc, n.id desc
  limit 50;
$$;

create function public.crm_follow_up_queue(p_customer_id uuid, p_status text)
returns table (id uuid, customer_id uuid, customer_name text, next_action text, due_on date,
  status text, assignee_name text, branch_name text)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.customer_id, coalesce(c.full_name, 'Customer'), f.next_action, f.due_on,
    f.status, coalesce(u.full_name, 'Unassigned'), b.name
  from public.crm_follow_ups f join public.branches b on b.id = f.branch_id
  join public.users c on c.id = f.customer_id
  left join public.users u on u.id = f.assignee_id
  where (p_customer_id is null or f.customer_id = p_customer_id)
    and f.status = p_status and public.crm_can_access_customer(f.customer_id)
    and public.current_user_can_access_branch(f.branch_id)
  order by case when f.status = 'open' then f.due_on end asc,
    case when f.status = 'completed' then f.due_on end desc, f.id
  limit 50;
$$;

revoke all on function public.crm_notes(uuid), public.crm_follow_up_queue(uuid, text) from public, anon, authenticated;
grant execute on function public.crm_notes(uuid), public.crm_follow_up_queue(uuid, text) to authenticated;

notify pgrst, 'reload schema';
