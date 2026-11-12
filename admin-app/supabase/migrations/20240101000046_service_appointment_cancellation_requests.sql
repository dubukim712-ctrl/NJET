create table public.service_appointment_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.service_appointments(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  subject text not null check (length(trim(subject)) between 3 and 120),
  reason text not null check (length(trim(reason)) between 10 and 1500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index service_appointment_cancellation_pending_idx
  on public.service_appointment_cancellation_requests (appointment_id)
  where status = 'pending';
create index service_appointment_cancellation_customer_idx
  on public.service_appointment_cancellation_requests (customer_id, created_at desc);

alter table public.service_appointment_cancellation_requests enable row level security;
create policy "Customers and appointment staff read cancellation requests"
  on public.service_appointment_cancellation_requests for select to authenticated
  using (
    customer_id = auth.uid()
    or exists (
      select 1
      from public.service_appointments a
      where a.id = appointment_id
        and public.current_user_has_permission('service_appointments.read')
        and public.current_user_can_access_branch(a.branch_id)
    )
  );
grant select on public.service_appointment_cancellation_requests to authenticated;
revoke insert, update, delete on public.service_appointment_cancellation_requests
  from public, anon, authenticated;

create or replace function public.request_service_appointment_cancellation(
  p_appointment_id uuid,
  p_subject text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_request_id uuid;
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in with a customer account to request cancellation.';
  end if;
  if p_subject is null or length(trim(p_subject)) not between 3 and 120
    or p_reason is null or length(trim(p_reason)) not between 10 and 1500 then
    raise exception 'Enter a subject and a reason for cancellation.';
  end if;

  select a.status into v_status
  from public.service_appointments a
  where a.id = p_appointment_id and a.customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'This appointment is unavailable.';
  end if;
  if v_status not in ('requested', 'confirmed') then
    raise exception 'Only requested or confirmed appointments can be cancelled.';
  end if;

  insert into public.service_appointment_cancellation_requests (
    appointment_id, customer_id, subject, reason
  ) values (
    p_appointment_id, auth.uid(), trim(p_subject), trim(p_reason)
  )
  on conflict (appointment_id) where status = 'pending' do nothing
  returning id into v_request_id;
  if v_request_id is null then
    raise exception 'A cancellation request is already under staff review.';
  end if;

  return v_request_id;
end;
$$;

create or replace function public.review_service_appointment_cancellation(
  p_request_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment_id uuid;
  v_appointment_status text;
begin
  if auth.uid() is null
    or not public.current_user_has_permission('service_appointments.manage') then
    raise exception 'You do not have permission to review cancellation requests.';
  end if;
  if p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'Choose approve or reject for this cancellation request.';
  end if;

  select r.appointment_id
  into v_appointment_id
  from public.service_appointment_cancellation_requests r
  join public.service_appointments a on a.id = r.appointment_id
  where r.id = p_request_id
    and r.status = 'pending'
    and public.current_user_can_access_branch(a.branch_id);
  if not found then
    raise exception 'This request is no longer pending or is outside your branch access.';
  end if;

  select a.status
  into v_appointment_status
  from public.service_appointments a
  where a.id = v_appointment_id
    and public.current_user_can_access_branch(a.branch_id)
  for update;
  if not found then
    raise exception 'This request is outside your branch access.';
  end if;

  perform 1
  from public.service_appointment_cancellation_requests r
  where r.id = p_request_id
    and r.appointment_id = v_appointment_id
    and r.status = 'pending'
  for update;
  if not found then
    raise exception 'This request is no longer pending.';
  end if;

  if p_decision = 'approve' then
    if v_appointment_status not in ('requested', 'confirmed') then
      raise exception 'This appointment is no longer eligible for cancellation.';
    end if;
    update public.service_appointment_cancellation_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
    update public.service_appointments
    set status = 'cancelled', updated_by = auth.uid()
    where id = v_appointment_id;
  else
    update public.service_appointment_cancellation_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
  end if;
end;
$$;

create or replace function public.resolve_cancellation_request_for_staff_cancel()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    update public.service_appointment_cancellation_requests
    set status = 'approved',
        reviewed_by = coalesce(auth.uid(), new.updated_by),
        reviewed_at = now()
    where appointment_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger service_appointment_cancellation_sync
  after update of status on public.service_appointments
  for each row execute procedure public.resolve_cancellation_request_for_staff_cancel();

create or replace function public.customer_service_appointment_cancellation_requests()
returns table (
  appointment_id uuid,
  subject text,
  reason text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in with a customer account to view cancellation requests.';
  end if;
  return query
  select distinct on (r.appointment_id)
    r.appointment_id, r.subject, r.reason, r.status, r.created_at
  from public.service_appointment_cancellation_requests r
  where r.customer_id = auth.uid()
  order by r.appointment_id, r.created_at desc, r.id desc
  limit 50;
end;
$$;

revoke all on function public.request_service_appointment_cancellation(uuid, text, text)
  from public, anon;
revoke all on function public.review_service_appointment_cancellation(uuid, text)
  from public, anon;
revoke all on function public.resolve_cancellation_request_for_staff_cancel()
  from public, anon, authenticated;
revoke all on function public.customer_service_appointment_cancellation_requests()
  from public, anon;
grant execute on function public.request_service_appointment_cancellation(uuid, text, text)
  to authenticated;
grant execute on function public.review_service_appointment_cancellation(uuid, text)
  to authenticated;
grant execute on function public.customer_service_appointment_cancellation_requests()
  to authenticated;

notify pgrst, 'reload schema';
