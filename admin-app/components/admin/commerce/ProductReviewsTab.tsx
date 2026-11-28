'use client';

import { storefrontCatalogQueryKey } from '@/data/commerce/catalog-query-keys';

import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminProductReviewsAction,
  moderateProductReviewAction,
} from '@/data/actions/product-reviews';
import { Button } from '@/components/ui/Button';

const reviewQueueKey = (userId: string) => ['commerce', 'product-reviews', userId] as const;
const pageSize = 25;

export function ProductReviewsTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: reviewQueueKey(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await getAdminProductReviewsAction({
        limit: pageSize,
        offset: pageParam,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === pageSize ? pages.length * pageSize : undefined,
    retry: false,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });

  async function moderate(reviewId: string, status: 'published' | 'rejected') {
    setBusyReviewId(reviewId);
    setActionError(null);
    try {
      const result = await moderateProductReviewAction({ reviewId, status });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: storefrontCatalogQueryKey });
      await queryClient.invalidateQueries({ queryKey: reviewQueueKey(userId) });
      await queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['product-rating-summary'] });
    } catch (error) {
      console.error('Could not save product review moderation decision.', error);
      setActionError('The review decision could not be saved. Try again.');
    } finally {
      setBusyReviewId(null);
    }
  }

  const reviews = query.data?.pages.flat();

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Review moderation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve customer reviews before they appear publicly.
        </p>
      </header>
      {actionError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {query.isPending ? (
        <p className="rounded-xl border p-5 text-sm text-muted-foreground" role="status">
          Loading reviews awaiting moderation…
        </p>
      ) : query.isError && !reviews ? (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <p className="text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : 'Reviews awaiting moderation could not be loaded.'}
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {query.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
              <p className="text-sm text-destructive">
                {query.error instanceof Error
                  ? query.error.message
                  : 'Reviews could not be refreshed. Showing saved results.'}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => { void query.refetch(); }}>
                Retry
              </Button>
            </div>
          )}
          {reviews?.length === 0 ? (
            <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              No reviews are waiting for approval.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {reviews?.map((review) => (
                <li key={review.review_id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{review.product_name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.rating} of 5 stars · Verified purchase ·{' '}
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyReviewId !== null}
                        onClick={() => { void moderate(review.review_id, 'published'); }}
                      >
                        {busyReviewId === review.review_id ? 'Saving…' : 'Approve'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyReviewId !== null}
                        onClick={() => { void moderate(review.review_id, 'rejected'); }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="whitespace-pre-line break-words text-sm leading-6">
                      {review.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {query.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => { void query.fetchNextPage(); }}
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
