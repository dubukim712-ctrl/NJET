import Image from 'next/image';
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
    <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary text-primary ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill unoptimized loading={loading} sizes="(max-width: 640px) 100vw, 33vw" className="object-contain" />
      ) : (
        <span className="text-sm font-semibold tracking-[0.18em]">NJET</span>
      )}
    </div>
  );
}
