create or replace function public.admin_order_sales_report_rows(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_branch_id uuid,
  p_agent_id uuid,
  p_search text,
  p_page integer,
  p_page_size integer
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
    raise exception 'You are not allowed to view sales report orders.';
  end if;
  if p_start_at is null or p_end_at is null
    or p_start_at >= p_end_at
    or p_end_at - p_start_at > interval '10 years'
    or p_page is null
    or p_page not between 1 and 10000
    or p_page_size is null
    or p_page_size not in (25, 50, 100)
    or length(coalesce(p_search, '')) > 120 then
    raise exception 'Choose valid report order filters.';
  end if;
  if p_branch_id is not null
    and not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You are not allowed to view this branch.';
  end if;

  return (
    with filtered_orders as materialized (
      select o.*
      from public.orders o
      where (
          (o.status = 'completed'
            and coalesce(o.completed_at, o.updated_at) >= p_start_at
            and coalesce(o.completed_at, o.updated_at) < p_end_at)
          or (o.status <> 'completed'
            and o.created_at >= p_start_at and o.created_at < p_end_at)
        )
        and (p_branch_id is null or o.branch_id = p_branch_id)
        and (p_agent_id is null or o.sales_agent_id = p_agent_id)
        and public.current_user_can_access_branch(o.branch_id)
        and (
          nullif(btrim(p_search), '') is null
          or position(lower(btrim(p_search)) in lower(
            concat_ws(' ', o.order_number, o.customer_name, o.contact_number)
          )) > 0
          or exists (
            select 1
            from public.order_items i
            where i.order_id = o.id
              and position(lower(btrim(p_search)) in lower(
                concat_ws(' ', i.product_name, i.variant_name, i.sku)
              )) > 0
          )
        )
    ),
    page_orders as (
      select *
      from filtered_orders
      order by case when status = 'completed'
        then coalesce(completed_at, updated_at) else created_at end desc, id desc
      offset ((p_page - 1) * p_page_size)
      limit p_page_size
    ),
    report_rows as (
      select
        case when o.status = 'completed'
          then coalesce(o.completed_at, o.updated_at) else o.created_at end as report_at,
        jsonb_build_object(
          'id', o.id,
          'order_number', o.order_number,
          'created_at', o.created_at,
          'completed_at', case when o.status = 'completed'
            then coalesce(o.completed_at, o.updated_at) else null end,
          'customer_name', o.customer_name,
          'contact_number', o.contact_number,
          'branch_name', o.branch_name,
          'sales_agent_id', o.sales_agent_id,
          'sales_agent_name', coalesce(nullif(btrim(agent.full_name), ''), 'Unassigned'),
          'order_source', o.order_source,
          'fulfillment', o.fulfillment,
          'status', o.status,
          'payment_method', o.payment_method,
          'payment_provider', o.payment_provider,
          'invoice_no', invoice.invoice_no,
          'total_minor', o.total_minor,
          'amount_paid_minor', coalesce(pay.collected_minor, 0) - coalesce(pay.refunded_minor, 0),
          'financed_minor', coalesce(pay.financed_minor, 0),
          'balance_due_minor', case
            when o.status in ('cancelled', 'expired') then 0
            else greatest(
              o.total_minor::bigint
                - coalesce(pay.collected_minor, 0)
                + coalesce(pay.refunded_minor, 0),
              0
            )
          end,
          'items', coalesce(items.data, '[]'::jsonb),
          'payments', coalesce(payments.data, '[]'::jsonb)
        ) as row_data
      from page_orders o
      left join public.users agent on agent.id = o.sales_agent_id
      left join lateral (
        select oi.invoice_no
        from public.order_invoices oi
        where oi.order_id = o.id
        order by oi.created_at desc
        limit 1
      ) invoice on true
      left join lateral (
        select
          sum(t.amount_minor) filter (where t.transaction_type = 'collection') as collected_minor,
          sum(t.amount_minor) filter (where t.transaction_type = 'refund') as refunded_minor,
          sum(t.amount_minor) filter (where t.transaction_type = 'financing') as financed_minor
        from public.order_payment_transactions t
        where t.order_id = o.id
      ) pay on true
      left join lateral (
        select jsonb_agg(jsonb_build_object(
          'product_name', i.product_name,
          'product_type', i.product_type,
          'variant_name', i.variant_name,
          'sku', i.sku,
          'quantity', i.quantity,
          'unit_price_minor', i.unit_price_minor,
          'has_cost_snapshot', i.unit_cost_minor is not null,
          'line_total_minor', i.unit_price_minor::bigint * i.quantity,
          'serial_numbers', coalesce((
            select jsonb_agg(u.serial_number order by u.serial_number)
            from public.ebike_units u
            where u.order_item_id = i.id and u.serial_number is not null
          ), '[]'::jsonb)
        ) order by i.created_at, i.id) as data
        from public.order_items i
        where i.order_id = o.id
      ) items on true
      left join lateral (
        select jsonb_agg(jsonb_build_object(
          'transaction_type', t.transaction_type,
          'payment_method', t.payment_method,
          'payment_provider', t.payment_provider,
          'is_downpayment', t.is_downpayment,
          'amount_minor', t.amount_minor,
          'reference', t.reference,
          'note', t.note,
          'created_at', t.created_at
        ) order by t.created_at, t.id) as data
        from public.order_payment_transactions t
        where t.order_id = o.id
      ) payments on true
    )
    select jsonb_build_object(
      'total', (select count(*) from filtered_orders),
      'rows', coalesce((
        select jsonb_agg(row_data order by report_at desc)
        from report_rows
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_order_sales_report_rows(
  timestamptz, timestamptz, uuid, uuid, text, integer, integer
) from public, anon;
grant execute on function public.admin_order_sales_report_rows(
  timestamptz, timestamptz, uuid, uuid, text, integer, integer
) to authenticated;

notify pgrst, 'reload schema';
