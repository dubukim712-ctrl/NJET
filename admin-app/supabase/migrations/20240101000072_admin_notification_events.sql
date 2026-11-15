create or replace function public.notify_order_needing_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.order_source <> 'online'
    or new.status <> 'awaiting_confirmation' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.notifications (
    recipient_user_id, event_type, title, message, href,
    entity_type, entity_id, branch_id
  )
  select
    u.id,
    'new_order',
    'New online order',
    'Order ' || new.order_number || ' is waiting for confirmation.',
    '/admin/orders',
    'order',
    new.id,
    new.branch_id
  from public.users u
  join public.roles r on r.id = u.role_id
  where r.scope = 'staff'
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'admin.access'
      )
    )
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'orders.manage'
      )
    )
    and (
      r.is_full_access
      or (new.branch_id is not null and u.branch_id = new.branch_id)
    );
  return new;
end;
$$;

create trigger orders_notify_admins_needing_action
  after insert or update of status on public.orders
  for each row execute procedure public.notify_order_needing_action();

create or replace function public.notify_service_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (
    recipient_user_id, event_type, title, message, href,
    entity_type, entity_id, branch_id
  )
  select
    u.id,
    'service_request',
    'New service request',
    'Appointment ' || new.appointment_number || ' is waiting for review.',
    '/admin/appointments',
    'service_appointment',
    new.id,
    new.branch_id
  from public.users u
  join public.roles r on r.id = u.role_id
  where r.scope = 'staff'
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'admin.access'
      )
    )
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'service_appointments.manage'
      )
    )
    and (
      r.is_full_access
      or u.branch_id = new.branch_id
    );
  return new;
end;
$$;

create trigger service_appointments_notify_request
  after insert on public.service_appointments
  for each row
  when (new.status = 'requested')
  execute procedure public.notify_service_request();

create or replace function public.notify_assigned_technician()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (
    recipient_user_id, event_type, title, message, href,
    entity_type, entity_id, branch_id
  )
  select
    u.id,
    'technician_assignment',
    'New technician assignment',
    'Appointment ' || new.appointment_number || ' was assigned to you.',
    '/admin/my-tasks',
    'service_appointment',
    new.id,
    new.branch_id
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = new.assigned_technician_id
    and r.scope = 'staff'
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'admin.access'
      )
    )
    and (r.is_full_access or u.branch_id = new.branch_id)
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'service_appointments.work'
      )
    );
  return new;
end;
$$;

create trigger service_appointments_notify_technician
  after update of assigned_technician_id on public.service_appointments
  for each row
  when (
    new.assigned_technician_id is not null
    and new.assigned_technician_id is distinct from old.assigned_technician_id
  )
  execute procedure public.notify_assigned_technician();

create or replace function public.track_inventory_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_name text;
  v_variant_name text;
  v_branch_name text;
  v_event_type text;
  v_title text;
  v_message text;
begin
  if new.stock is not distinct from old.stock then
    return new;
  end if;

  if old.stock < 3 and new.stock >= 3 then
    update public.notifications
    set resolved_at = coalesce(resolved_at, timezone('utc'::text, now()))
    where entity_type = 'product_variant'
      and entity_id = new.variant_id
      and branch_id = new.branch_id
      and event_type in ('low_stock', 'out_of_stock')
      and resolved_at is null;
    return new;
  end if;

  if new.stock >= 3 then
    return new;
  end if;

  v_event_type := case when new.stock = 0 then 'out_of_stock' else 'low_stock' end;
  v_title := case when new.stock = 0 then 'Out of stock' else 'Low stock' end;

  if old.stock < 3 then
    select p.name, v.name, b.name
    into v_product_name, v_variant_name, v_branch_name
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.branches b on b.id = new.branch_id
    where v.id = new.variant_id;

    v_message := left(
      format('%s - %s has %s units at %s.', v_product_name, v_variant_name, new.stock, v_branch_name),
      280
    );
    update public.notifications
    set event_type = v_event_type,
        title = v_title,
        message = v_message
    where entity_type = 'product_variant'
      and entity_id = new.variant_id
      and branch_id = new.branch_id
      and event_type in ('low_stock', 'out_of_stock')
      and resolved_at is null;
    return new;
  end if;

  select p.name, v.name, b.name
  into v_product_name, v_variant_name, v_branch_name
  from public.product_variants v
  join public.products p on p.id = v.product_id
  join public.branches b on b.id = new.branch_id
  where v.id = new.variant_id;

  v_message := left(
    format('%s - %s has %s units at %s.', v_product_name, v_variant_name, new.stock, v_branch_name),
    280
  );
  insert into public.notifications (
    recipient_user_id, event_type, title, message, href,
    entity_type, entity_id, branch_id
  )
  select
    u.id,
    v_event_type,
    v_title,
    v_message,
    '/admin/inventory',
    'product_variant',
    new.variant_id,
    new.branch_id
  from public.users u
  join public.roles r on r.id = u.role_id
  where r.scope = 'staff'
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'admin.access'
      )
    )
    and (r.is_full_access or u.branch_id = new.branch_id)
    and (
      r.is_full_access
      or exists (
        select 1 from public.role_permissions rp
        where rp.role_id = r.id
          and rp.permission_key = 'products.manage'
      )
    );
  return new;
end;
$$;

create trigger branch_inventory_track_notifications
  after update of stock on public.branch_inventory
  for each row execute procedure public.track_inventory_notifications();

revoke all on function public.notify_order_needing_action() from public, anon, authenticated;
revoke all on function public.notify_service_request() from public, anon, authenticated;
revoke all on function public.notify_assigned_technician() from public, anon, authenticated;
revoke all on function public.track_inventory_notifications() from public, anon, authenticated;
