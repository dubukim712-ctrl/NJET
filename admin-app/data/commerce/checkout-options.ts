import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { getCurrentLegalPolicyVersions } from '@/data/commerce/legal-policies';
import type { LegalPolicySlug } from '@/data/legal-policies';
import type { PaymentProvider } from '@/types/commerce-tables';

export type LegalPolicyVersions = Record<LegalPolicySlug, string>;

export type CheckoutOptions = {
  branches: { id: string; name: string; address: string }[];
  zones: { id: string; name: string; fee_minor: number }[];
  phoneVerificationRequired: boolean;
  customerPhoneNumber: string | null;
  customerPhoneVerified: boolean;
  paymentRecipients: {
    id: string;
    provider: PaymentProvider;
    recipientName: string;
    accountDetails: string;
  }[];
  policyVersions: LegalPolicyVersions;
};

export async function getCheckoutOptions(userId: string): Promise<{
  data: CheckoutOptions | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const [
      { data: branches, error: branchError },
      { data: zones, error: zoneError },
      { data: recipients, error: recipientError },
      policyVersions,
      { data: businessSettings, error: businessSettingsError },
      { data: customer, error: customerError },
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
        getCurrentLegalPolicyVersions(supabase),
        supabase
          .from('business_settings')
          .select('phone_verification_required')
          .eq('id', 1)
          .maybeSingle(),
        supabase
          .from('users')
          .select('phone_number, phone_verified_at')
          .eq('id', userId)
          .maybeSingle(),
      ]);
    if (branchError) throw branchError;
    if (zoneError) throw zoneError;
    if (recipientError) throw recipientError;
    if (businessSettingsError) throw businessSettingsError;
    if (customerError) throw customerError;
    if (!businessSettings || !customer) {
      throw new Error('Checkout phone settings could not be loaded.');
    }
    const paymentRecipients = recipients.map((recipient) => ({
      id: recipient.id,
      provider: recipient.provider,
      recipientName: recipient.recipient_name,
      accountDetails: recipient.account_details,
    }));
    return {
      data: {
        branches,
        zones,
        phoneVerificationRequired: businessSettings.phone_verification_required,
        customerPhoneNumber: customer.phone_number,
        customerPhoneVerified: Boolean(
          customer.phone_number && customer.phone_verified_at
        ),
        paymentRecipients,
        policyVersions,
      },
      error: null,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load checkout options.', error);
    return {
      data: null,
      error: 'Pickup and delivery options could not be loaded. Please try again later.',
    };
  }
}
