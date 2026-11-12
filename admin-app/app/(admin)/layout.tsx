import { requireStaff } from '@/data/auth/guards';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { AdminProvider } from '@/components/providers/AdminProvider';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireStaff('/admin');

  return (
    <AdminProvider profile={profile}>
      <DashboardShell user={profile}>
        {children}
      </DashboardShell>
    </AdminProvider>
  );
}
