import type { OrderStatus } from '@/types/commerce-tables';

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  awaiting_payment:
    'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200',
  awaiting_confirmation:
    'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  confirmed: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  cancelled: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
  expired: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
  completed:
    'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${ORDER_STATUS_COLORS[status]}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
