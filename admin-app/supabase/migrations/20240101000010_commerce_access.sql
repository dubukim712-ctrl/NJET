-- ============================================================================
-- Commerce RLS, grants, and private order-document storage
-- Run after 20240101000009_commerce_schema.sql
-- ============================================================================

alter table public.branches enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_documents enable row level security;

create policy "Storefront and staff can view branches"
  on public.branches for select to authenticated
  using (
    public.current_user_has_permission('branches.read')
    or public.current_user_has_permission('branches.manage')
    or (active and public.current_user_has_permission('storefront.access'))
  );
create policy "Staff can manage branches"
  on public.branches for all to authenticated
  using (public.current_user_has_permission('branches.manage'))
  with check (public.current_user_has_permission('branches.manage'));

create policy "Storefront and staff can view products"
  on public.products for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
    or (active and public.current_user_has_permission('storefront.access'))
  );
create policy "Staff can manage products"
  on public.products for all to authenticated
  using (public.current_user_has_permission('products.manage'))
  with check (public.current_user_has_permission('products.manage'));

create policy "Storefront and staff can view product variants"
  on public.product_variants for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
    or (
      active
      and public.current_user_has_permission('storefront.access')
      and exists (select 1 from public.products p where p.id = product_id and p.active)
    )
  );
create policy "Staff can manage product variants"
  on public.product_variants for all to authenticated
  using (public.current_user_has_permission('products.manage'))
  with check (public.current_user_has_permission('products.manage'));

create policy "Storefront and staff can view branch stock"
  on public.branch_inventory for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
    or (
      public.current_user_has_permission('storefront.access')
      and exists (select 1 from public.branches b where b.id = branch_id and b.active)
      and exists (
        select 1 from public.product_variants v
        join public.products p on p.id = v.product_id
        where v.id = variant_id and v.active and p.active
      )
    )
  );
create policy "Staff can manage branch stock"
  on public.branch_inventory for all to authenticated
  using (public.current_user_has_permission('products.manage'))
  with check (public.current_user_has_permission('products.manage'));

create policy "Storefront and staff can view delivery zones"
  on public.delivery_zones for select to authenticated
  using (
    public.current_user_has_permission('delivery_zones.read')
    or public.current_user_has_permission('delivery_zones.manage')
    or (active and public.current_user_has_permission('storefront.access'))
  );
create policy "Staff can manage delivery zones"
  on public.delivery_zones for all to authenticated
  using (public.current_user_has_permission('delivery_zones.manage'))
  with check (public.current_user_has_permission('delivery_zones.manage'));

create policy "Customers and order readers can view orders"
  on public.orders for select to authenticated
  using (
    customer_id = auth.uid()
    or public.current_user_has_permission('orders.read')
    or public.current_user_has_permission('orders.manage')
  );
create policy "Customers and order readers can view order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or public.current_user_has_permission('orders.read')
          or public.current_user_has_permission('orders.manage')
        )
    )
  );
create policy "Customers and order readers can view order documents"
  on public.order_documents for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or public.current_user_has_permission('orders.read')
          or public.current_user_has_permission('orders.manage')
        )
    )
  );

grant select, insert, update on public.branches, public.products,
  public.product_variants, public.branch_inventory, public.delivery_zones to authenticated;
grant select on public.orders, public.order_items, public.order_documents to authenticated;
revoke all on public.branches, public.products, public.product_variants,
  public.branch_inventory, public.delivery_zones, public.orders, public.order_items,
  public.order_documents from public, anon;
revoke insert, update, delete on public.orders, public.order_items, public.order_documents
  from anon, authenticated;
revoke all on function public.validate_product_variant_reservation() from public, anon, authenticated;
revoke all on function public.prevent_product_type_reservation_conflict() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'njet-order-documents',
  'njet-order-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Customers upload documents into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'njet-order-documents'
    and public.current_user_has_permission('storefront.access')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Customers and order readers can view order documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'njet-order-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_has_permission('orders.read')
      or public.current_user_has_permission('orders.manage')
    )
  );
create policy "Customers can remove unlinked uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'njet-order-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.order_documents d where d.object_path = name
    )
  );

notify pgrst, 'reload schema';
