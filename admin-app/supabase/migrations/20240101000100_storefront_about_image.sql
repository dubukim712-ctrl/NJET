alter table public.business_settings
  add column about_image_path text unique,
  add constraint business_settings_about_image_path_check check (
    about_image_path is null or about_image_path ~ (
      '^about/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );

drop policy if exists "Full access staff upload storefront branding"
  on storage.objects;
create policy "Full access staff upload storefront branding"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-storefront-branding'
    and public.current_user_is_full_access()
    and name ~ (
      '^(logos|about)/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );

drop policy if exists "Full access staff remove unused storefront branding"
  on storage.objects;
create policy "Full access staff remove unused storefront branding"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-storefront-branding'
    and public.current_user_is_full_access()
    and not exists (
      select 1
      from public.business_settings b
      where b.logo_path = name or b.about_image_path = name
    )
  );
