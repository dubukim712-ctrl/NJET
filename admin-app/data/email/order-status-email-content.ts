import { escapeEmailHtml } from './brevo-email.mjs';

export type OrderEmailStatus = 'confirmed' | 'completed' | 'cancelled';

export type OrderEmailDetails = {
  email: string;
  order_number: string;
  customer_name: string;
  fulfillment: 'pickup' | 'delivery';
  branch_name: string;
  branch_address: string | null;
  delivery_address: string | null;
  total_minor: number;
  balance_due_minor: number;
  cancellation_reason?: string | null;
};

const headings = {
  confirmed: 'Order confirmed and stock reserved',
  completed: 'Order completed',
  cancelled: 'Order cancelled',
};

const pesos = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function orderMessage(status: OrderEmailStatus, order: OrderEmailDetails) {
  if (status === 'completed') {
    return [
      'Thank you for your purchase!',
      'Open your order details to view or print your Sales Receipt.',
    ];
  }
  if (status === 'cancelled') {
    const reason = order.cancellation_reason?.trim();
    return ['Please do not send any further payment for this order.',
      ...(reason ? ['Cancellation reason: ' + reason] : [])];
  }

  const pickup = order.fulfillment === 'pickup';
  const location = pickup
    ? [order.branch_name, order.branch_address].filter(Boolean).join(', ')
    : order.delivery_address;
  return [
    'Your items have been reserved.',
    [pickup ? 'Pick up at store' : 'Delivery', location].filter(Boolean).join(': '),
    'Order total: ' + pesos.format(order.total_minor / 100),
    ...(pickup && order.balance_due_minor > 0
      ? ['Balance due at the store: ' + pesos.format(order.balance_due_minor / 100)]
      : []),
  ];
}

export function buildOrderStatusEmail(
  status: OrderEmailStatus,
  orderId: string,
  order: OrderEmailDetails,
  senderEmail: string,
  siteOrigin: string,
) {
  const heading = headings[status];
  const href = new URL('/orders/' + encodeURIComponent(orderId), siteOrigin).href;
  const lines = [
    'Hi ' + (order.customer_name.trim() || 'Valued Customer') + ',',
    'Order ' + order.order_number,
    ...orderMessage(status, order),
  ];

  return {
    sender: { email: senderEmail, name: 'NJET' },
    to: [{ email: order.email }],
    subject: heading + ' - ' + order.order_number,
    textContent: [heading, ...lines, 'View order details: ' + href].join('\n\n'),
    htmlContent: [
      '<div style="max-width:520px;margin:auto;padding:20px;font:16px/1.6 Arial,sans-serif;color:#17242c">',
      '<h1 style="font-size:26px;color:#07634e">' + heading + '</h1>',
      ...lines.map((line) => '<p>' + escapeEmailHtml(line) + '</p>'),
      '<p><a style="display:inline-block;padding:12px 18px;border-radius:8px;background:#07634e;color:#fff" href="' +
        escapeEmailHtml(href) + '">View order details</a></p>',
      '</div>',
    ].join(''),
  };
}
