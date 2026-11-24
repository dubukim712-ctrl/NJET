import assert from 'node:assert/strict';
import test from 'node:test';
import { toUserFriendlyError } from '../data/supabase/user-friendly-errors.ts';

const fallback = 'Could not save this product.';

test('explains a duplicate subcategory within its selected category', () => {
  const result = toUserFriendlyError({
    code: '23505',
    message: 'duplicate key value violates unique constraint "product_subcategories_category_slug_key"',
  }, fallback);
  assert.equal(result, 'A subcategory with this name or URL slug already exists under the selected category. Please choose a different name or URL slug.');
});

test('explains duplicates with unrecognized constraints without exposing identifiers', () => {
  assert.equal(toUserFriendlyError({
    code: '23505', constraint: 'internal_unique_index', details: 'Key (slug)=(private)',
  }, fallback), 'This value is already in use. Check your details and enter a different value.');
});

test('explains foreign-key failures without exposing internal references', () => {
  assert.equal(toUserFriendlyError({
    code: '23503', message: 'violates foreign key constraint "internal_product_ref"',
  }, fallback), 'This record cannot be deleted or changed because it is still linked to existing products, orders, or records.');
});

test('uses the supplied fallback for unknown SQL errors', () => {
  assert.equal(toUserFriendlyError({
    code: '42601', message: 'syntax error near SELECT * FROM internal_table', stack: 'at server.ts:17',
  }, fallback), fallback);
});

test('translates invalid inputs and fetch timeouts into safe guidance', () => {
  for (const code of ['22P02', '23514', '23502']) {
    assert.equal(toUserFriendlyError({ code }, fallback),
      'Some details are missing or invalid. Check the required fields and try again.');
  }
  assert.equal(toUserFriendlyError(new TypeError('fetch failed'), fallback),
    'The connection was interrupted or took too long. Check whether the change was saved before trying again.');
});

test('preserves exact order rejections and uses the fallback for unrecognized RPC text', () => {
  for (const message of [
    'The selected branch does not have enough stock for this cart.',
    'This order can no longer be cancelled.',
    'This order is not accepting payment proof.',
  ]) {
    assert.equal(toUserFriendlyError({ code: 'P0001', message }, fallback), message);
    assert.equal(toUserFriendlyError({ code: 'P0001', message: message + ' UPDATE private_table' }, fallback), fallback);
  }
});

test('explains branch and delivery-zone duplicates without exposing constraint identifiers', () => {
  assert.equal(toUserFriendlyError({
    code: '23505', constraint: 'branches_name_key',
  }, fallback), 'This branch name is already in use. Choose a different name.');
  assert.equal(toUserFriendlyError({
    code: '23505', message: 'violates unique constraint "delivery_zones_name_key"',
  }, fallback), 'This delivery zone name is already in use. Choose a different name.');
});

test('explains duplicate role names and email addresses without leaking constraint names', () => {
  assert.equal(toUserFriendlyError({ code: '23505', constraint: 'roles_name_key' }, fallback),
    'This role name is already in use. Choose a different name.');
  assert.equal(toUserFriendlyError({ code: '23505', constraint: 'user_profiles_email_key' }, fallback),
    'This email address is already in use.');
});

test('preserves reviewed appointment conflicts and hides unexpected RPC text', () => {
  const message = 'This technician already has an appointment in that 30-minute slot.';
  assert.equal(toUserFriendlyError({ code: 'P0001', message }, fallback), message);
  assert.equal(toUserFriendlyError({ code: 'P0001', message: message + ' SELECT * FROM private_table' }, fallback), fallback);
  assert.equal(toUserFriendlyError({ code: '23P01', constraint: 'internal_slot_constraint' }, fallback),
    'This time overlaps with an existing booking or closure. Choose another time.');
});
