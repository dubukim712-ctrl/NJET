-- Restrict new manual transactions to collections. Historical refunds remain in the ledger.
create or replace function public.record_order_payment_transaction(
  p_order_id uuid,
  p_transaction_type text,
  p_payment_method text,
  p_payment_provider text,
  p_amount_minor integer,
  p_reference text,
  p_note text,
  p_is_downpayment boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_net_paid bigint;
  v_id uuid;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to record order payments.';
  end if;

  if p_transaction_type is distinct from 'collection' then
    raise exception 'Only collections can be recorded.';
  end if;

  if p_payment_method is null
    or p_payment_method not in ('cash', 'online', 'home_credit', 'other')
    or p_is_downpayment is null
    or p_amount_minor is null or p_amount_minor <= 0
    or (p_payment_method = 'online' and (
      p_payment_provider is null
      or p_payment_provider not in ('gcash', 'bank_transfer', 'card')
    ))
    or (p_payment_method <> 'online' and p_payment_provider is not null)
    or (p_reference is not null and length(p_reference) > 120)
    or (p_note is not null and length(p_note) > 500) then
    raise exception 'Enter valid payment details.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found or not public.current_user_can_access_branch(v_order.branch_id) then
    raise exception 'The selected order is unavailable.';
  end if;
  if v_order.status in ('cancelled', 'expired') then
    raise exception 'Collections cannot be recorded for cancelled or expired orders.';
  end if;
  if p_is_downpayment and v_order.payment_method <> 'home_credit' then
    raise exception 'Only Home Credit orders can have a downpayment transaction.';
  end if;

  select coalesce(sum(
    case
      when transaction_type = 'collection' then amount_minor
      when transaction_type = 'refund' then -amount_minor
      else 0
    end
  ), 0)
  into v_net_paid
  from public.order_payment_transactions
  where order_id = p_order_id;

  if p_amount_minor + v_net_paid > v_order.total_minor then
    raise exception 'Recorded payments cannot exceed the order total.';
  end if;

  insert into public.order_payment_transactions (
    order_id, transaction_type, payment_method, payment_provider,
    amount_minor, is_downpayment, reference, note, recorded_by
  ) values (
    p_order_id, 'collection', p_payment_method, p_payment_provider,
    p_amount_minor, p_is_downpayment, nullif(btrim(p_reference), ''),
    nullif(btrim(p_note), ''), auth.uid()
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_order_payment_transaction(
  uuid, text, text, text, integer, text, text, boolean
) from public, anon;
grant execute on function public.record_order_payment_transaction(
  uuid, text, text, text, integer, text, text, boolean
) to authenticated;

notify pgrst, 'reload schema';
