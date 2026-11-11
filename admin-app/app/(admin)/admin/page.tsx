import { StaffLandingPage } from '@/components/dashboard/StaffLandingPage';
import { requireStaff } from '@/data/auth/guards';

export const metadata = { title: 'Admin Panel' };

export default async function AdminPage() {
  const { profile } = await requireStaff('/admin');
  return <StaffLandingPage profile={profile} />;
}
