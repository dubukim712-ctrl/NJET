create or replace function public.admin_order_sales_report_export(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_branch_id uuid,
  p_agent_id uuid,
  p_search text
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
    raise exception 'You are not allowed to export sales reports.';
  end if;
  if p_start_at is null or p_end_at is null
    or p_start_at >= p_end_at
    or p_end_at - p_start_at > interval '10 years'
    or length(coalesce(p_search, '')) > 120 then
    raise exception 'Choose valid report export filters.';
  end if;
  if p_branch_id is not null
    and not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You are not allowed to view this branch.';
  end if;

  return (
    with filtered_orders as materialized (
      select o.*
      from public.orders o
      where o.created_at >= p_start_at
        and o.created_at < p_end_at
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
    export_orders as (
      select *
      from filtered_orders
      order by created_at desc, id desc
      limit 5000
    ),
    export_rows as (
      select
        o.created_at,
        jsonb_build_object(
          'order_number', o.order_number,
          'invoice_no', invoice.invoice_no,
          'created_at', o.created_at,
          'customer_name', o.customer_name,
          'branch_name', o.branch_name,
          'sales_agent_name', coalesce(nullif(btrim(agent.full_name), ''), 'Unassigned'),
          'items', coalesce(items.description, ''),
          'payment_method', o.payment_method,
          'payment_provider', o.payment_provider,
          'total_minor', o.total_minor,
          'amount_paid_minor', coalesce(pay.collected_minor, 0) - coalesce(pay.refunded_minor, 0),
          'balance_due_minor', case
            when o.status in ('cancelled', 'expired') then 0
            else greatest(
              o.total_minor::bigint
                - coalesce(pay.collected_minor, 0)
                + coalesce(pay.refunded_minor, 0),
              0
            )
          end,
          'status', o.status
        ) as row_data
      from export_orders o
      left join public.users agent on agent.id = o.sales_agent_id
      left join lateral (
        select oi.invoice_no
        from public.order_invoices oi
        where oi.order_id = o.id
        order by oi.created_at desc
        limit 1
      ) invoice on true
      left join lateral (
        select string_agg(
          concat_ws(
            ' ', i.product_name, i.variant_name, 'x' || i.quantity,
            case when serials.value is not null then 'serial: ' || serials.value end
          ),
          '; ' order by i.created_at, i.id
        ) as description
        from public.order_items i
        left join lateral (
          select string_agg(u.serial_number, ', ' order by u.serial_number) as value
          from public.ebike_units u
          where u.order_item_id = i.id and u.serial_number is not null
        ) serials on true
        where i.order_id = o.id
      ) items on true
      left join lateral (
        select
          sum(t.amount_minor) filter (where t.transaction_type = 'collection') as collected_minor,
          sum(t.amount_minor) filter (where t.transaction_type = 'refund') as refunded_minor,
          sum(t.amount_minor) filter (where t.transaction_type = 'financing') as financed_minor
        from public.order_payment_transactions t
        where t.order_id = o.id
      ) pay on true
    )
    select jsonb_build_object(
      'total', (select count(*) from filtered_orders),
      'truncated', (select count(*) from filtered_orders) > 5000,
      'rows', coalesce((
        select jsonb_agg(row_data order by created_at desc)
        from export_rows
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_order_sales_report_export(
  timestamptz, timestamptz, uuid, uuid, text
) from public, anon;
grant execute on function public.admin_order_sales_report_export(
  timestamptz, timestamptz, uuid, uuid, text
) to authenticated;

notify pgrst, 'reload schema';
