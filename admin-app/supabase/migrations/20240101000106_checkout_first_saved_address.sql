begin;

-- This runs after checkout commits. The conditional update lets the first
-- checkout (or a profile edit that already saved an address) win atomically.
create function public.save_first_checkout_address(
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
  if auth.uid() is null or not coalesce(public.current_user_has_permission('storefront.access'), false) then
    return false;
  end if;

  if num_nonnulls(nullif(btrim(p_street_address), ''), nullif(btrim(p_province_name), ''),
      nullif(btrim(p_city_name), ''), nullif(btrim(p_barangay_name), '')) <> 4
    or greatest(length(p_street_address), length(p_province_name), length(p_city_name), length(p_barangay_name)) > 200
    or length(p_postal_code) > 20
    or not coalesce(p_province_code ~ '^[0-9]{1,20}$', false)
    or not coalesce(p_city_code ~ '^[0-9]{1,20}$', false)
    or not coalesce(p_barangay_code ~ '^[0-9]{1,20}$', false) then
    return false;
  end if;

  update public.users
  set street_address = btrim(p_street_address),
      province_code = p_province_code,
      province_name = btrim(p_province_name),
      city_code = p_city_code,
      city_name = btrim(p_city_name),
      barangay_code = p_barangay_code,
      barangay_name = btrim(p_barangay_name),
      postal_code = nullif(btrim(p_postal_code), '')
  where id = auth.uid()
    and nullif(btrim(street_address), '') is null
    and nullif(btrim(province_code), '') is null
    and nullif(btrim(province_name), '') is null
    and nullif(btrim(city_code), '') is null
    and nullif(btrim(city_name), '') is null
    and nullif(btrim(barangay_code), '') is null
    and nullif(btrim(barangay_name), '') is null
    and nullif(btrim(postal_code), '') is null;
  return found;
end;
$$;

revoke all on function public.save_first_checkout_address(text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_first_checkout_address(text, text, text, text, text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
