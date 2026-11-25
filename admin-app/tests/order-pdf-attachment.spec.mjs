import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileOrderPdfAttachment } from '../data/commerce/order-pdf-attachment.ts';

const path = 'order/new.pdf';
const ambiguous = { code: 'PGRST003', message: 'Timed out' };
const fail = async () => ({ error: ambiguous });

test('a lost PDF save response succeeds when the exact upload is attached', async () => {
  const result = await reconcileOrderPdfAttachment(fail, async () => ({ data: { object_path: path }, error: null }), path);
  assert.deepEqual(result, { status: 'attached' });
});

test('an unreadable or different attachment stays uncertain', async () => {
  for (const response of [{ data: null, error: ambiguous }, { data: { object_path: 'order/old.pdf' }, error: null }]) {
    assert.deepEqual(await reconcileOrderPdfAttachment(fail, async () => response, path), { status: 'uncertain' });
  }
});

test('success and explicit SQL rejection require no reconciliation read', async () => {
  const read = () => assert.fail('An unambiguous response must not trigger a second query.');
  assert.deepEqual(await reconcileOrderPdfAttachment(async () => ({ error: null }), read, path), { status: 'attached' });
  const error = { code: '23514', message: 'constraint failed' };
  assert.deepEqual(await reconcileOrderPdfAttachment(async () => ({ error }), read, path), { status: 'rejected', error });
});
