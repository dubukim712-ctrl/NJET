import { UsersContent, type UsersSearchParams } from '@/components/rbac/UsersContent';

export const metadata = { title: 'Users' };

interface UsersPageProps {
  searchParams: Promise<UsersSearchParams>;
}

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Team &amp; Security</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review accounts and their assigned roles.
        </p>
      </div>
      <UsersContent searchParams={searchParams} />
    </div>
  );
}
