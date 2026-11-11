import { StorefrontLandingPage } from '@/components/dashboard/StorefrontLandingPage';
import { requireCustomer } from '@/data/auth/guards';

export const metadata = { title: 'Storefront' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await requireCustomer('/dashboard');

  return (
    <StorefrontLandingPage
      profile={profile}
      permissionError={params?.error === 'insufficient_permissions'}
    />
  );
}
