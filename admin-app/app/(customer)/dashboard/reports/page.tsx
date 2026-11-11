import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

export const metadata = { title: 'Reports' };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and review reports for your organization.
        </p>
      </div>
      <EmptyState
        icon={FileText}
        title="No reports yet"
        description="Reports you generate will be listed here."
      />
    </div>
  );
}