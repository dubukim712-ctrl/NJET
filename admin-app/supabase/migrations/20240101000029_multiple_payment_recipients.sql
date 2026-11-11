-- Allow multiple QR payment accounts per provider and record the selected account.
-- Run after 20240101000028_storefront_and_certificate_settings.sql.

drop policy if exists "Full access staff upload payment recipient media"
  on storage.objects;
drop policy if exists "Full access staff remove unused payment recipient media"
  on storage.objects;

alter table public.payment_recipients
  add column id uuid not null default gen_random_uuid();
alter table public.payment_recipients
  drop constraint payment_recipients_pkey;
alter table public.payment_recipients
  add constraint payment_recipients_pkey primary key (id);
alter table public.payment_recipients
  drop column recipient_photo_path;

alter table public.orders
  add column payment_recipient_id uuid
    references public.payment_recipients(id) on delete restrict;
alter table public.orders
  add constraint orders_non_online_payment_recipient_check
  check (payment_method = 'online' or payment_recipient_id is null);

create policy "Order readers can view recipients selected for accessible orders"
  on public.payment_recipients for select to authenticated
  using (
    public.current_user_has_permission('orders.read')
    and exists (
      select 1
      from public.orders o
      where o.payment_recipient_id = payment_recipients.id
        and public.current_user_can_access_branch(o.branch_id)
    )
  );

create policy "Full access staff upload payment recipient media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-payment-recipient-media'
    and public.current_user_is_full_access()
    and name ~ '^recipients/(gcash|bank_transfer|card)/qr/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
create policy "Full access staff remove unused payment recipient media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-payment-recipient-media'
    and public.current_user_is_full_access()
    and not exists (
      select 1
      from public.payment_recipients r
      where r.payment_qr_path = name
    )
  );

create or replace function public.require_configured_payment_recipient()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient_id uuid;
begin
  if new.payment_method = 'online' then
    if new.payment_recipient_id is null then
      v_recipient_id := nullif(
        current_setting('app.payment_recipient_id', true),
        ''
      )::uuid;
      new.payment_recipient_id := v_recipient_id;
    end if;
    if new.payment_provider is null or new.payment_recipient_id is null then
      raise exception 'Choose an active recipient for the selected payment provider.';
    end if;
    select r.id into v_recipient_id
    from public.payment_recipients r
    where r.id = new.payment_recipient_id
      and r.provider = new.payment_provider
      and r.active
    for share;
    if not found then
      raise exception 'Choose an active recipient for the selected payment provider.';
    end if;
  elsif new.payment_recipient_id is not null then
    raise exception 'A payment recipient can only be selected for online payment.';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_require_payment_recipient on public.orders;
create trigger orders_require_payment_recipient
  before insert or update of payment_method, payment_provider, payment_recipient_id
  on public.orders
  for each row execute procedure public.require_configured_payment_recipient();
revoke all on function public.require_configured_payment_recipient()
  from public, anon, authenticated;

-- Keep the existing order creation implementation and add a trusted wrapper
-- that passes the selected recipient through a transaction-local setting.
create or replace function public.create_commerce_order_with_recipient(
  p_customer_name text,
  p_contact_number text,
  p_fulfillment text,
  p_branch_id uuid,
  p_delivery_zone_id uuid,
  p_address_line1 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_payment_method text,
  p_payment_provider text,
  p_payment_recipient_id uuid,
  p_payment_reference text,
  p_terms_version text,
  p_privacy_version text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_items jsonb,
  p_documents jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
begin
  if p_payment_method = 'online' then
    if p_payment_recipient_id is null
      or not exists (
        select 1
        from public.payment_recipients r
        where r.id = p_payment_recipient_id
          and r.provider = p_payment_provider
          and r.active
      ) then
      raise exception 'Choose an active recipient for the selected payment provider.';
    end if;
  elsif p_payment_recipient_id is not null then
    raise exception 'A payment recipient can only be selected for online payment.';
  end if;

  perform set_config(
    'app.payment_recipient_id',
    coalesce(p_payment_recipient_id::text, ''),
    true
  );
  v_order_id := public.create_commerce_order(
    p_customer_name,
    p_contact_number,
    p_fulfillment,
    p_branch_id,
    p_delivery_zone_id,
    p_address_line1,
    p_barangay,
    p_city,
    p_province,
    p_postal_code,
    p_payment_method,
    p_payment_provider,
    p_payment_reference,
    p_terms_version,
    p_privacy_version,
    p_terms_accepted,
    p_privacy_accepted,
    p_items,
    p_documents
  );
  perform set_config('app.payment_recipient_id', '', true);
  return v_order_id;
end;
$$;

revoke all on function public.create_commerce_order(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  text, text, text, boolean, boolean, jsonb, jsonb
) from public, anon, authenticated;
revoke all on function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, boolean, boolean, jsonb, jsonb
) from public, anon;
grant execute on function public.create_commerce_order_with_recipient(
  text, text, text, uuid, uuid, text, text, text, text, text, text, text,
  uuid, text, text, text, boolean, boolean, jsonb, jsonb
) to authenticated;

notify pgrst, 'reload schema';
