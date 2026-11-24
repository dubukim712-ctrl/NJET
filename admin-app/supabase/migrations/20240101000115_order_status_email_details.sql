create function public.order_status_email_details(p_order_id uuid, p_status text)
returns table (
  email text, order_number text, customer_name text, fulfillment text,
  branch_name text, branch_address text, delivery_address text,
  total_minor integer, balance_due_minor integer, has_ebike boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select au.email::text, o.order_number, o.customer_name, o.fulfillment::text,
    o.branch_name, b.address,
    case when o.fulfillment = 'delivery' then
      concat_ws(', ', nullif(o.address_line1, ''), nullif(o.barangay, ''),
        nullif(o.city, ''), nullif(o.province, ''), nullif(o.postal_code, ''))
    end,
    o.total_minor,
    -- The Home Credit balance is financed, so it is not due at pickup.
    case when o.payment_method = 'home_credit' then 0 else o.balance_due_minor end,
    exists (select 1 from public.order_items i where i.order_id = o.id and i.product_type = 'ebike')
  from public.orders o
  join auth.users au on au.id = o.customer_id
  left join public.branches b on b.id = o.branch_id
  where o.id = p_order_id and o.status::text = p_status
    and p_status in ('confirmed', 'completed', 'cancelled')
    and au.email_confirmed_at is not null and nullif(au.email, '') is not null;
$$;

revoke all on function public.order_status_email_details(uuid, text) from public, anon, authenticated;
grant execute on function public.order_status_email_details(uuid, text) to service_role;

notify pgrst, 'reload schema';
