import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import ts from 'typescript';

const request = new AsyncLocalStorage();
const appRoot = new URL('../../', import.meta.url);
const clientModule = 'data:text/javascript,' + encodeURIComponent(
  'export { mockServerClient as createClient } from ' + JSON.stringify(import.meta.url),
);
const navigationModule = 'data:text/javascript,' + encodeURIComponent(
  'export function redirect(destination) { throw Object.assign(new Error("Test redirect"), { destination }); }',
);
const orderEmailModule = 'data:text/javascript,export function queueOrderStatusEmail() {}';
const cacheModule = 'data:text/javascript,export function revalidatePath() {}';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/data/supabase/server') return nextResolve(clientModule, context);
    if (specifier === 'next/navigation') return nextResolve(navigationModule, context);
    if (specifier === '@/data/email/order-status-email') return nextResolve(orderEmailModule, context);
    if (specifier === 'next/cache') return nextResolve(cacheModule, context);
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(specifier.slice(2) + '.ts', appRoot).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(appRoot.href) || !url.endsWith('.ts') || url.includes('/node_modules/')) {
      return nextLoad(url, context);
    }
    // The app also uses parameter properties, which require TS transformation.
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  },
});

export function mockServerClient() {
  const client = request.getStore();
  assert.ok(client, 'No mock Supabase client was provided');
  return client;
}

export function actionContext(profile, { rpc, from } = {}) {
  const user = profile ? { id: randomUUID() } : null;
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: profile, error: null }),
            }),
          }),
        };
      }

      calls.push({ table });
      assert.ok(from, 'Unexpected database table access: ' + table);
      return from(table);
    },
    async rpc(name, args) {
      calls.push({ name, args });
      assert.ok(rpc, 'Unexpected RPC: ' + name);
      return rpc(name, args);
    },
  };

  return { calls, run: (callback) => request.run(client, callback) };
}
