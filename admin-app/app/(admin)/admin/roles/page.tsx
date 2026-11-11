import { RolesContent } from '@/components/rbac/RolesContent';

export const metadata = { title: 'Roles' };

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Team &amp; Security</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review roles and their permissions.</p>
      </div>
      <RolesContent />
    </div>
  );
}
