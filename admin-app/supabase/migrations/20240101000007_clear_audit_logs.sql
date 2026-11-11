-- ============================================================================
-- Controlled audit-log deletion for full-access admins
-- Run after 20240101000006_permissions_guards.sql
-- ============================================================================

alter table public.audit_logs
  drop constraint if exists audit_logs_action_check;

alter table public.audit_logs
  add constraint audit_logs_action_check
  check (action in ('insert', 'update', 'delete', 'clear'));

create or replace function public.clear_audit_logs(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_deleted integer;
  v_scope text := case when p_ids is null then 'all' else 'selected' end;
begin
  if v_actor_id is null or not public.current_user_is_full_access() then
    raise exception 'Only full-access admins can clear audit logs.';
  end if;

  if p_ids is not null and (
    cardinality(p_ids) = 0
    or cardinality(p_ids) > 100
    or array_position(p_ids, null) is not null
  ) then
    raise exception 'Select between 1 and 100 audit records.';
  end if;

  if p_ids is null then
    delete from public.audit_logs;
  else
    delete from public.audit_logs
    where id = any(p_ids);
  end if;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    select email into v_actor_email
    from public.users
    where id = v_actor_id;

    insert into public.audit_logs (
      actor_id,
      actor_email,
      action,
      table_name,
      old_data,
      metadata
    )
    values (
      v_actor_id,
      v_actor_email,
      'clear',
      'audit_logs',
      jsonb_build_object('clear_scope', v_scope, 'deleted_count', v_deleted),
      jsonb_build_object('deleted_count', v_deleted, 'clear_scope', v_scope)
    );
  end if;

  return v_deleted;
end;
$$;

revoke all on function public.clear_audit_logs(uuid[]) from public, anon;
grant execute on function public.clear_audit_logs(uuid[]) to authenticated;

notify pgrst, 'reload schema';
