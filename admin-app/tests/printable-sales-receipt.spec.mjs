import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { formatPhp } from '../lib/commerce.ts';
import { buildSalesReceiptData } from '../data/commerce/sales-receipt-data.ts';

const mocks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
    if (specifier === '@/data/supabase/service') {
      return { url: 'data:text/javascript,export function createServiceClient() { throw new Error("Privileged query before authorization"); }', shortCircuit: true };
    }
    if (specifier === '@/data/commerce/sales-receipt-data') {
      return nextResolve(new URL('../data/commerce/sales-receipt-data.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { getPrintableReceipt } = await import('../data/commerce/printable-receipt.ts');
mocks.deregister();

test('receipt checks completed status, ownership or branch before privileged reads', async () => {
  for (const [scope, expected] of [
    [{ customerId: 'customer' }, ['customer_id', 'customer']],
    [{ branchId: 'branch' }, ['branch_id', 'branch']],
  ]) {
    const conditions = [];
    const query = {
      select: () => query,
      eq: (...args) => { conditions.push(args); return query; },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const supabase = { from: (table) => { assert.equal(table, 'orders'); return query; } };
    assert.equal(await getPrintableReceipt(supabase, 'order', scope), null);
    assert.deepEqual(conditions, [['id', 'order'], ['status', 'completed'], expected]);
  }
});

test('receipt assembles per-item serials, promo labels, totals, and finance details', () => {
  const receipt = buildSalesReceiptData({
    order: { order_number: 'NJET-42', customer_name: 'Customer', contact_number: '09123456789',
      branch_name: 'Naic', fulfillment: 'pickup', payment_method: 'home_credit',
      total_minor: 18000, discount_total_minor: 2000, applied_coupon_code: 'NJET-TEST', delivery_fee_minor: 0,
      balance_due_minor: 3000, completed_at: '2026-11-28T02:00:00Z' },
    invoiceNo: 'SI-42',
    items: [{ id: 'bike', product_name: 'Bike', product_type: 'ebike', variant_name: 'Red',
      sku: 'BK-R', quantity: 2, unit_price_minor: 9000, regular_unit_price_minor: 10000,
      discount_name_snapshot: 'Promo' }],
    payments: [{ transaction_type: 'collection', amount_minor: 7000 },
      { transaction_type: 'financing', amount_minor: 9000 }, { transaction_type: 'refund', amount_minor: 1000 }],
    business: { business_name: 'NJET', address: 'Cavite', phone: '', email: '' },
    branchAddress: 'Naic, Cavite',
    homeCredit: { home_credit_acc_no: 'A-42', terms_months: 12, downpayment_minor: 6000, monthly_payment_minor: 1000 },
    units: [{ order_item_id: 'bike', serial_number: 'SN-1', motor_number: 'M-1' },
      { order_item_id: 'bike', serial_number: 'SN-2', motor_number: 'M-2' },
      { order_item_id: 'different', serial_number: 'SN-3', motor_number: 'M-3' }],
  });
  assert.equal(receipt.invoiceNo, 'SI-42');
  assert.match(receipt.issuedAt, /10:00/);
  assert.deepEqual(receipt.items[0].units.map(unit => [unit.serial_number, unit.motor_number]), [['SN-1', 'M-1'], ['SN-2', 'M-2']]);
  assert.equal(receipt.items[0].lineTotal, 18000);
  assert.deepEqual(receipt.promotions, ['Promo', 'NJET-TEST']);
  assert.deepEqual([receipt.subtotal, receipt.discount, receipt.total, receipt.amountPaid, receipt.balanceDue], [20000, 2000, 18000, 15000, 3000]);
  assert.equal(receipt.homeCredit.home_credit_acc_no, 'A-42');
  assert.equal(receipt.paymentStatus, 'Balance due');

  const source = readFileSync(new URL('../components/commerce/PrintableSalesReceipt.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } });
  const require = createRequire(import.meta.url);
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    if (name === 'next/link') return { default: (props) => createElement('a', props) };
    if (name === '@/lib/commerce') return { formatPhp };
    if (name === '@/components/commerce/PrintReceiptButton') {
      return { PrintReceiptButton: () => createElement('button', null, 'Print Receipt') };
    }
    return require(name);
  }, compiled, compiled.exports);
  const html = renderToStaticMarkup(createElement(compiled.exports.PrintableSalesReceipt, {
    receipt, logoUrl: null, backHref: '/dashboard/orders/example',
  }));
  assert.match(html, /<h1[^>]*>Sales Receipt<\/h1>/);
  assert.match(html, /Serial Number SN-1[^<]*Motor Number M-1/);
  assert.match(html, /NJET-TEST/);
  assert.match(html, /Back to Order/);
  assert.match(html, /print:hidden/);
  assert.match(html, /@page \{ size: auto; margin: 12mm; \}/);
});
