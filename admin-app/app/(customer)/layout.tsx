import { requireCustomer } from '@/data/auth/guards';
import { StorefrontShell } from '@/components/layout/StorefrontShell';
import { getStorefrontBusinessInfo } from '@/data/commerce/system-settings';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, supabase } = await requireCustomer('/dashboard');
  const businessInfo = await getStorefrontBusinessInfo(supabase);

  return (
    <StorefrontShell
      user={profile}
      businessInfo={businessInfo.data}
      businessInfoError={businessInfo.error}
    >
      {children}
    </StorefrontShell>
  );
}
