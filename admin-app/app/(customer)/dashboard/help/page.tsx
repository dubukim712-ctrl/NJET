import { HelpCircle } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

export const metadata = { title: 'Help' };

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guides and answers to common questions.
        </p>
      </div>
      <EmptyState
        icon={HelpCircle}
        title="Help center coming soon"
        description="Documentation and support resources will be available here."
      />
    </div>
  );
}