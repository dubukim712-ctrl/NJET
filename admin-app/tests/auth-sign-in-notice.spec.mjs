import assert from 'node:assert/strict';
import test from 'node:test';
import { addSignInNotice, consumeSignInNotice } from '../lib/auth-sign-in-notice.ts';

test('an explicit sign-in notice is consumed once and preserves other URL state', () => {
  const url = new URL('https://example.test/checkout?coupon=SPRING#payment');
  assert.equal(consumeSignInNotice(url), false);
  addSignInNotice(url);
  assert.equal(consumeSignInNotice(url), true);
  assert.equal(consumeSignInNotice(url), false);
  assert.equal(url.href, 'https://example.test/checkout?coupon=SPRING#payment');
});
