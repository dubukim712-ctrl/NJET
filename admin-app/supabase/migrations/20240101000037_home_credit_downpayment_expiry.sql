-- Require proof before confirming and expire unpaid Home Credit downpayments.

do $$
declare
  v_function text;
  v_old_old text := '''online_due_minor'', old.online_due_minor,';
  v_new_old text := E'''online_due_minor'', old.online_due_minor,\n      ''home_credit_downpayment_due_minor'', old.home_credit_downpayment_due_minor,';
  v_old_new text := '''online_due_minor'', new.online_due_minor,';
  v_new_new text := E'''online_due_minor'', new.online_due_minor,\n      ''home_credit_downpayment_due_minor'', new.home_credit_downpayment_due_minor,';
begin
  v_function := pg_get_functiondef(
    'public.log_commerce_order_audit_event()'::regprocedure
  );
  if position(v_old_old in v_function) > 0 then
    v_function := replace(v_function, v_old_old, v_new_old);
  elsif position(v_new_old in v_function) = 0 then
    raise exception 'Could not safely add Home Credit downpayment audit data.';
  end if;
  if position(v_old_new in v_function) > 0 then
    v_function := replace(v_function, v_old_new, v_new_new);
  elsif position(v_new_new in v_function) = 0 then
    raise exception 'Could not safely add Home Credit downpayment audit data.';
  end if;
  execute v_function;
end;
$$;

do $$
declare
  v_function text;
  v_old text := 'and v_order.payment_method = ''online'' and not exists (';
  v_new text := 'and (v_order.payment_method = ''online'' or (v_order.payment_method = ''home_credit'' and v_order.home_credit_downpayment_due_minor > 0)) and not exists (';
begin
  v_function := pg_get_functiondef(
    'public.confirm_commerce_order(uuid)'::regprocedure
  );
  if position(v_old in v_function) > 0 then
    v_function := replace(v_function, v_old, v_new);
  elsif position(v_new in v_function) = 0 then
    raise exception 'Could not safely require Home Credit downpayment proof.';
  end if;
  execute v_function;
end;
$$;

drop index if exists public.orders_unpaid_expiration_idx;
create index orders_unpaid_expiration_idx
  on public.orders (payment_expires_at)
  where status = 'awaiting_payment'
    and (
      payment_method = 'online'
      or (
        payment_method = 'home_credit'
        and home_credit_downpayment_due_minor > 0
      )
    );

create or replace function public.expire_unpaid_online_orders()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.orders
  set status = 'expired'
  where status = 'awaiting_payment'
    and payment_expires_at <= now()
    and (
      payment_method = 'online'
      or (
        payment_method = 'home_credit'
        and home_credit_downpayment_due_minor > 0
      )
    );
$$;
revoke all on function public.expire_unpaid_online_orders()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
