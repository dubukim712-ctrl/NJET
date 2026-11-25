drop policy "Visitors can view legal policy versions" on public.storefront_legal_policy_versions;
revoke select on public.storefront_legal_policy_versions from anon;
create policy "Full access staff can review legal policy versions"
  on public.storefront_legal_policy_versions for select to authenticated
  using (public.current_user_is_full_access());

-- Saving a policy publishes it immediately. The newest version is also the one checkout validates.
create function public.current_storefront_legal_policy(p_slug text)
returns table (slug text, version text, intro text, sections jsonb, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.slug, p.version, p.intro, p.sections, p.created_at
  from public.storefront_legal_policy_versions p
  where p.slug = p_slug
  order by p.id desc limit 1;
$$;

revoke all on function public.current_storefront_legal_policy(text) from public, anon, authenticated;
grant execute on function public.current_storefront_legal_policy(text) to anon, authenticated;
notify pgrst, 'reload schema';
