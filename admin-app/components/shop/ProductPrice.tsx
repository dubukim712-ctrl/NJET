import { formatPhp } from '@/lib/commerce';

export function ProductPrice({
  priceMinor,
  listPriceMinor,
  srpMinor,
  strikeSrp = false,
  className = '',
}: {
  priceMinor: number;
  listPriceMinor: number;
  srpMinor?: number | null;
  strikeSrp?: boolean;
  className?: string;
}) {
  const discountMinor = Math.max(0, (srpMinor ?? listPriceMinor) - priceMinor);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {strikeSrp && <span className="font-bold text-foreground">{formatPhp(priceMinor)}</span>}
      {srpMinor != null ? (
        <span className={strikeSrp ? "text-xs text-muted-foreground line-through" : "text-xs text-muted-foreground"}>SRP {formatPhp(srpMinor)}</span>
      ) : discountMinor > 0 && (
        <del className="text-xs font-normal text-muted-foreground">
          {formatPhp(listPriceMinor)}
        </del>
      )}
      {!strikeSrp && <span className="font-bold text-foreground">{formatPhp(priceMinor)}</span>}
      {discountMinor > 0 && (
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
          Save {formatPhp(discountMinor)}
        </span>
      )}
    </span>
  );
}
