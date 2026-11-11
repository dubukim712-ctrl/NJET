import { RoleDetailContent } from '@/components/rbac/RoleDetailContent';

export const metadata = { title: 'Role Details' };

interface RoleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
  return <RoleDetailContent params={params} />;
}
