'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerSessionId } from '@/components/dashboard/CustomerSession';
import { SmartLink } from '@/components/ui/SmartLink';
import { customerOrderDetailsOptions, customerReceiptOptions, useCustomerOrderDetailsOptions } from '@/data/commerce/customer-orders-client';

export function CustomerOrderLink({ orderId, receipt = false, onNavigate, ...props }: Omit<ComponentProps<typeof SmartLink>, 'href'> & {
  orderId: string;
  receipt?: boolean;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const opening = useRef(false);
  const userId = useCustomerSessionId();
  const detailOptions = useCustomerOrderDetailsOptions(userId, orderId);

  const href = '/orders/' + orderId + (receipt ? '/receipt' : '');

  function warmOrder() {
    if (!userId) return;
    if (receipt) void client.prefetchQuery(customerReceiptOptions(userId, orderId));
    else if (!detailOptions.initialData()) void client.prefetchQuery(customerOrderDetailsOptions(userId, orderId));
  }

  return (
    <SmartLink
      {...props}
      href={href}
      prefetch={true}
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
        if (cancelled || !userId) return;
        const options = receipt ? customerReceiptOptions(userId, orderId) : detailOptions;
        if (client.getQueryData(options.queryKey) != null || (!receipt && detailOptions.initialData())) return;

        event.preventDefault();
        if (opening.current) return;
        opening.current = true;
        const from = window.location.href;
        const request = receipt
          ? client.ensureQueryData(customerReceiptOptions(userId, orderId))
          : client.ensureQueryData(customerOrderDetailsOptions(userId, orderId));
        void request.catch(() => {}).finally(() => {
          opening.current = false;
          if (window.location.href === from) router.push(href);
        });
      }}
      onMouseEnter={warmOrder}
      onTouchStart={warmOrder}
      onFocus={warmOrder}
    />
  );
}
