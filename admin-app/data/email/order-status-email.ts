import 'server-only';

import { after } from 'next/server';
import { createServiceClient } from '@/data/supabase/service';
import { getCustomerEmailSiteUrl } from '@/lib/site-url';
import { deliverBrevoEmail } from './brevo-email.mjs';
import { buildOrderStatusEmail, type OrderEmailStatus } from './order-status-email-content';

export function queueOrderStatusEmail(orderId: string, status: OrderEmailStatus) {
  try {
    after(() => deliverBrevoEmail({
      label: 'Order status email',
      apiKey: process.env.BREVO_API_KEY?.trim(),
      senderEmail: process.env.BREVO_SENDER_EMAIL?.trim(),
      prepare: async (sender) => {
        const { data, error } = await createServiceClient()
          .rpc('order_status_email_details', { p_order_id: orderId, p_status: status })
          .maybeSingle();
        if (error) {
          console.warn('Order status email lookup failed in Supabase.', error.code);
          return null;
        }
        return data ? buildOrderStatusEmail(status, orderId, data, sender, getCustomerEmailSiteUrl()) : null;
      },
    }));
  } catch {
    console.warn('Order status email could not be scheduled.');
  }
}
