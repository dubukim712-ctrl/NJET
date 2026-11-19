create or replace function public.apply_product_discounts_to_order(
  p_order_id uuid,
  p_coupon_code text,
  p_channel text,
  p_cash_tendered_minor integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_discount record;
  v_coupon_id uuid;
  v_max_redemptions integer;
  v_redemption_count integer;
  v_normalized_phone text;
  v_subtotal bigint;
  v_total bigint;
  v_discount_total bigint;
  v_downpayment integer;
  v_coupon_applied boolean := false;
begin
  if p_channel not in ('storefront', 'walk_in') then
    raise exception 'Choose a valid sales channel.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.order_source <> (case p_channel
    when 'storefront' then 'online'
    else 'walk_in'
  end) then
    raise exception 'The order cannot receive this discount.';
  end if;

  if nullif(upper(btrim(p_coupon_code)), '') is not null then
    select d.id, d.max_redemptions
      into v_coupon_id, v_max_redemptions
    from public.product_discounts d
    where d.coupon_code = upper(btrim(p_coupon_code))
      and d.active
      and (d.starts_at is null or d.starts_at <= now())
      and (d.ends_at is null or d.ends_at > now())
    for update;
    if not found then
      raise exception 'This coupon code is invalid or inactive.';
    end if;
    select count(*) into v_redemption_count
    from public.product_discount_redemptions r
    where r.discount_id = v_coupon_id and r.status <> 'released';
    if v_max_redemptions is not null
      and v_redemption_count >= v_max_redemptions then
      raise exception 'This coupon has reached its redemption limit.';
    end if;
    v_normalized_phone := public.normalize_discount_phone(v_order.contact_number);
    if exists (
      select 1 from public.product_discount_redemptions r
      where r.discount_id = v_coupon_id and r.status <> 'released'
        and (
          (p_channel = 'storefront' and r.customer_id = v_order.customer_id)
          or (p_channel = 'walk_in' and r.normalized_phone = v_normalized_phone)
        )
    ) then
      raise exception 'This coupon has already been used by this customer.';
    end if;
  end if;

  for v_item in
    select * from public.order_items
    where order_id = p_order_id
    order by variant_id
    for update
  loop
    select * into v_discount
    from public.resolve_product_discount(v_item.variant_id, p_coupon_code);
    if found then
      if v_discount.discount_id = v_coupon_id then
        v_coupon_applied := true;
      end if;
      update public.order_items
      set regular_unit_price_minor = v_discount.list_price_minor,
        unit_price_minor = v_discount.unit_price_minor,
        discount_unit_minor = v_discount.discount_unit_minor,
        applied_discount_id = v_discount.discount_id,
        discount_name_snapshot = v_discount.discount_name,
        discount_code_snapshot = v_discount.discount_code
      where id = v_item.id;
    else
      update public.order_items
      set regular_unit_price_minor = v_item.unit_price_minor,
        discount_unit_minor = 0,
        applied_discount_id = null,
        discount_name_snapshot = null,
        discount_code_snapshot = null
      where id = v_item.id;
    end if;
  end loop;

  if v_coupon_id is not null and not v_coupon_applied then
    raise exception 'This coupon does not apply to the items in your order.';
  end if;

  select coalesce(sum(i.unit_price_minor::bigint * i.quantity), 0),
    coalesce(sum(i.discount_unit_minor::bigint * i.quantity), 0)
    into v_subtotal, v_discount_total
  from public.order_items i where i.order_id = p_order_id;
  v_total := v_subtotal + v_order.delivery_fee_minor;
  if v_total > 2147483647 then
    raise exception 'The discounted order total is too large to process.';
  end if;

  if v_order.order_source = 'walk_in'
    and v_order.payment_method = 'cash'
    and (p_cash_tendered_minor is null or p_cash_tendered_minor < v_total) then
    raise exception 'Cash tendered must cover the discounted sale total.';
  end if;
  if v_order.payment_method = 'home_credit' then
    if v_order.order_source = 'online' then
      v_downpayment := v_order.home_credit_downpayment_due_minor;
    else
      select d.downpayment_minor into v_downpayment
      from public.order_home_credit_details d
      where d.order_id = p_order_id;
    end if;
    if coalesce(v_downpayment, 0) > v_total then
      raise exception 'The discount cannot reduce the total below the Home Credit downpayment.';
    end if;
  end if;
  if v_order.reservation_due_minor > v_total then
    raise exception 'The discount cannot reduce the total below the reservation amount.';
  end if;

  update public.orders
  set total_minor = v_total::integer,
    discount_total_minor = v_discount_total::integer,
    applied_coupon_code = nullif(upper(btrim(p_coupon_code)), ''),
    cash_tendered_minor = case
      when order_source = 'walk_in' and payment_method = 'cash'
        then p_cash_tendered_minor
      else cash_tendered_minor
    end,
    online_due_minor = case
      when order_source = 'online' and payment_method = 'online'
        then least(online_due_minor, v_total)::integer
      else online_due_minor
    end,
    balance_due_minor = case
      when order_source = 'online' and payment_method = 'online'
        then (v_total - least(online_due_minor, v_total))::integer
      when order_source = 'online' and payment_method = 'home_credit'
        then (v_total - home_credit_downpayment_due_minor
          - reservation_due_minor)::integer
      when order_source = 'walk_in' and payment_method = 'home_credit'
        then (v_total - reservation_due_minor)::integer
      when order_source = 'online'
        then (v_total - reservation_due_minor)::integer
      else balance_due_minor
    end
  where id = p_order_id;

  if v_order.order_source = 'walk_in' then
    update public.order_payment_transactions
    set amount_minor = v_total::integer
    where order_id = p_order_id and source_event = 'walk_in_sale';
    if v_order.payment_method = 'home_credit' then
      select d.downpayment_minor into v_downpayment
      from public.order_home_credit_details d
      where d.order_id = p_order_id;
      if v_total > v_downpayment then
        update public.order_payment_transactions
        set amount_minor = (v_total - v_downpayment)::integer
        where order_id = p_order_id and source_event = 'home_credit_financed';
      else
        delete from public.order_payment_transactions
        where order_id = p_order_id and source_event = 'home_credit_financed';
      end if;
    end if;
  end if;

  if v_coupon_id is not null then
    insert into public.product_discount_redemptions (
      discount_id, order_id, customer_id, normalized_phone, status
    ) values (
      v_coupon_id, p_order_id,
      case when p_channel = 'storefront' then v_order.customer_id else null end,
      case when p_channel = 'walk_in' then v_normalized_phone else null end,
      case when v_order.status in ('confirmed', 'completed') then 'redeemed' else 'reserved' end
    );
  end if;
end;
$$;

create or replace function public.update_product_discount_redemption_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status then
    if new.status in ('cancelled', 'expired') then
      update public.product_discount_redemptions
      set status = 'released', released_at = now()
      where order_id = new.id and status <> 'released';
    elsif new.status in ('confirmed', 'completed') then
      update public.product_discount_redemptions
      set status = 'redeemed'
      where order_id = new.id and status = 'reserved';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_discount_redemption_status on public.orders;
create trigger orders_discount_redemption_status
  after update of status on public.orders
  for each row execute function public.update_product_discount_redemption_status();

revoke all on function public.apply_product_discounts_to_order(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.update_product_discount_redemption_status()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
