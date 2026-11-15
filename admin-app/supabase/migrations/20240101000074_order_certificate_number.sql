alter table public.order_certificates
  add column certificate_number text;

update public.order_certificates c
set certificate_number = 'CO-' || o.order_number
from public.orders o
where o.id = c.order_id;

alter table public.order_certificates
  alter column certificate_number set not null,
  add constraint order_certificates_certificate_number_check
    check (
      length(btrim(certificate_number)) between 1 and 80
      and certificate_number !~ '[[:cntrl:]]'
    );

drop function public.save_order_certificate(uuid, text, integer, text);

create function public.save_order_certificate(
  p_order_id uuid,
  p_object_path text,
  p_file_size integer,
  p_template_version text,
  p_certificate_number text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_certificate_number text;
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

  if p_certificate_number is null then
    v_certificate_number := 'CO-' || v_order.order_number;
  else
    v_certificate_number := btrim(p_certificate_number);
    if length(v_certificate_number) not between 1 and 80
      or v_certificate_number ~ '[[:cntrl:]]' then
      raise exception 'Enter a certificate number between 1 and 80 characters.';
    end if;
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
    order_id, certificate_number, object_path, file_size, generated_by,
    template_version, generated_at
  ) values (
    p_order_id, v_certificate_number, p_object_path, p_file_size, auth.uid(),
    p_template_version, now()
  )
  on conflict (order_id) do update set
    certificate_number = excluded.certificate_number,
    object_path = excluded.object_path,
    file_size = excluded.file_size,
    generated_by = excluded.generated_by,
    template_version = excluded.template_version,
    generated_at = excluded.generated_at;
end;
$$;

revoke all on function public.save_order_certificate(
  uuid, text, integer, text, text
) from public, anon;
grant execute on function public.save_order_certificate(
  uuid, text, integer, text, text
) to authenticated;

notify pgrst, 'reload schema';
