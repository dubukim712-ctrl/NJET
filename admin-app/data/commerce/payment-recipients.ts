import type { PaymentProvider } from '@/types/commerce-tables';

export const PAYMENT_PROVIDER_OPTIONS: {
  value: PaymentProvider;
  label: string;
}[] = [
  { value: 'gcash', label: 'GCash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

export function getPaymentProviderLabel(provider: PaymentProvider): string {
  return PAYMENT_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label
    ?? provider;
}
