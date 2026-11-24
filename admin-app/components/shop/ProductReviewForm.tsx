'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { submitProductReviewAction } from '@/data/actions/order-product-reviews';
import { Button } from '@/components/ui/Button';

type ReviewDraft = {
  id: string;
  rating: number;
  comment: string | null;
  isAnonymous: boolean;
};

export function ProductReviewForm({
  orderId,
  orderItemId,
  productId,
  userId,
  review,
}: {
  orderId: string;
  orderItemId: string;
  productId: string;
  userId: string;
  review: ReviewDraft | null;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [isAnonymous, setIsAnonymous] = useState(review?.isAnonymous ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const result = await submitProductReviewAction({
        orderId,
        orderItemId,
        productId,
        rating,
        comment,
        isAnonymous,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['my-order-item-review', userId, orderId, orderItemId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer-order-item-reviews', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['my-product-review-items', userId, productId],
        }),
        queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] }),
        queryClient.invalidateQueries({ queryKey: ['product-rating-summary', productId] }),
      ]);
    } catch (submitError) {
      console.error('Could not submit product review.', submitError);
      setError('Your review could not be submitted. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Your rating</legend>
        <div className="flex flex-wrap items-center gap-x-2">
          <div className="flex flex-wrap">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
                className="inline-flex size-11 items-center justify-center rounded-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star
                  className={`size-6 ${value <= rating ? 'fill-current' : ''}`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground" role="status">{rating} of 5 stars</span>
        </div>
      </fieldset>
      <label className="block space-y-2 text-sm font-medium">
        Review (optional)
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
          placeholder="What should other customers know?"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(event) => setIsAnonymous(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>Review anonymously (hide your account name from other customers)</span>
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {saved && (
        <p className="text-sm text-primary" role="status">
          Your review was submitted for approval.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Submitting…' : review ? 'Update review' : 'Submit review'}
      </Button>
    </form>
  );
}
