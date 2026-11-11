import { BranchesContent } from '@/components/admin/commerce/BranchesContent';

export const metadata = { title: 'Branches' };

export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Locations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Branches</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage customer pickup locations and branch details.</p>
      </header>
      <BranchesContent />
    </div>
  );
}
