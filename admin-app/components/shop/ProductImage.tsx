import Image from 'next/image';
import { Package } from 'lucide-react';
import { getProductImageUrl } from '@/lib/commerce';

export function ProductImage({
  path,
  alt,
  srcOverride,
  className = '',
  loading,
}: {
  path: string | null;
  alt: string;
  srcOverride?: string | null;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  const src = srcOverride ?? getProductImageUrl(path);
  return (
    <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary text-secondary-foreground ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill unoptimized loading={loading} sizes="(max-width: 640px) 100vw, 33vw" className="object-contain" />
      ) : (
        <div className="flex flex-col items-center gap-1 px-2 text-center">
          <Package className="size-5 text-muted-foreground sm:size-7" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs text-muted-foreground">No photo yet</span>
          <span aria-hidden="true" className="text-xs font-semibold tracking-[0.18em]">NJET</span>
        </div>
      )}
    </div>
  );
}
