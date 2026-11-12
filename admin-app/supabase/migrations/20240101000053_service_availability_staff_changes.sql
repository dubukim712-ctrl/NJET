create or replace function public.broadcast_service_availability_branch(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
begin
  if p_branch_id is not null then
    perform realtime.send(
      payload => jsonb_build_object('branchId', p_branch_id),
      event => 'availability_changed',
      topic => 'service-availability:' || p_branch_id::text,
      private => true
    );
  end if;
end;
$$;

create or replace function public.broadcast_service_availability_branch_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.broadcast_service_availability_branch(old.id);
  elsif tg_op = 'INSERT' then
    perform public.broadcast_service_availability_branch(new.id);
  else
    perform public.broadcast_service_availability_branch(old.id);
    if new.id is distinct from old.id then
      perform public.broadcast_service_availability_branch(new.id);
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.broadcast_service_availability_role(p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
declare
  v_branch_id uuid;
begin
  for v_branch_id in
    select distinct u.branch_id
    from public.users u
    where u.role_id = p_role_id and u.branch_id is not null
  loop
    perform public.broadcast_service_availability_branch(v_branch_id);
  end loop;
end;
$$;

create or replace function public.broadcast_service_availability_role_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
begin
  perform public.broadcast_service_availability_role(old.id);
  if new.id is distinct from old.id then
    perform public.broadcast_service_availability_role(new.id);
  end if;
  return null;
end;
$$;

create or replace function public.broadcast_service_availability_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.broadcast_service_availability_role(old.role_id);
  elsif tg_op = 'INSERT' then
    perform public.broadcast_service_availability_role(new.role_id);
  else
    perform public.broadcast_service_availability_role(old.role_id);
    if new.role_id is distinct from old.role_id then
      perform public.broadcast_service_availability_role(new.role_id);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.broadcast_service_availability_branch(uuid)
  from public, anon, authenticated;
revoke all on function public.broadcast_service_availability_branch_change()
  from public, anon, authenticated;
revoke all on function public.broadcast_service_availability_role(uuid)
  from public, anon, authenticated;
revoke all on function public.broadcast_service_availability_role_change()
  from public, anon, authenticated;
revoke all on function public.broadcast_service_availability_role_permission_change()
  from public, anon, authenticated;

create trigger users_service_availability_insert_delete
  after insert or delete on public.users
  for each row execute function public.broadcast_service_availability_change();
create trigger users_service_availability_update
  after update of branch_id, role_id, full_name on public.users
  for each row execute function public.broadcast_service_availability_change();

create trigger branches_service_availability_insert_delete
  after insert or delete on public.branches
  for each row execute function public.broadcast_service_availability_branch_change();
create trigger branches_service_availability_update
  after update of active, name on public.branches
  for each row execute function public.broadcast_service_availability_branch_change();

create trigger roles_service_availability_update
  after update of slug, scope on public.roles
  for each row execute function public.broadcast_service_availability_role_change();

create trigger role_permissions_service_availability_insert
  after insert on public.role_permissions
  for each row
  when (new.permission_key = 'service_appointments.work')
  execute function public.broadcast_service_availability_role_permission_change();
create trigger role_permissions_service_availability_delete
  after delete on public.role_permissions
  for each row
  when (old.permission_key = 'service_appointments.work')
  execute function public.broadcast_service_availability_role_permission_change();
create trigger role_permissions_service_availability_update
  after update of role_id, permission_key on public.role_permissions
  for each row
  when (
    old.permission_key = 'service_appointments.work'
    or new.permission_key = 'service_appointments.work'
  )
  execute function public.broadcast_service_availability_role_permission_change();
