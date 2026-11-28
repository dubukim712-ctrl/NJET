import { z } from 'zod';
import { getOrderView, ORDER_VIEWS, ORDER_VIEW_STATUSES } from '@/lib/order-queue';
import type { OrderStatus } from '@/types/commerce-tables';

export const ORDER_FILTER_STATUSES = [
  'awaiting_payment',
  'awaiting_confirmation',
  'confirmed',
  'cancelled',
  'expired',
  'completed',
] as const satisfies readonly OrderStatus[];

export const orderFiltersSchema = z
  .object({
    view: z.preprocess((view) => {
      if (view === 'confirmed') return 'upcoming';
      if (view === 'all' || view === 'completed' || view === 'closed') return 'history';
      return view;
    }, z.enum(ORDER_VIEWS).optional().catch(undefined)),
    q: z.string().trim().max(100).catch(''),
    status: z
      .union([z.enum(ORDER_FILTER_STATUSES), z.literal('')])
      .catch(''),
    branch: z.string().uuid().catch(''),
  })
  .strict()
  .transform((filters) => {
    const view = getOrderView(filters);
    const statuses = ORDER_VIEW_STATUSES[view];
    const status = statuses.length === 0 || (statuses.length > 1 && filters.status && statuses.includes(filters.status))
      ? filters.status
      : '';
    return { ...filters, view, status };
  });

export type OrderFilters = z.infer<typeof orderFiltersSchema>;
