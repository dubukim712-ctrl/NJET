import { Suspense } from 'react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { AuditLogDetailContent } from '@/components/audit/AuditLogDetailContent';

export const metadata = { title: 'Audit Log Entry' };

interface AuditLogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AuditLogDetailPage({
  params,
}: AuditLogDetailPageProps) {
  return (
    <Suspense fallback={<AdminDataFallback label="audit entry" />}>
      <AuditLogDetailContent params={params} />
    </Suspense>
  );
}
