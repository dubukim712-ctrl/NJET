import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const category = id(201);
const subcategory = id(202);

test('catalog filters and sorts across all active products before paging whole products', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.user', true), '')::uuid
    $$;
    create table public.product_categories (id uuid primary key, name text);
    create table public.product_subcategories (id uuid primary key, name text, active boolean);
    create table public.products (id uuid primary key, slug text, name text, description text, product_type text,
      category_id uuid, subcategory_id uuid, image_path text, is_demo boolean, active boolean);
    create table public.product_variants (id uuid primary key, product_id uuid, name text, sku text,
      price_minor integer, reservation_minor integer, home_credit_downpayment_minor integer, image_path text,
      specifications jsonb, active boolean);
    create table public.branches (id uuid primary key, active boolean);
    create table public.branch_inventory (variant_id uuid, branch_id uuid, stock integer);
    create table public.ebike_units (variant_id uuid, branch_id uuid, status text);
    create table public.product_reviews (product_id uuid, rating integer, status text);
    create table public.product_discounts (id uuid primary key, name text, coupon_code text, discount_type text,
      value integer, active boolean, starts_at timestamptz, ends_at timestamptz);
    create table public.product_discount_targets (discount_id uuid, product_variant_id uuid, product_category_id uuid);
    insert into public.product_categories values ('${id(200)}', 'Accessories'), ('${category}', 'E-bikes');
    insert into public.product_subcategories values ('${subcategory}', 'Cargo', true);
    insert into public.products
    select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'product-' || n,
      'Product ' || lpad(n::text, 3, '0'), case when n >= 125 then 'Trail specialist' else '' end,
      case when n >= 125 then 'ebike' else 'accessory' end,
      case when n >= 125 then '${category}'::uuid else '${id(200)}'::uuid end,
      case when n >= 125 then '${subcategory}'::uuid else null end, null, false, n <= 125
    from generate_series(1, 126) n;
    insert into public.product_variants
    select gen_random_uuid(), p.id, 'Variant ' || lpad(n::text, 3, '0'), p.slug || '-' || n,
      case when p.slug = 'product-125' then 150 else 100 end,
      0, 0, null, null, n <= 510
    from public.products p
    cross join lateral generate_series(1, case when p.slug = 'product-125' then 511 else 1 end) n;
    insert into public.branches values ('${id(203)}', true), ('${id(204)}', false);
    insert into public.ebike_units values
      ((select id from public.product_variants where sku = 'product-125-510'), '${id(203)}', 'in_stock'),
      ((select id from public.product_variants where sku = 'product-125-510'), '${id(204)}', 'in_stock'),
      ((select id from public.product_variants where sku = 'product-125-510'), '${id(203)}', 'warranty_reserved');
    insert into public.product_reviews values ('${id(125)}', 5, 'published'), ('${id(125)}', 1, 'hidden');
    insert into public.product_discounts values ('${id(205)}', 'Automatic sale', null, 'fixed', 75, true, null, null);
    insert into public.product_discount_targets
    select '${id(205)}', id, null from public.product_variants where sku = 'product-125-510';
  `);
  const migration = (file) => readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8');
  const discountSql = await migration('20240101000086_product_discount_pricing.sql');
  await db.exec(discountSql.slice(discountSql.indexOf('create or replace function public.resolve_product_discount'),
    discountSql.indexOf('create or replace function public.active_variant_discounts')));
  await db.exec(await migration('20240101000131_storefront_catalog_pagination.sql'));
  await db.exec(`
    alter table branches add column name text;
    alter table branches add column address text;
    update branches set name = 'Hillsview', address = 'Naic, Cavite';
    alter table product_reviews alter column rating type smallint;
    alter table product_reviews add column id uuid default gen_random_uuid(),
      add column customer_id uuid, add column order_item_id uuid, add column comment text,
      add column is_anonymous boolean, add column created_at timestamptz default now();
    create table users (id uuid primary key, full_name text, avatar_url text);
    create table orders (id uuid primary key, branch_id uuid, customer_id uuid, status text);
    create table order_items (id uuid primary key, order_id uuid, variant_id uuid not null references product_variants(id), variant_name text);
    insert into users values ('${id(206)}', 'Anonymous Test Rider', null);
    insert into orders values ('${id(207)}', '${id(203)}', '${id(206)}', 'completed');
    insert into order_items
    select '${id(208)}', '${id(207)}', id, name from product_variants where sku = 'product-125-510';
    update product_reviews set customer_id = '${id(206)}', order_item_id = '${id(208)}',
      comment = 'A published order review.', is_anonymous = true;
  `);
  await db.exec(await migration('20240101000139_storefront_landing.sql'));
  await db.exec('drop function if exists public.published_product_reviews(uuid, integer, integer);');
  const reviewProfile = await migration('20240101000109_published_review_profiles.sql');
  await db.exec(reviewProfile.replace('drop function public.published_product_reviews', 'drop function if exists public.published_product_reviews'));
  await db.exec(await migration('20240101000140_storefront_featured_polish.sql'));
  await db.exec(await migration('20240101000141_storefront_branch_catalog.sql'));
  await db.exec(await migration('20240101000143_preserve_published_review_ratings.sql'));
  await db.exec(await migration('20240101000144_rank_storefront_verified_reviews.sql'));
  await db.exec(`
    update products set product_type = 'ebike' where slug = 'product-124';
    insert into product_reviews (product_id, rating, status, customer_id, order_item_id, comment, is_anonymous, created_at)
    select product_id, 5, 'published', customer_id, order_item_id, placeholder, true, now() + interval '1 day'
    from product_reviews
    cross join unnest(array['test', '  TEST REVIEW 123!', '   ', 'nice']) as placeholder
    where status = 'published';
  `);

  async function page({ search = '', categoryId = null, subcategoryId = null, inStock = false, sort = 'featured', number = 1 } = {}) {
    const result = await db.query('select public.storefront_catalog_page($1,$2,$3,$4,$5,$6,24) as catalog',
      [search, categoryId, subcategoryId, inStock, sort, number]);
    return result.rows[0].catalog;
  }

  await db.exec('grant execute on function public.storefront_catalog(text,uuid[]) to anon; set role anon');
  const featured = (await db.query("select public.storefront_catalog_page('',null,null,false,'featured',1,4,null,'ebike') as catalog")).rows[0].catalog;
  assert.deepEqual(featured.products.map((product) => product.slug), ['product-125', 'product-124']);
  assert.deepEqual(featured.products[0].variants.at(-1).stockByBranch,
    [{ branchId: id(203), available: true, stock: null }]);
  const reviews = await db.query('select slug, reviewer_name, branch_name from public.storefront_home_reviews() where comment is not null');
  assert.deepEqual(reviews.rows, [{ slug: 'product-125', reviewer_name: null, branch_name: 'Hillsview' }]);
  const detailReviews = await db.query('select comment from public.published_product_reviews($1, 4, 0)', [id(125)]);
  assert.deepEqual(detailReviews.rows, Array.from({ length: 4 }, () => ({ comment: null })));
  const nextReviews = await db.query('select comment from public.published_product_reviews($1, 4, 4)', [id(125)]);
  assert.deepEqual(nextReviews.rows, [{ comment: 'A published order review.' }]);
  const byBranch = async (branchId) => (await db.query(
    "select public.storefront_catalog_page('',null,null,false,'featured',1,24,null,null,$1) as catalog", [branchId],
  )).rows[0].catalog;
  const branchCatalog = await byBranch(id(203));
  assert.deepEqual(branchCatalog.products.map((product) => product.slug), ['product-125']);
  assert.deepEqual(branchCatalog.products[0].stockSummary, { available: true, stock: null });
  assert.equal((await byBranch(id(204))).total, 0);
  const first = await page();
  assert.equal(first.products[0].slug, 'product-125');
  assert.equal(first.total, 125);
  assert.equal(first.products.length, 24);
  assert.ok(first.facets.some((facet) => facet.category_id === category && facet.subcategory_id === subcategory));
  assert.deepEqual((await page({ number: 6 })).products.map((product) => product.slug),
    ['product-120', 'product-121', 'product-122', 'product-123', 'product-124']);
  const [later] = (await page({ search: '  TRAIL specialist  ' })).products;
  assert.equal(later.slug, 'product-125');
  assert.equal(later.variants.length, 510);
  assert.deepEqual(later.stockSummary, { available: true, stock: null });
  assert.deepEqual(later.ratingSummary, { averageRating: 5, reviewCount: 5 });
  assert.deepEqual((await page({ categoryId: category, subcategoryId: subcategory })).products.map((p) => p.slug), ['product-125']);
  assert.deepEqual((await page({ inStock: true })).products.map((p) => p.slug), ['product-125']);
  assert.equal((await page({ sort: 'price-asc' })).products[0].slug, 'product-125');
  assert.equal((await page({ sort: 'price-desc', number: 6 })).products.at(-1).slug, 'product-125');
  assert.equal((await page({ search: '%' })).total, 0);
  assert.deepEqual((await page({ number: 7 })).products, []);

  await db.exec('set role authenticated');
  await db.query("select set_config('test.user',$1,false)", [id(999)]);
  const [signedIn] = (await page({ inStock: true })).products;
  assert.deepEqual(signedIn.stockSummary, { available: true, stock: 1 });
  assert.equal((await byBranch(id(203))).products[0].stockSummary.stock, 1);
  const [detail] = (await db.query(`select public.storefront_catalog_page('',null,null,false,'featured',1,1,'product-125') as catalog`)).rows[0].catalog.products;
  assert.equal(detail.variants.length, 510);
  assert.deepEqual(detail.variants.at(-1).stockByBranch, [{ branchId: id(203), available: true, stock: 1 }]);
  const cart = await db.query('select product_slug, sku from public.storefront_catalog(null,$1)', [[detail.variants.at(-1).id]]);
  assert.deepEqual(cart.rows, [{ product_slug: 'product-125', sku: 'product-125-510' }]);
  await db.exec('reset role');
  await db.exec(`
    insert into product_reviews (product_id, rating, status, customer_id, order_item_id, comment, is_anonymous, created_at)
    select product_id, score, 'published', customer_id, order_item_id, 'Verified comment ' || score, true, now() + interval '2 days'
    from product_reviews
    cross join unnest(array[2,3,4]) as score
    where comment = 'A published order review.' and status = 'published';
  `);
  await db.exec('set role anon');
  const topReviews = await db.query('select comment, rating from public.storefront_home_reviews()');
  assert.deepEqual(topReviews.rows, [
    { comment: 'A published order review.', rating: 5 },
    { comment: 'Verified comment 4', rating: 4 },
    { comment: 'Verified comment 3', rating: 3 },
  ]);
  await db.exec("reset role; update product_reviews set comment = null; set role anon");
  const ratingsOnly = await db.query('select comment, rating from public.storefront_home_reviews()');
  assert.deepEqual(ratingsOnly.rows, []);
});
