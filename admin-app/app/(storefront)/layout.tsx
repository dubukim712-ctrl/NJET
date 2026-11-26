import { getPublicStorefrontInfo } from '@/data/commerce/storefront-home';
import { StorefrontShell } from '@/components/layout/StorefrontShell';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, branches } = await getPublicStorefrontInfo();
  return (
    <StorefrontShell businessInfo={business.data} branches={branches.data ?? []} user={null}>{children}</StorefrontShell>
  );
}
