import { getPublicStorefrontInfo } from '@/data/commerce/storefront-home';
import { requireCustomer } from '@/data/auth/guards';
import { CustomerSession } from '@/components/dashboard/CustomerSession';
import { StorefrontShell } from '@/components/layout/StorefrontShell';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, user } = await requireCustomer('/');

  const { business, branches } = await getPublicStorefrontInfo();
  return (
    <StorefrontShell businessInfo={business.data} branches={branches.data ?? []} user={profile}>
      <CustomerSession userId={user.id}>{children}</CustomerSession>
    </StorefrontShell>
  );
}
