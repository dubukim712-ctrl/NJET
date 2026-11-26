import { formatPhp } from '@/lib/commerce';

export function ProductPrice({
  priceMinor,
  listPriceMinor,
  srpMinor,
  className = '',
}: {
  priceMinor: number;
  listPriceMinor: number;
  srpMinor?: number | null;
  className?: string;
}) {
  const discountMinor = Math.max(0, (srpMinor ?? listPriceMinor) - priceMinor);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {srpMinor != null ? (
        <span className="text-xs text-muted-foreground">SRP {formatPhp(srpMinor)}</span>
      ) : discountMinor > 0 && (
        <del className="text-xs font-normal text-muted-foreground">
          {formatPhp(listPriceMinor)}
        </del>
      )}
      <span className="font-semibold">{formatPhp(priceMinor)}</span>
      {discountMinor > 0 && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Save {formatPhp(discountMinor)}
        </span>
      )}
    </span>
  );
}
