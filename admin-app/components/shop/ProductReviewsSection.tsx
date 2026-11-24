'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getCustomerProductReviewItemsAction } from '@/data/actions/order-product-reviews';
import {
  getProductRatingSummaryAction,
  getPublishedProductReviewsAction,
} from '@/data/actions/product-reviews';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { ProductReviewCard } from '@/components/shop/ProductReviewCard';
import { ProductReviewStars } from '@/components/shop/ProductReviewStars';
import { Select } from '@/components/ui/Select';
import { ProductReviewForm } from '@/components/shop/ProductReviewForm';

const reviewPageSize = 10;

export function ProductReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string | null>(null);
  const canReview = user?.scope === 'customer'
    && hasPermission(user, PERMISSIONS.storefrontAccess);

  const summaryQuery = useQuery({
    queryKey: ['product-rating-summary', productId],
    queryFn: async () => {
      const result = await getProductRatingSummaryAction(productId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 60_000,
  });
  const reviewsQuery = useInfiniteQuery({
    queryKey: ['product-reviews', productId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await getPublishedProductReviewsAction({
        productId,
        limit: reviewPageSize,
        offset: pageParam,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === reviewPageSize ? pages.length * reviewPageSize : undefined,
    retry: false,
    staleTime: 60_000,
  });
  const customerReviewItemsQuery = useQuery({
    queryKey: ['my-product-review-items', user?.id ?? null, productId],
    queryFn: async () => {
      const result = await getCustomerProductReviewItemsAction(productId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: canReview,
    retry: false,
  });
  const purchasedItems = customerReviewItemsQuery.data?.items ?? [];
  const unreviewedItems = purchasedItems.filter((item) => !item.review);
  const selectedItem = unreviewedItems.find((item) => item.orderItemId === selectedOrderItemId)
    ?? unreviewedItems[0]
    ?? null;

  return (
    <section id="product-reviews" className="space-y-6 border-t pt-7" aria-labelledby="product-reviews-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Customer feedback</p>
          <h2 id="product-reviews-title" className="mt-1 text-2xl font-semibold tracking-tight">
            Ratings &amp; reviews
          </h2>
        </div>
        {summaryQuery.isPending ? (
          <p className="text-sm text-muted-foreground" role="status">Loading rating…</p>
        ) : summaryQuery.data ? (
          <div className="flex flex-wrap items-center gap-2">
            <ProductReviewStars rating={summaryQuery.data.averageRating} />
            <span className="text-sm font-semibold">{summaryQuery.data.averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              ({summaryQuery.data.reviewCount} {summaryQuery.data.reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-destructive" role="alert">
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : 'Rating summary could not be loaded.'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => { void summaryQuery.refetch(); }}>
              Retry
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="space-y-4">
          {!reviewsQuery.data && reviewsQuery.isPending ? (
            <p className="rounded-xl border p-4 text-sm text-muted-foreground" role="status">
              Loading customer reviews…
            </p>
          ) : !reviewsQuery.data && reviewsQuery.isError ? (
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
              <p className="text-sm text-destructive">
                {reviewsQuery.error instanceof Error
                  ? reviewsQuery.error.message
                  : 'Product reviews could not be loaded.'}
              </p>
              <Button type="button" variant="outline" onClick={() => { void reviewsQuery.refetch(); }}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              {reviewsQuery.isError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                  Could not refresh reviews. Showing the saved results.
                  <button
                    type="button"
                    className="ml-2 font-medium underline underline-offset-2"
                    onClick={() => { void reviewsQuery.refetch(); }}
                  >
                    Retry
                  </button>
                </p>
              )}
              {reviewsQuery.data?.pages.flat().length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  No published reviews yet.
                </p>
              ) : (
                <>
                  <ul className="divide-y rounded-xl border bg-card">
                    {reviewsQuery.data?.pages.flat().map((review) => (
                      <ProductReviewCard key={review.review_id} review={review} />
                    ))}
                  </ul>
                  {reviewsQuery.hasNextPage && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={reviewsQuery.isFetchingNextPage}
                      onClick={() => { void reviewsQuery.fetchNextPage(); }}
                    >
                      {reviewsQuery.isFetchingNextPage ? 'Loading…' : 'Load more reviews'}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">Share your experience</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Reviews are available after a completed online purchase and are checked by our team.
            </p>
          </div>
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login?redirect=%2Fshop">
                Sign in
              </Link>{' '}
              with your customer account to check review eligibility.
            </p>
          ) : !canReview ? (
            <p className="text-sm text-muted-foreground">
              A customer account is required to submit a review.
            </p>
          ) : customerReviewItemsQuery.isPending ? (
            <p className="text-sm text-muted-foreground" role="status">
              Checking your completed order items…
            </p>
          ) : customerReviewItemsQuery.isError && !customerReviewItemsQuery.data ? (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-destructive">
                {customerReviewItemsQuery.error instanceof Error
                  ? customerReviewItemsQuery.error.message
                  : 'Your completed order items could not be loaded.'}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => { void customerReviewItemsQuery.refetch(); }}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              {customerReviewItemsQuery.isError && (
                <p className="text-sm text-destructive" role="alert">
                  Completed order items could not be refreshed; showing saved results.
                </p>
              )}
              {purchasedItems.length > 0 && unreviewedItems.length === 0 ? (
                <p className="rounded-lg border bg-muted/60 p-3 text-sm" role="status">
                  Thank you! You have already reviewed all your purchased items for this product.
                </p>
              ) : !selectedItem ? (
                <p className="text-sm text-muted-foreground">
                  Once an online order for this product is completed, you can leave a review.
                </p>
              ) : (
                <>
                  <Select
                    label="Purchased item for this review"
                    value={selectedItem.orderItemId}
                    onValueChange={setSelectedOrderItemId}
                    className="min-h-11"
                  >
                    {unreviewedItems.map((item) => (
                      <option key={item.orderItemId} value={item.orderItemId}>
                        {item.orderNumber} &middot; {item.variantName}
                      </option>
                    ))}
                  </Select>
                  <ProductReviewForm
                    key={selectedItem.orderItemId}
                    orderId={selectedItem.orderId}
                    orderItemId={selectedItem.orderItemId}
                    productId={productId}
                    userId={user.id}
                    review={null}
                  />
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
