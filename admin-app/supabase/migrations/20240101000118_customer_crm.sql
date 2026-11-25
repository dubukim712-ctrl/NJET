insert into public.permissions (key, name, description, group_name, surface, sort_order)
values
  ('crm.read', 'View customer CRM', 'View branch-scoped customer profiles and follow-ups.', 'Customer CRM', 'admin', 120),
  ('crm.manage', 'Manage customer CRM', 'Add internal notes and manage follow-ups.', 'Customer CRM', 'admin', 121)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select id, k from public.roles cross join (values ('crm.read'), ('crm.manage')) as keys(k)
where slug = 'sales' and scope = 'staff'
on conflict (role_id, permission_key) do nothing;

create function public.crm_can_access_customer(p_customer_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.users actor join public.roles staff on staff.id = actor.role_id
    where actor.id = auth.uid() and staff.scope = 'staff'
      and public.current_user_has_permission('admin.access')
      and public.current_user_has_permission('crm.read')
      and exists (
        select 1 from public.users u join public.roles r on r.id = u.role_id
        where u.id = p_customer_id and r.scope = 'customer'
      )
      and (staff.is_full_access or (
        actor.branch_id is not null and (
          exists (select 1 from public.orders o where o.customer_id = p_customer_id and o.branch_id = actor.branch_id)
          or exists (select 1 from public.service_appointments a where a.customer_id = p_customer_id and a.branch_id = actor.branch_id)
        )
      ))
  );
$$;

create function public.crm_can_assign(p_user_id uuid, p_branch_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.current_user_has_permission('admin.access')
    and public.current_user_has_permission('crm.read')
    and public.current_user_has_permission('crm.manage')
    and exists (select 1 from public.users actor join public.roles r on r.id = actor.role_id
      where actor.id = auth.uid() and r.scope = 'staff')
    and public.current_user_can_access_branch(p_branch_id)
    and exists (
      select 1 from public.users u join public.roles r on r.id = u.role_id
      where u.id = p_user_id and r.scope = 'staff'
        and (
          r.is_full_access or (u.branch_id = p_branch_id and (
            select count(*) from public.role_permissions rp where rp.role_id = r.id
              and rp.permission_key in ('admin.access', 'crm.read', 'crm.manage')
          ) = 3)
        )
    );
$$;

revoke all on function public.crm_can_access_customer(uuid), public.crm_can_assign(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_can_access_customer(uuid), public.crm_can_assign(uuid, uuid) to authenticated;

create table public.crm_customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  body text not null check (char_length(btrim(body)) between 1 and 2000)
);

create table public.crm_follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  assignee_id uuid references public.users(id) on delete set null,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  due_on date not null,
  status text not null default 'open' check (status in ('open', 'completed')),
  next_action text not null check (char_length(btrim(next_action)) between 1 and 300)
);

create index crm_notes_customer_created_idx on public.crm_customer_notes(customer_id, created_at desc);
create index crm_follow_ups_customer_due_idx on public.crm_follow_ups(customer_id, status, due_on);
create index crm_follow_ups_branch_queue_idx on public.crm_follow_ups(branch_id, status, due_on, id);
create index crm_follow_ups_assignee_idx on public.crm_follow_ups(assignee_id);
create index crm_notes_branch_idx on public.crm_customer_notes(branch_id);

alter table public.crm_customer_notes enable row level security;
alter table public.crm_follow_ups enable row level security;
revoke all on table public.crm_customer_notes, public.crm_follow_ups from public, anon, authenticated;
grant select on table public.crm_customer_notes, public.crm_follow_ups to authenticated;
grant insert (customer_id, branch_id, body) on public.crm_customer_notes to authenticated;
grant insert (customer_id, branch_id, assignee_id, due_on, next_action) on public.crm_follow_ups to authenticated;
grant update (status) on public.crm_follow_ups to authenticated;

create policy "CRM staff read notes" on public.crm_customer_notes for select to authenticated
  using (public.crm_can_access_customer(customer_id) and public.current_user_can_access_branch(branch_id));
create policy "CRM managers add notes" on public.crm_customer_notes for insert to authenticated
  with check (created_by = auth.uid() and public.current_user_has_permission('crm.manage')
    and public.crm_can_access_customer(customer_id) and public.current_user_can_access_branch(branch_id));

create policy "CRM staff read follow-ups" on public.crm_follow_ups for select to authenticated
  using (public.crm_can_access_customer(customer_id) and public.current_user_can_access_branch(branch_id));
create policy "CRM managers create follow-ups" on public.crm_follow_ups for insert to authenticated
  with check (created_by = auth.uid() and public.crm_can_access_customer(customer_id)
    and public.crm_can_assign(assignee_id, branch_id));
create policy "CRM managers update follow-ups" on public.crm_follow_ups for update to authenticated
  using (public.current_user_has_permission('crm.manage') and public.crm_can_access_customer(customer_id)
    and public.current_user_can_access_branch(branch_id))
  with check (public.current_user_has_permission('crm.manage') and public.crm_can_access_customer(customer_id)
    and public.current_user_can_access_branch(branch_id));
