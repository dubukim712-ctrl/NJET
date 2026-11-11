import { AuditLogDetailContent } from '@/components/audit/AuditLogDetailContent';

export const metadata = { title: 'Audit Log Entry' };

interface AuditLogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AuditLogDetailPage({
  params,
}: AuditLogDetailPageProps) {
  return <AuditLogDetailContent params={params} />;
}
