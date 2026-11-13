insert into public.order_payment_transactions (
  order_id, transaction_type, payment_method, payment_provider,
  amount_minor, reference, source_event, recorded_by
)
select
  o.id, 'collection', 'online', o.payment_provider,
  o.online_due_minor, o.payment_reference,
  'verified_order_payment', o.confirmed_by
from public.orders o
where o.order_source = 'online'
  and o.status in ('confirmed', 'completed')
  and o.confirmed_at is not null
  and o.payment_method = 'online'
  and o.online_due_minor > 0
on conflict (order_id, source_event) do nothing;

insert into public.order_payment_transactions (
  order_id, transaction_type, payment_method, payment_provider,
  amount_minor, reference, source_event, recorded_by
)
select
  o.id, 'collection', o.payment_method, o.payment_provider,
  o.total_minor, o.payment_reference,
  'walk_in_sale', o.sales_agent_id
from public.orders o
where o.order_source = 'walk_in'
  and o.status = 'completed'
  and (
    (o.payment_method = 'cash' and o.cash_tendered_minor >= o.total_minor)
    or (
      o.payment_method = 'online'
      and o.payment_provider is not null
      and o.payment_reference is not null
    )
  )
on conflict (order_id, source_event) do nothing;

create or replace function public.complete_commerce_order_with_payment(
  p_order_id uuid,
  p_amount_minor integer,
  p_payment_method text,
  p_payment_provider text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_net_collected bigint;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to complete orders.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found or v_order.status <> 'confirmed'
    or v_order.order_source = 'walk_in'
    or v_order.payment_method = 'home_credit'
    or not public.current_user_can_access_branch(v_order.branch_id) then
    raise exception 'This order cannot be completed with a store payment.';
  end if;

  if p_amount_minor is null or p_amount_minor < 0
    or (p_reference is not null and length(p_reference) > 120)
    or (
      p_amount_minor = 0
      and (p_payment_method is not null or p_payment_provider is not null or p_reference is not null)
    )
    or (
      p_amount_minor > 0
      and (
        p_payment_method is null
        or p_payment_method not in ('cash', 'online', 'other')
        or (p_payment_method = 'online' and (
          p_payment_provider is null
          or p_payment_provider not in ('gcash', 'bank_transfer', 'card')
        ))
        or (p_payment_method <> 'online' and p_payment_provider is not null)
      )
    ) then
    raise exception 'Enter valid payment details.';
  end if;

  select coalesce(sum(
    case
      when transaction_type = 'collection' then amount_minor
      when transaction_type = 'refund' then -amount_minor
      else 0
    end
  ), 0)
  into v_net_collected
  from public.order_payment_transactions
  where order_id = p_order_id;

  if p_amount_minor > greatest(v_order.total_minor::bigint - v_net_collected, 0) then
    raise exception 'The collection exceeds the order balance.';
  end if;

  if p_amount_minor > 0 then
    insert into public.order_payment_transactions (
      order_id, transaction_type, payment_method, payment_provider,
      amount_minor, reference, recorded_by
    ) values (
      p_order_id, 'collection', p_payment_method, p_payment_provider,
      p_amount_minor, nullif(btrim(p_reference), ''), auth.uid()
    );
  end if;

  perform public.complete_commerce_order(p_order_id);
end;
$$;

revoke all on function public.complete_commerce_order_with_payment(
  uuid, integer, text, text, text
) from public, anon;
grant execute on function public.complete_commerce_order_with_payment(
  uuid, integer, text, text, text
) to authenticated;
revoke execute on function public.complete_commerce_order(uuid) from authenticated;

notify pgrst, 'reload schema';
