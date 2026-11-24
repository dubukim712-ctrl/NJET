export function orderConfirmationPath(orderId: string) {
  return `/checkout/success?orderId=${encodeURIComponent(orderId)}`;
}

export function appointmentConfirmationPath(appointmentId: string) {
  return `/dashboard/appointments/submitted?appointmentId=${encodeURIComponent(appointmentId)}`;
}

export function isPaymentProofDue(order: {
  status: string;
  online_due_minor: number;
  home_credit_downpayment_due_minor: number;
  payment_expires_at: string | null;
}, now = Date.now()) {
  return order.status === 'awaiting_payment'
    && (order.online_due_minor > 0 || order.home_credit_downpayment_due_minor > 0)
    && order.payment_expires_at !== null
    && Date.parse(order.payment_expires_at) > now;
}

export function formatConfirmationSlot(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}
