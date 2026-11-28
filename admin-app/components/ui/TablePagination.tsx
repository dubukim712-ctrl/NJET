import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from '@/components/ui/Button';

type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
} & (
  | { previousHref: string; nextHref: string; onPageChange?: never }
  | { onPageChange: (page: number) => void; previousHref?: never; nextHref?: never }
);

const controlClass = 'inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:flex-none';

export function TablePagination({
  page,
  pageSize,
  total,
  previousHref,
  nextHref,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  function control(label: string, target: number, href?: string) {
    const disabled = target < 1 || target > totalPages;
    if (onPageChange) {
      return (
        <Button type="button" variant={null} size={null} disabled={disabled} className={controlClass}
          onClick={() => onPageChange(target)}>
          {label}
        </Button>
      );
    }
    if (!disabled && href) {
      return <SmartLink href={href} className={controlClass}>{label}</SmartLink>;
    }
    return <span aria-disabled="true" className={controlClass + ' pointer-events-none opacity-50'}>{label}</span>;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing {first}–{last} of {total}
      </p>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        {control('Previous', page - 1, previousHref)}
        <span className="px-2 text-sm text-muted-foreground">{page} / {totalPages}</span>
        {control('Next', page + 1, nextHref)}
      </div>
    </div>
  );
}
