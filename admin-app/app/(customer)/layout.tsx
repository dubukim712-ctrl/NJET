import { requireCustomer } from '@/data/auth/guards';
import { StorefrontShell } from '@/components/layout/StorefrontShell';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireCustomer('/dashboard');

  return <StorefrontShell user={profile}>{children}</StorefrontShell>;
}
