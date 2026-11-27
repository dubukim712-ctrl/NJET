import { Star } from 'lucide-react';

export function ProductReviewStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[#d99b26]" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className={`size-4 ${rating >= value ? 'fill-current' : ''}`} aria-hidden="true" />
      ))}
    </span>
  );
}
