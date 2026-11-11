import { unstable_rethrow } from 'next/navigation';
import { requireFullAccess } from '@/data/auth/guards';
import type { createClient } from '@/data/supabase/server';
import type { PaymentProvider } from '@/types/commerce-tables';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AdminPaymentRecipient = {
  id: string;
  provider: PaymentProvider;
  recipientName: string;
  accountDetails: string;
  paymentQrPath: string;
  paymentQrUrl: string;
  active: boolean;
};

export type AdminBusinessInfo = {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  businessHours: string;
  logoPath: string | null;
  logoUrl: string | null;
};

export type StorefrontBusinessInfo = Omit<AdminBusinessInfo, 'logoPath'>;

export type AdminSystemSettings = {
  businessInfo: AdminBusinessInfo;
  branchServiceHours: {
    branches: { id: string; name: string }[];
    hours: {
      branchId: string;
      dayOfWeek: number;
      isOpen: boolean;
      opensAt: string | null;
      closesAt: string | null;
    }[];
  };
  certificateTemplate: {
    templateVersion: string;
    updatedAt: string;
  } | null;
  paymentRecipients: AdminPaymentRecipient[];
};

export async function getAdminSystemSettings(): Promise<{
  data: AdminSystemSettings | null;
  error: string | null;
}> {
  try {
    const { supabase } = await requireFullAccess('/admin/settings');
    const [
      businessResult,
      templateResult,
      recipientResult,
      branchesResult,
      serviceHoursResult,
    ] = await Promise.all([
      supabase
        .from('business_settings')
        .select('business_name, phone, email, address, business_hours, logo_path')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('ownership_certificate_templates')
        .select('template_version, updated_at')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('payment_recipients')
        .select('id, provider, recipient_name, account_details, payment_qr_path, active')
        .order('provider')
        .order('created_at')
        .limit(100),
      supabase.from('branches').select('id, name').order('name').limit(100),
      supabase
        .from('branch_service_hours')
        .select('branch_id, day_of_week, is_open, opens_at, closes_at')
        .limit(700),
    ]);
    if (businessResult.error) throw businessResult.error;
    if (templateResult.error) throw templateResult.error;
    if (recipientResult.error) throw recipientResult.error;
    if (branchesResult.error) throw branchesResult.error;
    if (serviceHoursResult.error) throw serviceHoursResult.error;
    if (!businessResult.data) throw new Error('Business settings are not initialized.');
    const branding = supabase.storage.from('njet-storefront-branding');

    return {
      data: {
        businessInfo: {
          businessName: businessResult.data.business_name,
          phone: businessResult.data.phone,
          email: businessResult.data.email,
          address: businessResult.data.address,
          businessHours: businessResult.data.business_hours,
          logoPath: businessResult.data.logo_path,
          logoUrl: businessResult.data.logo_path
            ? branding.getPublicUrl(businessResult.data.logo_path).data.publicUrl
            : null,
        },
        branchServiceHours: {
          branches: branchesResult.data,
          hours: serviceHoursResult.data.map((hour) => ({
            branchId: hour.branch_id,
            dayOfWeek: hour.day_of_week,
            isOpen: hour.is_open,
            opensAt: hour.opens_at,
            closesAt: hour.closes_at,
          })),
        },
        certificateTemplate: templateResult.data
          ? {
              templateVersion: templateResult.data.template_version,
              updatedAt: templateResult.data.updated_at,
            }
          : null,
        paymentRecipients: recipientResult.data.map((recipient) => {
          const storage = supabase.storage.from('njet-payment-recipient-media');
          return {
            id: recipient.id,
            provider: recipient.provider,
            recipientName: recipient.recipient_name,
            accountDetails: recipient.account_details,
            paymentQrPath: recipient.payment_qr_path,
            paymentQrUrl: storage.getPublicUrl(recipient.payment_qr_path).data.publicUrl,
            active: recipient.active,
          };
        }),
      },
      error: null,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load system settings.', error);
    return {
      data: null,
      error: 'System settings could not be loaded. Confirm the settings migration is applied and try again.',
    };
  }
}

export async function getStorefrontBusinessInfo(
  supabase: SupabaseClient
): Promise<{ data: StorefrontBusinessInfo | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('business_name, phone, email, address, business_hours, logo_path')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        data: null,
        error: 'Business contact information is not configured.',
      };
    }

    return {
      data: {
        businessName: data.business_name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        businessHours: data.business_hours,
        logoUrl: data.logo_path
          ? supabase.storage
              .from('njet-storefront-branding')
              .getPublicUrl(data.logo_path).data.publicUrl
          : null,
      },
      error: null,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load storefront business information.', error);
    return {
      data: null,
      error: 'Business contact information is temporarily unavailable.',
    };
  }
}
