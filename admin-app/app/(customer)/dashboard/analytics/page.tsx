import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

export const metadata = { title: 'Analytics' };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track usage and performance across your workspace.
        </p>
      </div>
      <EmptyState
        icon={BarChart3}
        title="No analytics yet"
        description="Analytics will appear here once your application starts collecting events."
      />
    </div>
  );
}