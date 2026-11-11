-- Add invoice records and private ownership certificates for completed orders.
-- Run after 20240101000026_scoped_branch_directory.sql.

create table public.order_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  invoice_no text not null check (
    length(btrim(invoice_no)) between 1 and 80
    and invoice_no !~ '[[:cntrl:]]'
  ),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create unique index order_invoices_invoice_no_unique
  on public.order_invoices (lower(invoice_no));
create trigger order_invoices_updated_at
  before update on public.order_invoices
  for each row execute procedure public.handle_updated_at();

create table public.order_certificates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  object_path text not null unique,
  content_type text not null default 'application/pdf'
    check (content_type = 'application/pdf'),
  file_size integer not null check (file_size between 1 and 2097152),
  generated_by uuid references public.users(id) on delete set null,
  template_version text not null check (
    length(template_version) <= 64
    and template_version ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  generated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.order_invoices enable row level security;
alter table public.order_certificates enable row level security;

create policy "Customers and order readers can view order invoices"
  on public.order_invoices for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "Customers and order readers can view order certificates"
  on public.order_certificates for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

revoke all on public.order_invoices, public.order_certificates
  from public, anon, authenticated;
grant select on public.order_invoices, public.order_certificates to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'njet-order-certificates',
  'njet-order-certificates',
  false,
  2097152,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Order managers upload e-bike certificates"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-order-certificates'
    and public.current_user_has_permission('orders.manage')
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[1]
        and o.status = 'completed'
        and public.current_user_can_access_branch(o.branch_id)
        and exists (
          select 1 from public.order_items i
          where i.order_id = o.id and i.product_type = 'ebike'
        )
    )
  );
create policy "Customers and order readers can view ownership certificates"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'njet-order-certificates'
    and exists (
      select 1 from public.order_certificates c where c.object_path = name
    )
  );
create policy "Order managers remove unattached certificates"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-order-certificates'
    and public.current_user_has_permission('orders.manage')
    and not exists (
      select 1 from public.order_certificates c where c.object_path = name
    )
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[1]
        and public.current_user_can_access_branch(o.branch_id)
    )
  );

create policy "Order managers can view sold e-bike units for certificates"
  on public.ebike_units for select to authenticated
  using (
    ebike_units.status = 'sold'
    and public.current_user_has_permission('orders.manage')
    and exists (
      select 1
      from public.order_items i
      join public.orders o on o.id = i.order_id
      where i.id = ebike_units.order_item_id
        and public.current_user_can_access_branch(o.branch_id)
    )
  );

create or replace function public.save_order_invoice(
  p_order_id uuid,
  p_invoice_no text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_invoice_no text := btrim(coalesce(p_invoice_no, ''));
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to manage order invoices.';
  end if;
  if length(v_invoice_no) not between 1 and 80
    or v_invoice_no ~ '[[:cntrl:]]' then
    raise exception 'Enter an invoice number between 1 and 80 characters.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'completed' then
    raise exception 'Invoice numbers can only be saved for completed orders.';
  end if;
  if not public.current_user_can_access_branch(v_order.branch_id) then
    raise exception 'You can only manage orders for your assigned branch.';
  end if;
  insert into public.order_invoices (order_id, invoice_no)
  values (p_order_id, v_invoice_no)
  on conflict (order_id) do update set invoice_no = excluded.invoice_no;
end;
$$;

create or replace function public.save_order_certificate(
  p_order_id uuid,
  p_object_path text,
  p_file_size integer,
  p_template_version text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.current_user_has_permission('orders.manage') then
    raise exception 'You are not allowed to generate ownership certificates.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'completed' then
    raise exception 'Ownership certificates can only be generated for completed orders.';
  end if;
  if not public.current_user_can_access_branch(v_order.branch_id) then
    raise exception 'You can only manage orders for your assigned branch.';
  end if;
  if not exists (
    select 1 from public.order_items i
    where i.order_id = p_order_id and i.product_type = 'ebike'
  ) then
    raise exception 'Ownership certificates are only available for e-bike orders.';
  end if;
  if p_object_path is null
    or p_file_size is null
    or p_template_version is null
    or length(p_template_version) > 64
    or p_template_version !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_object_path !~ (
      '^' || p_order_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
    )
    or p_file_size not between 1 and 2097152 then
    raise exception 'The generated certificate details are invalid.';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'njet-order-certificates' and o.name = p_object_path
  ) then
    raise exception 'The generated certificate file could not be found.';
  end if;
  insert into public.order_certificates (
    order_id, object_path, file_size, generated_by, template_version, generated_at
  ) values (
    p_order_id, p_object_path, p_file_size, auth.uid(), p_template_version, now()
  )
  on conflict (order_id) do update set
    object_path = excluded.object_path,
    file_size = excluded.file_size,
    generated_by = excluded.generated_by,
    template_version = excluded.template_version,
    generated_at = excluded.generated_at;
end;
$$;

revoke all on function public.save_order_invoice(uuid, text) from public, anon;
revoke all on function public.save_order_certificate(uuid, text, integer, text)
  from public, anon;
grant execute on function public.save_order_invoice(uuid, text) to authenticated;
grant execute on function public.save_order_certificate(uuid, text, integer, text)
  to authenticated;

create trigger audit_order_invoices_changes
  after insert or update or delete on public.order_invoices
  for each row execute procedure public.log_audit_event();
create trigger audit_order_certificates_changes
  after insert or update or delete on public.order_certificates
  for each row execute procedure public.log_audit_event();

revoke all on function public.log_audit_event() from public, anon, authenticated;

notify pgrst, 'reload schema';
