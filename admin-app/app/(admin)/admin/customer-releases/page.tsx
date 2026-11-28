import { redirect } from 'next/navigation';
import { getReleaseStaffContext } from '@/data/commerce/customer-releases';
import { AdminReleaseGalleryView } from '@/components/admin/settings/AdminReleaseGalleryView';

export const metadata = { title: 'Customer Releases' };

export default async function CustomerReleasesPage() {
  if (!(await getReleaseStaffContext())) redirect('/no-access');
  return <AdminReleaseGalleryView />;
}
