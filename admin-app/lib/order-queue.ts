import type { StaffOrder } from '@/data/commerce/admin-orders';
import type { OrderStatus } from '@/types/commerce-tables';

export const ORDER_VIEWS = ['attention', 'today', 'upcoming', 'history'] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

export const ORDER_VIEW_STATUSES: Record<OrderView, readonly OrderStatus[]> = {
  attention: ['awaiting_confirmation', 'awaiting_payment'],
  today: [],
  upcoming: ['confirmed'],
  history: [],
};

export function getOrderView(filters: { view?: OrderView; status: OrderStatus | '' }): OrderView {
  return filters.view ?? 'attention';
}

type OrderNextStepFields = Pick<StaffOrder, 'status' | 'phone_verification_status' | 'documents'>;

export function getOrderNextStep(order: OrderNextStepFields) {
  switch (order.status) {
    case 'expired': return 'Payment window expired';
    case 'awaiting_payment': return 'Awaiting payment proof';
    case 'awaiting_confirmation':
      if (order.phone_verification_status === 'manual_pending') return 'Verify phone';
      if (order.documents.some((document) => document.kind === 'payment_proof')) return 'Review payment proof';
      return 'Review order';
    case 'confirmed': return 'Ready to complete';
    default: return null;
  }
}
