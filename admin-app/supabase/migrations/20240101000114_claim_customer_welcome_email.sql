create function public.claim_customer_welcome_email(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.users as u
    set welcome_email_sent_at = now()
    from public.roles as r
    where u.id = p_user_id
      and u.role_id = r.id
      and r.scope = 'customer'
      and u.welcome_email_sent_at is null
    returning u.id
  )
  select exists (select 1 from claimed);
$$;

revoke all on function public.claim_customer_welcome_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_customer_welcome_email(uuid) to service_role;

notify pgrst, 'reload schema';
