-- Defer online payment proof until after order creation and expire unpaid orders.

alter table public.orders
  add column if not exists payment_expires_at timestamptz;

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in (
    'awaiting_payment', 'awaiting_confirmation', 'confirmed',
    'cancelled', 'expired', 'completed'
  ));

create or replace function public.set_online_order_payment_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.order_source = 'online' and new.payment_method = 'online' then
    new.status := 'awaiting_payment';
    new.payment_expires_at := coalesce(new.payment_expires_at, now() + interval '1 hour');
  else
    new.payment_expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_online_payment_state on public.orders;
create trigger orders_set_online_payment_state
  before insert on public.orders
  for each row execute procedure public.set_online_order_payment_state();
revoke all on function public.set_online_order_payment_state()
  from public, anon, authenticated;

do $$
declare
  v_function text;
  v_old text := 'p_payment_method = ''online'' and v_proof_count <> 1';
  v_new text := 'p_payment_method = ''online'' and v_proof_count <> 0';
  v_reservation_anchor text := 'if p_payment_method = ''online'' and v_ebike';
  v_reservation_guard text := 'Cash payment is unavailable for pickup orders with a positive reservation fee.';
  v_reservation_insert text := E'if p_payment_method = ''cash'' and p_fulfillment = ''pickup'' and exists (\n    select 1\n    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity integer)\n    join public.product_variants v on v.id = i.variant_id\n    where v.reservation_minor > 0\n  ) then\n    raise exception ''Cash payment is unavailable for pickup orders with a positive reservation fee.'';\n  end if;\n  if p_payment_method = ''online'' and v_ebike';
begin
  v_function := pg_get_functiondef(
    'public.create_commerce_order(text,text,text,uuid,uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,jsonb,jsonb)'::regprocedure
  );
  if position(v_old in v_function) > 0 then
    v_function := replace(v_function, v_old, v_new);
  elsif position(v_new in v_function) = 0 then
    raise exception 'Could not safely update the checkout document requirement.';
  end if;
  v_function := replace(
    v_function,
    'Upload the required payment proof and identity documents.',
    'Submit payment proof after placing the order and upload any required identity documents.'
  );
  if position(v_reservation_guard in v_function) = 0 then
    if position(v_reservation_anchor in v_function) = 0 then
      raise exception 'Could not safely add the reservation payment requirement.';
    end if;
    v_function := replace(v_function, v_reservation_anchor, v_reservation_insert);
  end if;
  execute v_function;
end;
$$;

create unique index if not exists order_documents_one_payment_proof_idx
  on public.order_documents (order_id)
  where kind = 'payment_proof';
create index if not exists orders_unpaid_expiration_idx
  on public.orders (payment_expires_at)
  where payment_method = 'online' and status = 'awaiting_payment';

create or replace function public.customer_order_payment_details(p_order_id uuid)
returns table (
  order_id uuid,
  order_number text,
  status text,
  total_minor integer,
  online_due_minor integer,
  payment_expires_at timestamptz,
  payment_provider text,
  payment_reference text,
  recipient_name text,
  account_details text,
  payment_qr_path text,
  has_payment_proof boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in to view this order.';
  end if;
  return query
  select
    o.id, o.order_number, o.status, o.total_minor, o.online_due_minor,
    o.payment_expires_at, o.payment_provider, o.payment_reference,
    r.recipient_name, r.account_details, r.payment_qr_path,
    exists (
      select 1 from public.order_documents d
      where d.order_id = o.id and d.kind = 'payment_proof'
    )
  from public.orders o
  join public.payment_recipients r on r.id = o.payment_recipient_id
  where o.id = p_order_id
    and o.customer_id = auth.uid()
    and o.payment_method = 'online';
end;
$$;

create or replace function public.attach_order_payment_proof(
  p_order_id uuid,
  p_object_path text,
  p_payment_reference text
)
returns table (previous_object_path text, expired boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_file_metadata jsonb;
  v_file_size integer;
  v_content_type text;
  v_document_id uuid;
  v_previous_path text;
begin
  if v_user_id is null or not public.current_user_has_permission('storefront.access') then
    raise exception 'Sign in to submit payment proof.';
  end if;
  if p_payment_reference is not null and length(trim(p_payment_reference)) > 120 then
    raise exception 'Payment reference numbers must be 120 characters or fewer.';
  end if;

  select * into v_order
  from public.orders o
  where o.id = p_order_id and o.customer_id = v_user_id
  for update;
  if not found or v_order.payment_method <> 'online'
    or v_order.status not in ('awaiting_payment', 'awaiting_confirmation') then
    raise exception 'This order is not accepting payment proof.';
  end if;

  if v_order.status = 'awaiting_payment'
    and (v_order.payment_expires_at is null or v_order.payment_expires_at <= now()) then
    update public.orders set status = 'expired' where id = p_order_id;
    return query select null::text, true;
    return;
  end if;

  if p_object_path is null
    or split_part(p_object_path, '/', 1) <> v_user_id::text
    or split_part(p_object_path, '/', 3) <> ''
    or split_part(p_object_path, '/', 2) !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'The uploaded payment proof is invalid.';
  end if;
  select o.metadata into v_file_metadata
  from storage.objects o
  where o.bucket_id = 'njet-order-documents' and o.name = p_object_path;
  if not found or coalesce(v_file_metadata->>'size', '') !~ '^[0-9]{1,7}$' then
    raise exception 'The uploaded payment proof could not be verified.';
  end if;
  v_file_size := (v_file_metadata->>'size')::integer;
  v_content_type := v_file_metadata->>'mimetype';
  if v_file_size not between 1 and 5242880
    or v_content_type is null
    or v_content_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Payment proof must be a JPG, PNG, or WebP image up to 5 MB.';
  end if;

  select d.id, d.object_path into v_document_id, v_previous_path
  from public.order_documents d
  where d.order_id = p_order_id and d.kind = 'payment_proof'
  for update;
  if v_document_id is null then
    insert into public.order_documents (
      order_id, kind, object_path, content_type, file_size, uploaded_by
    ) values (
      p_order_id, 'payment_proof', p_object_path, v_content_type, v_file_size, v_user_id
    );
  else
    update public.order_documents
    set object_path = p_object_path,
        content_type = v_content_type,
        file_size = v_file_size,
        uploaded_by = v_user_id,
        created_at = now()
    where id = v_document_id;
  end if;

  update public.orders
  set payment_reference = nullif(trim(p_payment_reference), ''),
      status = case when status = 'awaiting_payment'
        then 'awaiting_confirmation' else status end
  where id = p_order_id;

  return query select v_previous_path, false;
end;
$$;

revoke all on function public.customer_order_payment_details(uuid)
  from public, anon;
grant execute on function public.customer_order_payment_details(uuid)
  to authenticated;
revoke all on function public.attach_order_payment_proof(uuid, text, text)
  from public, anon;
grant execute on function public.attach_order_payment_proof(uuid, text, text)
  to authenticated;

create or replace function public.expire_unpaid_online_orders()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.orders
  set status = 'expired'
  where payment_method = 'online'
    and status = 'awaiting_payment'
    and payment_expires_at <= now();
$$;
revoke all on function public.expire_unpaid_online_orders()
  from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job record;
begin
  for v_job in
    select jobid from cron.job where jobname = 'expire-unpaid-online-orders'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule(
    'expire-unpaid-online-orders',
    '* * * * *',
    'select public.expire_unpaid_online_orders();'
  );
end;
$$;

do $$
declare
  v_function text;
  v_old text := 'v_order.status not in (''awaiting_confirmation'', ''confirmed'')';
  v_new text := 'v_order.status not in (''awaiting_payment'', ''awaiting_confirmation'', ''confirmed'')';
begin
  v_function := pg_get_functiondef(
    'public.cancel_commerce_order(uuid)'::regprocedure
  );
  if position(v_old in v_function) > 0 then
    execute replace(v_function, v_old, v_new);
  elsif position(v_new in v_function) = 0 then
    raise exception 'Could not safely update order cancellation states.';
  end if;
end;
$$;

notify pgrst, 'reload schema';
