import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { getStorefrontStockLabel } from '../data/commerce/storefront-stock-label.ts';
import { addCartItem, getAvailableQuantityLimit, setCartItemQuantity } from '../data/cart.ts';

const variantId = '00000000-0000-4000-8000-000000000001';
const branchId = '00000000-0000-4000-8000-000000000002';
const otherBranch = '00000000-0000-4000-8000-000000000003';

test('cart adds and increments respect the selected branch limit', () => {
  const stock = [
    { branchId, available: true, stock: 2 },
    { branchId: otherBranch, available: true, stock: 8 },
  ];
  const limit = getAvailableQuantityLimit(stock, branchId);
  assert.equal(limit, 2);
  const added = addCartItem([], variantId, limit, branchId);
  assert.equal(added.success, true);
  const incremented = setCartItemQuantity(added.items, variantId, 7, limit);
  assert.deepEqual(incremented, { success: true, items: [{ variantId, branchId, quantity: 2 }] });
  const blocked = addCartItem(incremented.items, variantId, limit, branchId);
  assert.deepEqual(blocked, { success: false, error: 'Maximum available quantity in cart.' });
  assert.equal(setCartItemQuantity(incremented.items, variantId, 3, limit).success, false);
  assert.equal(addCartItem(incremented.items, variantId, 1, otherBranch).success, false);
});

test('stock RPCs show exact counts only when authenticated and preserve quantity checks', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.auth_uid', true), '')::uuid $$;
    create table products (id uuid primary key, active boolean, product_type text);
    create table product_variants (id uuid primary key, product_id uuid, active boolean);
    create table branches (id uuid primary key, active boolean, name text not null default 'Branch');
    create table branch_inventory (variant_id uuid, branch_id uuid, stock integer);
    create table ebike_units (variant_id uuid, branch_id uuid, status text);
  `);
  const migration = new URL('../supabase/migrations/20240101000104_storefront_cart_availability.sql', import.meta.url);
  await db.exec(await readFile(migration, 'utf8'));
  const visibility = new URL('../supabase/migrations/20240101000108_authenticated_stock_visibility.sql', import.meta.url);
  await db.exec(await readFile(visibility, 'utf8'));
  await db.query("insert into products values ($1, true, 'part')", [variantId]);
  await db.query('insert into product_variants values ($1, $1, true)', [variantId]);
  await db.query('insert into branches (id, active) values ($1, true), ($2, true)', [branchId, otherBranch]);
  await db.query('insert into branch_inventory values ($1, $2, 1), ($1, $3, 5)', [variantId, branchId, otherBranch]);
  const canOrder = async (branch, quantity) => (await db.query(
    'select storefront_can_order_quantity($1, $2, $3) as available', [variantId, branch, quantity],
  )).rows[0].available;
  const branchStock = async () => (await db.query(
    'select available, stock from storefront_variant_availability(array[$1]::uuid[]) where branch_id = $2',
    [variantId, branchId],
  )).rows[0];
  const summaryStock = async () => (await db.query(
    'select available, stock from storefront_variant_stock_summary(array[$1]::uuid[])', [variantId],
  )).rows[0];

  await db.exec('set role anon');
  assert.deepEqual(await branchStock(), { available: true, stock: null });
  assert.deepEqual(await summaryStock(), { available: true, stock: null });
  await db.exec("set role authenticated; select set_config('test.auth_uid', '00000000-0000-4000-8000-000000000010', false)");
  assert.deepEqual(await branchStock(), { available: true, stock: 1 });
  assert.deepEqual(await summaryStock(), { available: true, stock: 6 });
  await db.exec("select set_config('test.auth_uid', '', false); set role anon");
  assert.equal(await canOrder(branchId, 1), true);
  assert.equal(await canOrder(branchId, 2), false);
  assert.equal(await canOrder(otherBranch, 2), true);
  await db.exec("reset role; update products set product_type = 'ebike'");
  await db.query("insert into ebike_units values ($1, $2, 'in_stock'), ($1, $2, 'sold')", [variantId, branchId]);
  await db.exec('set role anon');
  assert.equal(await canOrder(branchId, 1), true);
  assert.equal(await canOrder(branchId, 2), false);
  assert.equal(await canOrder(otherBranch, 1), false);
  await db.exec("set role authenticated; select set_config('test.auth_uid', '00000000-0000-4000-8000-000000000010', false)");
  assert.deepEqual(await branchStock(), { available: true, stock: 1 });
  assert.deepEqual(await summaryStock(), { available: true, stock: 1 });
});

test('stock labels hide numeric counts for guests and show them to signed-in shoppers', () => {
  assert.equal(getStorefrontStockLabel({ available: true, stock: 1 }, false), 'Available');
  assert.equal(getStorefrontStockLabel({ available: true, stock: 1 }, true), '1 in stock');
  assert.equal(getStorefrontStockLabel({ available: true, stock: null }, true), 'Available');
  assert.equal(getStorefrontStockLabel({ available: false, stock: null }, false), 'Out of stock');
});
