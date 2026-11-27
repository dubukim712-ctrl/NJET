alter table public.business_settings
  add column hero_image_path text unique,
  add constraint business_settings_hero_image_path_check check (
    hero_image_path is null or hero_image_path ~
      '^hero/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

-- Keep the existing full-access restriction and extend it to hero images.
alter policy "Full access staff upload storefront branding" on storage.objects
  with check (
    bucket_id = 'njet-storefront-branding'
    and public.current_user_is_full_access()
    and name ~ '^(logos|about|hero)/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

alter policy "Full access staff remove unused storefront branding" on storage.objects
  using (
    bucket_id = 'njet-storefront-branding'
    and public.current_user_is_full_access()
    and not exists (
      select 1 from public.business_settings b
      where b.logo_path = name or b.about_image_path = name or b.hero_image_path = name
    )
  );

notify pgrst, 'reload schema';
