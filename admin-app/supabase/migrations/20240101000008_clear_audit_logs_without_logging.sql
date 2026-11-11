-- ============================================================================
-- Clear audit logs without creating an audit event
-- Run after 20240101000007_clear_audit_logs.sql
-- ============================================================================

create or replace function public.clear_audit_logs(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_deleted integer;
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

  delete from public.audit_logs
  where p_ids is null or id = any(p_ids);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

notify pgrst, 'reload schema';
