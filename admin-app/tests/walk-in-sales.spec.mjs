import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { actionContext } from './helpers/admin-action-test.mjs';

const { createWalkInSaleAction } = await import('../data/actions/walk-in-sales.ts');
const { getWalkInCartPricing } = await import('../data/commerce/walk-in-sales.ts');

const staff = { scope: 'staff', permissions: ['admin.access', 'orders.manage'] };
const branchId = randomUUID();
const variantId = randomUUID();
const orderId = randomUUID();
const cashSale = {
  customerName: ' Test Customer ',
  contactNumber: '09171234567',
  branchId,
  paymentMethod: 'cash',
  paymentProvider: null,
  paymentReference: null,
  cashTenderedMinor: 50000,
  addressLine1: null,
  barangay: null,
  city: null,
  province: null,
  postalCode: null,
  homeCreditDetails: null,
  couponCode: ' TEST ',
  items: [{ variantId, quantity: 2 }],
};
const homeCreditSale = {
  ...cashSale,
  paymentMethod: 'home_credit',
  cashTenderedMinor: null,
  homeCreditDetails: {
    accountNo: ' HC-123 ',
    downpayment: '100.05',
    termsMonths: '12',
    monthlyPayment: '45.50',
  },
};

const sharedArgs = {
  p_customer_name: 'Test Customer',
  p_contact_number: cashSale.contactNumber,
  p_branch_id: branchId,
  p_address_line1: null,
  p_barangay: null,
  p_city: null,
  p_province: null,
  p_postal_code: null,
  p_items: [{ variant_id: variantId, quantity: 2 }],
  p_coupon_code: 'TEST',
};

test('walk-in sale rejects a missing customer or empty cart before RPC access', async () => {
  const context = actionContext(staff);
  for (const [payload, field] of [
    [{ ...cashSale, customerName: undefined }, 'customerName'],
    [{ ...cashSale, items: [] }, 'items'],
  ]) {
    const result = await context.run(() => createWalkInSaleAction(payload));
    assert.equal(result.success, false);
    assert.ok(result.fieldErrors[field]?.length);
  }
  assert.deepEqual(context.calls, []);
});

test('Home Credit rejects missing details, invalid downpayment and invalid terms before RPC access', async () => {
  const context = actionContext(staff);
  const details = homeCreditSale.homeCreditDetails;
  for (const homeCreditDetails of [
    null,
    { ...details, downpayment: '-1.00' },
    { ...details, downpayment: '1.005' },
    { ...details, termsMonths: '0' },
    { ...details, termsMonths: '121' },
  ]) {
    const result = await context.run(() => createWalkInSaleAction({ ...homeCreditSale, homeCreditDetails }));
    assert.equal(result.success, false);
    assert.ok(result.fieldErrors.homeCreditDetails?.length);
  }
  assert.deepEqual(context.calls, []);
});

test('cash and Home Credit sales send distinct normalized payloads to the checkout RPCs', async () => {
  const context = actionContext(staff, { rpc: () => ({ data: orderId, error: null }) });

  for (const sale of [cashSale, homeCreditSale]) {
    assert.deepEqual(await context.run(() => createWalkInSaleAction(sale)), {
      success: true, data: { orderId },
    });
  }
  assert.deepEqual(context.calls, [
    {
      name: 'create_walk_in_sale_with_discount',
      args: {
        ...sharedArgs,
        p_payment_method: 'cash',
        p_payment_provider: null,
        p_payment_reference: null,
        p_cash_tendered_minor: 50000,
      },
    },
    {
      name: 'create_walk_in_home_credit_sale_with_discount',
      args: {
        ...sharedArgs,
        p_home_credit_acc_no: 'HC-123',
        p_downpayment_minor: 10005,
        p_terms_months: 12,
        p_monthly_payment_minor: 4550,
      },
    },
  ]);
});

test('walk-in cart totals apply unit discounts and flag quantities above branch stock', () => {
  const pricing = getWalkInCartPricing(cashSale.items, [{
    variant_id: variantId, price_minor: 2000, discount_unit_minor: 500, stock: 1,
  }]);
  assert.equal(pricing.totalMinor, 4000);
  assert.equal(pricing.discountTotal, 1000);
  assert.equal(pricing.hasUnavailableItems, true);
  assert.equal(pricing.cartQuantities.get(variantId), 2);
});

test('walk-in checkout distinguishes a rejected sale from an uncertain outcome', async (t) => {
  t.mock.method(console, 'error', () => {});
  const payloads = [
    {
      rpc: () => ({ data: null, error: { code: 'P0001', message: 'Insufficient branch stock.' } }),
      expected: { success: false, error: 'Insufficient branch stock.' },
    },
    ...[
      () => ({ data: null, error: { code: '', message: 'Connection lost.' } }),
      () => ({ data: null, error: { code: '08006', message: 'Connection failure.' } }),
      () => ({ data: null, error: null }),
      () => { throw new Error('Connection lost'); },
    ].map((rpc) => ({
      rpc,
      expected: {
        success: false,
        error: 'The sale could not be confirmed. Check Orders before retrying.',
        outcomeUncertain: true,
      },
    })),
  ];

  for (const { rpc, expected } of payloads) {
    const context = actionContext(staff, { rpc });
    assert.deepEqual(await context.run(() => createWalkInSaleAction(cashSale)), expected);
    assert.equal(context.calls.length, 1);
  }
});
