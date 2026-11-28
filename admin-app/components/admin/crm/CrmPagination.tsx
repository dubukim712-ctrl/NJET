import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CrmPagination({ page, hasNext, href, label }: {
  page: number;
  hasNext: boolean;
  href: (page: number) => string;
  label: string;
}) {
  if (page === 1 && !hasNext) return null;

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-3 border-t p-4 text-sm">
      {page > 1 && <Button variant="outline" asChild className="min-h-11"><Link prefetch={false} href={href(page - 1)} onNavigate={(event) => { event.preventDefault(); window.history.pushState(null, "", href(page - 1)); }}>Previous</Link></Button>}
      <span className="tabular-nums">Page {page}</span>
      {hasNext && <Button variant="outline" asChild className="min-h-11"><Link prefetch={false} href={href(page + 1)} onNavigate={(event) => { event.preventDefault(); window.history.pushState(null, "", href(page + 1)); }}>Next</Link></Button>}
    </nav>
  );
}
