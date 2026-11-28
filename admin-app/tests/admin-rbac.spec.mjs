import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { actionContext } from './helpers/admin-action-test.mjs';

const { createRoleAction, deleteRoleAction } = await import('../data/actions/roles.ts');
const { clearAuditLogsAction } = await import('../data/actions/audit.ts');
const { getAdminAuditLogsAction } = await import('../data/actions/admin-audit-logs.ts');

function roleForm(values = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries({ slug: 'test_role', name: 'Test role', scope: 'staff', ...values })) {
    form.set(name, value);
  }
  return form;
}

test('signed-out and unauthorized callers cannot create or delete roles', async () => {
  for (const [profile, error] of [
    [null, 'You must be signed in.'],
    [{ scope: 'staff', permissions: ['admin.access', 'roles.read'] }, 'You do not have permission to manage roles.'],
  ]) {
    const context = actionContext(profile);
    await context.run(async () => {
      assert.deepEqual(await createRoleAction(roleForm()), { success: false, error });
      assert.deepEqual(await deleteRoleAction(randomUUID()), { success: false, error });
    });
    assert.deepEqual(context.calls, []);
  }
});

test('role management returns field errors and rejects an invalid deletion ID before DB access', async () => {
  const context = actionContext({ scope: 'staff', permissions: ['admin.access', 'roles.manage'] });
  await context.run(async () => {
    const form = roleForm({ slug: 'INVALID ROLE', name: '', scope: 'unknown' });
    form.append('permissions', 'invalid key');
    const result = await createRoleAction(form);
    assert.equal(result.success, false);
    assert.equal(result.error, 'Please fix the highlighted fields.');
    assert.deepEqual(Object.keys(result.fieldErrors).sort(), ['name', 'permissionKeys', 'scope', 'slug']);
    assert.deepEqual(await deleteRoleAction('invalid'), { success: false, error: 'Invalid role.' });
  });
  assert.deepEqual(context.calls, []);
});

test('audit readers cannot clear any or all logs, and customers cannot list audit logs', async () => {
  const reader = actionContext({
    scope: 'staff', permissions: ['admin.access', 'audit_logs.read'], is_full_access: false,
  });
  await reader.run(async () => {
    for (const selection of [null, [randomUUID()]]) {
      assert.deepEqual(await clearAuditLogsAction(selection), {
        success: false, error: 'Only full-access admins can clear audit logs.',
      });
    }
  });
  assert.deepEqual(reader.calls, []);

  const customer = actionContext({ scope: 'customer', permissions: ['storefront.access'] });
  await assert.rejects(() => customer.run(() => getAdminAuditLogsAction({ page: 1 })), {
    destination: '/?error=insufficient_permissions',
  });
  assert.deepEqual(customer.calls, []);
});

test('full access does not bypass audit selection validation', async () => {
  const admin = actionContext({ scope: 'staff', permissions: ['admin.access'], is_full_access: true });
  await admin.run(async () => {
    for (const selection of [[], ['invalid']]) {
      assert.deepEqual(await clearAuditLogsAction(selection), {
        success: false, error: 'Choose between 1 and 100 valid audit records.',
      });
    }
  });
  assert.deepEqual(admin.calls, []);
});
