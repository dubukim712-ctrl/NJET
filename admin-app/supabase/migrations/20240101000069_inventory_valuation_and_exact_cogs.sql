-- Manager-only inventory values and receipt-cost-aware sales COGS.
create or replace function public.admin_inventory_valuation(
  p_branch_id uuid,
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
    or not public.current_user_has_permission('products.manage') then
    raise exception 'You are not allowed to view inventory costs.';
  end if;
  if p_branch_id is not null
    and not public.current_user_can_access_branch(p_branch_id) then
    raise exception 'You are not allowed to view this branch.';
  end if;
  if p_page is null or p_page not between 1 and 10000
    or p_page_size is null or p_page_size not in (25, 50, 100) then
    raise exception 'Choose a valid inventory report page.';
  end if;

  return jsonb_build_object(
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.name)
      from public.branches b
      where b.active and public.current_user_can_access_branch(b.id)
    ), '[]'::jsonb),
    'page', p_page,
    'page_size', p_page_size,
    'result', (
      with inventory as materialized (
        select
          stock.branch_id,
          branch.name as branch_name,
          product.name as product_name,
          product.product_type,
          variant.id as variant_id,
          variant.name as variant_name,
          variant.sku,
          stock.stock as quantity_on_hand,
          case when product.product_type = 'ebike'
            then units.known_quantity else batches.known_quantity end as known_cost_quantity,
          case when product.product_type = 'ebike'
            then units.unknown_quantity else batches.unknown_quantity end as unknown_cost_quantity,
          case when product.product_type = 'ebike'
            then units.known_value_minor else batches.known_value_minor end as known_value_minor
        from public.branch_inventory stock
        join public.branches branch on branch.id = stock.branch_id
        join public.product_variants variant on variant.id = stock.variant_id
        join public.products product on product.id = variant.product_id
        left join lateral (
          select
            count(*) filter (where unit.unit_cost_minor is not null)::integer as known_quantity,
            count(*) filter (where unit.unit_cost_minor is null)::integer as unknown_quantity,
            coalesce(sum(unit.unit_cost_minor::bigint), 0) as known_value_minor
          from public.ebike_units unit
          where unit.branch_id = stock.branch_id and unit.variant_id = stock.variant_id
            and unit.status in ('in_stock', 'needs_identification')
        ) units on true
        left join lateral (
          select
            coalesce(sum(batch.quantity_remaining)
              filter (where batch.unit_cost_minor is not null), 0)::integer as known_quantity,
            coalesce(sum(batch.quantity_remaining)
              filter (where batch.unit_cost_minor is null), 0)::integer as unknown_quantity,
            coalesce(sum(batch.quantity_remaining::bigint * batch.unit_cost_minor), 0)
              as known_value_minor
          from public.inventory_stock_batches batch
          where batch.branch_id = stock.branch_id and batch.variant_id = stock.variant_id
            and batch.quantity_remaining > 0 and not batch.is_in_transit
        ) batches on true
        where stock.stock > 0
          and (p_branch_id is null or stock.branch_id = p_branch_id)
          and public.current_user_can_access_branch(stock.branch_id)
      )
      select jsonb_build_object(
        'total', (select count(*) from inventory),
        'summary', (
          select jsonb_build_object(
            'known_value_minor', coalesce(sum(known_value_minor), 0)::text,
            'unknown_cost_quantity', coalesce(sum(unknown_cost_quantity), 0)
          )
          from inventory
        ),
        'rows', coalesce((
          select jsonb_agg(jsonb_build_object(
            'branch_id', page.branch_id,
            'branch_name', page.branch_name,
            'product_name', page.product_name,
            'product_type', page.product_type,
            'variant_id', page.variant_id,
            'variant_name', page.variant_name,
            'sku', page.sku,
            'quantity_on_hand', page.quantity_on_hand,
            'known_cost_quantity', page.known_cost_quantity,
            'unknown_cost_quantity', page.unknown_cost_quantity,
            'known_value_minor', page.known_value_minor::text
          ) order by page.branch_name, page.product_name, page.variant_name)
          from (
            select * from inventory
            order by branch_name, product_name, variant_name, variant_id
            offset ((p_page - 1) * p_page_size)
            limit p_page_size
          ) page
        ), '[]'::jsonb)
      )
    )
  );
end;
$$;

revoke all on function public.admin_inventory_valuation(uuid, integer, integer)
  from public, anon;
grant execute on function public.admin_inventory_valuation(uuid, integer, integer)
  to authenticated;

alter function public.admin_order_sales_report(
  timestamptz, timestamptz, timestamptz, timestamptz, uuid, uuid, text
) rename to admin_order_sales_report_legacy_costs;
revoke all on function public.admin_order_sales_report_legacy_costs(
  timestamptz, timestamptz, timestamptz, timestamptz, uuid, uuid, text
) from public, anon, authenticated;

create function public.admin_order_sales_report(
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
declare
  v_report jsonb;
  v_period record;
  v_revenue bigint;
  v_cost bigint;
  v_missing bigint;
begin
  v_report := public.admin_order_sales_report_legacy_costs(
    p_start_at, p_end_at, p_compare_start_at, p_compare_end_at,
    p_branch_id, p_agent_id, p_granularity
  );
  for v_period in
    select 'current'::text as name, p_start_at as starts_at, p_end_at as ends_at
    union all
    select 'comparison', p_compare_start_at, p_compare_end_at
  loop
    if (v_report -> v_period.name -> 'gross_profit_minor')
      is distinct from 'null'::jsonb then
      select
        coalesce(sum(i.unit_price_minor::bigint * i.quantity), 0),
        coalesce(sum(coalesce(
          i.cost_total_minor, i.unit_cost_minor::bigint * i.quantity
        )), 0),
        count(*) filter (where coalesce(
          i.cost_total_minor, i.unit_cost_minor::bigint * i.quantity
        ) is null)
      into v_revenue, v_cost, v_missing
      from public.orders o
      join public.order_items i on i.order_id = o.id
      where o.status = 'completed'
        and coalesce(o.completed_at, o.updated_at) >= v_period.starts_at
        and coalesce(o.completed_at, o.updated_at) < v_period.ends_at
        and (p_branch_id is null or o.branch_id = p_branch_id)
        and (p_agent_id is null or o.sales_agent_id = p_agent_id)
        and public.current_user_can_access_branch(o.branch_id);
      if v_missing = 0 then
        v_report := jsonb_set(
          v_report,
          array[v_period.name, 'gross_profit_minor'],
          to_jsonb(v_revenue - v_cost),
          true
        );
      end if;
    end if;
  end loop;
  return v_report;
end;
$$;

revoke all on function public.admin_order_sales_report(
  timestamptz, timestamptz, timestamptz, timestamptz, uuid, uuid, text
) from public, anon;
grant execute on function public.admin_order_sales_report(
  timestamptz, timestamptz, timestamptz, timestamptz, uuid, uuid, text
) to authenticated;

notify pgrst, 'reload schema';
