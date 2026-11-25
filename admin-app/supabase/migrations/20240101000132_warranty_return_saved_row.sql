create function public.record_warranty_return_update_and_read(
  p_appointment_id uuid, p_reason text, p_disposition text, p_note text, p_previous_id text
)
returns table (reason text, disposition text, note text, recorded_at timestamptz, recorded_by text, update_id text)
language plpgsql security definer set search_path = ''
as $$
begin
  -- The existing write RPC checks role and branch, then holds the exchange lock until commit.
  if not public.record_warranty_return_update(p_appointment_id, p_reason, p_disposition, p_note, p_previous_id) then
    return;
  end if;

  return query
  select u.reason, u.disposition, u.note, u.recorded_at, actor.full_name, u.id::text
  from public.warranty_return_updates u
  left join public.users actor on actor.id = u.actor_id
  where u.appointment_id = p_appointment_id
  order by u.id desc limit 1;
end;
$$;

revoke all on function public.record_warranty_return_update_and_read(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_warranty_return_update_and_read(uuid, text, text, text, text)
  to authenticated;
notify pgrst, 'reload schema';
