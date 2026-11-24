begin;

create function public.save_customer_profile(
  p_full_name text,
  p_avatar_url text,
  p_phone_number text,
  p_street_address text,
  p_province_code text,
  p_province_name text,
  p_city_code text,
  p_city_name text,
  p_barangay_code text,
  p_barangay_name text,
  p_postal_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if length(p_full_name) > 100 then
    raise exception 'Name too long.' using errcode = '23514';
  end if;

  -- The contact RPC checks the caller and updates only their row. Both writes
  -- run in the same transaction, including the phone verification reset.
  if not public.save_customer_profile_contact(
    p_phone_number, p_street_address, p_province_code, p_province_name,
    p_city_code, p_city_name, p_barangay_code, p_barangay_name, p_postal_code
  ) then
    return false;
  end if;
  update public.users
  set full_name = p_full_name, avatar_url = p_avatar_url
  where id = auth.uid();
  return found;
end;
$$;

revoke all on function public.save_customer_profile(text, text, text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_customer_profile(text, text, text, text, text, text, text, text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
