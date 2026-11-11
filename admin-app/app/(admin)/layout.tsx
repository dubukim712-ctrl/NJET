import { requireStaff } from '@/data/auth/guards';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireStaff('/admin');

  return (
    <DashboardShell user={profile}>
      {children}
    </DashboardShell>
  );
}
