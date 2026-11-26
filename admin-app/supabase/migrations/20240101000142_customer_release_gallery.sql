create table public.customer_releases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  image_path text not null unique check (image_path ~ '^releases/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  image_url text generated always as ('/storage/v1/object/public/njet-storefront-branding/' || image_path) stored,
  customer_name text check (length(customer_name) <= 80),
  product_id uuid references public.products(id) on delete set null,
  model_name text check (length(model_name) <= 120),
  branch_id uuid references public.branches(id) on delete set null,
  branch_name text check (length(branch_name) <= 120),
  caption text check (length(caption) <= 500),
  is_approved boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  display_order integer not null default 0 check (display_order between -1000 and 1000),
  created_at timestamptz not null default now()
);

create index customer_releases_public_idx on public.customer_releases (display_order, created_at desc, id)
  where is_approved;

alter table public.customer_releases enable row level security;
revoke all on public.customer_releases from public, anon, authenticated;
grant select (id, image_path, image_url, customer_name, model_name, branch_name, caption, is_approved, display_order, created_at)
  on public.customer_releases to anon;
grant select, delete on public.customer_releases to authenticated;
grant insert (order_id, image_path, customer_name, product_id, model_name, branch_id,
  branch_name, caption, is_approved, uploaded_by, display_order) on public.customer_releases to authenticated;
grant update (order_id, customer_name, product_id, model_name, branch_id, branch_name,
  caption, is_approved, display_order) on public.customer_releases to authenticated;

create policy "Published releases are public" on public.customer_releases
  for select to anon, authenticated using (is_approved);

create policy "Staff can read their releases" on public.customer_releases
  for select to authenticated using (
    public.current_user_is_full_access() or (
      uploaded_by = auth.uid() and public.current_user_has_permission('orders.read')
      and public.current_user_has_permission('admin.access')
    )
  );

create policy "Staff can submit releases" on public.customer_releases
  for insert to authenticated with check (
    auth.uid() = uploaded_by
    and split_part(image_path, '/', 2) = auth.uid()::text
    and exists (select 1 from storage.objects s
      where s.bucket_id = 'njet-storefront-branding' and s.name = image_path)
    and (order_id is null or exists (
      select 1 from public.orders o where o.id = order_id and o.status = 'completed'
        and public.current_user_can_access_branch(o.branch_id)
    ))
    and (public.current_user_is_full_access() or (
      public.current_user_has_permission('admin.access')
      and public.current_user_has_permission('orders.read')
      and not is_approved and display_order = 0
      and (branch_id is null or public.current_user_can_access_branch(branch_id))
    ))
  );

create policy "Admins can manage releases" on public.customer_releases
  for update to authenticated using (public.current_user_is_full_access())
  with check (public.current_user_is_full_access() and (
    order_id is null or exists (select 1 from public.orders o where o.id = order_id and o.status = 'completed')
  ));

create policy "Staff can remove eligible releases" on public.customer_releases
  for delete to authenticated using (
    public.current_user_is_full_access() or (
      uploaded_by = auth.uid() and not is_approved
      and public.current_user_has_permission('admin.access')
      and public.current_user_has_permission('orders.read')
    )
  );

create function public.release_image_is_published(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.customer_releases r where r.image_path = p_path and r.is_approved);
$$;

revoke all on function public.release_image_is_published(text) from public;
grant execute on function public.release_image_is_published(text) to anon, authenticated;

alter policy "Storefront branding is public" on storage.objects using (
  bucket_id = 'njet-storefront-branding'
  and (name not like 'releases/%' or public.release_image_is_published(name))
);

create policy "Staff can read release images" on storage.objects for select to authenticated
  using (bucket_id = 'njet-storefront-branding' and name like 'releases/%'
    and (public.current_user_is_full_access() or split_part(name, '/', 2) = auth.uid()::text));

create policy "Staff can upload release images" on storage.objects for insert to authenticated
  with check (bucket_id = 'njet-storefront-branding'
    and name ~ '^releases/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(name, '/', 2) = auth.uid()::text
    and (public.current_user_is_full_access() or (
      public.current_user_has_permission('admin.access') and public.current_user_has_permission('orders.read')
    )));

create function public.release_image_is_attached(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.customer_releases r where r.image_path = p_path);
$$;

revoke all on function public.release_image_is_attached(text) from public;
grant execute on function public.release_image_is_attached(text) to authenticated;

create policy "Attached release images cannot be removed" on storage.objects
  as restrictive for delete to authenticated using (
    bucket_id <> 'njet-storefront-branding' or name not like 'releases/%'
    or not public.release_image_is_attached(name)
  );

create policy "Staff can remove their unused release images" on storage.objects for delete to authenticated
  using (bucket_id = 'njet-storefront-branding' and name like 'releases/%'
    and split_part(name, '/', 2) = auth.uid()::text
    and public.current_user_has_permission('admin.access') and public.current_user_has_permission('orders.read'));

notify pgrst, 'reload schema';
