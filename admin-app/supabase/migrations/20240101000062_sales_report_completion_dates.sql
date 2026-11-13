create or replace function public.admin_order_sales_report(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_compare_start_at timestamptz,
  p_compare_end_at timestamptz,
  p_branch_id uuid,
  p_agent_id uuid,
  p_granularity text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
    or not (
      public.current_user_has_permission('orders.read')
      or public.current_user_has_permission('orders.manage')
    ) then
    raise exception 'You are not allowed to view sales reports.';
  end if;
  if p_start_at is null or p_end_at is null
    or p_compare_start_at is null or p_compare_end_at is null
    or p_start_at >= p_end_at
    or p_compare_start_at >= p_compare_end_at
    or p_end_at - p_start_at > interval '10 years'
    or p_compare_end_at - p_compare_start_at > interval '10 years'
    or (p_start_at < p_compare_end_at and p_compare_start_at < p_end_at)
    or p_granularity is null
    or p_granularity not in ('hour', 'day', 'month') then
    raise exception 'Choose valid report periods.';
  end if;
  if p_branch_id is not null
    and not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You are not allowed to view this branch.';
  end if;

  return (
    with periods as (
      select 'current'::text as period, p_start_at as starts_at, p_end_at as ends_at
      union all
      select 'comparison', p_compare_start_at, p_compare_end_at
    ),
    report_orders as (
      select
        pr.period, o.id, o.completed_at, o.created_at, o.updated_at, o.status, o.total_minor,
        o.payment_method,
        coalesce(pay.collected_minor, 0)::bigint as collected_minor,
        coalesce(pay.refunded_minor, 0)::bigint as refunded_minor,
        coalesce(pay.financed_minor, 0)::bigint as financed_minor
      from periods pr
      join public.orders o
        on (
          (o.status = 'completed'
            and coalesce(o.completed_at, o.updated_at) >= pr.starts_at
            and coalesce(o.completed_at, o.updated_at) < pr.ends_at)
          or (o.status <> 'completed'
            and o.created_at >= pr.starts_at and o.created_at < pr.ends_at)
        )
      left join lateral (
        select
          sum(t.amount_minor) filter (where t.transaction_type = 'collection') as collected_minor,
          sum(t.amount_minor) filter (where t.transaction_type = 'refund') as refunded_minor,
          sum(t.amount_minor) filter (where t.transaction_type = 'financing') as financed_minor
        from public.order_payment_transactions t
        where t.order_id = o.id
      ) pay on true
      where (p_branch_id is null or o.branch_id = p_branch_id)
        and (p_agent_id is null or o.sales_agent_id = p_agent_id)
        and public.current_user_can_access_branch(o.branch_id)
    ),
    payment_events as (
      select
        pr.period, t.transaction_type, t.payment_method, t.payment_provider,
        t.is_downpayment, t.amount_minor, t.created_at
      from periods pr
      join public.order_payment_transactions t
        on t.created_at >= pr.starts_at and t.created_at < pr.ends_at
      join public.orders o on o.id = t.order_id
      where (p_branch_id is null or o.branch_id = p_branch_id)
        and (p_agent_id is null or o.sales_agent_id = p_agent_id)
        and public.current_user_can_access_branch(o.branch_id)
    ),
    period_totals as (
      select
        period,
        coalesce(sum(total_minor::bigint)
          filter (where status = 'completed'), 0) as completed_sales_minor,
        coalesce(sum(case when status not in ('cancelled', 'expired')
          then greatest(total_minor::bigint - collected_minor + refunded_minor, 0)
          else 0 end), 0) as pending_receivables_minor
      from report_orders
      group by period
    ),
    payment_totals as (
      select
        period,
        greatest(coalesce(sum(case
          when transaction_type = 'collection' and is_downpayment then amount_minor
          when transaction_type = 'refund' and is_downpayment then -amount_minor
          else 0
        end), 0), 0) as collected_downpayments_minor,
        coalesce(sum(amount_minor) filter (where transaction_type = 'refund'), 0)
          as refunded_minor
      from payment_events
      group by period
    ),
    item_rows as (
      select
        o.period, i.product_type, i.product_name, i.variant_name, i.sku,
        i.quantity, i.unit_price_minor::bigint * i.quantity as revenue_minor,
        i.unit_cost_minor
      from report_orders o
      join public.order_items i on i.order_id = o.id
      where o.status = 'completed'
    ),
    item_totals as (
      select
        period,
        coalesce(sum(quantity) filter (where product_type = 'ebike'), 0) as ebikes_sold,
        count(*) filter (where unit_cost_minor is null) as missing_cost_items,
        coalesce(sum(revenue_minor), 0) as item_revenue_minor,
        coalesce(sum(unit_cost_minor::bigint * quantity), 0) as item_cost_minor
      from item_rows
      group by period
    ),
    refund_totals as (
      select period, coalesce(sum(refunded_minor), 0) as refunded_minor
      from report_orders
      where status = 'completed'
      group by period
    ),
    metrics as (
      select
        pr.period,
        coalesce(pt.completed_sales_minor, 0) - coalesce(pay.refunded_minor, 0)
          as net_sales_minor,
        coalesce(it.ebikes_sold, 0) as ebikes_sold,
        case
          when coalesce(it.missing_cost_items, 0) > 0
            or coalesce(rt.refunded_minor, 0) > 0 then null
          else coalesce(it.item_revenue_minor, 0)
            - coalesce(it.item_cost_minor, 0)
        end as gross_profit_minor,
        coalesce(it.missing_cost_items, 0) as missing_cost_items,
        coalesce(pay.collected_downpayments_minor, 0) as collected_downpayments_minor,
        coalesce(pt.pending_receivables_minor, 0) as pending_receivables_minor
      from periods pr
      left join period_totals pt on pt.period = pr.period
      left join item_totals it on it.period = pr.period
      left join refund_totals rt on rt.period = pr.period
      left join payment_totals pay on pay.period = pr.period
    ),
    trend_events as (
      select
        date_trunc(
          p_granularity,
          coalesce(o.completed_at, o.updated_at) at time zone 'Asia/Manila'
        ) as bucket, o.total_minor::bigint as amount_minor
      from report_orders o
      where o.period = 'current' and o.status = 'completed'
      union all
      select
        date_trunc(p_granularity, t.created_at at time zone 'Asia/Manila'),
        -(t.amount_minor::bigint)
      from payment_events t
      where t.period = 'current' and t.transaction_type = 'refund'
    ),
    trend as (
      select bucket, sum(amount_minor) as amount_minor
      from trend_events
      group by 1
    ),
    categories as (
      select product_type, sum(quantity) as quantity, sum(revenue_minor) as revenue_minor
      from item_rows
      where period = 'current'
      group by product_type
    ),
    models as (
      select
        product_name, variant_name, sku,
        sum(quantity) as quantity, sum(revenue_minor) as revenue_minor
      from item_rows
      where period = 'current' and product_type = 'ebike'
      group by product_name, variant_name, sku
      order by sum(quantity) desc, sum(revenue_minor) desc
      limit 5
    ),
    payment_breakdown as (
      select
        transaction_type, payment_method, payment_provider, is_downpayment,
        sum(case when transaction_type = 'refund'
          then -amount_minor else amount_minor end) as amount_minor
      from payment_events
      where period = 'current'
      group by transaction_type, payment_method, payment_provider, is_downpayment
    )
    select jsonb_build_object(
      'current', (
        select to_jsonb(m) - 'period' from metrics m where m.period = 'current'
      ),
      'comparison', (
        select to_jsonb(m) - 'period' from metrics m where m.period = 'comparison'
      ),
      'sales_trend', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket', to_char(bucket, 'YYYY-MM-DD"T"HH24:MI:SS'),
          'amount_minor', amount_minor
        ) order by bucket)
        from trend
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(jsonb_build_object(
          'product_type', product_type,
          'quantity', quantity,
          'revenue_minor', revenue_minor
        ) order by product_type)
        from categories
      ), '[]'::jsonb),
      'top_models', coalesce((
        select jsonb_agg(jsonb_build_object(
          'product_name', product_name,
          'variant_name', variant_name,
          'sku', sku,
          'quantity', quantity,
          'revenue_minor', revenue_minor
        ) order by quantity desc, revenue_minor desc)
        from models
      ), '[]'::jsonb),
      'payment_breakdown', coalesce((
        select jsonb_agg(jsonb_build_object(
          'transaction_type', transaction_type,
          'payment_method', payment_method,
          'payment_provider', payment_provider,
          'is_downpayment', is_downpayment,
          'amount_minor', amount_minor
        ) order by transaction_type, payment_method, payment_provider, is_downpayment)
        from payment_breakdown
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_order_sales_report(
  timestamptz, timestamptz, timestamptz, timestamptz, uuid, uuid, text
) from public, anon;
grant execute on function public.admin_order_sales_report(
  timestamptz, timestamptz, timestamptz, timestamptz, uuid, uuid, text
) to authenticated;

notify pgrst, 'reload schema';
