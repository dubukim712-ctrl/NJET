-- Add public business information for the shared storefront.
-- Run after 20240101000029_multiple_payment_recipients.sql.

create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'NJET' check (
    length(btrim(business_name)) between 1 and 120
    and business_name !~ '[[:cntrl:]]'
  ),
  phone text not null default '' check (
    length(phone) <= 40
    and (phone = '' or phone ~ '^\+?[0-9][0-9() .-]{2,38}$')
  ),
  email text not null default '' check (
    length(email) <= 254
    and (email = '' or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  address text not null default '' check (
    length(address) <= 300
    and address !~ '[[:cntrl:]]'
  ),
  logo_path text unique check (
    logo_path is null or logo_path ~ (
      '^logos/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  ),
  business_hours text not null default '' check (
    length(business_hours) <= 200
    and business_hours !~ '[[:cntrl:]]'
  ),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create trigger business_settings_updated_at
  before update on public.business_settings
  for each row execute procedure public.handle_updated_at();

alter table public.business_settings enable row level security;
create policy "Visitors can view public business information"
  on public.business_settings for select to anon, authenticated
  using (true);
create policy "Full access staff can insert business settings"
  on public.business_settings for insert to authenticated
  with check (public.current_user_is_full_access());
create policy "Full access staff can update business settings"
  on public.business_settings for update to authenticated
  using (public.current_user_is_full_access())
  with check (public.current_user_is_full_access());
revoke all on public.business_settings from public, anon, authenticated;
grant select on public.business_settings to anon, authenticated;
grant insert, update on public.business_settings to authenticated;

insert into public.business_settings (id) values (1)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'njet-storefront-branding',
  'njet-storefront-branding',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Storefront branding is public"
  on storage.objects for select to public
  using (bucket_id = 'njet-storefront-branding');
create policy "Full access staff upload storefront branding"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-storefront-branding'
    and public.current_user_is_full_access()
    and name ~ '^logos/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
create policy "Full access staff remove unused storefront branding"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-storefront-branding'
    and public.current_user_is_full_access()
    and not exists (
      select 1 from public.business_settings b where b.logo_path = name
    )
  );

create trigger audit_business_settings_changes
  after insert or update or delete on public.business_settings
  for each row execute procedure public.log_audit_event();

notify pgrst, 'reload schema';
