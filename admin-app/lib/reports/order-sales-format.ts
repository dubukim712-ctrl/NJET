import type { OrderSalesReportRows } from '@/lib/validations/order-sales-report';

type ReportOrder = OrderSalesReportRows['rows'][number];

const DATE_FORMATTER = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatReportDateTime(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}

export function orderStatusLabel(status: ReportOrder['status']) {
  const labels: Record<ReportOrder['status'], string> = {
    awaiting_payment: 'Awaiting payment',
    awaiting_confirmation: 'Pending confirmation',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    completed: 'Completed',
  };
  return labels[status];
}

export function reportOrderStatus(order: ReportOrder) {
  if (order.payments.some((payment) => payment.transaction_type === 'refund')) {
    return {
      label: order.status === 'cancelled' ? 'Returned / refunded' : 'Refund recorded',
      className: 'bg-rose-500/10 text-rose-800 dark:text-rose-300',
    };
  }
  if (
    !['cancelled', 'expired'].includes(order.status)
    && order.payment_method === 'home_credit'
    && order.financed_minor > 0
    && order.balance_due_minor > 0
  ) {
    return { label: 'Installment active', className: 'bg-amber-500/10 text-amber-900 dark:text-amber-300' };
  }
  if (order.status === 'confirmed' && order.fulfillment === 'delivery') {
    return { label: 'Pending delivery', className: 'bg-sky-500/10 text-sky-800 dark:text-sky-300' };
  }
  if (order.status === 'completed' && order.balance_due_minor === 0) {
    return { label: 'Fully paid', className: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' };
  }
  const className = order.status === 'completed'
    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
    : order.status === 'confirmed'
      ? 'bg-sky-500/10 text-sky-800 dark:text-sky-300'
      : order.status === 'cancelled' || order.status === 'expired'
        ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
        : 'bg-amber-500/10 text-amber-900 dark:text-amber-300';
  return { label: orderStatusLabel(order.status), className };
}

export function paymentMethodLabel(
  method: ReportOrder['payment_method'] | ReportOrder['payments'][number]['payment_method'],
  provider: ReportOrder['payment_provider']
) {
  if (method === 'home_credit') return 'Home Credit';
  if (method === 'cash') return 'Cash';
  if (provider === 'gcash') return 'GCash';
  if (provider === 'bank_transfer') return 'Bank transfer';
  if (provider === 'card') return 'Card';
  if (method === 'online') return 'Online';
  return 'Other / unspecified';
}
