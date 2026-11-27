type ReceiptOrder = {
  order_number: string; customer_name: string; contact_number: string; branch_name: string;
  fulfillment: string; address_line1: string | null; barangay: string | null;
  city: string | null; province: string | null; postal_code: string | null;
  payment_method: string; payment_provider: string | null; total_minor: number;
  discount_total_minor: number; delivery_fee_minor: number; balance_due_minor: number;
  home_credit_downpayment_due_minor: number; applied_coupon_code: string | null;
  completed_at: string | null; updated_at: string;
};

type ReceiptItem = {
  id: string; product_name: string; product_type: string; variant_name: string; sku: string;
  quantity: number; unit_price_minor: number; regular_unit_price_minor: number;
  discount_name_snapshot: string | null;
};

type ReceiptPayment = { transaction_type: 'collection' | 'refund' | 'financing'; amount_minor: number };
type Business = { business_name: string; address: string; phone: string; email: string };
type HomeCredit = { home_credit_acc_no: string; downpayment_minor: number; terms_months: number; monthly_payment_minor: number };
type Unit = { order_item_id: string | null; serial_number: string | null; motor_number: string | null };

export function buildSalesReceiptData({
  order, invoiceNo, items, payments, business, homeCredit, branchAddress, units,
}: {
  order: ReceiptOrder; invoiceNo: string | null; items: ReceiptItem[];
  payments: ReceiptPayment[]; business: Business; homeCredit: HomeCredit | null;
  branchAddress: string; units: Unit[];
}) {
  const amountPaid = payments.reduce((sum, payment) =>
    sum + (payment.transaction_type === 'refund' ? -payment.amount_minor : payment.amount_minor), 0);
  const promotions = [...new Set([
    ...items.flatMap((item) => item.discount_name_snapshot ? [item.discount_name_snapshot] : []),
    ...(order.applied_coupon_code ? [order.applied_coupon_code] : []),
  ])];
  return {
    business,
    orderNumber: order.order_number,
    receiptNumber: invoiceNo ?? order.order_number,
    invoiceNo,
    issuedAt: new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila',
    }).format(new Date(order.completed_at ?? order.updated_at)),
    branchName: order.branch_name,
    branchAddress,
    customerName: order.customer_name,
    contactNumber: order.contact_number,
    address: [order.address_line1, order.barangay, order.city, order.province, order.postal_code].filter(Boolean).join(', '),
    fulfillment: order.fulfillment === 'delivery' ? 'Delivery' : 'Store Pickup',
    paymentMethod: [order.payment_method, order.payment_provider].filter(Boolean)
      .map((value) => value!.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())).join(' · '),
    paymentStatus: order.balance_due_minor > 0 ? 'Balance due' : 'Paid',
    items: items.map((item) => ({
      ...item,
      lineTotal: item.unit_price_minor * item.quantity,
      units: item.product_type === 'ebike' ? units.filter((unit) => unit.order_item_id === item.id) : [],
    })),
    subtotal: items.reduce((sum, item) => sum + item.regular_unit_price_minor * item.quantity, 0),
    discount: order.discount_total_minor,
    promotions,
    deliveryFee: order.delivery_fee_minor,
    total: order.total_minor,
    amountPaid: payments.length ? amountPaid : Math.max(0, order.total_minor - order.balance_due_minor),
    balanceDue: order.balance_due_minor,
    homeCreditDownpayment: order.payment_method === 'home_credit' ? order.home_credit_downpayment_due_minor : null,
    homeCredit: order.payment_method === 'home_credit' ? homeCredit : null,
  };
}

export type SalesReceiptData = ReturnType<typeof buildSalesReceiptData>;
