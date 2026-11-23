create role anon;
create role authenticated;
create schema auth;

create function auth.uid() returns uuid
language sql stable
as $$ select current_setting('test.actor_id', true)::uuid $$;

create function public.current_user_has_permission(permission text) returns boolean
language sql stable
as $$
  select permission = 'orders.manage'
    and current_setting('test.can_manage_orders', true) = 'true'
$$;

create function public.current_user_can_access_branch(branch_id uuid) returns boolean
language sql stable
as $$ select branch_id is not null $$;

create table public.orders (
  id uuid primary key,
  branch_id uuid not null,
  order_source text not null default 'online',
  status text not null,
  payment_method text not null default 'cash',
  total_minor integer not null,
  payment_provider text,
  payment_reference text,
  online_due_minor integer not null default 0,
  confirmed_by uuid,
  confirmed_at timestamptz,
  cash_tendered_minor integer,
  sales_agent_id uuid
);

create table public.order_payment_transactions (
  order_id uuid not null references public.orders(id),
  transaction_type text not null,
  payment_method text not null,
  payment_provider text,
  amount_minor integer not null,
  reference text,
  source_event text,
  recorded_by uuid,
  unique (order_id, source_event)
);

-- The migration under test validates payment before calling base completion.
create function public.complete_commerce_order(order_id uuid) returns void
language sql
as $$ update public.orders set status = 'completed' where id = order_id $$;
