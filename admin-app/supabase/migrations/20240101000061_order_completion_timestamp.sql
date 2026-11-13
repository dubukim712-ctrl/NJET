alter table public.orders
  add column if not exists completed_at timestamptz;

-- Legacy completed orders use updated_at as their last status-change timestamp.
create index if not exists orders_report_completed_idx
  on public.orders ((coalesce(completed_at, updated_at)) desc)
  where status = 'completed';
create index if not exists orders_report_branch_completed_idx
  on public.orders (branch_id, (coalesce(completed_at, updated_at)) desc)
  where status = 'completed';
create index if not exists orders_report_agent_completed_idx
  on public.orders (sales_agent_id, (coalesce(completed_at, updated_at)) desc)
  where status = 'completed';

create or replace function public.complete_commerce_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to complete orders.';
  end if;
  update public.orders
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where id = p_order_id and status = 'confirmed';
  if not found then
    raise exception 'Only confirmed orders can be completed.';
  end if;
end;
$$;

notify pgrst, 'reload schema';
