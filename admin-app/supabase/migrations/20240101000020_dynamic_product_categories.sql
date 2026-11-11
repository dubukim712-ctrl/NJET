create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tracks_serial_inventory boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.product_categories
  add column if not exists tracks_serial_inventory boolean not null default false;
create unique index if not exists product_categories_slug_key
  on public.product_categories (slug);

alter table public.products
  drop constraint if exists products_category_type_fkey;
alter table public.product_subcategories
  drop constraint if exists product_subcategories_category_type_fkey;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_categories'
      and column_name = 'product_type'
  ) then
    execute 'update public.product_categories
      set tracks_serial_inventory = (product_type = ''ebike'')';
    alter table public.product_categories drop column product_type;
  end if;
end;
$$;

insert into public.product_categories (name, slug, tracks_serial_inventory)
values
  ('E-bike', 'ebike', true),
  ('Spare part', 'spare-parts', false),
  ('Accessory', 'accessories', false)
on conflict (slug) do nothing;

alter table public.products
  add column if not exists category_id uuid;
alter table public.product_subcategories
  add column if not exists category_id uuid;

update public.products p
set category_id = c.id
from public.product_categories c
where p.category_id is null
  and c.slug = case p.product_type
    when 'ebike' then 'ebike'
    when 'part' then 'spare-parts'
    else 'accessories'
  end;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_subcategories'
      and column_name = 'product_type'
  ) then
    update public.product_subcategories s
    set category_id = c.id
    from public.product_categories c
    where s.category_id is null
      and c.slug = case s.product_type
        when 'ebike' then 'ebike'
        when 'part' then 'spare-parts'
        else 'accessories'
      end;
  end if;
end;
$$;

alter table public.products alter column category_id set not null;
alter table public.product_subcategories alter column category_id set not null;

alter table public.products
  drop constraint if exists products_category_id_fkey;
alter table public.products
  add constraint products_category_id_fkey
  foreign key (category_id) references public.product_categories (id)
  on delete restrict;
alter table public.product_subcategories
  drop constraint if exists product_subcategories_category_id_fkey;
alter table public.product_subcategories
  add constraint product_subcategories_category_id_fkey
  foreign key (category_id) references public.product_categories (id)
  on delete restrict;

create index if not exists products_category_idx
  on public.products (category_id);
create index if not exists product_subcategories_category_idx
  on public.product_subcategories (category_id);

alter table public.product_subcategories
  drop constraint if exists product_subcategories_product_type_slug_key;
alter table public.product_subcategories
  drop constraint if exists product_subcategories_category_slug_key;
alter table public.product_subcategories
  add constraint product_subcategories_category_slug_key
  unique (category_id, slug);

drop trigger if exists product_subcategory_guard on public.products;
drop trigger if exists product_subcategory_type_guard on public.product_subcategories;
drop function if exists public.guard_subcategory_type_change();
alter table public.product_subcategories drop column if exists product_type;

drop trigger if exists product_categories_updated_at on public.product_categories;
create trigger product_categories_updated_at
  before update on public.product_categories
  for each row execute procedure public.handle_updated_at();

alter table public.product_categories enable row level security;
drop policy if exists "Storefront and staff can view product categories"
  on public.product_categories;
drop policy if exists "Product managers can manage product categories"
  on public.product_categories;
create policy "Storefront and staff can view product categories"
  on public.product_categories for select to authenticated
  using (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
    or public.current_user_has_permission('storefront.access')
  );
create policy "Product managers can manage product categories"
  on public.product_categories for all to authenticated
  using (public.current_user_has_permission('products.manage'))
  with check (public.current_user_has_permission('products.manage'));
grant select, insert, update on public.product_categories to authenticated;
revoke all on public.product_categories from public, anon;

create or replace function public.guard_product_subcategory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.subcategory_id is not null and not exists (
    select 1 from public.product_subcategories c
    where c.id = new.subcategory_id
      and c.category_id = new.category_id
      and (
        c.active
        or (tg_op = 'UPDATE' and c.id = old.subcategory_id)
      )
  ) then
    raise exception 'Choose an active subcategory for this main category.';
  end if;
  return new;
end;
$$;

create trigger product_subcategory_guard
  before insert or update of category_id, subcategory_id on public.products
  for each row execute procedure public.guard_product_subcategory();

create or replace function public.guard_product_category_tracking_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.tracks_serial_inventory <> old.tracks_serial_inventory
    and exists (
      select 1 from public.products p where p.category_id = old.id
      union all
      select 1 from public.product_subcategories s where s.category_id = old.id
    ) then
    raise exception 'Remove this category from products and subcategories before changing its inventory tracking.';
  end if;
  return new;
end;
$$;

drop trigger if exists product_category_tracking_guard on public.product_categories;
create trigger product_category_tracking_guard
  before update of tracks_serial_inventory on public.product_categories
  for each row execute procedure public.guard_product_category_tracking_change();

revoke all on function public.guard_product_subcategory() from public, anon, authenticated;
revoke all on function public.guard_product_category_tracking_change() from public, anon, authenticated;
notify pgrst, 'reload schema';
