import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewRoleContent } from '@/components/rbac/NewRoleContent';

export const metadata = { title: 'New Role' };

export default function NewRolePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to roles
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          New role
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a reusable access level. The slug is permanent after creation.
        </p>
      </div>

      <NewRoleContent />
    </div>
  );
}
