import { formatPhp } from '@/lib/commerce';

export function ProductPrice({
  priceMinor,
  listPriceMinor,
  className = '',
}: {
  priceMinor: number;
  listPriceMinor: number;
  className?: string;
}) {
  const discountMinor = Math.max(0, listPriceMinor - priceMinor);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {discountMinor > 0 && (
        <del className="text-xs font-normal text-muted-foreground">
          {formatPhp(listPriceMinor)}
        </del>
      )}
      <span className="font-semibold">{formatPhp(priceMinor)}</span>
      {discountMinor > 0 && (
        <span className="text-[10px] font-medium text-primary">
          Save {formatPhp(discountMinor)}
        </span>
      )}
    </span>
  );
}
