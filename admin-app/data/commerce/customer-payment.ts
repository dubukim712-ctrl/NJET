import { unstable_rethrow } from 'next/navigation';
import type { createClient } from '@/data/supabase/server';
import {
  customerOrderPaymentDetailsSchema,
  type CustomerOrderPaymentDetails,
} from '@/lib/validations/commerce';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
export type CustomerOrderPayment = CustomerOrderPaymentDetails & {
 payment_qr_url: string;
};

export async function getCustomerOrderPayment(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ data: CustomerOrderPayment | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('customer_order_payment_details', {
      p_order_id: orderId,
    });
    if (error) throw error;
    const parsed = customerOrderPaymentDetailsSchema.safeParse(data?.[0]);
    if (!parsed.success) {
      return { data: null, error: 'This payment-required order could not be found.' };
    }

    return {
      data: {
        ...parsed.data,
        payment_qr_url: supabase.storage
          .from('njet-payment-recipient-media')
          .getPublicUrl(parsed.data.payment_qr_path).data.publicUrl,
      },
      error: null,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load customer payment details.', error);
    return {
      data: null,
      error: 'Payment details could not be loaded. Please try again later.',
    };
  }
}
