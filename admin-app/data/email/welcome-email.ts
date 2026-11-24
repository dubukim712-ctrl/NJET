import 'server-only';

import type { User } from '@supabase/supabase-js';
import { after } from 'next/server';
import { createServiceClient } from '@/data/supabase/service';
import { getCustomerEmailSiteUrl } from '@/lib/site-url';
import { deliverWelcomeEmail } from './welcome-email-delivery';

export function queueWelcomeEmail(user: User) {
  const { id, email, email_confirmed_at, user_metadata } = user;
  if (!email || !email_confirmed_at) return;

  const name = [user_metadata.full_name, user_metadata.name]
    .find((value): value is string => typeof value === 'string' && value.trim() !== '');

  after(() => deliverWelcomeEmail({
    recipient: { email, name },
    apiKey: process.env.BREVO_API_KEY?.trim(),
    senderEmail: process.env.BREVO_SENDER_EMAIL?.trim(),
    getOrigin: getCustomerEmailSiteUrl,
    claim: async () => {
      const db = createServiceClient();
      const { data, error } = await db.rpc('claim_customer_welcome_email', {
        p_user_id: id,
      });
      if (error) {
        console.warn('Welcome email claim failed in Supabase.', error.code);
        return false;
      }
      return data === true;
    },
  }));
}
