import { z } from 'zod';
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
    q: z.string().trim().max(100).catch(''),
    status: z
      .union([z.enum(ORDER_FILTER_STATUSES), z.literal('')])
      .catch(''),
    branch: z.string().uuid().catch(''),
  })
  .strict();

export type OrderFilters = z.infer<typeof orderFiltersSchema>;
