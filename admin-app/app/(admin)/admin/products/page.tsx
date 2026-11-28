import { AdminProductsView } from '@/components/admin/commerce/AdminProductsView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Products & stock' };

export default async function Page() {
  await requirePermission(PERMISSIONS.productsRead, '/admin/products');
  return <AdminProductsView />;
}
