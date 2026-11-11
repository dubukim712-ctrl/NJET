import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import type { PaymentProvider } from '@/types/commerce-tables';

export type CheckoutOptions = {
  branches: { id: string; name: string; address: string }[];
  zones: { id: string; name: string; fee_minor: number }[];
  paymentRecipients: {
    id: string;
    provider: PaymentProvider;
    recipientName: string;
    accountDetails: string;
  }[];
};

export async function getCheckoutOptions(): Promise<{
  data: CheckoutOptions | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const [
      { data: branches, error: branchError },
      { data: zones, error: zoneError },
      { data: recipients, error: recipientError },
    ] =
      await Promise.all([
        supabase
          .from('branches')
          .select('id, name, address')
          .eq('active', true)
          .order('name')
          .limit(100),
        supabase
          .from('delivery_zones')
          .select('id, name, fee_minor')
          .eq('active', true)
          .order('name')
          .limit(100),
        supabase
          .from('payment_recipients')
          .select('id, provider, recipient_name, account_details')
          .eq('active', true)
          .order('provider')
          .order('created_at')
          .limit(100),
      ]);
    if (branchError) throw branchError;
    if (zoneError) throw zoneError;
    if (recipientError) throw recipientError;
    const paymentRecipients = recipients.map((recipient) => ({
      id: recipient.id,
      provider: recipient.provider,
      recipientName: recipient.recipient_name,
      accountDetails: recipient.account_details,
    }));
    return { data: { branches, zones, paymentRecipients }, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load checkout options.', error);
    return {
      data: null,
      error: 'Pickup and delivery options could not be loaded. Please try again later.',
    };
  }
}
