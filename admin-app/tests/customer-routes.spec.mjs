import assert from 'node:assert/strict';
import test from 'node:test';
import { isWithinRoute, normalizeAuthDestination, PROTECTED_CUSTOMER_ROUTES } from '../lib/customer-routes.ts';

test('legacy sign-in destinations preserve nested paths and URL state', () => {
  assert.equal(normalizeAuthDestination('/dashboard'), '/');
  assert.equal(normalizeAuthDestination('/dashboard/orders/123/receipt?print=1#items'), '/orders/123/receipt?print=1#items');
  assert.equal(normalizeAuthDestination('/orders/123'), '/orders/123');
});

test('sign-in destinations reject paths that could become external redirects', () => {
  for (const destination of ['https://example.com', '//example.com', '/\\example.com', '/dashboard//example.com']) {
    assert.equal(normalizeAuthDestination(destination), null);
  }
});

test('customer protection covers nested routes and keeps public pages accessible', () => {
  const protectedPath = (path) => PROTECTED_CUSTOMER_ROUTES.some((route) => isWithinRoute(path, route));
  assert.equal(protectedPath('/orders/123/receipt'), true);
  assert.equal(protectedPath('/appointments/new'), true);
  for (const path of ['/', '/help', '/orders-info']) assert.equal(protectedPath(path), false);
});
