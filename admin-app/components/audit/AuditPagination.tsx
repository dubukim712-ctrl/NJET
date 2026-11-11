import Link from 'next/link';
import { buildAuditLogsHref } from '@/lib/audit';

interface AuditPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  action?: string;
  table?: string;
}

export function AuditPagination({
  page,
  pageSize,
  total,
  action,
  table,
}: AuditPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing {first}–{last} of {total}
      </p>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        {page > 1 ? (
          <Link
            href={buildAuditLogsHref({ page: page - 1, action, table })}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:flex-none"
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium opacity-50 sm:flex-none"
          >
            Previous
          </span>
        )}

        <span className="px-2 text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>

        {page < totalPages ? (
          <Link
            href={buildAuditLogsHref({ page: page + 1, action, table })}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:flex-none"
          >
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium opacity-50 sm:flex-none"
          >
            Next
          </span>
        )}
      </div>
    </div>
  );
}
