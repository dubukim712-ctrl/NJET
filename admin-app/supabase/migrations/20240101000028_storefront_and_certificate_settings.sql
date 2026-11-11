-- Add global certificate-template and payment-recipient configuration.
-- Run after 20240101000027_completed_order_documents.sql.

create table public.payment_recipients (
  provider text primary key check (provider in ('gcash', 'bank_transfer', 'card')),
  recipient_name text not null check (
    length(btrim(recipient_name)) between 1 and 120
    and recipient_name !~ '[[:cntrl:]]'
  ),
  account_details text not null check (
    length(btrim(account_details)) between 1 and 500
    and account_details !~ '[[:cntrl:]]'
  ),
  recipient_photo_path text not null unique check (
    recipient_photo_path ~ (
      '^recipients/' || provider ||
      '/photo/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  ),
  payment_qr_path text not null unique check (
    payment_qr_path ~ (
      '^recipients/' || provider ||
      '/qr/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  ),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create trigger payment_recipients_updated_at
  before update on public.payment_recipients
  for each row execute procedure public.handle_updated_at();

create table public.ownership_certificate_templates (
  id smallint primary key default 1 check (id = 1),
  object_path text not null unique check (
    object_path ~ '^templates/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
  ),
  template_version text not null check (
    length(template_version) <= 64
    and template_version ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create trigger ownership_certificate_templates_updated_at
  before update on public.ownership_certificate_templates
  for each row execute procedure public.handle_updated_at();

alter table public.payment_recipients enable row level security;
alter table public.ownership_certificate_templates enable row level security;

create policy "Customers can view active payment recipients"
  on public.payment_recipients for select to anon, authenticated
  using (active);
create policy "Full access staff can view all payment recipients"
  on public.payment_recipients for select to authenticated
  using (public.current_user_is_full_access());
create policy "Full access staff can insert payment recipients"
  on public.payment_recipients for insert to authenticated
  with check (public.current_user_is_full_access());
create policy "Full access staff can update payment recipients"
  on public.payment_recipients for update to authenticated
  using (public.current_user_is_full_access())
  with check (public.current_user_is_full_access());
create policy "Full access staff can delete payment recipients"
  on public.payment_recipients for delete to authenticated
  using (public.current_user_is_full_access());

create policy "Order managers can view certificate template settings"
  on public.ownership_certificate_templates for select to authenticated
  using (
    public.current_user_has_permission('orders.manage')
    or public.current_user_is_full_access()
  );
create policy "Full access staff can insert certificate template settings"
  on public.ownership_certificate_templates for insert to authenticated
  with check (public.current_user_is_full_access());
create policy "Full access staff can update certificate template settings"
  on public.ownership_certificate_templates for update to authenticated
  using (public.current_user_is_full_access())
  with check (public.current_user_is_full_access());
create policy "Full access staff can delete certificate template settings"
  on public.ownership_certificate_templates for delete to authenticated
  using (public.current_user_is_full_access());

revoke all on public.payment_recipients, public.ownership_certificate_templates
  from public, anon, authenticated;
grant select on public.payment_recipients to anon, authenticated;
grant insert, update, delete on public.payment_recipients to authenticated;
grant select, insert, update, delete
  on public.ownership_certificate_templates to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'njet-payment-recipient-media',
  'njet-payment-recipient-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Payment recipient media is public"
  on storage.objects for select to public
  using (bucket_id = 'njet-payment-recipient-media');
create policy "Full access staff upload payment recipient media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-payment-recipient-media'
    and public.current_user_is_full_access()
    and name ~ '^recipients/(gcash|bank_transfer|card)/(photo|qr)/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
create policy "Full access staff remove unused payment recipient media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-payment-recipient-media'
    and public.current_user_is_full_access()
    and not exists (
      select 1
      from public.payment_recipients r
      where r.recipient_photo_path = name or r.payment_qr_path = name
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'njet-certificate-templates',
  'njet-certificate-templates',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Order managers can read certificate templates"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'njet-certificate-templates'
    and (
      public.current_user_has_permission('orders.manage')
      or public.current_user_is_full_access()
    )
  );
create policy "Full access staff upload certificate templates"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-certificate-templates'
    and public.current_user_is_full_access()
    and name ~ '^templates/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
  );
create policy "Full access staff remove unused certificate templates"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-certificate-templates'
    and public.current_user_is_full_access()
    and not exists (
      select 1 from public.ownership_certificate_templates t
      where t.object_path = name
    )
  );

create or replace function public.require_configured_payment_recipient()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.payment_method = 'online' and not exists (
    select 1
    from public.payment_recipients r
    where r.provider = new.payment_provider
      and r.active
  ) then
    raise exception 'The selected online payment provider is not currently available.';
  end if;
  return new;
end;
$$;
create trigger orders_require_payment_recipient
  before insert or update of payment_method, payment_provider on public.orders
  for each row execute procedure public.require_configured_payment_recipient();
revoke all on function public.require_configured_payment_recipient()
  from public, anon, authenticated;

create trigger audit_payment_recipients_changes
  after insert or update or delete on public.payment_recipients
  for each row execute procedure public.log_audit_event();
create trigger audit_certificate_template_changes
  after insert or update or delete on public.ownership_certificate_templates
  for each row execute procedure public.log_audit_event();

notify pgrst, 'reload schema';
