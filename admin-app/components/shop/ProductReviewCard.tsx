import { UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import type { PublishedProductReview } from '@/data/actions/product-reviews';
import { ProductReviewStars } from '@/components/shop/ProductReviewStars';

export function ProductReviewCard({ review }: { review: PublishedProductReview }) {
  const name = review.is_anonymous ? 'Anonymous' : review.reviewer_name ?? 'Customer';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const comment = review.comment?.trim();
  const date = new Date(review.created_at).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });

  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 border border-border" aria-hidden="true">
          {!review.is_anonymous && review.reviewer_avatar_url && (
            <AvatarImage src={review.reviewer_avatar_url} alt="" className="object-cover" referrerPolicy="no-referrer" />
          )}
          <AvatarFallback className="text-xs font-semibold text-muted-foreground">
            {review.is_anonymous ? <UserRound className="size-4" /> : initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-sm font-medium">{name}</p>
          <ProductReviewStars rating={review.rating} />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">Verified buyer</span>
            <time dateTime={review.created_at}>{date}</time>
            {review.variant_name && (
              <span className="max-w-full break-words rounded-full border bg-muted px-2 py-0.5">
                Variant: {review.variant_name}
              </span>
            )}
          </div>
          {comment ? (
            <p className="whitespace-pre-line break-words text-sm leading-6">{comment}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Rating only</p>
          )}
        </div>
      </div>
    </li>
  );
}
