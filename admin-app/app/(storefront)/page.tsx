import { StorefrontHomePage } from '@/components/shop/StorefrontHomePage';
import { getStoreCatalog } from '@/data/commerce/catalog';

export const metadata = { title: 'Home | NJET' };

export default async function HomePage() {
  const result = await getStoreCatalog();

  return (
    <StorefrontHomePage
      catalog={result.data}
      error={result.error}
    />
  );
}
