import type { SalesReceiptData } from '@/data/commerce/sales-receipt';

type ReceiptOrder = {
  order_number: string;
  customer_name: string;
  contact_number: string;
  branch_name: string;
  fulfillment: string;
  delivery_zone_name: string | null;
  address_line1: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  payment_method: string;
  payment_provider: string | null;
  total_minor: number;
  discount_total_minor: number;
  delivery_fee_minor: number;
  home_credit_downpayment_due_minor: number;
  balance_due_minor: number;
  completed_at: string | null;
  updated_at: string;
};

type ReceiptItem = {
  id: string;
  product_name: string;
  product_type: 'ebike' | 'part' | 'accessory';
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price_minor: number;
  regular_unit_price_minor: number;
  discount_unit_minor: number;
};

type ReceiptPayment = {
  transaction_type: 'collection' | 'refund' | 'financing';
  payment_method: string;
  payment_provider: string | null;
  amount_minor: number;
  is_downpayment: boolean;
  reference: string | null;
};

type Business = {
  business_name: string;
  address: string;
  phone: string;
  email: string;
};

type HomeCreditDetails = {
  home_credit_acc_no: string;
  downpayment_minor: number;
  terms_months: number;
  monthly_payment_minor: number;
};

type EBikeUnit = {
  order_item_id: string | null;
  serial_number: string | null;
  motor_number: string | null;
};

const amountFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPhp(amountMinor: number) {
  return `PHP ${amountFormatter.format(amountMinor / 100)}`;
}

function formatIssuedAt(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'long',
    timeZone: 'Asia/Manila',
  }).format(new Date(value)).replace(/[^\x20-\x7e]/g, ' ');
}

function paymentLabel(method: string, provider: string | null) {
  const label = method.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const paymentProvider = provider?.replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const value = paymentProvider ? `${label} (${paymentProvider})` : label;
  return value.replace(/[^\x20-\x7e]/g, ' ');
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].join(', ');
}

export function buildSalesReceiptData({
  order,
  invoiceNo,
  certificateNumber,
  items,
  payments,
  business,
  homeCredit,
  units,
}: {
  order: ReceiptOrder;
  invoiceNo: string | null;
  certificateNumber: string | null;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  business: Business;
  homeCredit: HomeCreditDetails | null;
  units: EBikeUnit[];
}): SalesReceiptData {
  const amountPaid = payments.reduce((sum, payment) => (
    sum + (payment.transaction_type === 'refund'
      ? -payment.amount_minor
      : payment.transaction_type === 'collection' ||
          payment.transaction_type === 'financing'
        ? payment.amount_minor
        : 0)
  ), 0);
  const downpayment = homeCredit?.downpayment_minor
    ?? (order.payment_method === 'home_credit'
      ? order.home_credit_downpayment_due_minor
      : payments.reduce(
        (sum, payment) => payment.is_downpayment
          ? sum + (payment.transaction_type === 'refund'
            ? -payment.amount_minor
            : payment.amount_minor)
          : sum,
        0
      ));
  const paymentsText = payments.length
    ? payments.map((payment) => {
        const type = payment.transaction_type === 'refund'
          ? 'Refund'
          : payment.transaction_type === 'financing'
            ? 'Financing'
            : 'Collection';
        const reference = payment.reference ? ` - Ref: ${payment.reference}` : '';
        return `${type} - ${paymentLabel(payment.payment_method, payment.payment_provider)}: ${formatPhp(payment.amount_minor)}${reference}`;
      }).join('\n')
    : 'No payment transactions recorded.';
  const eBikeItems = items.filter((item) => item.product_type === 'ebike');
  const eBikeUnits = eBikeItems.flatMap((item) =>
    units.filter((unit) => unit.order_item_id === item.id)
  );
  const address = [
    order.address_line1,
    order.barangay,
    order.city,
    order.province,
    order.postal_code,
  ].filter(Boolean).join(', ');

  return {
    businessName: business.business_name,
    businessAddress: business.address,
    businessPhone: business.phone,
    businessEmail: business.email,
    receiptNumber: invoiceNo ?? order.order_number,
    orderNumber: order.order_number,
    issuedAt: formatIssuedAt(order.completed_at ?? order.updated_at),
    purchaseDate: formatIssuedAt(order.completed_at ?? order.updated_at),
    customerName: order.customer_name,
    contactNumber: order.contact_number,
    ownerName: order.customer_name,
    ownerAddress: address,
    branchName: order.fulfillment === 'delivery'
      ? order.delivery_zone_name ?? 'Delivery'
      : order.branch_name,
    storeBranch: order.branch_name,
    fulfillment: order.fulfillment === 'delivery' ? 'Delivery' : 'Branch pickup',
    productType: uniqueValues(items.map((item) => ({
      ebike: 'Electric Bicycle',
      part: 'Part',
      accessory: 'Accessory',
    })[item.product_type])),
    modelType: uniqueValues(eBikeItems.map((item) => item.product_name)),
    color: uniqueValues(eBikeItems.map((item) => item.variant_name)),
    serialNumber: uniqueValues(eBikeUnits.map((unit) => unit.serial_number ?? '')),
    motorNumber: uniqueValues(eBikeUnits.map((unit) => unit.motor_number ?? '')),
    invoiceNumber: invoiceNo ?? order.order_number,
    paymentMode: paymentLabel(order.payment_method, order.payment_provider),
    homeCreditAccountNumber: homeCredit?.home_credit_acc_no ?? '',
    downpayment: formatPhp(downpayment),
    terms: homeCredit ? `${homeCredit.terms_months} months` : '',
    monthlyPayment: homeCredit
      ? formatPhp(homeCredit.monthly_payment_minor)
      : '',
    certificateNumber: certificateNumber ?? '',
    salesInvoiceNumber: invoiceNo ?? '',
    items: items.map((item) => {
      const regularTotal = item.regular_unit_price_minor * item.quantity;
      const discountTotal = item.discount_unit_minor * item.quantity;
      const itemTotal = item.unit_price_minor * item.quantity;
      const price = discountTotal > 0
        ? `Regular ${formatPhp(regularTotal)} - Discount ${formatPhp(discountTotal)} - Paid ${formatPhp(itemTotal)}`
        : formatPhp(itemTotal);
      return `${item.quantity} x ${item.product_name} - ${item.variant_name} (${item.sku}) - ${price}`;
    }).join('\n'),
    subtotal: formatPhp(
      items.reduce((sum, item) => sum + item.regular_unit_price_minor * item.quantity, 0)
    ) + (order.discount_total_minor > 0
      ? ` - Discounts ${formatPhp(order.discount_total_minor)}`
      : ''),
    deliveryFee: formatPhp(order.delivery_fee_minor),
    total: formatPhp(order.total_minor),
    paymentMethod: paymentLabel(order.payment_method, order.payment_provider),
    payments: paymentsText,
    amountPaid: formatPhp(amountPaid),
    balanceDue: formatPhp(order.balance_due_minor),
  };
}
