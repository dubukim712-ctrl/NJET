import { StorefrontHomePage } from '@/components/shop/StorefrontHomePage';

export const metadata = { title: 'Home' };

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  return <StorefrontHomePage permissionError={params.error === 'insufficient_permissions'} />;
}
