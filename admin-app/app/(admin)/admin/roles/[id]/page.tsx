import { Suspense } from 'react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { RoleDetailContent } from '@/components/rbac/RoleDetailContent';

export const metadata = { title: 'Role Details' };

interface RoleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
  return (
    <Suspense fallback={<AdminDataFallback label="role details" />}>
      <RoleDetailContent params={params} />
    </Suspense>
  );
}
