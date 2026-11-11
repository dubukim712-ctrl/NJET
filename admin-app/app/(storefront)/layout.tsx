import { StorefrontShell } from '@/components/layout/StorefrontShell';
import { getStorefrontBusinessInfo } from '@/data/commerce/system-settings';
import { createClient } from '@/data/supabase/server';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const businessInfo = await getStorefrontBusinessInfo(supabase);

  return (
    <StorefrontShell
      user={null}
      businessInfo={businessInfo.data}
      businessInfoError={businessInfo.error}
    >
      {children}
    </StorefrontShell>
  );
}
