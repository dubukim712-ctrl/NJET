-- Older storefront builds read the versions table and order by id.
-- Let those builds see the same current version as the new public RPC.
grant select (id, slug, version, intro, sections, created_at)
  on public.storefront_legal_policy_versions to anon;

create policy "Storefront can read current legal policy versions"
  on public.storefront_legal_policy_versions for select to anon, authenticated
  using (
    version = (
      select current_policy.version
      from public.current_storefront_legal_policy(storefront_legal_policy_versions.slug) current_policy
    )
  );

notify pgrst, 'reload schema';
