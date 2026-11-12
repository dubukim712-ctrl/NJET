import { CustomerOrderPaymentSkeleton } from '@/components/checkout/CustomerOrderPaymentSkeleton';

export default function OrderPaymentLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <CustomerOrderPaymentSkeleton />
    </div>
  );
}
