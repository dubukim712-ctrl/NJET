-- Audit catalog, stock movement, and order changes.
-- Run after 20240101000021_product_variant_specifications.sql.

create or replace function public.log_commerce_order_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_actor_id uuid := auth.uid();
  v_actor_email text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := jsonb_build_object(
      'id', old.id,
      'order_number', old.order_number,
      'status', old.status,
      'fulfillment', old.fulfillment,
      'branch_id', old.branch_id,
      'branch_name', old.branch_name,
      'delivery_zone_id', old.delivery_zone_id,
      'delivery_zone_name', old.delivery_zone_name,
      'payment_method', old.payment_method,
      'payment_provider', old.payment_provider,
      'total_minor', old.total_minor,
      'delivery_fee_minor', old.delivery_fee_minor,
      'reservation_due_minor', old.reservation_due_minor,
      'balance_due_minor', old.balance_due_minor,
      'online_due_minor', old.online_due_minor,
      'confirmed_by', old.confirmed_by,
      'confirmed_at', old.confirmed_at,
      'cancelled_by', old.cancelled_by,
      'cancelled_at', old.cancelled_at,
      'created_at', old.created_at,
      'updated_at', old.updated_at
    );
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new := jsonb_build_object(
      'id', new.id,
      'order_number', new.order_number,
      'status', new.status,
      'fulfillment', new.fulfillment,
      'branch_id', new.branch_id,
      'branch_name', new.branch_name,
      'delivery_zone_id', new.delivery_zone_id,
      'delivery_zone_name', new.delivery_zone_name,
      'payment_method', new.payment_method,
      'payment_provider', new.payment_provider,
      'total_minor', new.total_minor,
      'delivery_fee_minor', new.delivery_fee_minor,
      'reservation_due_minor', new.reservation_due_minor,
      'balance_due_minor', new.balance_due_minor,
      'online_due_minor', new.online_due_minor,
      'confirmed_by', new.confirmed_by,
      'confirmed_at', new.confirmed_at,
      'cancelled_by', new.cancelled_by,
      'cancelled_at', new.cancelled_at,
      'created_at', new.created_at,
      'updated_at', new.updated_at
    );
  end if;

  select email into v_actor_email
  from public.users
  where id = v_actor_id;

  insert into public.audit_logs (
    actor_id, actor_email, action, table_name, record_id, old_data, new_data
  )
  values (
    v_actor_id,
    v_actor_email,
    lower(tg_op),
    tg_table_name,
    coalesce(v_new->>'id', v_old->>'id'),
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_product_categories_changes on public.product_categories;
create trigger audit_product_categories_changes
  after insert or update or delete on public.product_categories
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_product_subcategories_changes on public.product_subcategories;
create trigger audit_product_subcategories_changes
  after insert or update or delete on public.product_subcategories
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_products_changes on public.products;
create trigger audit_products_changes
  after insert or update or delete on public.products
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_product_variants_changes on public.product_variants;
create trigger audit_product_variants_changes
  after insert or update or delete on public.product_variants
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_inventory_movements_changes on public.inventory_movements;
create trigger audit_inventory_movements_changes
  after insert or update or delete on public.inventory_movements
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_orders_changes on public.orders;
create trigger audit_orders_changes
  after insert or update or delete on public.orders
  for each row execute procedure public.log_commerce_order_audit_event();

drop trigger if exists audit_order_items_changes on public.order_items;
create trigger audit_order_items_changes
  after insert or update or delete on public.order_items
  for each row execute procedure public.log_audit_event();

revoke all on function public.log_commerce_order_audit_event()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
