-- Keep financing identifiers separate from customer-readable order data.

create table if not exists public.order_home_credit_details (
  order_id uuid primary key references public.orders(id) on delete cascade,
  home_credit_acc_no text not null
    check (length(btrim(home_credit_acc_no)) between 1 and 80),
  downpayment_minor integer not null check (downpayment_minor >= 0),
  terms_months integer not null check (terms_months between 1 and 120),
  monthly_payment_minor integer not null check (monthly_payment_minor >= 0),
  recorded_by uuid,
  created_at timestamptz not null default now()
);

alter table public.order_home_credit_details enable row level security;
revoke all on public.order_home_credit_details from public, anon, authenticated;
grant select on public.order_home_credit_details to authenticated;

drop policy if exists order_home_credit_details_read
  on public.order_home_credit_details;
create policy order_home_credit_details_read
  on public.order_home_credit_details
  for select to authenticated
  using (
    public.current_user_has_permission('orders.manage')
    and exists (
      select 1
      from public.orders o
      where o.id = order_home_credit_details.order_id
        and o.payment_method = 'home_credit'
        and public.current_user_can_access_branch(o.branch_id)
    )
  );

create or replace function public.record_home_credit_order_details()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_no text := nullif(btrim(current_setting('app.home_credit_account_no', true)), '');
  v_downpayment integer := nullif(current_setting('app.home_credit_downpayment_minor', true), '')::integer;
  v_terms integer := nullif(current_setting('app.home_credit_terms_months', true), '')::integer;
  v_monthly_payment integer := nullif(current_setting('app.home_credit_monthly_payment_minor', true), '')::integer;
begin
  if old.status is distinct from new.status
    and new.status = 'completed'
    and new.payment_method = 'home_credit' then
    if v_account_no is null
      or length(v_account_no) > 80
      or v_account_no ~ '[[:cntrl:]]'
      or v_downpayment is null
      or v_downpayment < 0
      or v_downpayment > new.total_minor
      or v_terms is null
      or v_terms not between 1 and 120
      or v_monthly_payment is null
      or v_monthly_payment < 0
      or (v_downpayment < new.total_minor and v_monthly_payment = 0) then
      raise exception 'Enter valid Home Credit account and financing details before completing the order.';
    end if;

    insert into public.order_home_credit_details (
      order_id, home_credit_acc_no, downpayment_minor, terms_months,
      monthly_payment_minor, recorded_by
    ) values (
      new.id, v_account_no, v_downpayment, v_terms, v_monthly_payment, auth.uid()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.record_home_credit_order_details()
  from public, anon, authenticated;

drop trigger if exists orders_home_credit_details_before_completion
  on public.orders;
create trigger orders_home_credit_details_before_completion
  before update of status on public.orders
  for each row execute function public.record_home_credit_order_details();

create or replace function public.complete_commerce_order_with_home_credit(
  p_order_id uuid,
  p_home_credit_acc_no text,
  p_downpayment_minor integer,
  p_terms_months integer,
  p_monthly_payment_minor integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to complete orders.';
  end if;
  select * into v_order from public.orders
  where id = p_order_id
  for update;
  if not found or v_order.status <> 'confirmed'
    or v_order.payment_method <> 'home_credit' then
    raise exception 'Only confirmed Home Credit orders can be completed here.';
  end if;

  perform set_config('app.home_credit_account_no', coalesce(p_home_credit_acc_no, ''), true);
  perform set_config('app.home_credit_downpayment_minor', coalesce(p_downpayment_minor::text, ''), true);
  perform set_config('app.home_credit_terms_months', coalesce(p_terms_months::text, ''), true);
  perform set_config('app.home_credit_monthly_payment_minor', coalesce(p_monthly_payment_minor::text, ''), true);
  perform public.complete_commerce_order(p_order_id);
end;
$$;
revoke all on function public.complete_commerce_order_with_home_credit(uuid, text, integer, integer, integer)
  from public, anon;
grant execute on function public.complete_commerce_order_with_home_credit(uuid, text, integer, integer, integer)
  to authenticated;

create or replace function public.create_walk_in_home_credit_sale(
  p_customer_name text,
  p_contact_number text,
  p_branch_id uuid,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_items jsonb,
  p_home_credit_acc_no text,
  p_downpayment_minor integer,
  p_terms_months integer,
  p_monthly_payment_minor integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
    or not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to create walk-in sales.';
  end if;

  perform set_config('app.home_credit_account_no', coalesce(p_home_credit_acc_no, ''), true);
  perform set_config('app.home_credit_downpayment_minor', coalesce(p_downpayment_minor::text, ''), true);
  perform set_config('app.home_credit_terms_months', coalesce(p_terms_months::text, ''), true);
  perform set_config('app.home_credit_monthly_payment_minor', coalesce(p_monthly_payment_minor::text, ''), true);
  return public.create_walk_in_sale(
    p_customer_name => p_customer_name,
    p_contact_number => p_contact_number,
    p_branch_id => p_branch_id,
    p_payment_method => 'home_credit',
    p_payment_provider => null,
    p_payment_reference => null,
    p_cash_tendered_minor => null,
    p_address_line1 => p_address_line1,
    p_barangay => p_barangay,
    p_city => p_city,
    p_province => p_province,
    p_postal_code => p_postal_code,
    p_items => p_items
  );
end;
$$;
revoke all on function public.create_walk_in_home_credit_sale(text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer)
  from public, anon;
grant execute on function public.create_walk_in_home_credit_sale(text, text, uuid, text, text, text, text, text, jsonb, text, integer, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';
