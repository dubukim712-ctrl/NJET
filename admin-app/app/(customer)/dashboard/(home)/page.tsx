import { StorefrontHomePage } from "@/components/shop/StorefrontHomePage";

export const metadata = { title: "Storefront" };

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  return <StorefrontHomePage permissionError={params.error === 'insufficient_permissions'} />;
}
