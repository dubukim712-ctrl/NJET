import { FolderOpen } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

export const metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and organize shared files.
        </p>
      </div>
      <EmptyState
        icon={FolderOpen}
        title="No documents yet"
        description="Uploaded documents will be listed here."
      />
    </div>
  );
}