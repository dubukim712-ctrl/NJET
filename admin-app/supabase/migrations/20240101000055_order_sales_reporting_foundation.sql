alter table public.product_variants
  add column if not exists cost_minor integer;
alter table public.product_variants
  drop constraint if exists product_variants_cost_minor_check;
alter table public.product_variants
  add constraint product_variants_cost_minor_check
  check (cost_minor is null or cost_minor >= 0);

alter table public.order_items
  add column if not exists unit_cost_minor integer;
alter table public.order_items
  drop constraint if exists order_items_unit_cost_minor_check;
alter table public.order_items
  add constraint order_items_unit_cost_minor_check
  check (unit_cost_minor is null or unit_cost_minor >= 0);

alter table public.orders
  add column if not exists sales_agent_id uuid
  references public.users(id) on delete set null;

create index if not exists orders_report_created_idx
  on public.orders (created_at desc);
create index if not exists orders_report_branch_created_idx
  on public.orders (branch_id, created_at desc);
create index if not exists orders_report_agent_created_idx
  on public.orders (sales_agent_id, created_at desc);
create index if not exists order_items_order_idx
  on public.order_items (order_id);

create or replace function public.attribute_walk_in_sales_agent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.sales_agent_id := case
    when new.order_source = 'walk_in' then auth.uid()
    else null
  end;
  return new;
end;
$$;
revoke all on function public.attribute_walk_in_sales_agent()
  from public, anon, authenticated;

drop trigger if exists orders_attribute_walk_in_sales_agent on public.orders;
create trigger orders_attribute_walk_in_sales_agent
  before insert on public.orders
  for each row execute function public.attribute_walk_in_sales_agent();

create or replace function public.snapshot_order_item_cost()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select v.cost_minor
  into new.unit_cost_minor
  from public.product_variants v
  where v.id = new.variant_id;
  return new;
end;
$$;
revoke all on function public.snapshot_order_item_cost()
  from public, anon, authenticated;

drop trigger if exists order_items_snapshot_cost on public.order_items;
create trigger order_items_snapshot_cost
  before insert on public.order_items
  for each row execute function public.snapshot_order_item_cost();

create table public.order_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  transaction_type text not null
    check (transaction_type in ('collection', 'refund', 'financing')),
  payment_method text not null
    check (payment_method in ('cash', 'online', 'home_credit', 'other')),
  payment_provider text
    check (payment_provider is null or payment_provider in ('gcash', 'bank_transfer', 'card')),
  amount_minor integer not null check (amount_minor > 0),
  is_downpayment boolean not null default false,
  reference text check (reference is null or length(reference) <= 120),
  note text check (note is null or length(note) <= 500),
  source_event text,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint order_payment_transactions_provider_check check (
    (payment_method = 'online' and payment_provider is not null)
    or (payment_method <> 'online' and payment_provider is null)
  ),
  constraint order_payment_transactions_financing_check check (
    transaction_type <> 'financing' or payment_method = 'home_credit'
  ),
  unique (order_id, source_event)
);

create index order_payment_transactions_order_created_idx
  on public.order_payment_transactions (order_id, created_at desc);
create index order_payment_transactions_created_idx
  on public.order_payment_transactions (created_at desc);

alter table public.order_payment_transactions enable row level security;
revoke all on public.order_payment_transactions from public, anon, authenticated;
grant select on public.order_payment_transactions to authenticated;

create policy order_payment_transactions_read
  on public.order_payment_transactions
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_payment_transactions.order_id
        and (
          public.current_user_has_permission('orders.read')
          or public.current_user_has_permission('orders.manage')
        )
        and public.current_user_can_access_branch(o.branch_id)
    )
  );

create or replace function public.record_order_sales_payment_events()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_downpayment integer;
begin
  if old.status is distinct from new.status and new.status = 'confirmed' then
    if new.payment_method = 'online' and new.online_due_minor > 0 then
      insert into public.order_payment_transactions (
        order_id, transaction_type, payment_method, payment_provider,
        amount_minor, is_downpayment, reference, source_event, recorded_by
      ) values (
        new.id, 'collection', 'online', new.payment_provider,
        new.online_due_minor, false, new.payment_reference,
        'verified_order_payment', new.confirmed_by
      )
      on conflict (order_id, source_event) do nothing;
    elsif new.payment_method = 'home_credit'
      and new.home_credit_downpayment_due_minor > 0 then
      insert into public.order_payment_transactions (
        order_id, transaction_type, payment_method, payment_provider,
        amount_minor, is_downpayment, reference, source_event, recorded_by
      ) values (
        new.id, 'collection', 'online', new.payment_provider,
        new.home_credit_downpayment_due_minor, true, new.payment_reference,
        'verified_order_payment', new.confirmed_by
      )
      on conflict (order_id, source_event) do nothing;
    end if;
  end if;

  if old.status is distinct from new.status and new.status = 'completed' then
    if new.order_source = 'walk_in'
      and new.payment_method in ('cash', 'online') then
      insert into public.order_payment_transactions (
        order_id, transaction_type, payment_method, payment_provider,
        amount_minor, reference, source_event, recorded_by
      ) values (
        new.id, 'collection', new.payment_method, new.payment_provider,
        new.total_minor, new.payment_reference,
        'walk_in_sale', auth.uid()
      )
      on conflict (order_id, source_event) do nothing;
    elsif new.payment_method = 'home_credit' then
      select d.downpayment_minor
      into v_downpayment
      from public.order_home_credit_details d
      where d.order_id = new.id;

      if v_downpayment is not null then
        if new.order_source = 'walk_in' and v_downpayment > 0 then
          insert into public.order_payment_transactions (
            order_id, transaction_type, payment_method, amount_minor,
            is_downpayment, note, source_event, recorded_by
          ) values (
            new.id, 'collection', 'other', v_downpayment,
            true,
            'Home Credit downpayment; collection method was not recorded.',
            'home_credit_downpayment', auth.uid()
          )
          on conflict (order_id, source_event) do nothing;
        end if;

        if new.total_minor > v_downpayment then
          insert into public.order_payment_transactions (
            order_id, transaction_type, payment_method, amount_minor,
            source_event, recorded_by
          ) values (
            new.id, 'financing', 'home_credit',
            new.total_minor - v_downpayment,
            'home_credit_financed', auth.uid()
          )
          on conflict (order_id, source_event) do nothing;
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.record_order_sales_payment_events()
  from public, anon, authenticated;

drop trigger if exists orders_record_sales_payment_events on public.orders;
create trigger orders_record_sales_payment_events
  after update of status on public.orders
  for each row execute function public.record_order_sales_payment_events();

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

  if p_transaction_type is null
    or p_transaction_type not in ('collection', 'refund')
    or p_payment_method is null
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
  if v_order.status in ('cancelled', 'expired')
    and p_transaction_type = 'collection' then
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

  if p_transaction_type = 'refund' and p_amount_minor > v_net_paid then
    raise exception 'A refund cannot exceed the recorded payments.';
  end if;
  if p_transaction_type = 'refund' and p_is_downpayment and p_amount_minor > (
    select coalesce(sum(
      case when transaction_type = 'collection' then amount_minor else -amount_minor end
    ), 0)
    from public.order_payment_transactions
    where order_id = p_order_id and is_downpayment
  ) then
    raise exception 'A downpayment refund cannot exceed recorded downpayments.';
  end if;
  if p_transaction_type = 'collection'
    and p_amount_minor + v_net_paid > v_order.total_minor then
    raise exception 'Recorded payments cannot exceed the order total.';
  end if;

  insert into public.order_payment_transactions (
    order_id, transaction_type, payment_method, payment_provider,
    amount_minor, is_downpayment, reference, note, recorded_by
  ) values (
    p_order_id, p_transaction_type, p_payment_method, p_payment_provider,
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
