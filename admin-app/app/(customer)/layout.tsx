import { getPublicStorefrontInfo } from '@/data/commerce/storefront-home';
import { requireCustomer } from '@/data/auth/guards';
import { StorefrontShell } from '@/components/layout/StorefrontShell';
import { SupportChatLauncher } from '@/components/support-chat/SupportChatLauncher';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireCustomer('/dashboard');

  const { business, branches } = await getPublicStorefrontInfo();
  return (
    <>
      <StorefrontShell businessInfo={business.data} branches={branches.data ?? []} user={profile}>{children}</StorefrontShell>
      <SupportChatLauncher />
    </>
  );
}
