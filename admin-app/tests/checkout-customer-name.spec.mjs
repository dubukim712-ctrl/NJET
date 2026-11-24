import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCheckoutCustomerName } from '../data/commerce/checkout-customer-name.ts';

test('checkout prefers the trimmed profile name over account metadata', () => {
  assert.equal(resolveCheckoutCustomerName('  Alex Santos  ', {
    full_name: 'Account Full Name', name: 'Account Name',
  }), 'Alex Santos');
});

test('checkout falls back to usable metadata or leaves the name field empty', () => {
  assert.equal(resolveCheckoutCustomerName('   ', {
    full_name: '  Account Full Name  ', name: 'Other Name',
  }), 'Account Full Name');
  assert.equal(resolveCheckoutCustomerName(null, { full_name: ' ', name: '  Account Name  ' }), 'Account Name');
  assert.equal(resolveCheckoutCustomerName('', { full_name: 42, name: '   ' }), '');
  assert.equal(resolveCheckoutCustomerName(undefined), '');
});
