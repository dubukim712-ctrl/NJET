create function public.crm_follow_up_page(
  p_status text, p_mine boolean, p_due text, p_search text, p_offset integer
)
returns table (id uuid, customer_id uuid, customer_name text, next_action text, due_on date,
  status text, assignee_name text, branch_name text)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.customer_id, coalesce(nullif(btrim(c.full_name), ''), 'Customer'), f.next_action,
    f.due_on, f.status,
    case when f.assignee_id is null then 'Unassigned'
      else coalesce(nullif(btrim(u.full_name), ''), 'Staff member') end,
    b.name
  from public.crm_follow_ups f join public.branches b on b.id = f.branch_id
  join public.users c on c.id = f.customer_id
  left join public.users u on u.id = f.assignee_id
  cross join lateral (select (now() at time zone 'Asia/Manila')::date as today) calendar
  where f.status = p_status and (not coalesce(p_mine, false) or f.assignee_id = auth.uid())
    and public.crm_can_access_customer(f.customer_id)
    and public.current_user_can_access_branch(f.branch_id)
    and (p_status = 'completed' or case coalesce(p_due, 'any')
      when 'any' then true
      when 'overdue' then f.due_on < calendar.today
      when 'today' then f.due_on = calendar.today
      when 'upcoming' then f.due_on > calendar.today
      else false
    end)
    and (coalesce(btrim(p_search), '') = '' or strpos(lower(coalesce(c.full_name, '')), lower(btrim(p_search))) > 0
      or strpos(lower(f.next_action), lower(btrim(p_search))) > 0
      or strpos(lower(b.name), lower(btrim(p_search))) > 0)
  order by case when f.status = 'open' then f.due_on end,
    case when f.status = 'completed' then f.due_on end desc, f.id
  limit 51 offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.crm_follow_up_page(text, boolean, text, text, integer) from public, anon, authenticated;
grant execute on function public.crm_follow_up_page(text, boolean, text, text, integer) to authenticated;
notify pgrst, 'reload schema';
