begin;

alter table public.users
  add column street_address text,
  add column province_code text,
  add column province_name text,
  add column city_code text,
  add column city_name text,
  add column barangay_code text,
  add column barangay_name text,
  add column postal_code text;

-- Keep existing profile/RBAC grants. Only this RPC can edit the contact
-- fields on behalf of a customer, and it always targets the caller's row.
create function public.save_customer_profile_contact(
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
  if auth.uid() is null or not coalesce(public.current_user_has_permission('storefront.access'), false) then
    raise exception 'Sign in with a customer account to update your contact information.';
  end if;

  if greatest(length(p_street_address), length(p_province_name), length(p_city_name), length(p_barangay_name)) > 200
    or length(p_postal_code) > 20
    or (p_province_code is not null and p_province_code !~ '^[0-9]{1,20}$')
    or (p_city_code is not null and p_city_code !~ '^[0-9]{1,20}$')
    or (p_barangay_code is not null and p_barangay_code !~ '^[0-9]{1,20}$')
    or (
      num_nonnulls(p_street_address, p_province_code, p_province_name, p_city_code, p_city_name,
        p_barangay_code, p_barangay_name, p_postal_code) > 0
      and num_nonnulls(nullif(btrim(p_street_address), ''), p_province_code, nullif(btrim(p_province_name), ''),
        p_city_code, nullif(btrim(p_city_name), ''), p_barangay_code, nullif(btrim(p_barangay_name), '')) <> 7
    ) then
    raise exception 'Enter a complete saved address or clear all address fields.' using errcode = '23514';
  end if;

  update public.users
  set phone_verified_at = case when phone_number is not distinct from p_phone_number then phone_verified_at end,
      phone_number = p_phone_number,
      street_address = p_street_address,
      province_code = p_province_code,
      province_name = p_province_name,
      city_code = p_city_code,
      city_name = p_city_name,
      barangay_code = p_barangay_code,
      barangay_name = p_barangay_name,
      postal_code = p_postal_code
  where id = auth.uid();
  return found;
end;
$$;

revoke all on function public.save_customer_profile_contact(text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_customer_profile_contact(text, text, text, text, text, text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
