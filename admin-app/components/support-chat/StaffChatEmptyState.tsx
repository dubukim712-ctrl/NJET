import { Users } from 'lucide-react';

export function StaffChatEmptyState({ search, status }: {
  search: string;
  status: 'all' | 'open' | 'resolved';
}) {
  const title = search ? 'No conversations match your search' : {
    all: 'No conversations yet',
    open: 'No open conversations',
    resolved: 'No resolved conversations',
  }[status];
  const description = search
    ? 'Try a different search or choose another status.'
    : status === 'resolved' ? 'Conversations you resolve will appear here.' : 'New customer messages will appear here.';

  return (
    <div className="m-auto max-w-xs px-5 py-10 text-center">
      <Users className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
